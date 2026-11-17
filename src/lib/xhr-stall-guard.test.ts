import { afterEach, describe, expect, it, vi } from "vitest";
import { watchXhrForStalls } from "./xhr-stall-guard";

afterEach(() => vi.useRealTimers());
describe("upload stall watchdog", () => {
  it("reports a stalled transfer before abort callbacks can mislabel it as a user cancellation", async () => {
    vi.useFakeTimers();
    let fail!: (error: Error) => void;
    const transfer = new Promise<void>((_resolve, reject) => { fail = reject; });
    const request = { abort: () => fail(new DOMException("User aborted", "AbortError")) } as XMLHttpRequest;
    watchXhrForStalls({ request, reject: fail, timeoutMs: 5000, stallMessage: "Transfer stalled" });
    const assertion = expect(transfer).rejects.toThrow("Transfer stalled");
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });
  it("does not abort an upload that continues to report progress", () => {
    vi.useFakeTimers();
    const abort = vi.fn(); const reject = vi.fn();
    const guard = watchXhrForStalls({ request: { abort } as unknown as XMLHttpRequest, reject, timeoutMs: 10_000, stallMessage: "stalled" });
    vi.advanceTimersByTime(5000); guard.touch(); vi.advanceTimersByTime(5000);
    expect(abort).not.toHaveBeenCalled(); expect(reject).not.toHaveBeenCalled();
    guard.dispose(); vi.advanceTimersByTime(30_000); expect(abort).not.toHaveBeenCalled();
  });
});
