"""Install a downloaded project and compare its native output with the preview."""

from __future__ import annotations

import base64
import csv
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from collections import Counter
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile

import pymupdf
import yaml
import zxingcpp
from PIL import Image, ImageChops, ImageStat
from pypdf import PdfReader


def qr_destinations(image: Image.Image) -> set[str]:
    decoded = zxingcpp.read_barcodes(image)
    for code in decoded:
        assert code.bytes == code.text.encode("utf-8"), "QR payload bytes changed"
    unicode_urls = {code.text for code in decoded if not code.text.isascii()}
    if unicode_urls:
        declared = zxingcpp.read_barcodes(image, text_mode=zxingcpp.TextMode.ECI)
        expected = {"]Q2\\000026" + url for url in unicode_urls}
        assert expected <= {code.text for code in declared}, (
            "Unicode QR lacks explicit UTF-8 ECI"
        )
    return {code.text for code in decoded}


def inspect_pdf(path: Path) -> dict:
    reader = PdfReader(path)
    urls = set()
    with pymupdf.open(path) as rendered:
        for page in rendered:
            urls.update(qr_destinations(page.get_pixmap(dpi=150).pil_image()))
    return {
        "text": [" ".join(page.extract_text().split()) for page in reader.pages],
        "pageSizes": [
            [float(page.mediabox.width), float(page.mediabox.height)]
            for page in reader.pages
        ],
        "qrUrls": sorted(urls),
        "language": str(reader.root_object.get("/Lang")),
    }


def text_coverage(preview: str, pdf: str) -> float:
    def words(value: str) -> Counter[str]:
        normalized = unicodedata.normalize("NFKC", value).casefold()
        return Counter(re.findall(r"\w+", normalized))

    pdf_words = words(pdf)
    preview_words = words(preview)
    if not pdf_words:
        return 1.0 if not preview_words else 0.0
    return sum((preview_words & pdf_words).values()) / sum(pdf_words.values())


def raster_difference(preview: Image.Image, reference: Image.Image) -> dict:
    assert preview.size == reference.size
    mean = sum(ImageStat.Stat(ImageChops.difference(preview, reference)).mean) / 3
    preview_ink = sum(preview.convert("L").histogram()[:245])
    reference_ink = sum(reference.convert("L").histogram()[:245])
    assert reference_ink > 0, "Reference page has no visible ink"
    ink_ratio = preview_ink / reference_ink
    return {"mean": mean, "inkRatio": ink_ratio}


def inspect_preview(evidence: Path, pdf: dict) -> dict:
    pages = json.loads((evidence / "preview-pages.json").read_text())
    assert len(pages) == len(pdf["text"]), "Preview/PDF page count differs"
    urls: set[str] = set()
    coverage = []
    pixel_difference = []
    with pymupdf.open(evidence / "browser.pdf") as rendered:
        for index, (page, pdf_text, size) in enumerate(
            zip(pages, pdf["text"], pdf["pageSizes"], strict=True), start=1
        ):
            with Image.open(evidence / f"preview-page-{index}.png") as image:
                assert image.size == (page["width"], page["height"])
                expected_pixels = (math.ceil(size[0] * 2), math.ceil(size[1] * 2))
                assert image.size == expected_pixels, (
                    f"Preview/PDF page {index} dimensions differ: {image.size} vs {expected_pixels}"
                )
                reference = (
                    rendered[index - 1].get_pixmap(dpi=144).pil_image().convert("RGB")
                )
                assert image.size == reference.size
                preview_rgb = image.convert("RGB")
                preview_corner = preview_rgb.getpixel((10, 10))
                reference_corner = reference.getpixel((10, 10))
                assert isinstance(preview_corner, tuple)
                assert isinstance(reference_corner, tuple)
                assert all(
                    preview_corner[channel] >= 245
                    and abs(preview_corner[channel] - reference_corner[channel]) <= 5
                    for channel in range(3)
                ), f"Preview page {index} background differs from the PDF"
                difference = raster_difference(preview_rgb, reference)
                assert difference["mean"] < 5, (
                    f"Preview/PDF page {index} pixels differ: {difference['mean']:.1f}"
                )
                assert 0.9 <= difference["inkRatio"] <= 1.1, (
                    f"Preview/PDF page {index} ink differs: {difference['inkRatio']:.2f}"
                )
                pixel_difference.append(difference)
                urls.update(qr_destinations(image))
                coverage.append(text_coverage(page["plainText"], pdf_text))
    assert min(coverage) >= 0.9, f"Preview text coverage too low: {coverage}"
    assert sorted(urls) == pdf["qrUrls"], "Preview/PDF QR destinations differ"
    return {
        "pages": len(pages),
        "textCoverage": coverage,
        "meanPixelDifference": pixel_difference,
        "qrUrls": sorted(urls),
    }


