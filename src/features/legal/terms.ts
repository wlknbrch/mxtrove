export const CURRENT_TERMS_VERSION = "2026-08-05";
export const CURRENT_TERMS_LAST_UPDATED = "August 5, 2026";
export const PENDING_TERMS_ACCEPTANCE_KEY = "mxtrove:pending-terms-acceptance";
const PENDING_ACCEPTANCE_MAX_AGE_MS = 15 * 60 * 1_000;

export function rememberPendingTermsAcceptance() {
  window.sessionStorage.setItem(
    PENDING_TERMS_ACCEPTANCE_KEY,
    JSON.stringify({
      version: CURRENT_TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
    }),
  );
}

export function hasPendingTermsAcceptance() {
  try {
    const pending = JSON.parse(
      window.sessionStorage.getItem(PENDING_TERMS_ACCEPTANCE_KEY) ?? "null",
    ) as { version?: string; acceptedAt?: string } | null;
    const acceptedAt = pending?.acceptedAt ? Date.parse(pending.acceptedAt) : Number.NaN;
    return pending?.version === CURRENT_TERMS_VERSION
      && Number.isFinite(acceptedAt)
      && Date.now() - acceptedAt <= PENDING_ACCEPTANCE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function clearPendingTermsAcceptance() {
  window.sessionStorage.removeItem(PENDING_TERMS_ACCEPTANCE_KEY);
}
