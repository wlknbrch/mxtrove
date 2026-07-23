import { createHmac, timingSafeEqual } from "node:crypto";

import { config } from "../config.js";

function signaturePayload(assetId: string, expiresAt: number) {
  return `${assetId}.${expiresAt}`;
}

export function signProtectedAsset(assetId: string, expiresAt: number) {
  return createHmac("sha256", config.protectedMediaSigningSecret)
    .update(signaturePayload(assetId, expiresAt))
    .digest("base64url");
}

export function verifyProtectedAssetSignature(
  assetId: string,
  expiresAt: number,
  suppliedSignature: string,
) {
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = Buffer.from(signProtectedAsset(assetId, expiresAt));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
