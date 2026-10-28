# Compatibility, deployment assumptions, cache and sync

Contract version **0.1.1** includes the local security-maintenance update to the original0.1.0 source audit; it is not a newly deployed API version. No backend version/capabilities endpoint exists. Worker package says0.1.0 while web says1.2.1; neither alone proves which migrations are installed.

Security maintenance changes no row/RPC payload: patched React Router7/Zod4/Vite7, typed form input/output, maintained Fastify rate limiting (including readyz), UUID-only job paths, escaped Drive literals and trusted-host bounded redirects. Social artwork uses the same outbound boundary and a streaming12MiB cap. These are local candidate changes; pin the containing source revision, not fc3ee23 alone, and verify deployment separately.

## Observed versus unverified

| Component | Source evidence | Deployment assumption / verification gate |
|---|---|---|
| Local checkout | fc3ee23cf2182f5f8d2a4617183fe3207050eedf, v1.2.1 | Actual audited source; no pull/reset made |
| Remote main/masterplan baseline | c4afc05ba2cb614ca6e1d3be4838093877e854bc | Observed 2026-10-27; only README/screenshots differ from local; do not assume future main remains identical |
| Web dependency/runtime | React19/Vite7/Node >=22 <23 | Use Node22 for checks, not execution host's default Node24 |
| Worker/API | Fastify5, source routes in inventory, package0.1.0 | Actual deployed revision/configuration unknown; healthz does not report source revision |
| Database | migrations in inventory.json (last 20261020120000) | Production applied history unknown; compare list/dry-run only when specifically authorized |
| PostgREST | local config max_rows1000, PostgreSQL17 | Do not assume hosted limit/version exactly matches; explicit paging still required |
| Supabase Auth | web identity and worker JWKS verifier | Native redirect allowlists, templates, JWT signing config unverified; existing worker verifies remote JWKS, legacy HS256 compatibility not established |
| Realtime | checked-in publication migrations and hooks | Deployed publication/RLS and reconnect delivery unverified; no durable event replay cursor promised |
| Media | production compose worker + persistent local protected volume | Same volume/project/config must survive rollout; production path, quotas, FFmpeg and free disk unverified |
| Deep links / APNs | no AASA/native device routes in source | Not deployed/available merely because masterplan proposes them |
| Real screenshots | added by remote docs commit | iOS0.1 must read screenshots from that exact revision if absent in this older local checkout |

## Reuse matrix

| Surface | Web | iOS | Android |
|---|---|---|---|
| Supabase identity/RLS, existing table/RPC reads/writes | existing | reuse wire; native repositories/DTOs | same contracts |
| Compact feed RPCs and privacy-aware profile/social RPCs | existing | unchanged with same session | unchanged |
| HTTP media jobs/raw uploads/read URLs/Range | existing | unchanged for foreground/full upload; lifecycle adaptations | unchanged with native lifecycle |
| Browser OAuth, XHR, File, popup, sessionStorage | existing | native adapters, Keychain, explicit registrations | native adapters, Keystore |
| Browser player/MediaSession/DOM FX | existing | AVPlayer/MediaPlayer; desktop FX excluded | Media3; desktop FX excluded |
| Draft autosave/multi-step import | existing, last-writer-wins/incomplete retry guarantees | backend hardening before safe concurrent/retry claims | same future additive contracts |
| In-app notification rows/Realtime | existing | reuse; foreground reconciliation | reuse |
| VAPID subscriptions/push | existing | no direct reuse as APNs | no direct reuse as FCM |
| Source/license/trademark links | existing AGPL-3.0-only | preserve, determine distribution strategy | preserve |

## Cache and egress budget

Current web `src/lib/query-client.ts`: default staleTime10min, detail15min, selected list roots30min, gcTime24h, no window-focus refetch, query retry1/mutation retry0. Selected roots persist up to24h in localStorage capped at4,500,000 **characters**, including library/projects/conversation/profile/feed roots. `use-auth` clears cache on local signout, but storage itself is not encrypted. This is current behavior, not the private-memory-only target in the masterplan.

Native policy: public snapshots bounded by account/environment/contract version/TTL/size; private lists memory-only by default. If encrypted private disk snapshots are later approved, define revocation, expiry and account-key deletion first. Signed URLs/provider tokens/share tokens are not feed snapshot payloads.

Home page currently makes three concurrent ID-source requests (home RPC, trending RPC, latest-public posts IDs) and then one compact card RPC; protected URLs can require extra calls. Latest Explore makes one posts-ID request + one card RPC, trending Explore one ranking RPC + one card RPC. Native should keep at most the needed page plus bounded prefetch and avoid hydrating detail comments/credits or all tracks' signed URLs on feed mount. No “one request for all Home data” or zero-egress guarantee is claimed.

`get_resolved_post_cards` bounds to50 IDs and compact peaks320. The web has a compatible fallback on RPC error and on successful missing cards; this can be more expensive. A native client should treat missing optimized capability as a staging/deployment gate, not silently fetch full tables indefinitely.

Feed invalidation listens for posts changes and feed_events inserts, debounced1500ms. It is not a complete change stream for hearts/comments/follows/privacy changes from every device. Project realtime groups project/member/track/activity/feedback/protected tables; message channel filters conversation, notification channel recipient. No per-card channel. After foreground/reconnect, subscribe and reconcile active keys to close the snapshot/subscription race; TTL and events both matter. Realtime removal/permission events may not deliver full old rows; enforce invalidation even without a delete payload. Do not promise “only query when a post changes.”

Metadata bytes over Supabase are uncached Data API egress. Caching locally avoids requests; it does not reclassify PostgREST bytes as Storage CDN cached egress. Keep audio/image proxy traffic on VPS when configured, never make the legacy drive-media Edge body proxy the native default. Collect staging request counts/response bytes/cache hits/worker bytes, without private contents, before setting CI thresholds. No invented MB-per-user guarantee.

## Evolution and rollout rules

New fields/RPCs/endpoints must be additive, explicit-grant/RLS protected and versioned when semantics change. Unknown enum fails closed for authorization. Current web must pass tests throughout. Native pins a tested backend SHA + contract version; minimum capabilities are verified on staging before each phase uses them. Breaking rename/revocation redesign needs a staged old/new compatibility plan.

Read-only prerequisites: operator records deployed web/worker revisions, applied migrations, Auth redirects and key algorithm, available volumes/configuration and staging isolation. This phase neither needs nor changes production credentials. Future deployment uses existing production compose project/volumes and preserves secrets; consult normal self-hosting/runbook rather than treating mobile docs as a migration command.

## Masterplan corrections established by source

- request_account_deletion returns scheduled timestamp, not request UUID; it deactivates profile immediately and requires recent JWT amr.
- Google Drive provider tokens are memory-resident; Dropbox/OneDrive use sessionStorage; native secure persistence is a policy change.
- OneDrive public-link revocation is explicitly unimplemented; external previously public bytes cannot be made private retroactively by a DB visibility flag.
- HMAC signed protected URLs survive membership/share revocation until expiry; share review feedback does not check max_uses, and resolve/read counter boundaries differ.
- get_resolved_post_cards is compact, mixed-case, sometimes sparse; create-job HTTP result is a summary, not the full MediaProcessingJob type.
- S3 protected storage is a placeholder, while actual factory uses local storage. APNs/version discovery/resumable worker upload/CAS drafts are absent.
- Existing server cleanup removes protected files and auth account; it does not use user OAuth tokens to honor remote original deletion. That user option needs an explicit native/provider workflow or product correction.
