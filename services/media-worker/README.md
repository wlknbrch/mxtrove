# MxShare Media Worker

Self-hosted worker for V1.5 media processing and push dispatch.

## Responsibilities

- receive the original audio file directly from the browser
- transcode it to MP3 with FFmpeg
- generate waveform data for the frontend player
- hold the preview temporarily until the browser uploads it to Google Drive
- dispatch queued web-push notifications with VAPID keys

## Local setup

1. Copy the worker env file:

   ```bash
   cp services/media-worker/.env.example services/media-worker/.env
   ```

2. Install dependencies:

   ```bash
   npm --prefix services/media-worker install
   ```

3. Start the worker:

   ```bash
   npm run worker:dev
   ```

The frontend should point to the same origin through `VITE_MEDIA_WORKER_URL`.

## Required environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

## Helpful local checks

```bash
npm run worker:typecheck
npm run worker:build
```

## Docker

Build and run the worker locally:

```bash
docker compose -f docker-compose.worker.yml up --build
```
