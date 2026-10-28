# Portable synthetic fixtures

`payloads.json`: schema name + raw JSON payload, schema version1; decode using `wire-schemas.json` components. Includes all four post visibilities, single/album, project role/version, nullable fields, every appearance accent/theme, >32-bit byte counters, waveform V1/legacy and job summary/full row. References are deterministic synthetic UUIDs, domains are `.invalid`. No production export, provider links or usable token appears here.

`client-errors.json`: client normalization cases with observable HTTP/network input and expected kind/retry/outcomeUnknown. They are client requirements, not a new server error envelope. `authorization.json` one directory above is the role/visibility matrix for UI capability tests; it does not grant access.

Swift tests can load these with Bundle resources/JSONDecoder and Kotlin tests with kotlinx.serialization/Json. Keep raw names and null/missing distinctions. Full-domain examples use fields the domain expects; sparse-card fixtures deliberately omit heavy asset keys. For forward compatibility, tests must also insert unknown fields/enums and verify preservation or fail-closed authorization. The existing server may return additional fields.

Do not use preview fixtures in a production repository implementation as a hidden fallback. They exist only for tests/previews/offline design. Signed URLs are not stored here as a working capability; media fixture host is unresolvable `.invalid`.
