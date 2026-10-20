# Licensing and distribution

## Platform

Copyright (C) 2026 Tom Maucksch. The original MxTrove platform is licensed under
**AGPL-3.0-only**. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE). This covers
frontend, worker, original database migrations, tests, documentation, deployment
scripts, and first-party project assets. Third-party components retain their own
licenses. User uploads and personal data are outside the software license.

No current platform directory is exempted for an SDK or integration. A future
standalone library may use Apache-2.0 only through its own explicit license and
compatible dependencies. Contributors retain copyright in their contributions.

## Providing source

When distributing the software, comply with the AGPL's source and notice
requirements. When running a modified network version, prominently offer its
users the Corresponding Source of that version at no charge (AGPL section 13).
Include relevant frontend, worker, migrations, build and installation scripts,
modifications, and required notices. A link to unmodified upstream is insufficient
for a modified deployment. Private keys, real users' data, and private media do
not belong in the source offer.

Set `VITE_SOURCE_URL` and `PUBLIC_SOURCE_URL` to the accessible source of the
deployed revision, preferably an immutable commit or matching source archive.
If frontend and worker are deployed from different revisions, point each to its
own revision. Keep source available for the applicable license obligations;
do not link to an inaccessible private repository. The app's Source link and
worker source endpoint expose these offers without an extra API request.

## Branding and assets

Use [TRADEMARKS.md](../TRADEMARKS.md) to identify independent services clearly.
It addresses trademark/endorsement, not additional copyright restrictions.
Brand images in `public/` and the project concept image in `src/assets/docs/`
are supplied as project assets under the platform license. Preserve upstream
attribution when replacing them. Embedded third-party fonts and icons retain
their original license/copyright notices.

Only include music, screenshots, artwork, and other demo materials you have
permission to redistribute. The seed and UI demo must contain synthetic accounts;
never export the production database as demonstration content.

## Binary and container distributions

`npm run licenses:generate` builds [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)
from both npm lockfiles and locally installed license texts. Regenerate it after
dependency changes. Inspect the licenses of the target platform packages too.

FFmpeg is executed as a separate program. Its actual license depends on its
build configuration, including optional GPL components. Sharp's bundled libvips
contains LGPL components. Shipping a Docker image ships these binaries as well
as their OS dependencies: inspect the exact image, preserve notices, and satisfy
the corresponding source/relinking requirements of the applicable versions.
The application license alone does not satisfy dependency obligations.

For the initial release, publish platform source and Docker build recipes.
Do not publish prebuilt container images until an image inventory and the
required third-party source/notices have been prepared for that exact image.
See <https://ffmpeg.org/legal.html> and the packaged libvips license files.
