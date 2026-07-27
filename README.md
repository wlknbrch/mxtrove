# MxTrove V2

MxTrove is a collaborative working archive for musicians. Artists keep private
originals in their own cloud account, while MxTrove provides versioned releases,
collaboration rooms, protected previews, timestamped feedback, messaging, social
discovery, and public release pages.

The production site is designed for:

- `https://mxtrove.wlknbrch.com`
- `https://www.mxtrove.wlknbrch.com` (redirects to the apex domain)

## What V2 Includes

- Private Single, EP, Album, and loose-collection collaboration projects
- Owner, Admin, Editor, Contributor, Reviewer, and Viewer roles enforced by SQL
- Profile/email invites, invitation lifecycle, membership changes, and ownership transfer
- Shared tracklists, assignment, status, ordering, active versions, and project chat
- Timestamped and ranged feedback, replies, reactions, resolution, and A/B version compare
- Public, followers-only, unlisted, and private releases
- Protected playback for collaboration, follower-only, unlisted, and message media
- Direct-message audio, image, document, project, post, and version attachments
- Blocking, muting, profile privacy, message privacy, and invite privacy
- Dark, light, and system themes with accents, density, player, and accessibility settings
- Google Drive, Dropbox, and OneDrive providers with explicit browser-mediated migration
- Credits, external links, QR codes, embeds, and dynamic public social cards
- Search across permitted creators, releases, songs, projects, feedback, and messages
- Moderation reports, admin-only actions, recoverable account deletion, and data export
- Realtime project, message, and notification refresh
- PWA shell, read-only offline snapshots, and local drafts

## Architecture

```text
Browser
  React + Vite + TypeScript
  React Router + TanStack Query + Zustand
  Personal cloud provider sessions

Supabase
  Auth
  PostgreSQL
  RLS, RPCs, Realtime
  Metadata only (no audio binaries)

Media worker
  Fastify
  FFmpeg / ffprobe
  Protected derivative storage
  Attachments, exports, web push, and social cards

Production
  Docker
  Nginx
  Traefik
```

Important directories:

- `src/features/projects`: projects, roles, invites, tracks, feedback, and review
- `src/features/attachments`: message attachment client and rendering
- `src/features/privacy`: privacy and account lifecycle APIs
- `src/features/appearance`: local/account appearance synchronization
- `src/features/dropbox` and `src/features/onedrive`: provider implementations
- `services/media-worker/src/protected-media`: private derivative storage and streaming
- `services/media-worker/src/attachments`: validated attachment processing
- `services/media-worker/src/social-preview`: dynamic HTML and OG images
- `supabase/migrations`: additive V1, V1.5, and V2 schema history
- `supabase/tests`: database and RLS regression tests

## Storage And Trust Model

Private WAV, FLAC, AIFF, and master files remain in the uploader's personal
Google Drive, Dropbox, or OneDrive account. MxTrove does not copy those originals
to Supabase or the VPS as a permanent backup.

The VPS protected-media volume may contain only derivatives:

- MP3 collaboration and restricted-release previews
- message audio previews and waveforms
- EXIF-stripped WebP image previews
- allowed small documents
- temporary export archives
- cached social-preview images

Protected files are never served by Nginx as static files. The worker endpoint
checks authentication or a valid share token, calls server-side permission RPCs,
supports HTTP byte ranges, and returns private no-store cache headers.

The default provider is `LocalProtectedMediaStorage` at:

```text
/data/mxshare-protected-media
```

`S3ProtectedMediaStorage` is an inactive provider boundary only. It is not a
configured production backend yet.

## Requirements

- Node.js 22
- npm
- FFmpeg and ffprobe for local worker development
- Supabase CLI 2.109.1 or compatible
- Docker Engine and Docker Compose for local Supabase and production containers
- A Supabase project
- At least one configured personal cloud OAuth application

Install the Supabase CLI on macOS:

```bash
brew install supabase/tap/supabase
supabase --version
```

## Local Setup

Install dependencies:

```bash
npm ci
npm --prefix services/media-worker ci
```

Create local environment files:

```bash
cp .env.example .env
cp services/media-worker/.env.example services/media-worker/.env
```

