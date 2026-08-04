import {
  getArtworkAssetUrls,
  getPreviewPlaybackUrl,
  getPreviewPlaybackUrls,
} from "@/lib/asset-urls";
import { hasUsablePreviewAsset } from "@/lib/playback-health";
import { getAssetWaveform } from "@/lib/waveform";
import { normalizeWaveformData } from "@/lib/waveform";

import type { PlaybackTrack } from "@/components/audio/player-store";
import type { ResolvedPostCard, ResolvedReleaseTrack } from "@/features/posts/types";

export function getReleaseTrackVersionId(track: ResolvedReleaseTrack | null | undefined) {
  return track?.version?.id ?? track?.track.song_version_id ?? null;
}

export function getReleasePlaybackSelection(
  tracks: PlaybackTrack[],
  preferredReleaseTrackId?: string | null,
) {
  const preferredTrack = preferredReleaseTrackId
    ? tracks.find((track) => track.releaseTrackId === preferredReleaseTrackId) ?? null
    : null;

  return {
    tracks,
    initialTrackId: preferredTrack?.id ?? tracks[0]?.id ?? null,
  };
}

export function buildPostPlaybackTracks(item: ResolvedPostCard): PlaybackTrack[] {
  const preferPublicPreview = item.post.visibility === "public";
  const singleLyrics = item.single?.showLyrics
    ? item.single.song?.lyrics?.trim() || null
    : null;

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
          protectedAssetId: item.single.protectedPreview?.asset.id ?? null,
          durationSeconds:
            item.single.previewAsset.duration_seconds
            ?? item.single.protectedPreview?.asset.duration_seconds
            ?? null,
          waveform:
            getAssetWaveform(item.single.previewAsset)
            ?? normalizeWaveformData(item.single.protectedPreview?.asset.waveform_data),
          lyrics: singleLyrics,
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
        protectedAssetId: asset.id,
        durationSeconds: asset.duration_seconds,
        waveform: normalizeWaveformData(asset.waveform_data),
        lyrics: singleLyrics,
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
          lyrics: singleLyrics,
          versionLabel: item.single.featuredVersion?.version_label ?? null,
          queueGroupLabel: item.post.title,
        },
      ];
    }
  }

  return item.releaseTracks.reduce<PlaybackTrack[]>((tracks, track) => {
    const lyrics = track.track.show_lyrics ? track.song?.lyrics?.trim() || null : null;

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
          releaseTrackId: track.track.id,
          versionId: track.version?.id ?? track.track.song_version_id,
          title: track.track.track_title,
          artistName: item.owner?.display_name ?? "Unknown artist",
          artworkUrl: getArtworkAssetUrls(item.artwork),
          src: previewUrl,
          srcCandidates: [
            ...publicCandidates,
            ...(track.protectedPreview ? [track.protectedPreview.readUrl] : []),
          ],
          protectedAssetId: track.protectedPreview?.asset.id ?? null,
          durationSeconds:
            track.previewAsset.duration_seconds
            ?? track.protectedPreview?.asset.duration_seconds
            ?? null,
          waveform:
            getAssetWaveform(track.previewAsset)
            ?? normalizeWaveformData(track.protectedPreview?.asset.waveform_data),
          lyrics,
          versionLabel: track.versionLabel ?? track.track.production_stage,
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
        releaseTrackId: track.track.id,
        versionId: track.version?.id ?? track.track.song_version_id,
        title: track.track.track_title,
        artistName: item.owner?.display_name ?? "Unknown artist",
        artworkUrl: getArtworkAssetUrls(item.artwork),
        src: readUrl,
        srcCandidates: [readUrl],
        protectedAssetId: asset.id,
        durationSeconds: asset.duration_seconds,
        waveform: normalizeWaveformData(asset.waveform_data),
        lyrics,
        versionLabel: track.versionLabel ?? track.track.production_stage,
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
      releaseTrackId: track.track.id,
      versionId: track.version?.id ?? track.track.song_version_id,
      title: track.track.track_title,
      artistName: item.owner?.display_name ?? "Unknown artist",
      artworkUrl: getArtworkAssetUrls(item.artwork),
      src: previewUrl,
      srcCandidates: getPreviewPlaybackUrls(track.previewAsset),
      durationSeconds: track.previewAsset?.duration_seconds ?? null,
      waveform: getAssetWaveform(track.previewAsset),
      lyrics,
      versionLabel: track.versionLabel ?? track.track.production_stage,
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
