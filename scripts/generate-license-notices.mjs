import fs from "node:fs";
import path from "node:path";

const roots = [".", "services/media-worker"];
const inventory = new Map();
for (const root of roots) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
  for (const [location, entry] of Object.entries(lock.packages ?? {})) {
    if (!location) continue;
    const name = location.split("node_modules/").at(-1);
    const key = `${name}@${entry.version}`;
    const record = inventory.get(key) ?? { name, version: entry.version, license: entry.license ?? "UNDECLARED", texts: new Set() };
    const directory = path.join(root, location);
    if (fs.existsSync(directory)) {
      for (const file of fs.readdirSync(directory).sort()) {
        if (!/^(licen[sc]e|copying|notice)(\..*)?$/i.test(file)) continue;
        const filename = path.join(directory, file);
        if (!fs.statSync(filename).isFile()) continue;
        record.texts.add(fs.readFileSync(filename, "utf8").trim());
      }
    }
    inventory.set(key, record);
  }
}

const records = [...inventory.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`, "en"));
const lines = [
  "# Third-party notices", "",
  "Generated from both committed npm lockfiles and installed license/notice files.",
  "Regenerate after installing both dependency sets: `npm run licenses:generate`.",
  "Dependencies retain their own copyrights and licenses; MxTrove does not relicense them.", "",
  "This includes development tools and optional platform packages. A missing local text",
  "means that package was not installed on the generating platform; retain its original",
  "license files when distributing it. This inventory is not a completed binary audit.", "",
  "Fonts retain OFL-1.1 terms. Sharp/libvips contains LGPL components; web-push and",
  "Lightning CSS include MPL components. FFmpeg and OS/container packages are outside",
  "npm: see [distribution requirements](docs/licensing.md#binary-and-container-distributions).", "",
  "| Package | Version | Declared license |", "| --- | --- | --- |",
  ...records.map(r => `| ${r.name} | ${r.version} | ${r.license.replaceAll("|", "\\|")} |`), "",
];
const texts = new Map();
for (const record of records) {
  for (const value of record.texts) {
    const packages = texts.get(value) ?? [];
    packages.push(`${record.name}@${record.version}`);
    texts.set(value, packages);
  }
}
for (const [value, packages] of texts) {
  lines.push(`## ${packages.join(", ")}`, "", "```text", value.replaceAll("```", "'''"), "```", "");
}
fs.writeFileSync("THIRD_PARTY_NOTICES.md", `${lines.join("\n")}\n`);
console.log(`Wrote notices for ${records.length} dependency versions; ${texts.size} distinct installed license/notice texts.`);
