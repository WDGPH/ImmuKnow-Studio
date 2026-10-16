import { execFileSync } from "node:child_process";

export function studioBuild(root: string, environment: NodeJS.ProcessEnv = process.env) {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const revision = environment.IMMUKNOW_STUDIO_BUILD_SHA ?? git("rev-parse", "HEAD");
  let tag = environment.IMMUKNOW_STUDIO_BUILD_TAG;
  if (tag === undefined) {
    tag = git("tag", "--merged", "HEAD", "--sort=-version:refname")
      .split("\n")
      .find((name) => /^v?\d+\.\d+\.\d+$/.test(name));
    if (tag && git("rev-parse", `${tag}^{commit}`) !== revision) tag += "+";
  }
  return { revision, tag: tag || null };
}
