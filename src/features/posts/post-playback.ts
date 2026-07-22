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
      title: track.track.track_title,
      artistName: item.owner?.display_name ?? "Unknown artist",
      artworkUrl: getArtworkAssetUrls(item.artwork),
      src: previewUrl,
      srcCandidates: getPreviewPlaybackUrls(track.previewAsset),
      durationSeconds: track.previewAsset?.duration_seconds ?? null,
      waveform: getAssetWaveform(track.previewAsset),
      versionLabel: track.track.production_stage,
      queueGroupLabel: item.post.title,
    });

    return tracks;
  }, []);
}
