# Authorization matrix

This describes current source, including limitations; it is not a promise that every masterplan security target is already enforced. Exact latest helper bodies and policies are retained in `contracts/inventory.json`; local/staging SQL tests are the enforcement evidence. Native UI hints must **fail closed** on unknown roles and cannot replace server checks.

## Post and profile visibility

`can_view_post` latest definition is in `20260723125000_mxshare_v2_release_pages_moderation.sql`. It requires owner not deactivated, post not hidden and no blocked pair, followed by one of owner/public/follower/accepted member of a project whose linked_post_id matches. **It does not itself test `is_published` or the owner's profile visibility.** Do not invent stronger guarantees from the names of these flags.

| Viewer / post | public | followers | unlisted | private |
|---|---|---|---|---|
| Anonymous, no share | allowed by can_view_post | denied | denied | denied |
| Signed-in unrelated | allowed | denied | denied | denied |
| Follows post owner | allowed | allowed | denied | denied |
| Post owner | allowed | allowed | allowed | allowed |
| Accepted member of linked collaboration project | allowed | allowed | allowed through linked project | allowed through linked project |
| Blocked pair / hidden post / deactivated owner | denied by this helper | denied | denied | denied |
| Valid post share token | separate resolver, not can_view_post entitlement | separate resolver | separate resolver | separate resolver |

Profile `members_only` means **any authenticated member of MxTrove**, not followers/project members. `can_view_profile` separately checks deactivation and blocked pairs. Sharing a direct post URL does not authorize unlisted/private data. Shared resolvers have their own checks and do not call all the same predicates; compare both paths in staging rather than assume perfect symmetry.

**Projection audit gate:** the SECURITY DEFINER compact-card SQL selects `single.previousVersion` as the most recent other song version without an explicit published/visibility predicate in that subquery. It also serializes full featured/version rows. This can over-return version metadata relative to ordinary row RLS; do not equate post entitlement with blanket access to every historical version. Before native uses historical-version metadata, add staging negative cases (public single with a newer private version) and decide/redact the permitted DTO. This audit does not probe production data or change that query; backlog B2 covers the permission/projection review.

## Accepted collaboration role capabilities

Machine copy: [authorization.json](contracts/authorization.json). `Y` is the common helper allowance; extra resource ownership/status validation still applies.

| Operation / predicate | owner | admin | editor | contributor | reviewer | viewer |
|---|---|---|---|---|---|---|
| View project / can_view_collaboration_project | Y | Y | Y | Y | Y | Y |
| Edit metadata/tracks / can_edit_collaboration_project | Y | Y | Y | no | no | no |
| Upload project version / can_upload_project_version | Y | Y | Y | Y | no | no |
| Review / can_review_project | Y | Y | Y | Y | Y | no |
| Invite/manage members / can_manage_collaboration_members | Y | Y | no | no | no | no |
| Change/remove admin | Y | no | no | no | no | no |
| Change/remove non-owner, non-admin member | Y | Y | no | no | no | no |
| Transfer ownership / delete project | Y | no | no | no | no | no |
| Leave project | transfer first | Y | Y | Y | Y | Y |

Pending, declined, removed and anonymous users have no membership allowance. Project `private`/`members_only`/`link_invite` does not make an arbitrary UUID readable. View/review shares use explicit token resolvers. A project owner is also installed as accepted owner membership by creation; a corrupt missing membership must not be patched around by the client.

Direct row author-specific exceptions differ from RPC permissions. In current RPCs **any accepted reviewer-or-higher** can create/reply/resolve/reopen/change thread status and set version review status; these actions are not limited to the thread author or editor. Generic direct feedback row UPDATE uses author-or-project-editor policy; own reply edits use author policy. Creating a thread still validates project/track/version association and timestamps; review-link writers have the separate scoped path. The role table is not a blanket grant to mutate every feedback field. Exact predicates are in the generated function/policy inventory.

| Feedback action | owner/admin/editor/contributor/reviewer | viewer | Link-only reviewer |
|---|---|---|---|
| create/reply via member RPC | allowed with valid target | denied | not through membership RPC |
| resolve/reopen/status, version review status | allowed with valid target | denied | denied by membership helpers |
| Generic direct thread UPDATE | own author or project editor+ | own-author policy only if applicable; no new view entitlement | author policy alone does not establish project read rights |
| Create shared feedback | normal permissions, or valid scoped review link | valid scoped review link can authorize | signed-in + active review link and matching target |

## Other resource boundaries

| Resource/action | Current boundary | Must deny / native implication |
|---|---|---|
| Private song/source asset | owner plus explicit collaboration/version policies | no public-original fallback, no arbitrary provider token borrowing |
| Conversation/message reads | conversation membership | unrelated/removed users, cross-account cached records |
| Sending message/file attachment | member + can_send_message_to_conversation; direct recipient privacy/block checks; upload only to message sent by caller | an existing conversation does not override new DM/block restrictions |
| Reference attachments | authorized target checked by create_message_reference_attachment | guessed project/post/version ID doesn't create access |
| Deleting message/attachment | own sender/owner checks and soft deletion/cleanup | other participants cannot delete sender's attachment through worker |
| Notifications/settings/exports | recipient/profile owner | project/app admin does not gain another user's private notifications/settings |
| Follows table | either participant; public metrics/connections via RPC | unrestricted follow graph table query |
| Reports and moderation | app_admin_roles with explicit admin RPC checks | project role `admin` confers no site-admin role |
| Admin content removal | public content scope, self-moderation protections | using moderation as a route into another user's private library |
| Native device/APNs | absent | do not send native tokens to push_subscriptions |
| Service functions | worker-only reserve/finalize/release/claim/export/cleanup | no service-role/secret key in either native app |

App roles are `moderator` and `admin`. `is_app_admin(...,'moderator')` accepts both, used for reports/dashboard/removal; `minimum_role='admin'` accepts only admin. Neither is a collaboration membership, and neither authorizes reading private notifications. Self-target protections are enforced by latest moderation triggers in addition to RPC guards.

## Protected media and share caveats

`POST /v1/protected-media/:assetId/read-url` authorizes JWT **or** supplied share token via can_access_protected_media. That helper requires ready/not-deleted/not-expired asset, no blocked pair, then owner/message membership/visible post/project membership/or matching active share. Token max-use comparison is `<=` here, while initial resolvers require `<` before consuming the use.

Direct `GET/HEAD` accepts a valid HMAC signature **without rerunning** that helper; it still checks asset ready/not-deleted and local file existence. HMAC binds asset ID and expiry, not user/session/share. Default lifetime is 300 seconds. Removing membership, blocking, logout or revoking a share stops **new URL issuance**, but an already issued URL can remain usable until expiry. Direct stream path does not independently check asset.expires_at; this is a hardening gap, not an immediate-revocation guarantee. Already downloaded bytes cannot be recalled.

Without a valid signature, GET requires JWT; a share-token header alone without JWT is insufficient on this path. Anonymous share readers first use read-url. HEAD and Range use the same authorization branch as GET. Signed URLs and share tokens must stay in memory; purge/stop private playback on logout, account switch or observed permission loss. Mandatory gate before claiming immediate revocation: implement scoped/revocable media access and test existing-issued URLs, asset expiry, HEAD/Range, blocked/removed members and share counters.

`create_shared_feedback_thread` requires an authenticated reviewer with an active review link and matching track/version. Current code **does not recheck max_uses** there; initial resolve and playback use other counter rules. Documented as an explicit policy decision/gap instead of silently strengthening it on paper.

See [verification.md](verification.md) for the negative test matrix. Static role fixtures model helpers only, not production authorization.
