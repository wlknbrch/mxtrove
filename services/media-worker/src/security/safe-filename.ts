export function sanitizeIncomingFilename(rawValue: string | undefined) {
  if (!rawValue) {
    return "attachment";
  }

  let decoded = rawValue;
  try {
    decoded = decodeURIComponent(rawValue);
  } catch {
    // Keep the undecoded value and sanitize it below.
  }

  const sanitized = decoded
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f"'/\\]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return sanitized || "attachment";
}

export function safeContentDispositionFilename(filename: string) {
  return sanitizeIncomingFilename(filename);
}
