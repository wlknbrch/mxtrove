const DROPBOX_ORIGINS = new Map([
  ["dropbox.com", "https://dropbox.com"],
  ["www.dropbox.com", "https://www.dropbox.com"],
  ["dl.dropboxusercontent.com", "https://dl.dropboxusercontent.com"],
]);
const MAX_REDIRECTS = 5;

export function getDropboxPublicMediaUrl(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const origin = DROPBOX_ORIGINS.get(parsed.hostname);
    if (!origin || parsed.protocol !== "https:" || parsed.port || parsed.username || parsed.password) return null;
    // The origin comes from a fixed map, never from the request's URL string.
    return `${origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/** Fetch only trusted public provider hosts, validating every redirect before I/O. */
export async function fetchPublicProviderMedia(
  source: string,
  init: { method?: string; headers?: Headers; signal?: AbortSignal } = {},
  fetchImpl: typeof fetch = fetch,
) {
  let target = new URL(source);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    if (
      target.protocol !== "https:" || target.port || target.username || target.password
      || !(
        target.hostname === "drive.google.com"
        || target.hostname === "drive.usercontent.google.com"
        || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.googleusercontent\.com$/.test(target.hostname)
        || target.hostname === "dropbox.com"
        || target.hostname === "www.dropbox.com"
        || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dropboxusercontent\.com$/.test(target.hostname)
        || target.hostname === "1drv.ms"
        || target.hostname === "onedrive.live.com"
        || target.hostname === "api.onedrive.com"
        || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.files\.1drv\.com$/.test(target.hostname)
        || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.sharepoint\.com$/.test(target.hostname)
      )
    ) throw new Error("Unsupported public media destination.");

    const response = await fetchImpl(target, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || redirect === MAX_REDIRECTS) throw new Error("Invalid or excessive public media redirects.");
    target = new URL(location, target);
  }
  throw new Error("Invalid public media redirect chain.");
}