Required frontend values:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_MEDIA_WORKER_URL
VITE_APP_URL
```

Add the client IDs for every provider you want to expose:

```text
VITE_GOOGLE_DRIVE_CLIENT_ID
VITE_DROPBOX_CLIENT_ID
VITE_ONEDRIVE_CLIENT_ID
```

Required worker values:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
PROTECTED_MEDIA_SIGNING_SECRET
APP_ORIGIN
WORKER_PUBLIC_URL
PUBLIC_APP_URL
```

Generate a signing secret:

```bash
openssl rand -base64 48
```

Start and migrate local Supabase:

```bash
supabase start
supabase db reset --local
supabase test db
```

`supabase db reset --local` applies every migration in timestamp order and then
runs `supabase/seed.sql`. The seed is idempotent and is intended only for local
development.

Start the worker and web app in separate terminals:

```bash
npm run worker:dev
npm run dev
```

The default URLs are:

```text
Web:    http://localhost:5173
Worker: http://localhost:8080
```

Set `VITE_ENABLE_DEMO_MODE=true` only for explicit UI-only inspection. Demo mode
does not prove RLS, OAuth, protected playback, uploads, or Realtime behavior.

## Supabase Deployment

Link the repository to the production project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Inspect and push all pending migrations:

```bash
supabase db diff --linked
supabase db push
```

Deploy the public cloud-media proxy:

```bash
supabase functions deploy drive-media --no-verify-jwt
```

The function is at `supabase/functions/drive-media/index.ts`. It proxies only
public asset records; private originals and protected derivatives do not use it.

Production Auth settings:

```text
Site URL:
https://mxtrove.wlknbrch.com

Allowed redirect URLs:
https://mxtrove.wlknbrch.com
https://www.mxtrove.wlknbrch.com
http://localhost:5173
```

Enable Realtime for the V2 tables through the included migrations. Do not expose
the service-role or secret key to the frontend.

## OAuth Providers

### Google Drive

- Enable Google Drive API.
- Add `http://localhost:5173` for development.
- Add both production origins.
- Use the `drive.file` scope.
- Put only the web client ID in the frontend.
- Add test users while the consent screen remains in external testing.

### Dropbox

Create a scoped Dropbox app and add:

```text
http://localhost:5173/oauth/callback/dropbox
https://mxtrove.wlknbrch.com/oauth/callback/dropbox
```

Set the app key as `VITE_DROPBOX_CLIENT_ID`.

### OneDrive

Create a Microsoft Entra SPA registration and add:

```text
http://localhost:5173/oauth/callback/onedrive
https://mxtrove.wlknbrch.com/oauth/callback/onedrive
```

Allow delegated `User.Read` and `Files.ReadWrite`, then set the application
client ID as `VITE_ONEDRIVE_CLIENT_ID`.

Provider access tokens intentionally remain in browser `sessionStorage`. They
are not stored in Supabase. Expired Dropbox or OneDrive sessions require a
reconnect. OneDrive anonymous-link revocation must currently be completed in
OneDrive when Microsoft Graph does not expose a safe single-link revoke flow.

## Web Push

Generate one VAPID pair:

```bash
npx web-push generate-vapid-keys
```

Use the public value in both `VITE_WEB_PUSH_PUBLIC_KEY` and
`WEB_PUSH_PUBLIC_KEY`. Keep `WEB_PUSH_PRIVATE_KEY` worker-only. Use a real
contact URI for `WEB_PUSH_SUBJECT`.

Browser notifications require HTTPS in production. Brave users may also need to
allow notification permissions and Brave's push messaging setting.

## Production With Docker And Traefik

Prerequisites:

- DNS for both hostnames points to the VPS.
- Traefik is already attached to an external Docker network.
- The default network name is `traefik-public`.
- Ports 80 and 443 are reachable by Traefik.

Create the network if needed:

```bash
docker network create traefik-public
```

Create the production environment:

```bash
cp deploy/mxshare.vps.env.example deploy/mxshare.vps.env
```

At minimum, replace every placeholder in that file. Important production values:

```text
VITE_APP_URL=https://mxtrove.wlknbrch.com
VITE_MEDIA_WORKER_URL=https://mxtrove.wlknbrch.com/worker
APP_ORIGIN=https://mxtrove.wlknbrch.com,https://www.mxtrove.wlknbrch.com
PUBLIC_APP_URL=https://mxtrove.wlknbrch.com
WORKER_PUBLIC_URL=https://mxtrove.wlknbrch.com/worker
PROTECTED_MEDIA_DIR=/data/mxshare-protected-media
PROTECTED_MEDIA_MIN_FREE_BYTES=1073741824
```

`PROTECTED_MEDIA_MIN_FREE_BYTES` is a hard safety reserve. The worker rejects a
new protected-media upload before it would consume the final reserved disk
space; it never deletes an existing message attachment automatically.

Build and start:

```bash
docker compose \
  --env-file deploy/mxshare.vps.env \
  -f docker-compose.production.yml \
  up -d --build
```

The compose file creates persistent volumes for worker temp data and protected
media. Back up `mxshare-protected-media`; do not publish or bind it into Nginx.

Traefik routing included in the compose file:

```text
mxtrove.wlknbrch.com/*          -> Nginx web app
www.mxtrove.wlknbrch.com/*      -> permanent apex redirect
mxtrove.wlknbrch.com/worker/*   -> Fastify worker, /worker stripped
mxtrove.wlknbrch.com/social/*   -> social HTML renderer
mxtrove.wlknbrch.com/og/*       -> cached OG image renderer
mxshare.wlknbrch.com/*          -> permanent MxTrove redirect
```

Public share buttons use `/social/post/:postId` and
`/social/profile/:username`. Crawlers receive dynamic metadata; browsers are
immediately redirected to the canonical app route.

### MxTrove rebrand and cloud folders

The public product name is MxTrove. Existing database identifiers, Docker
volumes, local-storage keys, and compatibility headers retain their historical
`mxshare` names intentionally; changing them would invalidate local state or
existing deployment data without improving the public brand.

After deploying the rebrand, reconnect each existing provider once from
Settings -> Cloud storage:

- Google Drive renames the saved `MxShare` root folder to `MxTrove` by its
  existing Drive ID. Child folder IDs, file IDs, public links, and database
  references remain unchanged.
- Dropbox atomically moves `/MxShare` to `/MxTrove`. Dropbox file IDs and shared
  links remain unchanged, while saved parent-folder paths and Dropbox view URLs
  are rewritten in Supabase.
- If both old and new root folders exist, MxTrove refuses to merge them
  automatically. Resolve the duplicate manually and reconnect; this prevents
  accidental overwrites.
- Changing the Dropbox app-folder display name in the Dropbox console is
  separate from the `/MxTrove` folder managed inside the app namespace.

Do not manually copy the old folder into a new root before reconnecting. The
built-in migration is designed to preserve object identity instead of creating
duplicate files.

### Search and share-card launch

The production build ships `robots.txt`, `sitemap.xml`, JSON-LD application
metadata, canonical OpenGraph tags, and a static 1200x630 MxTrove preview. Public
release and profile links continue to use artwork-aware cards from the worker.

After the first production deployment:

1. Add `https://mxtrove.wlknbrch.com/sitemap.xml` to Google Search Console.
2. Request indexing for the canonical home URL.
3. Verify `/social/post/:postId` and `/social/profile/:username` with the share
   debugger of each social platform you plan to use.
4. Keep the old MxShare DNS records pointed at Traefik while legacy links are
   being redirected.
5. Re-enable web push on the new origin; browser push subscriptions do not move
   between domains.

Health checks:

```bash
curl -I https://mxtrove.wlknbrch.com
curl https://mxtrove.wlknbrch.com/worker/healthz
curl https://mxtrove.wlknbrch.com/worker/readyz
```

Inspect containers:

```bash
docker compose \
  --env-file deploy/mxshare.vps.env \
  -f docker-compose.production.yml \
  ps

docker compose \
  --env-file deploy/mxshare.vps.env \
  -f docker-compose.production.yml \
  logs -f web media-worker
```

Deploy later updates:

