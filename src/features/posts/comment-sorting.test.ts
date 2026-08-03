import { describe, expect, it } from "vitest";

import { sortCommentThreads, type CommentThread } from "@/features/posts/comment-sorting";
import type { ResolvedComment } from "@/features/posts/types";

function comment(input: Partial<ResolvedComment> & Pick<ResolvedComment, "id" | "created_at">): ResolvedComment {
  return {
    id: input.id,
    post_id: "post-1",
    author_id: "author-1",
    body: input.id,
    parent_comment_id: null,
    created_at: input.created_at,
    updated_at: input.created_at,
    deleted_at: null,
    author: null,
    heartCount: input.heartCount ?? 0,
    replyCount: input.replyCount ?? 0,
    viewerHasHearted: input.viewerHasHearted ?? false,
  };
}

describe("sortCommentThreads", () => {
  const newer = comment({ id: "newer", created_at: "2026-08-03T12:00:00.000Z" });
  const popular = comment({
    id: "popular",
    created_at: "2026-08-01T12:00:00.000Z",
    heartCount: 5,
    replyCount: 1,
  });
  const reply = comment({ id: "reply", created_at: "2026-08-02T12:00:00.000Z", heartCount: 2 });
  const threads: CommentThread[] = [
    { comment: newer, replies: [] },
    { comment: popular, replies: [reply] },
  ];

  it("ranks engagement above pure recency in relevance mode", () => {
    expect(sortCommentThreads(threads, "relevant").map((entry) => entry.comment.id)).toEqual([
      "popular",
      "newer",
    ]);
  });

  it("sorts newest top-level comments first in chronological mode", () => {
    expect(sortCommentThreads(threads, "chronological").map((entry) => entry.comment.id)).toEqual([
      "newer",
      "popular",
    ]);
  });
});
