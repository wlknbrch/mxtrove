# Models, enums and serialization

Canonical definitions: [models.md](models.md) contains every exported domain/feature type verbatim and [inventory.json](inventory.json) contains structured fields, optionality, literal unions, table definitions with ordered alterations, foreign keys/CHECK/default constraints and exact latest function bodies. [source-inventory.md](source-inventory.md) renders all 51 tables and 142 SQL identities. This audit does not substitute TypeScript casts for a live database catalog.

## Mapping rules for both platforms

| Wire value | Swift domain | Kotlin domain | Rule |
|---|---|---|---|
| PostgreSQL UUID / `id`, `*_id` | UUID or domain-wrapped UUID | UUID/domain ID | Preserve canonical IDs across clients; provider file IDs and share tokens are opaque strings, not UUIDs |
| `timestamptz` string | Date via fractional/nonfractional ISO-8601 decoder | Instant | UTC on wire; optional fractional seconds and `+00:00`/`Z`; display local time |
| `bigint` byte counters | Int64 | Long | Never 32-bit; JSON integers currently numeric; do not round through Float |
| SQL numeric / duration/seconds/confidence/progress | Double with finite/range checks | Double | Zero is not null; seconds are not milliseconds; confidence can be null |
| nullable property | Optional | nullable | Different from absent key; card DTOs omit heavyweight properties |
| optional TS property | decodeIfPresent / default only where documented | default only where documented | Missing new fields are tolerated; never default missing permission to allow |
| text enum | raw-value wrapper + unknown(String) | sealed/raw wrapper with Unknown | Preserve raw unknown values; unknown role/visibility denies mutations |
| JSONB payload/metadata | JSONValue or versioned DTO | JsonElement/versioned DTO | Do not stringify/parse twice; draft schema_version and payload.schemaVersion differ in casing |
| snake_case rows, camelCase card/waveform/worker results | explicit CodingKeys per DTO | explicit SerialName per DTO | A global convertFromSnakeCase cannot describe the mixed API |

## Domain-to-table map

| Domain | Canonical relations / outputs | Native note |
|---|---|---|
| Profile | profiles; get_current_profile_v2/get_profile_by_username_v2/save_profile_v2 | Auth user ID is profile ID; privacy-aware RPC may redact fields |
| CloudConnection, Asset | cloud_connections, assets | Credentials are not connection metadata; provider file IDs are opaque |
| Song, SongVersion | songs, song_versions | Version owner may differ from song owner in collaboration |
| Post, SinglePost, ReleaseTrack | posts, single_posts, release_tracks | Single points to featured version; EP/album has ordered track records |
| ResolvedPostCard | get_resolved_post_cards → `{post_id, card}` array | RPC card is not full detail and is not the web hydrated object |
| PostDraft | post_drafts | payload is versioned JSON; `updated_at` is not a compare-and-swap condition |
| Comments/hearts/follows | comments, comment_hearts, post_hearts, version_hearts, follows | No public full follow graph; engagement aggregates via RPC |
| Conversation/Member/Message | conversations, conversation_members, messages | User JWT/membership and block/DM policy; deleted_at is meaningful |
| MessageAttachment | message_attachments | Three file types plus three reference types; references convey no new entitlement |
| Notification/Preferences/Subscription | notifications, notification_preferences, push_subscriptions | Web Push records are not native devices |
| CollaborationProject/Member/Invite/Track/Activity | collaboration_projects, collaboration_project_members, collaboration_project_invites, collaboration_project_tracks, collaboration_activity | Six roles; membership accepted/removed and project archived_at matter |
| FeedbackThread/Reply/Reaction | feedback_threads, feedback_replies, feedback_reactions | Timestamp/range/category/priority/status and exclusive reaction |
| MediaProcessingJob | media_processing_jobs; worker get job | Create-job response is only id/status/stage/progress, not a full job |
| WaveformDataV1 | waveform_data / waveform_peaks | See exact envelope below; legacy flat arrays remain possible |
| ProtectedMediaAsset/Quota | protected_media_assets, protected_media_quotas | Service-only storage/checksum fields are not client authority |
| ShareLink | share_links and RPC resolvers | Raw token returned on creation only; hash/access logs are not share credentials |
| Privacy/Appearance | profile_privacy_settings, profile_appearance_settings | Missing row requires documented defaults, not a fabricated saved row |
| Account export/deletion | data_export_requests, account_deletion_requests | Async states; protected export URL obtained using existing read-url |
| Admin/reporting | app_admin_roles, reports, report_admin_notes, admin_moderation_actions | App role never inferred from project role |
| Internal operational data | feed_events, push_delivery_queue, push_delivery_attempts, share_link_access_logs, social_preview_cache, terms_acceptances | Native normally uses authorized projections/RPCs, not worker service operations |

