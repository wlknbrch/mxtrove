# Contributing to MxTrove

MxTrove is maintained by Tom Maucksch. Bug reports, documentation, accessibility
improvements, tests, and focused code contributions are welcome.

## Getting started

Read [README.md](README.md), [the self-hosting guide](docs/self-hosting.md), and
[the architecture and trust model](README.md#architecture). Use Node.js 22
and install both dependency sets with `npm ci` and
`npm --prefix services/media-worker ci`.

Use synthetic data and your own local services/OAuth applications. Never use
the public MxTrove instance, another person's cloud account, or production
credentials as a development/test backend.

## Issues and pull requests

Search existing issues before opening a new one. Include reproduction steps,
expected/actual behavior, and the app version. Remove tokens, private media
links, user information, and private screenshots from reports.

Discuss substantial changes in an issue first. Keep pull requests focused,
explain the behavior changed, and include the checks you ran. New schema changes
must be additive migrations; do not rewrite existing migration history.
Preserve RLS, private-media authorization, bounded queries, and cache
invalidation. Document any change that affects compatibility or egress.

Before submitting, run:

```sh
npm run check
npm --prefix services/media-worker run typecheck
npm --prefix services/media-worker test
npm --prefix services/media-worker run build
npm run security:scan
```

For database changes, start a local Supabase stack and run `supabase test db`.
For UI changes, check desktop and mobile, browser console errors, and keyboard
access. Explain any checks that you could not run.

## Contribution license and sign-off

By intentionally submitting a contribution, you offer it under AGPL-3.0-only
unless maintainers explicitly agree otherwise for a separately licensed
component. You keep your copyright. No copyright assignment is required.

Certify each contribution using the Developer Certificate of Origin 1.1 at
<https://developercertificate.org/>. Add a sign-off with `git commit -s`; this
records `Signed-off-by: Your Name <your-email>` in the commit. Only submit code,
assets, and documentation that you have the right to contribute, and preserve
third-party notices. Do not paste user content or incompatible licensed code.

Future standalone SDKs/integrations may use Apache-2.0 when their own license
files explicitly say so. That is not an exception for current platform code.

## Review and support

Maintainers decide what merges and when a release ships. A report or PR does
not create a guaranteed response time. Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
