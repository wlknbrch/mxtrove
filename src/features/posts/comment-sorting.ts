import type { ResolvedComment } from "@/features/posts/types";

export type CommentSortMode = "relevant" | "chronological";

export interface CommentThread {
  comment: ResolvedComment;
  replies: ResolvedComment[];
}

export function getCommentRelevanceScore(thread: CommentThread) {
  const replyHearts = thread.replies
    .filter((reply) => !reply.deleted_at)
    .reduce((total, reply) => total + reply.heartCount, 0);
  return thread.comment.heartCount * 2 + thread.comment.replyCount * 3 + replyHearts * 0.5;
}

export function sortCommentThreads(threads: CommentThread[], mode: CommentSortMode) {
  return threads
    .map((thread) => ({
      ...thread,
      replies: [...thread.replies].sort(
        (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      ),
    }))
    .sort((left, right) => {
      if (mode === "chronological") {
        return new Date(right.comment.created_at).getTime() - new Date(left.comment.created_at).getTime();
      }

      const scoreDifference = getCommentRelevanceScore(right) - getCommentRelevanceScore(left);
      if (scoreDifference !== 0) return scoreDifference;
      return new Date(right.comment.created_at).getTime() - new Date(left.comment.created_at).getTime();
    });
}
