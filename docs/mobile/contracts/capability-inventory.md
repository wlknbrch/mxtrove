# Capability lookup

- [Human feature/action matrix](../feature-parity.md): product meaning, native release target, reusable versus additive boundary.
- [Per-route/per-function parity manifest](parity.json): all 52 routes and 173 API functions, source location, exact direct RPC/table targets, authorization function/policy evidence and dependency IDs from [decisions](../decisions.md).
- [Full generated inventory](source-inventory.md): API signatures/argument expressions, latest RPC signatures, all tables/ALTERs/views and final named policies.
- [Machine source evidence](inventory.json): all 707 UI event/navigation/mutation sites; exact handler text and labels where literal; all 216 source-file hashes, 46 migration hashes and 9 configuration/lockfile hashes, full function bodies and ordered grant/revoke/dynamic statements. Provider calls and transitive feature orchestration are retained alongside direct table/RPC calls.

Follow a user action from its UI handler/source → imported feature API (name/signature) → direct or imported helper's RPC/table/worker call → latest SQL body/policy or HTTP route → authorization matrix/test. A browser helper is not itself an HTTP API; helper exports and duplicate click/keyboard handlers are not separate features. Server-only routines, trigger functions and workers are deliberately inventoried but never automatically promoted to native capabilities.

Generated artifacts must be reviewed when source changes; blindly regenerating inventory after a permission change does not prove parity. Future routes/features without a release mapping cause contract generation to fail, so they cannot disappear from native planning unnoticed.
