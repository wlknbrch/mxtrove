# MxShare V1 / V1.5

MxShare is a social working archive for musicians. Private originals stay in each artist's own Google Drive, while Supabase handles auth, metadata, messaging, notifications, feed logic, and access control.

## Stack

- React + Vite + TypeScript
- React Router
- Tailwind CSS v4
- TanStack Query
- Zustand
- Supabase Auth / Postgres / RLS / SQL migrations
- Google Identity Services + Google Drive REST API
- Self-hosted media worker with Fastify + FFmpeg + web-push

## Architecture

### App shape

- `src/app`: providers and app bootstrap
- `src/components`: layout, player, and shared UI primitives
- `src/features`: auth, drive, feed, follows, library, media-processing, messages, notifications, posts, profile, settings, songs
- `src/lib`: environment handling, helpers, domain logic, demo fixtures, PWA helpers, Supabase wiring
- `src/routes`: protected routing and route registration
- `src/types`: shared domain models
- `services/media-worker`: V1.5 audio processing + push worker

### Storage model

- Supabase never stores audio binaries.
- Google Drive stores:
  - private original audio
  - public preview audio
  - cover artwork
  - avatars
- Supabase stores:
  - Drive file IDs and folder IDs
  - file metadata and waveform payloads
  - songs, versions, posts, comments, follows, messages, notifications, push subscriptions

### Media pipeline

V1.5 introduces a split pipeline:

1. The browser uploads the original to the user's private Google Drive folder.
2. The browser sends the same file to the self-hosted media worker.
3. The worker creates an MP3 preview plus waveform data.
4. The browser downloads the preview from the worker and uploads it into the public previews folder in Drive.
5. Supabase stores the preview asset metadata and links it back to the original.

This keeps Drive tokens out of the worker and keeps Supabase free of media binaries.

## Local setup

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install worker dependencies:

   ```bash
   npm --prefix services/media-worker install
   ```

3. Copy env values:

   ```bash
   cp .env.example .env
   cp services/media-worker/.env.example services/media-worker/.env
   ```

4. Create a Supabase project.

5. Run the SQL migrations in order:

   - [`supabase/migrations/20260707190000_mxshare_v1.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/migrations/20260707190000_mxshare_v1.sql)
   - [`supabase/migrations/20260709001500_fix_message_rls_recursion.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/migrations/20260709001500_fix_message_rls_recursion.sql)
   - [`supabase/migrations/20260710103000_mxshare_v15_social_graph.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/migrations/20260710103000_mxshare_v15_social_graph.sql)
   - [`supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/migrations/20260710183000_mxshare_v15_media_push_release.sql)

