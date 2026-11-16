const DEFAULT_STALL_TIMEOUT_MS = 90_000;
const STALL_CHECK_INTERVAL_MS = 5_000;

/**
 * Watches an in-flight XHR and rejects when no progress has been reported for a
 * while. Without this, a connection that stalls mid-transfer (proxy restarts,
 * rate-limit drops) can hang a whole upload lane indefinitely.
 */
export function watchXhrForStalls(params: {
  request: XMLHttpRequest;
  reject: (error: Error) => void;
  stallMessage: string;
  timeoutMs?: number;
}) {
  let lastActivityAt = Date.now();
  const touch = () => {
    lastActivityAt = Date.now();
  };

  const timer = window.setInterval(() => {
    if (Date.now() - lastActivityAt >= (params.timeoutMs ?? DEFAULT_STALL_TIMEOUT_MS)) {
      window.clearInterval(timer);
      params.request.abort();
      params.reject(new Error(params.stallMessage));
    }
  }, STALL_CHECK_INTERVAL_MS);

  return {
    touch,
    dispose: () => window.clearInterval(timer),
  };
}