## Canonical enum groups

Domain and named feature literal enums are generated into `wire-schemas.json`; all inline field unions and more complex feature composites remain exact in models.md/inventory.json. Wire schemas cover domain rows plus reviewed HTTP/card/share shapes; TypeScript-only composite/view types are not falsely advertised as complete JSON Schemas. Key distinctions:

- Post/asset `Visibility`: `private`, `followers`, `unlisted`, `public`.
- SongVersion `sharing_mode`: `private`, `project_members`, `followers`, `public` (no `unlisted`).
- Project visibility: `private`, `members_only`, `link_invite` (not post visibility). Profile visibility: `public`, `members_only`.
- Project type: `single`, `ep`, `album`, `loose_collection`; post type: only `single`, `ep`, `album`.
- Project role: `owner`, `admin`, `editor`, `contributor`, `reviewer`, `viewer`; app admin roles are a separate SQL constraint.
- Project status: `planning`, `active`, `review`, `finalizing`, `completed`, `archived`. Track states are `idea`, `draft`, `recording`, `arrangement`, `mixing`, `review`, `approved`, `final`.
- Version review: `not_requested`, `review_requested`, `changes_requested`, `approved`.
- Protected asset: `reserved`, `processing`, `ready`, `failed`, `deleted`. Media job has its own 12 states, including `generating_waveform` and legacy-named `uploading_to_drive` for any cloud provider.
- Appearance retains **both** `reduced_motion` and `reduce_motion`. Effective native motion reduction should OR account flags with OS accessibility; don't rename either on the wire.

## Sparse card and waveform contracts

`get_resolved_post_cards` accepts at most 50 IDs and returns readable rows only. Native must restore requested order by post_id and treat omitted cards as unavailable/pending refresh without leaking data. A successful omission is not evidence of corruption. Do not automatically invoke the legacy expensive fallback on native; diagnose missing migrations first.

Card payload uses camelCase fields such as `heartCount`, `viewerHasHearted`, `single.featuredVersion`, `releaseTracks[].track`, `protectedPreviewAsset`, and `feedEvent`. Heavy fields are intentionally null/absent: comments, credits/external links, private song notes and large artwork waveforms. SQL omits some Asset keys; use a **separate CardAsset DTO**, not a strict full-row decoder. `protectedPreviewAsset` is metadata; web converts it to `{asset, readUrl}` using a separate worker request. Never persist that URL as part of the card snapshot.

V1 waveform is `{version:1,durationSeconds,sourceSampleRate,analysisSampleRate:8000,bucketCount,peaks:[[min,max],...]}` with finite normalized samples. `bucketCount === peaks.length`; compact cards cap at 320 buckets. Full waveform can be larger. Legacy `number[]` uses the web normalizer's compatibility behavior; do not claim an absent legacy duration is measured or generate fake song peaks. No peaks → real scrubber fallback.

Nullable lyrics depend on `show_lyrics`/owner authorization. A null/redacted field must not be recovered from another cached user's full-row DTO.

Some SQL fields are intentionally absent from web domain interfaces: profile deactivation/suspension/deletion timestamps, protected asset storage/expiry/deleted metadata and later feedback reply project_id. SQL definitions/ALTERs are canonical; preserve permitted additional fields without treating them as new client entitlements. Strict full-row casts in web code do not prove a card response includes every required property.