6. Optionally seed local development data:

   - [`supabase/seed.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/seed.sql)

7. Configure Google Cloud:

   - create an OAuth client for a web application
   - enable the Google Drive API
   - add local origin(s), for example `http://localhost:5173`
   - use the client ID as `VITE_GOOGLE_DRIVE_CLIENT_ID`
   - do not expose any Google client secret in the frontend

8. Set frontend environment variables:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_GOOGLE_DRIVE_CLIENT_ID`
   - `VITE_MEDIA_WORKER_URL`
   - `VITE_WEB_PUSH_PUBLIC_KEY`
   - `VITE_APP_URL`

9. Set worker environment variables:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
   - `WEB_PUSH_PUBLIC_KEY`
   - `WEB_PUSH_PRIVATE_KEY`
   - `WEB_PUSH_SUBJECT`
   - `APP_ORIGIN`
   - optional FFmpeg and temp-directory overrides from [`services/media-worker/.env.example`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/services/media-worker/.env.example)

10. Start the worker:

   ```bash
   npm run worker:dev
   ```

11. Start the app:

   ```bash
   npm run dev
   ```

12. Optional local UI QA without backend credentials:

   - set `VITE_ENABLE_DEMO_MODE=true`
   - this is clearly marked demo mode
   - Drive playback, push, and worker processing stay simulated there

## Production deployment on a VPS with Docker + Traefik

This repo is now prepared for the production shape below:

- the Vite app is built into a static frontend image via [`Dockerfile`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/Dockerfile)
- Nginx serves the SPA with cache rules and a health endpoint via [`deploy/nginx/mxshare.conf`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/deploy/nginx/mxshare.conf)
- the media worker runs as its own container
- Traefik terminates TLS and routes:
  - `https://mxshare.wlknbrch.com` → frontend
  - `https://www.mxshare.wlknbrch.com` → permanent redirect to the apex domain
  - `https://mxshare.wlknbrch.com/worker/*` → media worker

The production compose entrypoint is [`docker-compose.production.yml`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/docker-compose.production.yml). Example secrets and runtime values live in [`deploy/mxshare.vps.env.example`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/deploy/mxshare.vps.env.example).

### 1. VPS prerequisites

- Docker Engine + Docker Compose plugin installed
- Traefik already running on the VPS
- a shared external Traefik network available, default name: `traefik-public`
- DNS records in place:
  - `mxshare.wlknbrch.com` → VPS IP
  - `www.mxshare.wlknbrch.com` → VPS IP or CNAME to the apex

If the Traefik network does not exist yet:

```bash
docker network create traefik-public
```

### 2. Supabase production checklist

1. Create or reuse the production Supabase project.
2. Run all migrations in the order listed in the local setup section above.
3. Set the Auth site URL to:

   ```text
   https://mxshare.wlknbrch.com
   ```

4. Add these Auth redirect / allowed URLs:

   - `https://mxshare.wlknbrch.com`
   - `https://www.mxshare.wlknbrch.com`
   - your existing localhost URLs for development if you still want local sign-in

5. Deploy the public Drive media proxy Edge Function:

   ```bash
   supabase functions deploy drive-media --no-verify-jwt
   ```

That function lives at [`supabase/functions/drive-media/index.ts`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/functions/drive-media/index.ts) and is required for production artwork / avatar / public-audio proxying outside localhost.

### 3. Google Cloud production checklist

For the Google Drive OAuth client:

- enable the Google Drive API
- add these Authorized JavaScript origins:
  - `https://mxshare.wlknbrch.com`
  - `https://www.mxshare.wlknbrch.com`
- keep using the web client ID as `VITE_GOOGLE_DRIVE_CLIENT_ID`
- do not expose any client secret in the frontend image

If your app is still in Google's external testing mode, make sure the production Google account(s) that should connect Drive are approved testers until verification is complete.

### 4. Web Push / VAPID keys

Generate a VAPID key pair once, then reuse it for both the frontend and worker:

```bash
npx web-push generate-vapid-keys
```

Use:

- `publicKey` as `VITE_WEB_PUSH_PUBLIC_KEY` and `WEB_PUSH_PUBLIC_KEY`
- `privateKey` as `WEB_PUSH_PRIVATE_KEY`
- a real admin contact as `WEB_PUSH_SUBJECT`, for example `mailto:contact@wlknbrch.com`

### 5. Prepare the production env file

Copy the example env file:

```bash
cp deploy/mxshare.vps.env.example deploy/mxshare.vps.env
```

Then fill in the real values. The most important production values are:

- `VITE_APP_URL=https://mxshare.wlknbrch.com`
- `VITE_MEDIA_WORKER_URL=https://mxshare.wlknbrch.com/worker`
- `APP_ORIGIN=https://mxshare.wlknbrch.com,https://www.mxshare.wlknbrch.com`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `VITE_SUPABASE_PUBLISHABLE_KEY=...`
- `VITE_GOOGLE_DRIVE_CLIENT_ID=...`
- `VITE_WEB_PUSH_PUBLIC_KEY=...`
- `WEB_PUSH_PRIVATE_KEY=...`

The frontend build is static, so any change to `VITE_*` variables requires rebuilding the web image.

### 6. Build and launch on the VPS

From the repo root on the server:

```bash
docker compose --env-file deploy/mxshare.vps.env -f docker-compose.production.yml up -d --build
```

Useful follow-up commands:

```bash
docker compose --env-file deploy/mxshare.vps.env -f docker-compose.production.yml ps
docker compose --env-file deploy/mxshare.vps.env -f docker-compose.production.yml logs -f web media-worker
```

### 7. Post-deploy verification

Check the frontend and worker health endpoints:

```bash
curl -I https://mxshare.wlknbrch.com
curl https://mxshare.wlknbrch.com/worker/healthz
curl https://mxshare.wlknbrch.com/worker/readyz
```

Then verify the real product flows:

1. Load `https://mxshare.wlknbrch.com`.
2. Confirm `https://www.mxshare.wlknbrch.com` redirects to the apex domain.
3. Sign in with a real account.
4. Connect Google Drive from Settings.
5. Upload a private original and confirm the worker generates the preview.
6. Confirm feed images, avatars, and playback all resolve correctly through the deployed Edge Function and worker.
7. Trigger a push test from Settings → Notifications.

### 8. Rolling updates later

For future releases:

```bash
git pull
docker compose --env-file deploy/mxshare.vps.env -f docker-compose.production.yml up -d --build
```

If you only changed worker-only env values, you can recreate just the worker service. If you changed any `VITE_*` values, rebuild the frontend as well.

## Product flows implemented

- email/password login and registration via Supabase
- onboarding and profile editing
- public profile routes at `/@username`
- follow/unfollow plus follower/following routes
- follow-derived Home feed and creator discovery surfaces
- Home and Explore feeds
- library dashboard with songs, versions, and assets
- song workspace with direct original upload, automatic preview generation, artwork upload, song editing, asset cleanup, and version creation
- single publishing flow with automatic preview generation from uploaded originals
- EP / album creation flow with drag-and-drop ordering and workspace jump-off links
- EP / album editing after publish with track remapping and reorder support
- public post detail with post hearts, threaded comments, replies, comment edit/delete, and release playback
- Google Drive settings flow with reconnect / repair behavior
- notification settings for browser push and event-level delivery preferences
- direct messages and unread counts
- notification center and unread state
- global audio player with queue, seek, repeat, volume, hearts, and real waveform rendering from stored waveform data
- PWA manifest + service worker registration for web push

## Worker

The worker lives in [`services/media-worker`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/services/media-worker/README.md).

It provides:

- `/v1/media/jobs/:id/input` for raw original uploads
- job polling and preview download endpoints
- cleanup of expired worker artifacts
- queued web-push dispatch

Deployment artifacts:

- [`Dockerfile`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/Dockerfile)
- [`services/media-worker/Dockerfile`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/services/media-worker/Dockerfile)
- [`docker-compose.worker.yml`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/docker-compose.worker.yml)
- [`docker-compose.production.yml`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/docker-compose.production.yml)
- [`deploy/nginx/mxshare.conf`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/deploy/nginx/mxshare.conf)
- [`deploy/mxshare.vps.env.example`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/deploy/mxshare.vps.env.example)
- [`supabase/functions/drive-media/index.ts`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/functions/drive-media/index.ts)

## Commands

- Frontend type check:

  ```bash
  npm run typecheck
  ```

- Frontend tests:

  ```bash
  npm test
  ```

- Frontend build:

  ```bash
  npm run build
  ```

- Worker type check:

  ```bash
  npm run worker:typecheck
  ```

- Worker build:

  ```bash
  npm run worker:build
  ```

## CI

GitHub Actions workflow:

- [` .github/workflows/ci.yml `](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/.github/workflows/ci.yml)

It currently runs:

- frontend typecheck, tests, and production build
- worker typecheck and build

## Tests

Current local coverage includes:

- username validation
- song creation payload
- version-number derivation
- single-update activity bump logic
- album track-change non-bump logic
- private-original rejection for public playback
- browser-friendly public preview acceptance
- Drive folder persistence helpers

Relevant files:

- [`src/lib/domain.test.ts`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/src/lib/domain.test.ts)
- [`src/features/drive/google-drive-connection.test.ts`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/src/features/drive/google-drive-connection.test.ts)
- [`supabase/tests/v1_rls.sql`](/Users/wlknbrch/Desktop/Dev%20Projects/MxShare/mxshare-web/supabase/tests/v1_rls.sql)

## Manual test plan

1. Register a new user and confirm a profile row is created.
2. Complete onboarding and confirm `/@username` resolves.
3. Open Settings → Google Drive and connect Drive.
4. Confirm the `MxShare` folder structure is created in the linked Drive.
5. Upload a private source in the song workspace or single flow.
6. Confirm the worker generates a preview automatically and that the preview becomes publicly playable.
7. Confirm waveforms appear in feed cards and the global player for processed previews.
8. Publish a first public single.
9. Create an EP or album from multiple songs.
10. Edit that release and confirm reorder / remap changes save in place.
11. Open a public post from a second account and verify hearts, comments, replies, and edits behave correctly.
12. Open Settings → Notifications, enable push in the browser, and send a test push.
13. Confirm a different account still cannot read private originals or private song metadata.

## Known current limits

- no Dropbox, OneDrive, iCloud, S3, or custom storage backends
- no group spaces or collaboration rooms
- no media attachments in direct messages
- no follower-only visibility
- no playlists, monetization, DRM, or download restrictions
- no native iOS or Android clients
- DB/RLS SQL tests are present but not yet executed automatically inside local app commands
- route-level social cards are still static app-wide metadata, not per-release Open Graph cards
