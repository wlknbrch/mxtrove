export interface AppRelease {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

// Keep the current package version first. Older entries automatically move into the archive UI.
export const appReleases: AppRelease[] = [
  {
    version: "1.2.2",
    date: "November 2026",
    title: "Reliable multi-file imports",
    changes: [
      "Download your own albums and EPs as a ZIP of original audio, artwork and release metadata; single posts include all of your saved versions. Files are retrieved privately from the connected cloud providers.",
      "Imported songs now show a loading state while opening, keep editing state separate between tracks, and allow retrying connection errors without falsely reporting a missing song.",
      "Preview uploads detect closed or incomplete streams immediately, persist accepted jobs for restart recovery, and keep later tracks running when an individual job fails. Preview retries cannot overwrite an active job.",
      "Fixed multi-file library imports stalling halfway through large batches: conversions keep running when the media worker is busy, briefly unreachable, or restarted, and stalled jobs now recover automatically.",
      "Freshly uploaded previews no longer fail with a transient 410 from Google Drive; the media proxy retries against an alternate host before reporting an error.",
      "Interrupted uploads and downloads are detected and reported with a clear message instead of hanging silently. Original files always stay safe in your connected cloud storage.",
      "Queued conversions now show a waiting state instead of looking frozen, and import progress is stored more efficiently between page reloads.",
      "Raised the media-worker request rate limit in the production compose recipe so parallel imports are no longer throttled mid-import.",
    ],
  },
  {
    version: "1.2.1",
    date: "August 2026",
    title: "Cinematic playback and smoother continuity",
    changes: [
      "Added optional desktop-only Cinematic FX with audio-reactive color flow, particles, neon ambient lighting, and beat-driven ripples.",
      "Long player titles now pan smoothly within their existing space on desktop and mobile, while visual effects remain disabled on mobile.",
      "Reduced repeated Supabase feed payloads with persistent query caching, targeted realtime invalidation, and more compact waveform data.",
      "Improved cloud-media proxy resilience so interrupted provider streams no longer terminate the local development server.",
      "Refined release and profile artwork backdrops with softer edges, cleaner transitions, and no visibly repeated artwork panels.",
    ],
  },
  {
    version: "1.0.2",
    date: "August 2026",
    title: "Small adjustments and fixes",
    changes: [
      "Fixed a layout issue with the release page backdrop.",
      "Footer added to release pages. Navigation is consistent across the site.",
    ],
  },
  {
    version: "1.0.1",
    date: "August 2026",
    title: "Artwork takes the stage",
    changes: [
      "Release pages now use an expressive artwork-led hero with a responsive backdrop, clearer controls, and a focused tracklist.",
      "Artwork and titles in feeds and public profiles now open the release; fullscreen artwork stays exclusive to the release page.",
      "The About page now shows the installed version, the latest changes, and an expandable archive of earlier releases.",
      "Admin moderation and notification flows received additional safeguards, including protection against self-moderation.",
    ],
  },
  {
    version: "1.0.0",
    date: "August 2026",
    title: "The public release",
    changes: [
      "Public moderation tools and a private admin dashboard make reports and visible community content manageable.",
      "Playback, cloud media delivery, mobile layouts, release sharing, lyrics, and library workflows received a broad stability pass.",
      "The About page now exposes the installed app version and this versioned changelog.",
    ],
  },
  {
    version: "0.9.7",
    date: "August 2026",
    title: "Release updates and resilience",
    changes: [
      "Added release-update notifications, stronger cache behavior, and safer song deletion.",
      "Improved mobile light-theme surfaces, persistent library state, and cloud artwork rendering.",
      "Made asset usage and release relationships easier to understand from the library.",
    ],
  },
  {
    version: "0.9.4",
    date: "August 2026",
    title: "Cloud-first creative workflow",
    changes: [
      "Expanded multi-upload, grouped song selection, autosaved release editing, and provider-neutral storage guidance.",
      "Added in-app feedback and bug reports with reproducibility context and optional screenshots.",
      "Refined profile, settings, and mobile layouts across smaller screens.",
    ],
  },
  {
    version: "0.8.9",
    date: "August 2026",
    title: "Accounts and continuity",
    changes: [
      "Introduced Google sign-in, password recovery, Terms acceptance, and improved account onboarding.",
      "Made album and EP playback more continuous across routes and mobile media controls.",
      "Added clearer legal, privacy, and service information for the hosted app.",
    ],
  },
  {
    version: "0.8.6",
    date: "August 2026",
    title: "Deeper song context",
    changes: [
      "Added lyrics, musical key, tempo metadata, comment hearts, and per-song sharing from releases.",
      "Introduced detailed waveforms and optional server-side audio analysis.",
      "Improved track-level hearts and metadata across singles, EPs, and albums.",
    ],
  },
];

export function getCurrentAppRelease(version: string) {
  return appReleases.find((release) => release.version === version) ?? appReleases[0];
}

export function getArchivedAppReleases(version: string) {
  return appReleases.filter((release) => release.version !== version);
}
