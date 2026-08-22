export interface AppRelease {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

// Keep the current package version first. Older entries automatically move into the archive UI.
export const appReleases: AppRelease[] = [
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
