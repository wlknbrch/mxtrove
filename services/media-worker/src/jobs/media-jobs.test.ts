import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type MediaJobsModule = typeof import("./media-jobs.js");

interface FakeQueryResult {
  data: unknown;
  error: unknown;
}

const { queryBuilders, queryResults } = vi.hoisted(() => ({
  queryBuilders: [] as Array<{ calls: string[]; builder: Record<string, unknown> }>,
  queryResults: [] as FakeQueryResult[],
}));

function createFakeQuery(result: FakeQueryResult) {
  const calls: string[] = [];
  const builder: Record<string, unknown> = {
    select: (columns: string) => {
      calls.push(`select:${columns}`);
      return builder;
    },
    update: (payload: Record<string, unknown>) => {
      calls.push(`update:${JSON.stringify(payload)}`);
      return builder;
    },
    eq: (column: string, value: unknown) => {
      calls.push(`eq:${column}=${String(value)}`);
      return builder;
    },
    in: (column: string, values: string[]) => {
      calls.push(`in:${column}=${values.join(",")}`);
      return builder;
    },
    lt: (column: string, value: string) => {
      calls.push(`lt:${column}=${value}`);
      return builder;
    },
    then: (onFulfilled?: (value: FakeQueryResult) => unknown, onRejected?: (error: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected?: (error: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
    finally: (onFinally?: () => void) => Promise.resolve(result).finally(onFinally),
  };
  return { calls, builder };
}

vi.mock("../supabase/service.js", () => ({
  supabaseAdmin: {
    from: () => {
      const fake = createFakeQuery(queryResults.shift() ?? { data: [], error: null });
      queryBuilders.push(fake);
      return fake.builder;
    },
  },
}));

let mediaJobs: MediaJobsModule;

beforeAll(async () => {
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ||= "test-service-role-key";
  process.env.PROTECTED_MEDIA_SIGNING_SECRET ||= "test-signing-secret-with-enough-entropy";
  mediaJobs = await import("./media-jobs.js");
});

beforeEach(() => {
  queryBuilders.length = 0;
  queryResults.length = 0;
});

describe("stale media job recovery", () => {
  it("marks jobs that stopped reporting progress as failed with an actionable message", async () => {
    queryResults.push({ data: [{ id: "stale-job" }], error: null }, { data: null, error: null });

    await mediaJobs.recoverStaleMediaJobs();

    expect(queryBuilders).toHaveLength(2);
    const [lookup, update] = queryBuilders;
    expect(lookup.calls.some((call) => call.startsWith("select:id"))).toBe(true);
    expect(
      lookup.calls.some((call) =>
        call.startsWith("in:status=uploading,queued,probing,transcoding,generating_waveform,uploading_to_drive"),
      ),
    ).toBe(true);
    expect(lookup.calls.some((call) => call.startsWith("lt:updated_at="))).toBe(true);

    const updateCall = update.calls.find((call) => call.startsWith("update:")) ?? "";
    expect(updateCall).toContain('"status":"failed"');
    expect(updateCall).toContain("Retry the conversion.");
    expect(update.calls.some((call) => call.startsWith("in:id=stale-job"))).toBe(true);
  });

  it("resolves successfully when no job is stale", async () => {
    await mediaJobs.recoverStaleMediaJobs();

    // Only the stale lookup runs; no bulk update is issued for an empty set.
    expect(queryBuilders).toHaveLength(1);
    const lookup = queryBuilders[0];
    expect(lookup.calls.some((call) => call.startsWith("select:id"))).toBe(true);
  });
});
