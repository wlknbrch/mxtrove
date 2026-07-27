import {
  getArtworkAssetUrls,
  getPreviewPlaybackUrl,
  getPreviewPlaybackUrls,
} from "@/lib/asset-urls";
import { hasUsablePreviewAsset } from "@/lib/playback-health";
import { getAssetWaveform } from "@/lib/waveform";
import { normalizeWaveformData } from "@/lib/waveform";

import type { PlaybackTrack } from "@/components/audio/player-store";
import type { ResolvedPostCard } from "@/features/posts/types";

export function buildPostPlaybackTracks(item: ResolvedPostCard): PlaybackTrack[] {
  const preferPublicPreview = item.post.visibility === "public";

  if (
    preferPublicPreview
    && item.single?.previewAsset
    && hasUsablePreviewAsset(item.single.previewAsset)
  ) {
    const publicCandidates = getPreviewPlaybackUrls(item.single.previewAsset);
    const previewUrl = publicCandidates[0] ?? null;
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
          srcCandidates: [
            ...publicCandidates,
            ...(item.single.protectedPreview ? [item.single.protectedPreview.readUrl] : []),
          ],
          durationSeconds:
            item.single.previewAsset.duration_seconds
            ?? item.single.protectedPreview?.asset.duration_seconds
            ?? null,
          waveform:
            getAssetWaveform(item.single.previewAsset)
            ?? normalizeWaveformData(item.single.protectedPreview?.asset.waveform_data),
          versionLabel: item.single.featuredVersion?.version_label ?? null,
          queueGroupLabel: item.post.title,
        },
      ];
    }
  }

  if (item.single?.protectedPreview) {
    const { asset, readUrl } = item.single.protectedPreview;
    return [
      {
        id: item.single.featuredVersion?.id ?? item.post.id,
        postId: item.post.id,
        versionId: item.single.featuredVersion?.id ?? null,
        title: item.post.title,
        artistName: item.owner?.display_name ?? "Unknown artist",
        artworkUrl: getArtworkAssetUrls(item.artwork),
        src: readUrl,
        srcCandidates: [readUrl],
        durationSeconds: asset.duration_seconds,
        waveform: normalizeWaveformData(asset.waveform_data),
        versionLabel: item.single.featuredVersion?.version_label ?? null,
        queueGroupLabel: item.post.title,
      },
    ];
  }

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
    if (
      preferPublicPreview
      && track.previewAsset
      && hasUsablePreviewAsset(track.previewAsset)
    ) {
      const publicCandidates = getPreviewPlaybackUrls(track.previewAsset);
      const previewUrl = publicCandidates[0] ?? null;
      if (previewUrl) {
        tracks.push({
          id: track.track.id,
          postId: item.post.id,
          versionId: track.version?.id ?? track.track.song_version_id,
          title: track.track.track_title,
          artistName: item.owner?.display_name ?? "Unknown artist",
          artworkUrl: getArtworkAssetUrls(item.artwork),
          src: previewUrl,
          srcCandidates: [
            ...publicCandidates,
            ...(track.protectedPreview ? [track.protectedPreview.readUrl] : []),
          ],
          durationSeconds:
            track.previewAsset.duration_seconds
            ?? track.protectedPreview?.asset.duration_seconds
            ?? null,
          waveform:
            getAssetWaveform(track.previewAsset)
            ?? normalizeWaveformData(track.protectedPreview?.asset.waveform_data),
          versionLabel: track.version?.version_label ?? track.track.production_stage,
          queueGroupLabel: item.post.title,
        });
        return tracks;
      }
    }

    if (track.protectedPreview) {
      const { asset, readUrl } = track.protectedPreview;
      tracks.push({
        id: track.track.id,
        postId: item.post.id,
        versionId: track.version?.id ?? track.track.song_version_id,
        title: track.track.track_title,
        artistName: item.owner?.display_name ?? "Unknown artist",
        artworkUrl: getArtworkAssetUrls(item.artwork),
        src: readUrl,
        srcCandidates: [readUrl],
        durationSeconds: asset.duration_seconds,
        waveform: normalizeWaveformData(asset.waveform_data),
        versionLabel: track.version?.version_label ?? track.track.production_stage,
        queueGroupLabel: item.post.title,
      });
      return tracks;
    }

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
