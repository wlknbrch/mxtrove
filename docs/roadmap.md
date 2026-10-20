# MxTrove roadmap

This is a direction, not a delivery schedule. Maintainers prioritize privacy,
reliable music workflows, accessible interfaces, and bounded infrastructure use.

## Open-source foundation

- AGPL-3.0-only platform, complete contribution/security documentation, and
  clear identification of independently operated forks.
- Reproducible local setup and self-hosting without official-service credentials.
- Public CI, dependency/license inventories, secret scanning, and release checks.

## Next priorities

- Expand integration coverage for release visibility, session changes,
  cloud-provider failures, cache invalidation, and protected playback.
- Improve setup diagnostics and operator configuration across all surfaces.
- Document measured database egress and media/storage costs per workflow.
- Improve keyboard/screen-reader accessibility and mobile player reliability.
- Make update, backup, and restore instructions easier to validate.

## Later exploration

- Standalone SDKs and integration libraries under Apache-2.0, with their own
  explicit license files and dependency boundaries.
- Additional protected-storage backends after implementation and security tests;
  the current S3 class is only a boundary, not a supported production backend.

Good first contributions include documentation corrections, focused accessibility
fixes, and regression tests. Discuss substantial work before beginning.
