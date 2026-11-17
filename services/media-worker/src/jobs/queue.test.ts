import { describe, expect, it, vi } from "vitest";
import { MediaJobQueue } from "./queue.js";

describe("media batch queue", () => {
  it("finishes the remaining tracks when the eighth of twelve jobs rejects before starting", async () => {
    const process = vi.fn(async (id: string) => { if (id === "8") throw new Error("temporary database failure"); });
    const failed = vi.fn(async () => undefined);
    const queue = new MediaJobQueue(1, process, failed);
    for (let i = 1; i <= 12; i++) queue.add(String(i));
    await vi.waitFor(() => expect(process).toHaveBeenCalledTimes(12));
    expect(process.mock.calls.map(([id]) => id)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(failed).toHaveBeenCalledWith("8", expect.any(Error));
    await vi.waitFor(() => expect(queue.has("12")).toBe(false));
  });
  it("deduplicates queued and actively processed IDs", async () => {
    let finish!: () => void;
    const process = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const queue = new MediaJobQueue(1, process, async () => undefined);
    queue.add("same-job"); queue.add("same-job");
    expect(process).toHaveBeenCalledTimes(1);
    finish();
    await vi.waitFor(() => expect(queue.has("same-job")).toBe(false));
  });
});
