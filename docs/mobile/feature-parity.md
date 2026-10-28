# Feature parity and traceability

All entries are **audited web behavior / native not implemented**. Versions are delivery targets from the masterplan, not shipped functionality. `U` means the backend transport can be reused with the same JWT/RLS; `N` means native client implementation/configuration; `A` means additive backend work or an unresolved backend guarantee. These can coexist.

Every route and exported feature API is individually enumerated in [source-inventory.md](contracts/source-inventory.md). [parity.json](contracts/parity.json) maps **every route and all 173 API functions** to a release, native disposition and source. The 707 UI handler/navigation/mutation sites, including keyboard/pointer events, links and controls outside pages, are in `inventory.json.uiActions`; they are source traceability, not 707 distinct product features. The following matrix supplies the human meaning and exceptions.

| Capability and user actions | Web implementation / service boundary | Native target | Disposition and parity rule |
|---|---|---|---|
| Password sign-in, signup, Google sign-in, sign out, session restoration | `features/auth/api.ts`, `hooks/use-auth.tsx`, Supabase Auth | 0.2 | U/N: same user IDs; OAuth/recovery redirects and Keychain differ |
| Terms consent, pending Google consent, onboarding/profile setup | `features/legal/api.ts`, `terms.ts`, `terms-acceptance-gate.tsx`, `profile/onboarding-page.tsx` | 0.2 | U/N: version `2026-08-05`; pending intent expires after 15 minutes; navigation gate is not universal server-side Terms enforcement |
| Forgot/reset password; email/password change and reauthentication | `auth/password-recovery-pages.tsx`, `privacy/account-api.ts` | 0.2 / 0.9 | U/N: SDK auth operations and recovery flow; never blindly replay credential mutations |
| Home: followed/own, trending/latest fallback, pagination, refresh | `feed/api.ts`, `use-feed-realtime.ts`, post-card RPC | 0.3 | U: page 6; compact bulk cards, no per-card detail resolution |
| Explore: newest/trending, post-type/search filters, load more | `feed/explore-page.tsx`, `feed/api.ts` | 0.3 | U: page 8; bounded lists and user-scoped cache |
| Global search: creators, posts, songs, projects; select result | `search/api.ts`, `search_v2_catalog`, `search_public_catalog` | 0.3 | U/N: preserve result discriminants and authorization; debounce/cancel |
| Creator discovery, profile read, stats, pinned release, external links | `profile/api.ts`, `follows/api.ts`, profile/metrics RPCs | 0.3 | U: use privacy-aware RPCs, do not fetch full private profiles to render a card |
| Follow/unfollow, follower/following lists | `follows/api.ts`, social RPCs | 0.4 | U: direct `follows` table is participant-only; use connections RPC |
| Edit profile, avatar, display name, username, location, links, pin | `profile/api.ts`, settings/profile page, provider assets | 0.4 / 0.5 | U/N: avatar upload depends on native cloud authorization |
| View post/single/EP/album, track list, credits, external links, lyrics | `posts/api.ts`, post detail and presentation, `get_post_song_metadata` | 0.3 | U: card DTOs are partial; full detail is a separate read |
| Hearts on posts, versions and comments; optimistic rollback | `posts/api.ts`, social tables and `toggle_version_heart` | 0.4 | U/N: toggles are not safe automatic retries after timeout |
| Comments/replies, edit/delete own, sorting | `posts/api.ts`, `comment-sorting.ts`, `get_comment_engagement` | 0.4 | U: preserve parent/depth and soft-delete semantics |
| Report a post; support/app feedback form | `posts/api.ts`, `legal/feedback-api.ts`, reports RPC/table | 0.4 / 0.9 | U: validation, reason enums and rate/length limits remain authoritative |
| Global play/pause, seek, next/previous, queue selection/context replacement, repeat, volume, collapse/expand | `components/audio/player-store.ts`, `global-player.tsx` (desktop and mobile layouts) | 0.3 | N: AVPlayer coordinator; queue contexts must retain media permissions; no shuffle/reorder/remove queue API exists today |
| Lyrics sheet, waveform seek, artwork fullscreen, scrolling long titles | audio components, `songs/lyrics-dialog.tsx`, `lib/waveform.ts` | 0.3 | U/N: real peaks only; legacy flat peaks are not V1 tuples |
| Cinematic FX, ambient light and beat visualization | audio cinematic components | 1.0 | Desktop exception: intentionally absent on web mobile and native iPhone; do not silently make it a parity blocker |
| Background playback, lock screen, remote controls, audio interruption/route changes | native requirement; browser media session is only a reference | 0.3 | N: device/capability verification; no worker change |
| Library dashboard: song/release lists, filters, sort, details | `library/api.ts`, library/song pages | 0.5 | U: current aggregate API is not a single endpoint; native must bound reads |
| Add song/version, notes, lyrics, musical key/tempo, production stage/label/changelog | `library/api.ts`, song detail | 0.5 | U/A: direct row writes; no durable import idempotency key |
| Batch import: dedup files, groups, progress, retry/cancel, leave confirmation | library import and upload modules | 0.5 | N/A: browser File/XHR/abort flow must become persistent native workflow |
| Connect/disconnect Google Drive, Dropbox, OneDrive, restore session, default provider | `drive/api.ts`, provider adapters and settings/storage | 0.5 | U/N: three public-client registrations; saved connection is not a valid local provider token |
| Existing/legacy MxShare folder migration and provider reference rewrite | drive/provider APIs, Dropbox path migration | 0.5 | U/N: reuse stored folder IDs; do not duplicate original libraries |
| Upload original directly to provider; private original playback, file metadata/deletion | `CloudStorageProvider` interface and adapters | 0.5 | N: implement all 13 methods; access tokens remain local |
| Create processing job, upload input, poll status, MP3/waveform, analyze key/tempo | media-processing API and worker `/v1/media/*` | 0.5 | U/N/A: full-file PUT works; durable resumability and idempotency are absent |
| Public preview upload/publication and protected post/project preview | `automatic-preview.ts`, protected-media routes/RPCs | 0.5 | U/N: public derivates only; preserve private originals |
| Delete song/version/asset; reference blockers; cloud cleanup | library and drive APIs; cascade migrations | 0.5 | U/N: destructive multi-system workflow; explicit confirm and reference checks |
| Create Single, EP, Album; choose versions, track order, artwork, lyrics, credits, links, review | posts create pages/API | 0.6 | U/N: existing atomic creation RPCs; provider tasks remain separate |
| Persist/list/open/delete draft, debounce autosave, local leave/recovery | `posts/drafts-api.ts`, draft hooks | 0.6 | U/A: unconditional upsert, no compare-and-swap; multi-client conflict gate |
| Edit published release/single, select featured version, presentation/visibility, delete/remove post | posts edit/detail/API | 0.6 | U/A: preserve `update_release_post`; cross-provider publication is not one transaction; no separate reversible unpublish endpoint asserted |
| Create/list/revoke release/project/version share, permission, expiry and use limit | share RPCs, posts/projects APIs | 0.6 / 0.7 | U/A: consumed-use semantics and short-lived signed URL revocation need explicit handling |
| Public guest post/profile, shared release/project/version, invite token | optional public shell, shared pages, invite page | 1.0 | U/N: same authorization; share tokens are secrets, not cache keys written to disk |
| Copy link, QR, share sheet, embed code, track-specific social link | posts/share modules, embed page, worker social routes | 0.6 / 1.0 | N: native share sheet; HTML embed editor/preview is web-specific |
| Project list/create/details; type, status, cover, description, archived states | `projects/api.ts`, workspace tabs | 0.7 | U: types/roles are project-specific, not post visibility |
| Project tracks add/remove/reorder/assign/status, active version, upload version | project API, collaboration tables/RPCs | 0.7 | U/N: accepted role checks; contributor upload does not imply track editing |
| A/B version review, playback position, waveform timestamps/ranges | project workspace, player store | 0.7 | N: device timing/seek tests; do not equate display-only selection with synchronization |
| Feedback thread, reply, reaction, priority, category, assignee, resolve/reopen/status | project API + feedback RPCs | 0.7 | U: distinguish author/editor/reviewer and link-only feedback |
| Invite by account/email, pending list, accept/decline by token/ID, role change/remove, leave, owner transfer/delete | project API and membership RPCs | 0.7 | U: owner/admin exceptions; ownership transfer is owner-only |
| Project activity and project chat, realtime refresh | workspace/activity, project/messages realtime hooks | 0.7 / 0.8 | U/N: one subscription group per active context; foreground repair |
| Direct conversations, list/open, unread/read, send/delete own message | `messages/api.ts` | 0.8 | U/A: UUID response reconciliation; no send idempotency contract |
| Send/view/delete private audio/image/document attachments | attachments API and worker | 0.8 | U/N/A: raw-byte upload, signature validation, protected access; no resumable upload |
| Attach a post/project/version reference and follow the authorized target | `create_message_reference_attachment`, attachments API | 0.8 | U: permissions checked at creation and navigation; reference is not an access grant |
| Notifications list/unread/read-all, preferences, deep links | notifications API and realtime | 0.8 | U: same in-app records and event IDs |
| Browser push subscriptions, enable/disable/test | notifications API, worker push dispatcher | 0.8 | Web-only transport: do not insert APNs tokens into VAPID subscriptions |
| Native APNs registration, logout revocation, safe notification tap | absent in current source | 0.8 | A/N: device table/endpoints, dispatcher transport, signing/entitlement gate |
| Theme dark/light/system, five accents, comfortable/compact | appearance API/settings, profile settings RPC | 0.1 shell / 0.9 sync | U/N: same persisted values; native Dynamic Type takes precedence over tiny controls |
| Waveforms, autoplay, remember volume, contrast, transparency, two motion flags, larger text | appearance API and audio/accessibility components | 0.1 shell / 0.9 sync | U/N: preserve both `reduced_motion` and `reduce_motion` until explicit migration |
| Profile visibility/discovery/location/stats, DM/invite audience | privacy API and settings | 0.9 | U: privacy RPCs; visible controls do not enforce backend access by themselves |
| Block/unblock, mute/unmute, list blocked users | privacy API | 0.4 safety / 0.9 settings | U: block is bidirectional denial; mute is filtering/preferences |
| Export JSON/CSV request, status, protected download | privacy/account API, worker exports processor | 0.9 | U: asynchronous RPC/table workflow, no `/v1/exports` HTTP endpoint |
| Request/cancel account deletion, grace period, optional cloud deletion | account API, cleanup cycle | 0.9 | U/N/A: reauthentication gate and actual cloud-cleanup behavior must be staged |
| Admin dashboard/reports/detail, notes, dismiss/hide or revoke/remove/suspend | admin API and moderation RPCs | 0.9 | U: app admin role distinct from project admin; public-only content/self-moderation restrictions; no reinstate UI invented |
| About/Privacy/Terms, changelog, source/licenses, support/feedback | legal pages, app footer, changelog dialog | 0.9 | N: changelog/support are also dialogs, not standalone router paths |
| Universal/App Links and post/track/profile/share/invite recovery routing | web routes, share URLs, social redirects | 1.0 | A/N: no AASA/app association deployment established; preserve browser fallback |
| Bounded caches, offline states, logout/role change invalidation and realtime reconnect | query-client, auth/realtime hooks | all / 1.0 | N/A: web disk persistence includes private roots; native must not copy it blindly |

## Scope discrepancies that affect planning

- There is no independent `/projects/:id/chat`, `/changelog`, `/feedback` or `/share/project/:token` router entry. Project/version shares dispatch through `/share/:token`; project conversations use messages routes. Native navigation can present these differently without inventing backend routes.
- Social/OG HTTP routes are worker routes, not authenticated product API responses. Track links use a query/redirect context; do not add a second database representation of releases.
- Supabase cached egress is not a cache for arbitrary PostgREST responses. Client cache, compact RPC results and VPS media delivery are the current savings mechanisms; freshness is TTL/event based, not a guaranteed change-only database protocol.
- The masterplan's resumable import state machine, unified errors, APNs devices, draft conflict detection and immediate revocation are desired contracts. They are not all current guarantees. See [decisions.md](decisions.md).
