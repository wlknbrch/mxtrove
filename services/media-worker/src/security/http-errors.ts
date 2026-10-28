import { RATE_LIMIT_MESSAGE } from "./http-rate-limit.js";

export function workerErrorResponse(error: unknown, production: boolean) {
  if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 429) {
    return { statusCode: 429, body: { error: RATE_LIMIT_MESSAGE } };
  }
  const message = error instanceof Error ? error.message : "Worker request failed.";
  const statusCode = message.includes("bearer token") || message.includes("JWT")
    ? 401
    : message.includes("quota") || message.includes("size limit") ? 413 : 500;
  return {
    statusCode,
    body: { error: statusCode === 500 && production ? "The media worker could not complete this request." : message },
  };
}
