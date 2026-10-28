# Existing worker endpoint contracts

Canonical machine specification: [api.openapi.yaml](api.openapi.yaml), OpenAPI3.1, encoded as JSON (a valid YAML1.2 subset). Generated from actual route registrations plus reviewed current request/response semantics. All 24 explicit method/path pairs and 11 Fastify automatic HEAD operations are covered. No APNs, generic exports, resumable-upload or capabilities routes are invented.

Base is explicit `WORKER_URL`, including `/worker` on the current production reverse proxy. Do not append `/worker` twice. Native sends HTTPS, appropriate Content-Type and Supabase user JWT on authenticated operations; **provider token never substitutes for user JWT**. Native clients generally send no Origin; current CORS callback accepts no Origin. CORS is not authorization.

| Method / path | Request/auth | Success / side effect | Important failure states |
|---|---|---|---|
| GET /healthz | public |200 `{ok,worker}` | Does not prove DB/provider readiness |
| GET /readyz | public |200 `{ok,tempDir,protectedMedia}`; checks directories |500; not a version/permissions/FFmpeg probe |
| GET /source | public |302 Location to corresponding source | configuration controls target |
| POST /v1/media/jobs | JWT; JSON sourceAssetId, optional songVersionId/songId/outputMode/protectedPurpose/projectId/postId |200 `{id,status,stage,progress}`; create/reuse active job |400 missing source; ownership/context errors can be500; no formal idempotency |
| PUT /v1/media/jobs/:jobId/input | owner JWT, raw bytes, max500MiB default |202 summary queued |404 hidden/not-owned; size/quota can413; no upload-offset API |
| GET /v1/media/jobs/:jobId | owner JWT |200 complete current job row |404; enum/error_code can evolve |
| GET /v1/media/jobs/:jobId/preview | owner JWT |200 audio/mpeg; ready→uploading_to_drive |409 not ready;404 cleaned/not-owned; not a safe read-only polling operation |
| POST /v1/media/jobs/:jobId/acknowledge | owner JWT, no body |204 remove temp directory |404; **not DB finalization** |
| DELETE /v1/media/jobs/:jobId | owner JWT |204 cancel and temp cleanup |404; DB cancel RPC sets separate cancellation request in web flow |
| POST /v1/media/analyze-song | JWT, raw audio; X-MxShare-Song-Id and X-MxShare-Source-Asset-Id |200 `{tempoBpm,tempoConfidence,musicalKey,keyConfidence}`; persists song analysis |400 headers missing; ownership/conversion may500 |
| POST /v1/push/test | JWT, no body |200 `{ok:true}`; Web Push |Not an APNs smoke test |
| POST /v1/protected-media/:assetId/read-url | user JWT and/or X-MxShare-Share-Token, no body |200 `{url,expiresInSeconds}` |404 permission/missing record;410 missing backing file |
| GET /v1/protected-media/:assetId | signed query expires+signature, or JWT (optional share header) |200/206 typed bytes; no-store; Range |401 without valid signature/JWT;404 denied/not-ready/deleted;410 backing missing;416 invalid range |
| HEAD /v1/protected-media/:assetId | same auth/Range |200/206 headers only |same branch/error semantics |
| GET /v1/public-media | public query fileId/kind/size, or provider=dropbox&url=allowed HTTPS source; optional Range |upstream status/body, ETag, content-range and cache headers |400 source; upstream failures can be non-JSON; no arbitrary-host proxy |
| HEAD /v1/public-media | same public parameters |upstream HEAD without body |upstream status |
| POST /v1/messages/:messageId/attachments | own sender JWT + current send permission, raw bytes, X-MxShare-Filename optional, X-MxShare-Attachment-Type required audio/image/document |201 MessageAttachment row after processing |400 type;404 denied;413 size;415 signature;422 audio duration |
| DELETE /v1/message-attachments/:attachmentId | owner JWT |204 soft delete + storage release |404 denied/already deleted |
| GET /og/post/:postId.png | public-only source |200 image/png |404 hidden/nonpublic/missing |
| GET /og/post/:postId/track/:trackId.png | public EP/album and valid track |200 image/png |404 invalid target/single |
| GET /og/profile/:username.png | public profile |200 image/png |404 |
| GET /social/post/:postId | public post |200 text/html OG metadata + meta refresh `/post/:id` |404 |
| GET /social/post/:postId/track/:trackId | public EP/album track |200 HTML; target `/post/:id?track=:trackId` |404 |
| GET /social/profile/:username | public profile |200 HTML; target `/@:username` |404 |

GET helpers also have Fastify automatic HEAD except the two explicitly paired media routes. These implicit HEAD handlers can still perform GET work/side effects, including changing preview status and generating cached social images. Do not use preview HEAD to poll readiness. OPTIONS preflight is supplied by @fastify/cors, not a business API.

## Header, range and error details

Protected media supports a single byte range, including suffix/open-ended range as defined by `parseByteRange`; multiple/malformed/unsatisfiable requests return416 and `Content-Range: bytes */<size>`. HEAD has no body. Public proxy forwards upstream range semantics; do not assume it can make an upstream that ignores Range seekable.

Raw requests are not multipart form data. Filename is sanitized by worker; filename/MIME assertions are not authority (file signatures are checked for attachments). Actual limits come from deployment environment, not an account entitlement embedded in iOS. A native client can send Content-Length for file uploads but must handle raw streamed responses and 204 without JSON decoding.

Current global handler preserves rate-limit429 with `{error}`; other exceptions retain the English-substring mapping. Explicit route errors and upstream public proxy bodies remain distinct. Read [errors.md](errors.md). Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After; per IP/worker buckets: generic read240/min (including readiness), protected read600/min, public proxy1200/min, upload30/min, mutation120/min, social120/min (cheap healthz exempt). The maintained plugin bounds its in-memory client cache. Do not parallelize enough requests to exhaust a shared NAT bucket.

Public-media initial Dropbox origins are exactly dropbox.com, www.dropbox.com and dl.dropboxusercontent.com, HTTPS only, without URL credentials or nonstandard ports. Redirects are manual/validated (maximum5), with unsupported destinations or loops returning502. Trusted Google/Dropbox public media CDNs continue to work. The social image loader additionally permits Microsoft public cloud media hosts, validates redirects and caps downloaded image bytes before unbounded buffering.

## Supabase Edge Function and development proxy

`supabase/functions/drive-media/index.ts` is an existing compatibility GET/OPTIONS proxy with its own `PUBLIC_MEDIA_PROXY_URL` redirect behavior. `vite.config.ts` provides development `/api/drive-media`. They are not missing worker endpoints and not the native streaming default. The native base must route media to the deployed VPS worker/direct permitted provider URL; never introduce a second media body path through Supabase to emulate the browser dev proxy.
