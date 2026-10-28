/** Escape a literal inside Google Drive's single-quoted query language. */
export function escapeDriveQueryLiteral(value: string) {
  return value.replace(/[\\']/g, "\\$&");
}
