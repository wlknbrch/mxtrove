import Fastify from "fastify";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getJob: vi.fn(), write: vi.fn(), uploading: vi.fn(), queued: vi.fn(), failed: vi.fn(), enqueue: vi.fn(), events: [] as string[] }));
vi.mock("../auth/verify-jwt.js", () => ({ verifySupabaseBearerToken: async () => ({ id: "owner" }) }));
vi.mock("../config.js", () => ({ config: { maxUploadBytes: 1000 } }));
vi.mock("../media/paths.js", () => ({ ensureJobDir: async () => ({ inputPath: "/tmp/synthetic-input" }) }));
vi.mock("../media/io.js", () => ({ writeReadableStreamToFile: mocks.write }));
vi.mock("./media-jobs.js", () => ({ getJobForOwner: mocks.getJob, setJobUploading: mocks.uploading,
  setJobQueued: mocks.queued, failMediaJobInput: mocks.failed, enqueueMediaJob: mocks.enqueue, touchMediaJob: vi.fn(async () => undefined) }));
import { registerMediaJobInputRoute } from "./input-route.js";
async function app() {
  const server = Fastify();
  server.addContentTypeParser("*", (_request, payload, done) => done(null, payload));
  await registerMediaJobInputRoute(server);
  return server;
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.events.length = 0;
  mocks.getJob.mockResolvedValue({ id: "job", status: "created", input_bytes: 4 });
  mocks.uploading.mockImplementation(async () => { mocks.events.push("uploading"); });
  mocks.write.mockImplementation(async () => { mocks.events.push("received"); return 4; });
  mocks.queued.mockImplementation(async () => { mocks.events.push("persisted"); });
  mocks.enqueue.mockImplementation(() => { mocks.events.push("dispatched"); });
  mocks.failed.mockResolvedValue(undefined);
});
describe("accepting preview input", () => {
  it("persists a complete queued upload before dispatching it", async () => {
    const server = await app();
    const response = await server.inject({ method: "PUT", url: "/v1/media/jobs/job/input", headers: { "content-type": "audio/wav" }, payload: "data" });
    expect(response.statusCode).toBe(202);
    expect(mocks.events).toEqual(["uploading", "received", "persisted", "dispatched"]);
    expect(mocks.write).toHaveBeenCalledWith(expect.any(Readable), "/tmp/synthetic-input", 1000, 4);
    expect(mocks.getJob).toHaveBeenCalledWith("job", "owner");
    await server.close();
  });
  it("marks interrupted input failed immediately, enabling a fresh retry", async () => {
    const server = await app(); const error = new Error("Premature close"); mocks.write.mockRejectedValue(error);
    const response = await server.inject({ method: "PUT", url: "/v1/media/jobs/job/input", headers: { "content-type": "audio/wav" }, payload: "data" });
    expect(response.statusCode).toBe(422);
    expect(mocks.failed).toHaveBeenCalledWith("job", error);
    expect(mocks.enqueue).not.toHaveBeenCalled();
    await server.close();
  });
  it("never overwrites an already queued or completed file", async () => {
    const server = await app(); mocks.getJob.mockResolvedValue({ id: "job", status: "queued" });
    const response = await server.inject({ method: "PUT", url: "/v1/media/jobs/job/input", headers: { "content-type": "audio/wav" }, payload: "data" });
    expect(response.statusCode).toBe(409); expect(mocks.write).not.toHaveBeenCalled();
    await server.close();
  });
  it("reports temporary storage exhaustion distinctly", async () => {
    const server = await app(); mocks.write.mockRejectedValue(new Error("Not enough temporary disk space is available for media processing."));
    const response = await server.inject({ method: "PUT", url: "/v1/media/jobs/job/input", headers: { "content-type": "audio/wav" }, payload: "data" });
    expect(response.statusCode).toBe(507); expect(response.json().error).toMatch(/storage|disk space/);
    await server.close();
  });
});
