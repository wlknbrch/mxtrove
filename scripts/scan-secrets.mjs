import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Only publication files enter the working-tree scan, never ignored local secrets.
const history = process.argv.includes("--history");
const scanner = process.env.GITLEAKS_BIN || "gitleaks";
const version = spawnSync(scanner, ["version"], { encoding: "utf8" });
if (version.error || version.status !== 0) {
  console.error("Install Gitleaks 8.30.1+ (macOS: brew install gitleaks), or set GITLEAKS_BIN. No scan was performed.");
  process.exit(2);
}

const common = ["--redact=100", "--no-banner", "--config=.gitleaks.toml", "--exit-code=1"];
let temporaryDirectory;
try {
  let args;
  if (history) {
    args = ["git", ...common, "--log-opts=--all --full-history", "."];
  } else {
    temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "mxtrove-publication-scan-"));
    const git = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
    if (git.status !== 0) throw new Error("Could not enumerate publication files.");
    for (const name of git.stdout.split("\0").filter(Boolean)) {
      const destination = path.resolve(temporaryDirectory, name);
      if (!destination.startsWith(`${temporaryDirectory}${path.sep}`)) throw new Error("Invalid repository path.");
      try {
        const contents = readFileSync(name);
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, contents);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    args = ["dir", ...common, temporaryDirectory];
  }
  const result = spawnSync(scanner, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 2;
} finally {
  if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
}
