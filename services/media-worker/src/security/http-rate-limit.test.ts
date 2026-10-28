import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { describe, expect, it } from "vitest";
import { workerRateLimitOptions } from "./http-rate-limit.js";
import { workerErrorResponse } from "./http-errors.js";

describe("actual Fastify rate limiting", () => {
  it("shares upload budgets across routes and rejects before expensive handlers", async () => {
    const app = Fastify();
    await app.register(rateLimit, workerRateLimitOptions(true));
    app.setErrorHandler((error, _request, reply) => {
      const result = workerErrorResponse(error, true);
      return reply.code(result.statusCode).send(result.body);
    });
    let calls = 0;
    app.post("/v1/media/jobs", async () => { calls++; return { ok: true }; });
    app.post("/v1/media/analyze-song", async () => { calls++; return { ok: true }; });
    app.get("/v1/media/jobs/example", async () => ({ ok: true }));
    try {
      for (let n = 0; n < 30; n++) expect((await app.inject({ method: "POST", url: "/v1/media/jobs" })).statusCode).toBe(200);
      const denied = await app.inject({ method: "POST", url: "/v1/media/analyze-song" });
      expect(denied.statusCode).toBe(429);
      expect(denied.json().error).toContain("Too many requests");
      expect(Number(denied.headers["retry-after"])).toBeGreaterThan(0);
      expect(calls).toBe(30);
      expect((await app.inject({ method: "GET", url: "/v1/media/jobs/example" })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: "/v1/media/jobs", remoteAddress: "192.0.2.2" })).statusCode).toBe(200);
    } finally { await app.close(); }
  });

  it("protects filesystem readiness checks while leaving the cheap liveness probe exempt", async () => {
    const app = Fastify();
    await app.register(rateLimit, { ...workerRateLimitOptions(true), max: 2 });
    app.get("/healthz", async () => ({ ok: true }));
    app.get("/readyz", async () => ({ ok: true }));
    try {
      for (let n = 0; n < 3; n++) expect((await app.inject("/healthz")).statusCode).toBe(200);
      expect((await app.inject("/readyz")).statusCode).toBe(200);
      expect((await app.inject({ method: "HEAD", url: "/readyz" })).statusCode).toBe(200);
      expect((await app.inject("/readyz")).statusCode).toBe(429);
    } finally { await app.close(); }
  });

  it("retains explicit development disabling and production error redaction", async () => {
    const app = Fastify();
    await app.register(rateLimit, { ...workerRateLimitOptions(false), max: 1 });
    app.post("/v1/media/jobs", async () => ({ ok: true }));
    try {
      expect((await app.inject({ method: "POST", url: "/v1/media/jobs" })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: "/v1/media/jobs" })).statusCode).toBe(200);
      expect(workerErrorResponse(new Error("private server path"), true)).toEqual({ statusCode: 500, body: { error: "The media worker could not complete this request." } });
    } finally { await app.close(); }
  });
});
