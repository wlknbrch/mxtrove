import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildExportArchive, tableToCsv, type ExportPayload } from "./archive.js";

const payload: ExportPayload = {
  generated_at: "2026-07-23T00:00:00.000Z",
  format_version: 2,
  note: "References only.",
  tables: {
    profile: [{ id: "profile-1", display_name: "Kai, \"Orbit\"" }],
  },
};

describe("data export archive", () => {
  it("escapes CSV values safely", () => {
    expect(tableToCsv(payload.tables.profile)).toContain('"Kai, ""Orbit"""');
  });

  it("builds JSON and ZIP artifacts with the expected contents", () => {
    const json = buildExportArchive(payload, "json");
    expect(json.filename).toBe("mxtrove-export.json");
    expect(JSON.parse(json.bytes.toString("utf8"))).toMatchObject({ format_version: 2 });

    const zip = buildExportArchive(payload, "json_csv");
    const files = unzipSync(zip.bytes);
    expect(files["mxtrove-export.json"]).toBeDefined();
    expect(files["csv/profile.csv"]).toBeDefined();
  });
});
