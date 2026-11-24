"""Install a downloaded project and compare its native output with the preview."""

from __future__ import annotations

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
from pathlib import Path
from zipfile import ZipFile

import pymupdf
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
        assert (project / "immuknow-revision.txt").read_text().strip() == (
            Path(__file__).resolve().parents[1] / "immuknow-revision.txt"
        ).read_text().strip()

        binary = shutil.which(env.get("IMMUKNOW_BIN", "immuknow"))
        assert binary, "Install the reviewed standalone ImmuKnow executable"
        # The test harness uses Python to inspect PDFs, but the extracted project
        # must run with no Python, uv, shell or other tools on its command path.
        env["PATH"] = ""

        def run(*arguments: str) -> None:
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
            assert result.returncode == 0, (
                result.stdout + result.stderr + json.dumps(failures, indent=2)
            )

        assert not (project / ".venv").exists()
        assert not (project / "pyproject.toml").exists()
        assert not (project / "uv.lock").exists()
        assert not (project / "scripts").exists()
        run("project", "sync")
        run("project", "check")
        selected = json.loads((evidence / "selected-example.json").read_text())
        if selected["example"] == "missing-meningococcal":
            run("project", "check", "--sample")

        browser = inspect_pdf(evidence / "browser.pdf")
        preview = inspect_preview(evidence, browser)
        run("run", "--sample", "--output", "native")
        (record_path,) = (project / "native").glob("*/run.json")
        run_dir = record_path.parent
        # Preserve the native artifacts even if a comparison fails.
        shutil.copytree(run_dir, evidence / "native")
        assert not run_dir.name.endswith(".incomplete")
        record = json.loads(record_path.read_text())
        (entry,) = record["entries"]
        original = run_dir / entry["original"]["path"]
        native = inspect_pdf(original)
        assert native["pageSizes"] == browser["pageSizes"], (
            "Native and browser page count or size differs"
        )
        assert native["qrUrls"] == browser["qrUrls"], (
            "Native and browser QR destinations differ"
        )
        assert native["language"] == browser["language"]
        native_text, browser_text = " ".join(native["text"]), " ".join(browser["text"])
        coverage = [
            text_coverage(native_text, browser_text),
            text_coverage(browser_text, native_text),
        ]
        assert min(coverage) >= 0.95, f"Native and browser text coverage: {coverage}"
        native_raster = []
        with pymupdf.open(original) as rendered:
            for index, page in enumerate(rendered, start=1):
                output = page.get_pixmap(dpi=144).pil_image().convert("RGB")
                output.save(evidence / f"native-page-{index}.png")
                with Image.open(evidence / f"preview-page-{index}.png") as raw:
                    native_raster.append(raster_difference(raw.convert("RGB"), output))
        preview["nativeRasterDifference"] = native_raster
        comparison = {
            **selected,
            "browser": browser,
            "preview": preview,
            "native": native,
            "textCoverage": coverage,
            "findings": sorted(
                {
                    f"{check['code']}:{check['status']}"
                    for check in entry["checks"]
                    if check["status"] in {"warn", "fail"}
                }
            ),
        }
        (evidence / "comparison.json").write_text(json.dumps(comparison, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