def selected_csvs(directory: Path, record: dict) -> tuple[list[dict], list[dict]]:
    """Read the selected native CSV pair and verify its source-row joins."""
    assert record["run_schema_version"] == 2
    exports = record["exports"]
    assert exports["schema_version"] == 1
    assert exports["record_revision"] == record["record_revision"]
    tables = []
    for name in ("records", "findings"):
        descriptor = exports[name]
        path = directory / descriptor["path"]
        assert sha256(path.read_bytes()).hexdigest() == descriptor["sha256"]
        with path.open(newline="", encoding="utf-8") as source:
            rows = list(csv.DictReader(source))
        assert all(
            row["run_id"] == record["run_id"]
            and row["record_revision"] == str(record["record_revision"])
            for row in rows
        )
        tables.append(rows)
    records, findings = tables
    assert len(records) == len(record["entries"])
    by_key = {row["row_key"]: row for row in records}
    assert len(by_key) == len(records)
    for index, entry in enumerate(record["entries"], start=1):
        row = by_key[entry["row_key"]]
        assert row["source_record"] == str(index)
        assert row["client_id"] == entry["client_id"]
        observed = {check["finding_key"]: check for check in entry["checks"]}
        assert len(observed) == len(entry["checks"])
        effective = entry.get("effective_checks", [])
        assert len({check["finding_key"] for check in effective}) == len(effective)
        for result in effective:
            assert result["finding_key"] in observed
        for finding in findings:
            if (
                finding["scope"] == "row"
                and finding["row_key"] == entry["row_key"]
                and finding["origin"] == "check"
            ):
                observation = observed[finding["finding_key"]]
                result = next(
                    result
                    for result in effective
                    if result["finding_key"] == finding["finding_key"]
                )
                assert finding["code"] == observation["code"]
                assert finding["observed_status"] == observation["status"]
                assert finding["effective_status"] == result["status"]
    for finding in findings:
        if finding["scope"] == "row":
            assert finding["client_id"] == by_key[finding["row_key"]]["client_id"]
    assert not (directory / "report.html").exists()
    assert not list(directory.glob("bundles-*/*.csv"))
    return records, findings


