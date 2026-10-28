# Media lifecycle and recovery

Source owners: `src/features/media-processing/automatic-preview.ts`, `src/features/library/api.ts`, `src/features/drive/api.ts`, provider adapters, `services/media-worker/src/jobs/media-jobs.ts`, protected-media/attachments/cleanup/exports modules. Exact HTTP operations are in [OpenAPI](api.openapi.yaml).

## Original → public derivative

1. Select/validate local file. Keep app-owned temporary copy for native retry/background tasks where needed. Provider tokens and local file URLs are never row metadata.
2. Authorize the user's chosen cloud. Reuse saved root/folder IDs; originals go **directly to personal Drive/Dropbox/OneDrive**. Commit an `assets` row only after remote upload success (`audio_original`, private).
3. Create song/version and/or processing job according to the existing orchestration. `POST /v1/media/jobs` accepts a sourceAssetId owned by caller, optional song/version, and public_cloud/protected context. It currently reuses an **active** job for matching owner/source/mode and protected context; this is not an atomic persistent Idempotency-Key guarantee.
4. `PUT /v1/media/jobs/:jobId/input`: full raw bytes to temporary worker disk. Not multipart, not Content-Range/resumable. Successful response is 202 queued; do not issue another PUT while a previous upload/processing state is ambiguous.
5. Poll GET job under owner JWT; ffprobe → MP3 transcode → actual waveform/audio analysis. Public mode becomes `ready` with temporary preview, default ready TTL 6h.
6. Owner GET preview downloads MP3 and changes ready → uploading_to_drive (a legacy name for all providers). Upload derivative back to user's cloud and make **that derivative**, not original, publicly readable. Save preview asset metadata/relationship.
7. Call database `finalize_media_processing_job` through existing feature API to mark metadata/completed. HTTP `POST .../acknowledge` only removes temporary job directory; **it does not finalize database metadata**. Acknowledge after confirmed derivative upload/link/finalization.

Native can avoid downloading the same original twice by retaining its local import file; an existing remote-only original may need downloading for processing, as current web code does. Do not let Supabase proxy audio bytes to solve this.

## Protected derivative and private streaming

Protected mode adds purpose (`post_preview`, `collaboration_preview`, `message_audio`) and authorized target IDs. Worker reserves quota/storage, produces derivative, finalizes protected asset and links protected_preview_asset_id where appropriate; completed job has protected_asset_id. Public-cloud preview download/upload is not required for this branch.

Read-url authorization and private GET/HEAD/Range are described in [authorization](../authorization.md). URLs expire (default 300s), private response `Cache-Control: private, no-store, max-age=0`; no permanent signed URLs in database/cache. Re-request before/after expiry with bounded retry and current credentials. Member/share revocation does **not** instantly revoke an already signed URL in current code.

The S3 storage class is a placeholder that throws for its methods; the factory currently chooses local storage. Do not declare S3 a working deployed backend merely because an interface exists.

## Attachments and exports

DM attachment path: send/obtain own message → raw POST attachment headers/type/filename → signature detection → bounded processing → reserve/finalize protected asset → message_attachments row → read-url for authorized participants. Audio transcodes to MP3/waveform, images rotate/resize ≤2048 and encode WebP, documents accept supported signatures. File signature checks are not a claim of full antivirus scanning. Cleanup finally removes attachment temporary directory; failed reservation is released.

Export path: RPC request_data_export → own data_export_requests → worker polling builds JSON/CSV archive → protected export asset → existing read-url. No separate export HTTP API exists. Native must not dump private cache as account export.

## States, retries and deletion

The actual 12 MediaProcessingJobStatus values and complete job schema are in wire-schemas.json. Intended sequence is created → uploading → queued → probing → transcoding → generating_waveform → ready → uploading_to_drive → completed; protected mode completes directly after derivative finalization. failed/cancelled/expired are terminal UI states, not permission to repeat destructive provider operations. Stale active jobs are marked failed/worker_restart after the configured timeout (default 30 min); queue is in-process, not a durable resume engine.

| Failure point | Preserve | Safe next step / current gap |
|---|---|---|
| Provider reauth/network before upload | local file/import intent | reconnect and resume only per provider's supported session |
| Provider accepted file but metadata response lost | remote object ID / client operation record | reconcile before another upload; no global server import idempotency currently |
| Preview conversion failed | original asset/song/version | create/reuse allowed job after checking status; no original deletion |
| Cloud derivative upload/publication failed | temporary job while TTL valid | retry/reconcile cloud ID; job preview may expire, then controlled reprocess |
| Finalization response lost | job + preview IDs | read current records before repeating; do not blindly publish twice |
| App killed / network lost during worker PUT | local file + job ID | status reconciliation; full retry may retransmit entire input; resumable worker gap |
| Cancel | explicit cancel intent | worker DELETE updates state/removes temp files; cancellation must not imply deleting committed cloud original |
| Delete post/version/song/asset | user confirmation + reference graph | follow existing blockers/cascade RPCs; never run guessed cloud deletion globally |
| Account deletion | scheduled time/owner identity | deactivates immediately with grace period; server has no user cloud tokens, cannot promise remote cloud cleanup without user-held authorization |

Cloud deletion and DB cleanup are not one transaction. Record failed cleanup for user review, and test shared references before removal. OneDrive `revokePublicPreview` currently throws and asks user to remove the anonymous link in OneDrive: do not claim a visibility change can always retract an old external provider URL. Public proxy/image cache can also outlive a visibility change; use protected derivatives for private material from the start.

## Resource / egress assumptions

Config defaults, not deployment evidence: input 500MiB, audio attachment 50MiB, image 15MiB, document 20MiB, max audio duration 5400s, concurrent media jobs 1, protected disk safety reserve 1GiB. Rate limits are per worker instance/IP. Never hardcode these as future account entitlements; there is no version/capabilities discovery endpoint today. Feed-card waveform ≤320 buckets; use lazily fetched full detail. Public media body travels via VPS `/worker/v1/public-media` (Drive/Dropbox) or direct supported provider public URL; the legacy Supabase Edge proxy remains a fallback in web configuration and must not be native's default.
