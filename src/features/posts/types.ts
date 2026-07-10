import type {
  Asset,
  Comment,
  FeedEvent,
  Post,
  Profile,
  ReleaseTrack,
  Song,
  SongVersion,
} from "@/types/domain";

export interface ResolvedComment extends Comment {
  author: Profile | null;
}

export interface ResolvedReleaseTrack {
  track: ReleaseTrack;
  song: Song | null;
  version: SongVersion | null;
  previewAsset: Asset | null;
}

export interface ResolvedSingleInfo {
  song: Song | null;
  featuredVersion: SongVersion | null;
  previewAsset: Asset | null;
  previousVersion: SongVersion | null;
}

export interface ResolvedPostCard {
  post: Post;
  owner: Profile | null;
  artwork: Asset | null;
  single: ResolvedSingleInfo | null;
  releaseTracks: ResolvedReleaseTrack[];
  comments: ResolvedComment[];
  heartCount: number;
  viewerHasHearted: boolean;
  versionHeartCount: number;
  commentCount: number;
  feedEvent?: FeedEvent | null;
}
