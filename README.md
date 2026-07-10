# MxShare V1

MxShare is a social working archive for musicians. Private originals, previews, covers, and avatars live in each user's own Google Drive. Supabase handles auth, metadata, social features, messaging, notifications, and access control.

## Stack

- React + Vite + TypeScript
- React Router
- Tailwind CSS v4
- TanStack Query
- Zustand
- Supabase Auth / Postgres / Realtime / RLS / SQL migrations
- Google Identity Services + Google Drive REST API

## Architecture

### App shape

- `src/app`: providers and app bootstrap
- `src/components`: layout, player, and shared UI primitives
- `src/features`: feature modules for auth, feed, library, songs, posts, drive, messages, notifications, profile, and settings
- `src/lib`: environment handling, helpers, domain logic, demo fixtures, and Supabase wiring
- `src/routes`: protected routing and route registration
- `src/types`: domain models

### Storage model

- Supabase never stores audio binaries.
- Google Drive stores:
  - original audio
  - public preview audio
  - cover artwork
  - avatars
- Supabase stores:
  - Drive file IDs
  - parent folder IDs
  - file metadata
  - public preview/view URLs
  - song / post / social graph data

### Google Drive provider

The V1 Drive layer is implemented behind `CloudStorageProvider` with a concrete `GoogleDriveProvider`:

- browser-only OAuth via Google Identity Services
- narrow `drive.file` scope
- session-only access token handling
- no provider tokens persisted in Supabase
- automatic `MxShare/Audio/Originals`, `MxShare/Audio/Previews`, `MxShare/Artwork`, and `MxShare/Artwork/Avatars` setup
- direct browser upload to Drive
- resumable upload path for larger files
- explicit public preview permission flow

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env values:

   ```bash
   cp .env.example .env
   ```

3. Create a Supabase project.

4. Run the SQL migration in order:

   - [`supabase/migrations/20260707190000_mxshare_v1.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/migrations/20260707190000_mxshare_v1.sql)

5. Optionally seed local development data:

   - [`supabase/seed.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/seed.sql)

6. Configure Google Cloud:

   - create an OAuth client for a web application
   - enable the Google Drive API
   - add local origin(s), for example `http://localhost:5173`
   - use the client ID as `VITE_GOOGLE_DRIVE_CLIENT_ID`
   - do not expose any Google client secret in the frontend

7. Set environment variables:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_GOOGLE_DRIVE_CLIENT_ID`
   - `VITE_APP_URL`

8. Start the app:

   ```bash
   npm run dev
   ```

9. Optional local UI QA without backend credentials:

   - set `VITE_ENABLE_DEMO_MODE=true`
   - this is clearly marked demo mode
   - it does not pretend to provide real Drive playback

## Supabase notes

### Migration coverage

The migration includes:

- core tables from the spec
- `feed_events` for Home feed ordering
- `post_public_metrics` view for post/comment/version-heart counters
- profile auto-creation trigger from `auth.users`
- comment-depth validation trigger
- asset / single-post / release-track validation triggers
- `publish_single_version(version_id)`
- `create_direct_conversation(other_profile_id)`
- `mark_notification_read(notification_id)`
- `mark_all_notifications_read()`
- RLS on all app tables

### RLS verification

Manual SQL verification file:

- [`supabase/tests/v1_rls.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/tests/v1_rls.sql)

It checks at least:

- no self-follow
- no foreign private song reads
- no foreign private asset reads
- no duplicate hearts
- no direct-message access for non-members

## Product flows implemented

- email/password login and registration via Supabase
- onboarding and profile editing
- protected routes
- Home and Explore feeds
- private library with songs, versions, projects, and assets tabs
- song workspace with direct private-source upload, shared-playback upload, artwork upload, song editing, and version creation
- single publishing flow with Drive original upload, shared playback upload, and optional artwork upload
- EP / album creation flow with track selection, drag-and-drop ordering, quick-add song shells, and workspace jump-off links
- public post detail with post-level comments and hearts
- profile routes at `/@username`
- public profile links and avatar upload in settings
- direct messages
- notifications
- Google Drive settings overview, setup, and reconnect flow
- global audio player with queue, seek, repeat, volume, and post-heart controls

## Commands

- Type check:

  ```bash
  npm run typecheck
  ```

- Tests:

  ```bash
  npm test
  ```

- Production build:

  ```bash
  npm run build
  ```

## Automated tests

Current Vitest coverage:

- username validation
- song creation payload
- next version number calculation
- single-update activity bump logic
- album track-change non-bump logic
- private-original rejection for public playback
- browser-friendly public preview acceptance

Test file:

- [`src/lib/domain.test.ts`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/src/lib/domain.test.ts)

## Manual test plan

1. Register a new user and confirm a profile row is created.
2. Complete onboarding and confirm `/@username` resolves.
3. Open Settings → Google Drive and connect Drive.
4. Confirm `MxShare` root folders are created in the linked Drive.
5. Quick-add a song in Library and confirm it opens directly into the song workspace.
6. Upload a private WAV, FLAC, or MP3 source in the song workspace.
7. Upload a browser-friendly shared playback file in MP3, M4A, AAC, or OGG.
8. Upload or select artwork for the same song.
9. Create a version from the uploaded assets.
10. Publish a first public single.
11. Open the post from a second account and verify the post appears in Explore.
12. Heart and comment on that post from the second account.
13. Upload a new version for the same song and republish it.
14. Confirm the single post remains the same and comments stay attached.
15. Confirm the feed shows the single as an update and `activity_at` moved forward.
16. Create an EP or album from multiple songs, including songs created from the release quick-add flow.
17. Reorder tracks and confirm the release stays in place instead of feed-bumping.
18. Open direct messages between two accounts and verify new text messages appear.
19. Confirm a different account cannot read private originals or private songs.
20. Confirm the app remains usable on desktop and a mobile-sized viewport.

## Known V1 limits

- no Dropbox, OneDrive, iCloud, S3, or custom storage backends
- no automatic audio conversion
- no server-side waveform generation
- no follower-only visibility
- no group spaces or collaboration rooms
- no media attachments in direct messages
- no push notifications
- no playlists, monetization, DRM, or download restrictions
- no native iOS or Android clients

## IMPLEMENTIERT

- React/Vite frontend with feature-oriented structure
- Supabase migration with tables, indices, triggers, RLS, RPCs, and feed events
- Google Drive provider abstraction with direct browser upload and public preview handling
- Auth, onboarding, feed, library, post, profile, messaging, notification, and settings routes
- Seed data and test artifacts

## MANUELLE KONFIGURATION

- Supabase project creation and migration execution
- Google OAuth client creation and Drive API enablement
- environment variables
- optional local seed import
- optional local demo mode flag

## BEKANNTE V1-GRENZEN

- local verification here cannot complete real Supabase Auth or live Google Drive OAuth without your project credentials
- SQL migration and RLS rules were authored for Supabase but not executed against a live database in this workspace
- seed posts intentionally avoid pretending to contain real Drive playback files

## NÄCHSTE SINNVOLLE V1.5-SCHRITTE

- add richer realtime invalidation and unread counts
- add automatic preview generation / conversion so public playback does not depend on a separate manual export
- add richer release editing after publish, especially for EP / album track maintenance
- add stronger feed ranking and search
- deepen comments and social actions
- add DB-level automated tests through Supabase CLI in CI
