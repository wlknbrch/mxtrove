# MxTrove Media Worker

Fastify worker for media conversion, private derivative streaming, attachments,
data exports, web push, and dynamic social previews.

## Responsibilities

- Receive private originals from an authenticated browser job.
- Generate MP3 previews and detailed waveform payloads with FFmpeg.
- Store restricted derivatives through `ProtectedMediaStorage`.
- Authorize protected reads with Supabase RPCs or short-lived signatures.
- Support byte ranges for browser audio seeking.
- Validate and process direct-message attachments.
- Strip image metadata by rotating, resizing, and re-encoding to WebP.
- Dispatch privacy-safe queued web-push notifications.
- Build protected JSON/CSV account exports.
- Render and cache public release/profile Open Graph cards.
- Remove expired jobs, exports, reservations, and account-owned derivatives.

Private cloud originals are never retained in protected storage after processing.

## Local Development

```bash
cp services/media-worker/.env.example services/media-worker/.env
npm --prefix services/media-worker ci
npm run worker:dev
```

The worker loads `services/media-worker/.env.local` and then
`services/media-worker/.env` when started through the root npm script.

For local macOS/Linux development, keep protected storage on a writable local
path such as:

```text
MEDIA_TEMP_DIR=/tmp/mxshare
PROTECTED_MEDIA_DIR=/tmp/mxshare-protected-media
SOCIAL_PREVIEW_CACHE_DIR=/tmp/mxshare-protected-media/social-previews
```

Required values:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
PROTECTED_MEDIA_SIGNING_SECRET
APP_ORIGIN
WORKER_PUBLIC_URL
PUBLIC_APP_URL
```

FFmpeg and ffprobe must be available at `FFMPEG_PATH` and `FFPROBE_PATH`.

## Endpoints

```text
GET  /healthz
GET  /readyz

POST /v1/media/jobs
PUT  /v1/media/jobs/:jobId/input
GET  /v1/media/jobs/:jobId
GET  /v1/media/jobs/:jobId/preview

GET  /v1/protected-media/:assetId
HEAD /v1/protected-media/:assetId
POST /v1/protected-media/:assetId/read-url

POST   /v1/messages/:messageId/attachments
DELETE /v1/message-attachments/:attachmentId

GET /social/post/:postId
GET /social/post/:postId/track/:trackId
GET /social/profile/:username
GET /og/post/:postId.png
GET /og/post/:postId/track/:trackId.png
GET /og/profile/:username.png
```

Authenticated endpoints require a Supabase bearer token. Protected reads can
also use a valid share token header or a short-lived signed query string.

## Protected Storage

The production container mounts:

```text
/data/mxshare-protected-media
```

Do not expose this directory through Nginx, Traefik file providers, or a public
Docker bind. Files use generated storage keys rather than uploaded names and are
written with private permissions.

Default limits are documented in `.env.example`:

- 50 MB per attachment
- 15 MB per image
- 20 MB per document
- 90 minutes per audio attachment
- five-minute maximum signed read URL

Database quota reservations protect the 2 GB protected-media and 500 MB
attachment defaults against concurrent uploads.

## Verification

```bash
npm --prefix services/media-worker run typecheck
npm --prefix services/media-worker test
npm --prefix services/media-worker run build
npm --prefix services/media-worker audit --omit=dev
```

Worker tests cover signature detection, active-content rejection, byte ranges,
rate limits, safe filenames, signed URL expiry, local path confinement,
waveforms, and export archives. Authorization role matrices are tested in
`supabase/tests/v2_rls.sql` through the database CI job.

## Docker

Standalone local worker:

```bash
docker compose -f docker-compose.worker.yml up --build
```

Full production deployment:

```bash
docker compose \
  --env-file deploy/mxshare.vps.env \
  -f docker-compose.production.yml \
  up -d --build
```

See the repository root `README.md` for Supabase, OAuth, Traefik, backup, and
post-deployment instructions.
