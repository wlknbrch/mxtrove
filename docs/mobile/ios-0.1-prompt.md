# Ready-to-run iOS 0.1 prompt

Run this **in a separately opened `mxtrove-ios` repository**, after making these Phase0 contracts available read-only. This prompt is a handoff, not authorization to create an app/repository in the current Phase0 task.

```text
Execute ONLY iOS 0.1 (Foundation and visual shell) from the MxTrove iOS Masterplan.

First inspect this repository, its instructions and git status; preserve existing
work. Read the MxTrove backend's docs/mobile/README.md, feature-parity.md,
compatibility.md, authorization.md, decisions.md, contracts/schema-map.md,
contracts/errors.md, contracts/api.openapi.yaml, contracts/parity.json and fixtures.
Use contract baseline 0.1.1. Original runtime base is backend commit
fc3ee23cf2182f5f8d2a4617183fe3207050eedf (web v1.2.1), with subsequent local
security maintenance in the current contract artifacts. Pin the commit containing
these artifacts; do not treat the unmodified base as the security-patched build.
Real screenshots are at c4afc05ba2cb614ca6e1d3be4838093877e854bc.
Record the actual contract artifact/backend revision used; do not assume main
equals production or imply unresolved APIs are deployed.

Create or complete a standalone Swift/SwiftUI iPhone Xcode project in this iOS
repository. No WebView/React wrapper or copied web UI. Check available Xcode,
Swift and Simulator, select and document explicit toolchain/minimum iOS and
dependency pins. Default minimum iOS18 if supported and no existing instruction
overrides it. Document any bundle/signing decision; never invent Team ID or keys.

Build modules App, Core, Data, Features, Media, Integrations, DesignSystem,
Resources, Tests and Docs. Add development/staging/production configurations
with public-value templates only; no automatic production fallback. Build
typed/cancellable network and auth/session protocols, domain errors, Keychain
abstraction with tests, dependency injection, AppCoordinator/NavigationRouter
and a single player coordinator interface. Do not implement a fake signed-in
session, live OAuth, cloud uploads, APNs or future full feature screens in 0.1.

Create a premium native shell faithful to real web screenshots at backend commit
c4afc05: docs/screenshots/mx-home.webp, mx-library.webp, mx-project.webp,
mx-publish.webp, mx-profile.webp and mx-storage.webp. Inspect them before visual
work. Use Home/Explore/Library/Projects/Inbox tabs, auth/splash shells, a separate
notifications destination and persistent mini-player shell. Placeholder screens
must honestly show loading/empty/offline/error/not-connected state. Synthetic
data is for previews/tests only, never a hidden substitute for live services.

Implement all appearance tokens: dark/light/system; violet #9d5cff, rose #ed5f98,
cyan #22b9d5, emerald #26b982, amber #d99530; comfortable/compact;
show_waveforms, autoplay_next, remember_volume/player_volume, reduced_motion,
reduce_motion, increase_contrast, reduce_transparency and larger_ui_text.
Preserve wire names while honoring OS Dynamic Type/Reduce Motion/VoiceOver.
Use bounded artwork loading, accessible controls and adaptive safe areas.
No desktop Cinematic FX on iPhone and no permanently running visualization.

Use DTO/domain separation, mixed-case explicit mapping and fail-closed unknown
role/visibility handling. Decode the portable Phase0 fixtures in Swift tests;
include missing/null/unknown/64-bit/date/error cases. Test environment isolation,
session/logout cache boundaries, routing, cancellation/retry policy, Keychain
abstraction and appearance variants. Do not declare source-only role fixtures
proof of server RLS, or enforce new server guarantees in the client by guessing.

Add reproducible macOS build/test commands and macOS CI (no signing secrets),
unit/UI tests and preview/screenshot catalog. Build on at least a small and large
iPhone Simulator if available; capture dark/light, five accents, large text,
loading/empty/error and VoiceOver labels. State exactly what could not run.
Personal-Team/capability problems block only that integration, not simulator
tests. Do not enable unsupported APNs/Associated Domains entitlements.

Do not modify/deploy production backend, credentials, migrations or shared VPS
containers. Preserve AGPL attribution and document standalone native license/
distribution as a decision if unresolved; current code has no Apache exception.
No paid cloud account or production user is required for 0.1 acceptance.

Finish with files changed, selected toolchain, test commands/results, actual
Simulator screenshot evidence, requirement-to-test table, unresolved decisions,
and exact iOS 0.2 prompt. Update iOS docs/changelog/parity without claiming live
auth or future phases are delivered. 0.2 must first verify staging revisions,
Supabase callbacks/provider config and the B0/B1 prerequisites in decisions.md.
```