def main(evidence: Path) -> None:
    evidence = evidence.resolve()
    env = {
        key: value
        for key, value in os.environ.items()
        if key not in {"VIRTUAL_ENV", "PYTHONPATH", "UV_PROJECT_ENVIRONMENT"}
    }
    with tempfile.TemporaryDirectory(
        prefix="immuknow-downloaded-project-"
    ) as temporary:
        workspace = Path(temporary)
        extracted = workspace / "Extracted project"
        with ZipFile(evidence / "typst-project.zip") as archive:
            archive.extractall(extracted)
        project = workspace / "Relocated projet Élodie"
        extracted.rename(project)
        assert not project.is_relative_to(Path(__file__).resolve().parents[1])
        assert (project / "core-revision.txt").read_text().strip() == (
            Path(__file__).resolve().parents[1] / "core-revision.txt"
        ).read_text().strip()

        binary = shutil.which(env.get("IMMUKNOW_BIN", "immuknow"))
        assert binary, "Install the reviewed standalone Core executable"
        # The test harness uses Python to inspect PDFs, but the extracted project
        # must run with no Python, uv, shell or other tools on its command path.
        env["PATH"] = ""

        def run(*arguments: str, expected_success: bool = True) -> str:
            result = subprocess.run(
                [binary, *arguments],
                cwd=project,
                env=env,
                capture_output=True,
                text=True,
                timeout=90,
                check=False,
            )
            with (evidence / "native-commands.log").open("a") as log:
                log.write(f"{arguments!r}\n{result.stdout}\n{result.stderr}\n")
            failures = []
            if result.returncode:
                for record_path in project.glob("*/*/run.json"):
                    record = json.loads(record_path.read_text())
                    shutil.copytree(
                        record_path.parent,
                        evidence
                        / "failed-native"
                        / record_path.parent.relative_to(project),
                        dirs_exist_ok=True,
                    )
                    checks = list(record.get("checks", []))
                    for entry in record.get("entries", []):
                        checks.extend(entry.get("checks", []))
                    for attempt in record.get("delivery_attempts", []):
                        checks.extend(attempt.get("checks", []))
                        for evaluation in attempt.get("evaluations", {}).values():
                            checks.extend(evaluation.get("results", []))
                    failures.extend(
                        check for check in checks if check.get("status") == "fail"
                    )
            assert (result.returncode == 0) == expected_success, (
                result.stdout + result.stderr + json.dumps(failures, indent=2)
            )
            return result.stdout + result.stderr

        assert not (project / ".venv").exists()
        assert not (project / "pyproject.toml").exists()
        assert not (project / "uv.lock").exists()
        assert not (project / "scripts").exists()
        run("project", "sync")
        run("project", "check")
        selected = json.loads((evidence / "selected-example.json").read_text())
        if selected["example"] == "missing-meningococcal":
            run("project", "check", "--sample")
        for name, encoded in selected["inputBytes"].items():
            path = project / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(base64.b64decode(encoded))
        browser = inspect_pdf(evidence / "browser.pdf")
        preview = inspect_preview(evidence, browser)
        comparison = {
            **selected,
            "browser": browser,
            "preview": preview,
            "selectors": [],
            "rebundled": False,
        }
        selectors = [
            (
                "assignments",
                [
                    "--notice-assignments",
                    selected["input"]["assignments"],
                    "--templates",
                    str(Path(selected["template"]).parent),
                ],
            ),
        ]
        if selected["example"] == "missing-meningococcal":
            selectors.insert(0, ("template", ["--template", selected["template"]]))
        for selector, arguments in selectors:
            receipt = run(
                "run",
                selected["input"]["csv"],
                "--config",
                "config",
                "--output",
                selector,
                *arguments,
            )
            (record_path,) = (project / selector).glob("*/run.json")
            run_dir = record_path.parent
            # Preserve real outputs even if a later comparison fails.
            shutil.copytree(run_dir, evidence / selector)
            record = json.loads(record_path.read_text())
            assert record["status"] in {"completed", "completed_with_warnings"}
            (entry,) = record["entries"]
            (csv_row,), csv_findings = selected_csvs(run_dir, record)
            assert "Severity (1 source records):" in receipt
            assert all(
                f"{bucket}:" in receipt
                for bucket in ("error", "warning", "clear", "pending")
            )
            assert "100.0%" in receipt
            for descriptor in record["exports"].values():
                if isinstance(descriptor, dict) and "path" in descriptor:
                    assert descriptor["path"] in receipt
            assert csv_row["original_status"] == "completed"
            assert csv_row["original_path"] == entry["original"]["path"]
            assert csv_row["original_pages"] == str(entry["original"]["pages"])
            assert csv_row["bundle_status"] == "completed"
            assert csv_row["bundle_path"] == entry["bundle"]["path"]
            assert csv_row["bundle_start_page"] == str(
                entry["bundle"]["notice_start_page"]
            )
            assert csv_row["bundle_end_page"] == str(entry["bundle"]["notice_end_page"])
            assert entry["original"]["status"] == "completed"
            original = run_dir / entry["original"]["path"]
            assert (
                sha256(original.read_bytes()).hexdigest() == entry["original"]["sha256"]
            )
            native = inspect_pdf(original)
            assert native["pageSizes"] == browser["pageSizes"], (
                f"{selector}: native/browser page count or size differs"
            )
            assert native["qrUrls"] == browser["qrUrls"], (
                f"{selector}: native/browser QR destinations differ"
            )
            assert native["language"] == browser["language"]
            native_text, browser_text = (
                " ".join(native["text"]),
                " ".join(browser["text"]),
            )
            coverage = [
                text_coverage(native_text, browser_text),
                text_coverage(browser_text, native_text),
            ]
            assert min(coverage) >= 0.95, (
                f"{selector}: native/browser text coverage too low: {coverage}"
            )
            if not comparison["selectors"]:
                with pymupdf.open(original) as rendered:
                    for index, page in enumerate(rendered, start=1):
                        page.get_pixmap(dpi=144).save(
                            evidence / f"native-page-{index}.png"
                        )
                native_raster = []
                for index in range(1, len(native["text"]) + 1):
                    with (
                        Image.open(evidence / f"preview-page-{index}.png") as raw,
                        Image.open(evidence / f"native-page-{index}.png") as output,
                    ):
                        difference = raster_difference(
                            raw.convert("RGB"), output.convert("RGB")
                        )
                        native_raster.append(difference)
                comparison["preview"]["nativeRasterDifference"] = native_raster
            assert entry["saved_evidence"]["identity"]["row_key"] == entry["row_key"]
            assert (
                entry["saved_evidence"]["identity"]["client_id"] == entry["client_id"]
            )
            assert sorted(entry["saved_evidence"]["qr_urls"]) == native["qrUrls"]
            assert entry["saved_evidence"]["page_count"] == len(native["text"])
            findings = sorted(
                {
                    f"{check['code']}:{check['status']}"
                    for check in entry["checks"]
                    if check["status"] in {"warn", "fail"}
                }
            )
            comparison["selectors"].append(
                {
                    "pdf": native,
                    "textCoverage": coverage,
                    "qrUrls": sorted(entry["saved_evidence"]["qr_urls"]),
                    "findings": findings,
                    "summary": entry["saved_evidence"],
                }
            )

        if selected["example"] == "missing-meningococcal":
            parameters_path = project / "config/parameters.yaml"
            parameters = yaml.safe_load(parameters_path.read_text())
            parameters["encryption"]["enabled"] = True
            parameters_path.write_text(yaml.safe_dump(parameters, allow_unicode=True))
            run(
                "run",
                selected["input"]["csv"],
                "--config",
                "config",
                "--output",
                "protected",
                *selectors[0][1],
            )
            (protected_record_path,) = (project / "protected").glob("*/run.json")
            protected_record = json.loads(protected_record_path.read_text())
            (protected_entry,) = protected_record["entries"]
            (protected_row,), _ = selected_csvs(
                protected_record_path.parent, protected_record
            )
            assert protected_row["protected_status"] == "completed"
            assert (
                protected_row["protected_path"] == protected_entry["encryption"]["path"]
            )
            protected_pdf = (
                protected_record_path.parent / protected_row["protected_path"]
            )
            assert (
                sha256(protected_pdf.read_bytes()).hexdigest()
                == protected_entry["encryption"]["sha256"]
            )
            with pymupdf.open(protected_pdf) as encrypted:
                assert encrypted.needs_pass
            assert protected_entry["encryption"]["revision"] == 6
            protected_bytes = protected_pdf.read_bytes()
            assert re.search(rb"/R\s+6\b", protected_bytes)
            assert re.search(rb"/CFM\s*/AESV3\b", protected_bytes)
            shutil.copytree(protected_record_path.parent, evidence / "protected")
            input_path = project / selected["input"]["csv"]
            with input_path.open(newline="", encoding="utf-8-sig") as source:
                reader = csv.DictReader(source)
                fieldnames = reader.fieldnames
                rows = list(reader)
            assert fieldnames is not None and len(rows) == 1
            rows[0]["immunizations_given"] = "not a history"
            rows[0]["intended_reader"] = "invalid"
            with input_path.open("w", newline="", encoding="utf-8") as output:
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            receipt = run(
                "run",
                selected["input"]["csv"],
                "--config",
                "config",
                "--output",
                "no-pdf",
                *selectors[0][1],
                expected_success=False,
            )
            (failed_path,) = (project / "no-pdf").glob("*/run.json")
            failed_record = json.loads(failed_path.read_text())
            (failed_row,), failed_findings = selected_csvs(
                failed_path.parent, failed_record
            )
            assert (
                failed_row["severity"] == "error"
                and failed_row["route"] == "report_only"
            )
            assert (
                failed_row["protected_status"]
                == failed_row["bundle_status"]
                == "excluded"
            )
            assert not any(
                failed_row[key]
                for key in (
                    "original_path",
                    "protected_path",
                    "bundle_path",
                    "bundle_start_page",
                    "bundle_end_page",
                )
            )
            assert any(
                row["code"] == "source.history_unusable" for row in failed_findings
            )
            assert "error: 1 (100.0%)" in receipt
            shutil.copytree(failed_path.parent, evidence / "no-pdf")
            comparison["protectedAndNoPdf"] = True

        if selected["example"] == "missing-mmr":
            assert record["status"] == "completed_with_warnings"
            assert entry["routing"] == "deliverable"
            original_record = entry["original"].copy()
            original_checks = [
                check for check in entry["checks"] if check.get("stage") != "delivery"
            ]
            preserved = {
                path: sha256(path.read_bytes()).hexdigest()
                for path in run_dir.rglob("*")
                if path.is_file() and (path.suffix == ".csv" or "bundles-" in str(path))
            }
            assert any(
                row["code"] == "content.multiple_links"
                and row["observed_status"] == row["effective_status"] == "warn"
                and row["row_key"] == entry["row_key"]
                for row in csv_findings
            )
            issue = next(
                issue
                for row in csv_findings
                if row["code"] == "content.multiple_links"
                for issue in json.loads(row["issue_ids"])
            )
            # Saved originals suffice after removing authored inputs. A hold excludes
            # a notice; releasing the hold leaves its warnings and policy in force.
            for directory in ("templates", "config", "examples"):
                shutil.rmtree(project / directory)
            for revoke in (False, True):
                flags = ["--revoke"] if revoke else []
                run(
                    "acknowledge",
                    str(run_dir),
                    issue,
                    *flags,
                    "--reason",
                    "Fictional downloaded-project review",
                )
                reviewed = json.loads(record_path.read_text())
                _, reviewed_findings = selected_csvs(run_dir, reviewed)
                acknowledged = {
                    value
                    for row in reviewed_findings
                    for value in json.loads(row["acknowledged_issue_ids"])
                }
                assert (issue in acknowledged) != revoke
                before_refresh = reviewed.copy()
                run("warnings", str(run_dir), "--refresh")
                assert json.loads(record_path.read_text()) == before_refresh
                assert reviewed["entries"] == record["entries"]
            attempts = len(record["delivery_attempts"])
            for decision in ("withhold", "release"):
                arguments = [
                    binary,
                    "rebundle",
                    str(run_dir),
                    f"--{decision}",
                    entry["row_key"],
                ]
                if decision == "withhold":
                    arguments += ["--reason", "Fictional saved-run review"]
                result = subprocess.run(
                    arguments,
                    cwd=project,
                    env=env,
                    capture_output=True,
                    text=True,
                    check=True,
                )
                with (evidence / "native-commands.log").open("a") as log:
                    log.write(f"{arguments!r}\n{result.stdout}\n{result.stderr}\n")
                rebundled = json.loads(record_path.read_text())
                (after,) = rebundled["entries"]
                assert after["original"] == original_record
                assert [
                    check
                    for check in after["checks"]
                    if check.get("stage") != "delivery"
                ] == original_checks
                (after_csv,), _ = selected_csvs(run_dir, rebundled)
                assert after_csv["route"] == (
                    "withheld" if decision == "withhold" else "ready"
                )
                assert after_csv["bundle_status"] == (
                    "excluded" if decision == "withhold" else "completed"
                )
                if decision == "withhold":
                    assert not any(
                        after_csv[key]
                        for key in (
                            "bundle_path",
                            "bundle_start_page",
                            "bundle_end_page",
                        )
                    )
                assert all(
                    sha256(path.read_bytes()).hexdigest() == digest
                    for path, digest in preserved.items()
                )
                preserved.update(
                    {
                        path: sha256(path.read_bytes()).hexdigest()
                        for path in run_dir.rglob("*.csv")
                    }
                )
                assert after["routing"] == (
                    "withheld" if decision == "withhold" else "deliverable"
                )
                if decision == "withhold":
                    assert after["bundle"] is None
                attempts += 1
                assert len(rebundled["delivery_attempts"]) == attempts
            assert rebundled["status"] == "completed_with_warnings"
            assert inspect_pdf(run_dir / after["original"]["path"]) == native
            delivery = inspect_pdf(run_dir / after["bundle"]["path"])
            assert delivery["text"] == native["text"]
            assert delivery["qrUrls"] == native["qrUrls"]
            shutil.copytree(run_dir, evidence / "rebundled")
            comparison["rebundled"] = True
        (evidence / "comparison.json").write_text(json.dumps(comparison, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
