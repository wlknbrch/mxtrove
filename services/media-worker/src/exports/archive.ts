import { strToU8, zipSync } from "fflate";

export type ExportTable = Array<Record<string, unknown>>;

export interface ExportPayload {
  generated_at: string;
  format_version: number;
  note: string;
  tables: Record<string, ExportTable>;
}

function csvValue(value: unknown) {
  const normalized =
    value === null || typeof value === "undefined"
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function tableToCsv(rows: ExportTable) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  if (!keys.length) return "";
  return [
    keys.map(csvValue).join(","),
    ...rows.map((row) => keys.map((key) => csvValue(row[key])).join(",")),
  ].join("\n");
}

export function buildExportArchive(
  payload: ExportPayload,
  format: "json" | "json_csv",
) {
  const json = JSON.stringify(payload, null, 2);
  if (format === "json") {
    return {
      bytes: Buffer.from(json),
      filename: "mxtrove-export.json",
      mimeType: "application/json",
    };
  }

  const files: Record<string, Uint8Array> = {
    "mxtrove-export.json": strToU8(json),
  };
  for (const [table, rows] of Object.entries(payload.tables)) {
    files[`csv/${table}.csv`] = strToU8(tableToCsv(rows));
  }
  return {
    bytes: Buffer.from(zipSync(files, { level: 6 })),
    filename: "mxtrove-export.zip",
    mimeType: "application/zip",
  };
}