```bash
git pull
supabase db push
supabase functions deploy drive-media --no-verify-jwt
docker compose \
  --env-file deploy/mxshare.vps.env \
  -f docker-compose.production.yml \
  up -d --build
```

Every `VITE_*` change requires rebuilding the frontend image.

## Commands

```bash
# Complete frontend check
npm run check

# Individual frontend checks
npm run typecheck
npm test
npm run build

# Worker checks
npm run worker:typecheck
npm --prefix services/media-worker test
npm run worker:build

# Database and RLS tests (requires Docker)
supabase db reset --local
supabase test db

# Production dependency audits
npm audit --omit=dev
npm --prefix services/media-worker audit --omit=dev
```

## CI

`.github/workflows/ci.yml` runs:

- Frontend typecheck, unit tests, and production build
- Worker typecheck, unit tests, and build
- Local Supabase startup, all migrations, seed, and database/RLS tests
- Frontend Docker build
- Worker Docker build

CI is the required database proof when Docker is unavailable on a development
machine.

## Migration Of Existing V1/V1.5 Data

All V2 migrations are additive. Do not edit or rerun old migration files
manually against production.

The migrations:

- backfill owner IDs and collaboration-safe version fields
- keep existing Google Drive asset references valid
- preserve public Single, EP, Album, feed, message, and notification data
- add default privacy, appearance, quota, and cloud-connection records
- migrate legacy release URLs into structured external links
- move hidden locations out of the publicly readable profile row

Before production migration:

```bash
pg_dump --format=custom --no-owner --no-acl YOUR_DATABASE_URL > mxtrove-before-v2.dump
```

After `supabase db push`, verify one existing account, release, avatar, artwork,
preview, conversation, and notification before inviting production traffic.

## Security Notes

- Share and invite tokens are cryptographically random and only hashed at rest.
- Protected read URLs are short lived and bounded by `PROTECTED_URL_TTL_SECONDS`.
- New protected URL requests re-check follows, membership, visibility, blocks, and tokens.
- Existing signed URLs remain valid only until their configured TTL expires.
- Attachment signatures are inspected; SVG, HTML, archives, and executables are rejected.
- Image previews are rotated, resized, and re-encoded to WebP to remove EXIF metadata.
- Filenames are not used as storage paths and are sanitized for response headers.
- Protected-media quota updates lock rows to avoid reservation races.
- Admin access is based on server-controlled app roles, not editable profile fields.
- Account deletion requires recent password authentication, deactivates first, and uses a grace period.
- Cloud originals are not deleted during account cleanup unless a future explicit cloud-file deletion path is enabled.

## Manual Acceptance

Use at least three real accounts and complete this flow before calling a deployment
fully accepted:

1. Create an Album project and invite a second account as Editor.
2. Accept the invite and confirm both accounts see the same project and project chat.
3. Upload a version from the Editor's cloud provider.
4. Confirm only a protected MP3 derivative reaches the VPS.
5. Add feedback at a timestamp, reply, resolve it, and compare two versions.
6. Publish a followers-only Single from the project.
7. Confirm a follower can read and play it while a non-follower cannot.
8. Unfollow and confirm a new protected-media request is rejected.
9. Create and revoke an unlisted review link.
10. Upload audio, image, and PDF attachments in a direct message.
11. Confirm a non-member cannot request those attachments.
12. Block a third account and verify follow, message, invite, comment, and heart restrictions.
13. Change message privacy to mutual follows and test both one-way and mutual states.
14. Switch to Light Theme, reload, sign out/in, and verify persistence.
15. Connect a second cloud provider and migrate a disposable test asset.
16. Verify credits, links, QR, embed, and dynamic social cards on a public release.
17. Request a data export and download it before expiry.
18. Run the complete CI workflow and inspect both Docker health checks.

## Deliberate Limits

V2 does not include native apps, DAW plugins, live audio, simultaneous DAW
editing, stem separation, AI mixing/mastering, DRM, subscriptions, payment
processing, music distribution, iCloud Drive, anonymous comments, forums, video
calls, or a production S3 protected-media backend.

Offline mode caches only bounded metadata and drafts. It never pretends that
uploads, cloud access, publishing, membership changes, protected playback, or
message sending succeeded while disconnected.
