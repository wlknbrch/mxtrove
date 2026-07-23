import {
  getArtworkAssetUrls,
  getPreviewPlaybackUrl,
  getPreviewPlaybackUrls,
} from "@/lib/asset-urls";
import { hasUsablePreviewAsset } from "@/lib/playback-health";
import { getAssetWaveform } from "@/lib/waveform";

import type { PlaybackTrack } from "@/components/audio/player-store";
import type { ResolvedPostCard } from "@/features/posts/types";

export function buildPostPlaybackTracks(item: ResolvedPostCard): PlaybackTrack[] {
  if (item.single?.previewAsset && hasUsablePreviewAsset(item.single.previewAsset)) {
    const previewUrl = getPreviewPlaybackUrl(item.single.previewAsset);
    if (previewUrl) {
      return [
        {
          id: item.single.featuredVersion?.id ?? item.post.id,
          postId: item.post.id,
          versionId: item.single.featuredVersion?.id ?? null,
          title: item.post.title,
          artistName: item.owner?.display_name ?? "Unknown artist",
          artworkUrl: getArtworkAssetUrls(item.artwork),
          src: previewUrl,
          srcCandidates: getPreviewPlaybackUrls(item.single.previewAsset),
          durationSeconds: item.single.previewAsset.duration_seconds ?? null,
          waveform: getAssetWaveform(item.single.previewAsset),
          versionLabel: item.single.featuredVersion?.version_label ?? null,
          queueGroupLabel: item.post.title,
        },
      ];
    }
  }

  return item.releaseTracks.reduce<PlaybackTrack[]>((tracks, track) => {
    if (!hasUsablePreviewAsset(track.previewAsset)) {
      return tracks;
    }

    const previewUrl = getPreviewPlaybackUrl(track.previewAsset);
    if (!previewUrl) {
      return tracks;
    }

    tracks.push({
      id: track.track.id,
      postId: item.post.id,
      versionId: track.version?.id ?? track.track.song_version_id,
      title: track.track.track_title,
      artistName: item.owner?.display_name ?? "Unknown artist",
      artworkUrl: getArtworkAssetUrls(item.artwork),
      src: previewUrl,
      srcCandidates: getPreviewPlaybackUrls(track.previewAsset),
      durationSeconds: track.previewAsset?.duration_seconds ?? null,
      waveform: getAssetWaveform(track.previewAsset),
      versionLabel: track.version?.version_label ?? track.track.production_stage,
      queueGroupLabel: item.post.title,
    });

    return tracks;
  }, []);
}

export function getPlaybackQueueDurationSeconds(tracks: Array<Pick<PlaybackTrack, "durationSeconds">>) {
  const knownDurations = tracks
    .map((track) => track.durationSeconds)
    .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration) && duration > 0);

  if (knownDurations.length === 0) {
    return null;
  }

  return knownDurations.reduce((sum, duration) => sum + duration, 0);
}
