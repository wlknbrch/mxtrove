import type {
  Asset,
  Comment,
  FeedEvent,
  Post,
  PostCredit,
  PostExternalLink,
  Profile,
  ProtectedMediaAsset,
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
  protectedPreview: {
    asset: ProtectedMediaAsset;
    readUrl: string;
  } | null;
  versionHeartCount: number;
  viewerHasHeartedVersion: boolean;
}

export interface ResolvedSingleInfo {
  song: Song | null;
  featuredVersion: SongVersion | null;
  previewAsset: Asset | null;
  protectedPreview: {
    asset: ProtectedMediaAsset;
    readUrl: string;
  } | null;
  previousVersion: SongVersion | null;
  versionHeartCount: number;
  viewerHasHeartedVersion: boolean;
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
  viewerHasHeartedVersion: boolean;
  commentCount: number;
  credits: PostCredit[];
  externalLinks: PostExternalLink[];
  feedEvent?: FeedEvent | null;
}
