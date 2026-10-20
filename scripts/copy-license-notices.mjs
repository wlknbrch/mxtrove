import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist/licenses", { recursive: true });
for (const filename of ["LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md"]) {
  copyFileSync(filename, `dist/licenses/${filename}`);
}
