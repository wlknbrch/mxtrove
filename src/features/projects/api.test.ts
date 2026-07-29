import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProfilesByIds } from "@/features/profile/api";
import { searchProjectInviteCandidates, toggleFeedbackReaction } from "@/features/projects/api";
import { searchV2 } from "@/features/search/api";
import { requireSupabase } from "@/lib/service-utils";
import type { Profile } from "@/types/domain";

vi.mock("@/features/profile/api", () => ({
  getProfilesByIds: vi.fn(),
}));

vi.mock("@/features/search/api", () => ({
  searchV2: vi.fn(),
}));

vi.mock("@/lib/service-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/service-utils")>("@/lib/service-utils");
  return {
    ...actual,
    requireSupabase: vi.fn(),
  };
});

const profiles: Profile[] = [
  {
    id: "profile-1",
    username: "lars_christmas",
    display_name: "LarS KlingTanZ",
    bio: null,
    location: null,
    website_url: null,
    instagram_url: null,
    spotify_url: null,
    youtube_url: null,
    support_url: null,
    avatar_asset_id: "avatar-1",
    pinned_post_id: null,
    onboarding_completed: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "profile-2",
    username: "luna_park",
    display_name: "Luna Park",
    bio: null,
    location: null,
    website_url: null,
    instagram_url: null,
    spotify_url: null,
    youtube_url: null,
    support_url: null,
    avatar_asset_id: null,
    pinned_post_id: null,
    onboarding_completed: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("searchProjectInviteCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps fuzzy creator relevance order while excluding members and non-creators", async () => {
    vi.mocked(searchV2).mockResolvedValue([
      {
        result_kind: "release",
        result_id: "release-1",
        context_id: "release-1",
        title: "Lars",
        subtitle: null,
        rank: 10,
      },
      {
        result_kind: "creator",
        result_id: "profile-1",
        context_id: null,
        title: "LarS KlingTanZ",
        subtitle: "@lars_christmas",
        rank: 9,
      },
      {
        result_kind: "creator",
        result_id: "profile-2",
        context_id: null,
        title: "Luna Park",
        subtitle: "@luna_park",
        rank: 8,
      },
    ]);
    vi.mocked(getProfilesByIds).mockResolvedValue([profiles[1], profiles[0]]);

    await expect(searchProjectInviteCandidates("lrs", ["profile-2"])).resolves.toEqual([profiles[0]]);
    expect(getProfilesByIds).toHaveBeenCalledWith(["profile-1"]);
  });

  it("does not query before two characters are entered", async () => {
    await expect(searchProjectInviteCandidates("l")).resolves.toEqual([]);
    expect(searchV2).not.toHaveBeenCalled();
    expect(getProfilesByIds).not.toHaveBeenCalled();
  });
});

describe("toggleFeedbackReaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the atomic reaction RPC instead of writing independent reaction rows", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(requireSupabase).mockReturnValue({ rpc } as never);

    await toggleFeedbackReaction({
      threadId: "thread-1",
      reaction: "agree",
      active: true,
    });

    expect(rpc).toHaveBeenCalledWith("set_feedback_reaction", {
      target_thread_id: "thread-1",
      target_reaction: "agree",
      target_active: true,
    });
  });
});
