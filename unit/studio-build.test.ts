import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { studioBuild } from "../studio-build";

test("release tags identify exact releases and later development commits", () => {
  const root = mkdtempSync(join(tmpdir(), "studio-version-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    git("init", "--initial-branch=main");
    git("config", "user.name", "Studio test");
    git("config", "user.email", "studio@example.invalid");
    git("commit", "--allow-empty", "-m", "Before first release");
    expect(studioBuild(root, {}).tag).toBeNull();
    git("tag", "-a", "v1.0.0", "-m", "First release");
    expect(studioBuild(root, {})).toEqual({ revision: git("rev-parse", "HEAD"), tag: "v1.0.0" });
    git("commit", "--allow-empty", "-m", "Development after release");
    expect(studioBuild(root, {})).toEqual({ revision: git("rev-parse", "HEAD"), tag: "v1.0.0+" });
    git("tag", "v1.1.0");
    expect(studioBuild(root, {}).tag).toBe("v1.1.0");
    git("checkout", "-b", "future-release");
    git("commit", "--allow-empty", "-m", "Unmerged release");
    git("tag", "v2.0.0");
    git("checkout", "main");
    git("tag", "unrelated-tag");
    expect(studioBuild(root, {}).tag).toBe("v1.1.0");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("injected identity works without Git metadata, including an explicitly absent tag", () => {
  const environment = { IMMUKNOW_STUDIO_BUILD_SHA: "1234567890abcdef", IMMUKNOW_STUDIO_BUILD_TAG: "v1.0.0+" };
  expect(studioBuild("/no-checkout", environment)).toEqual({ revision: "1234567890abcdef", tag: "v1.0.0+" });
  expect(studioBuild("/no-checkout", { ...environment, IMMUKNOW_STUDIO_BUILD_TAG: "" }).tag).toBeNull();
});
