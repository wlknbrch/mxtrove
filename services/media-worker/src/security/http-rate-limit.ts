import type { FastifyRequest } from "fastify";
import type { RateLimitPluginOptions } from "@fastify/rate-limit";

import { selectRateLimitPolicy } from "./rate-limit.js";

export const RATE_LIMIT_MESSAGE = "Too many requests. Please wait briefly and try again.";

function requestPolicy(request: FastifyRequest) {
  return selectRateLimitPolicy(request.method, request.url.split("?", 1)[0]);
}

export function workerRateLimitOptions(enabled: boolean): RateLimitPluginOptions {
  return {
    global: true,
    hook: "onRequest",
    cache: 10_000,
    timeWindow: 60_000,
    max: (request) => requestPolicy(request)?.limit ?? 240,
    keyGenerator: (request) => `${requestPolicy(request)?.bucket ?? "health"}:${request.ip}`,
    allowList: (request) => !enabled || request.method === "OPTIONS" || !requestPolicy(request),
    skipOnError: false,
    errorResponseBuilder: () => ({ statusCode: 429, error: RATE_LIMIT_MESSAGE, message: RATE_LIMIT_MESSAGE }),
  };
}
