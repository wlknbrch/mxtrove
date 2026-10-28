# Security checks

## Local security remediation candidate — 2026-10-27

Read-only GitHub inspection found24 open CodeQL alerts on remote main
`c4afc05ba2cb614ca6e1d3be4838093877e854bc`, seven Dependabot alerts and no
open secret-scanning alerts. The npm registry additionally reported a Zod
advisory not yet represented in that Dependabot snapshot.

The local candidate applies these fixes:

- Dependencies: React Router DOM7.18.4, Zod4.6.7, compatible form resolver5.9.2,
  Vite7.3.7 and Fastify rate-limit10.3.0, with regenerated lockfiles/notices.
  Both full npm audits report zero findings, including development packages.
- CodeQL #1: trusted-origin public media with validated, bounded manual redirects;
  no URL credentials, nonstandard ports, internal-IP destinations or arbitrary
  redirect hosts. The Vite proxy and social artwork loader reuse that boundary.
  Social images have a streaming12MiB cap before allocating an entire response.
- CodeQL #2–#10: validate UUID job identifiers before building paths, canonicalize
  their case and enforce storage-root containment; adversarial create/delete
  regression cases complement existing protected-storage tests.
- CodeQL #11: escape both backslashes and quotes in Drive name/parent literals.
- CodeQL #12–#24: maintained Fastify global rate-limiting plugin, bounded client
  cache, shared policy budgets and readiness limiting. HTTP429 survives the
  custom error handler and is tested through actual Fastify requests.
- CI audits now fail on all advisory severities, including dev dependencies;
  public pull requests also receive CodeQL analysis.

No alerts were dismissed, no credentials changed, and no production deployment
or database migration was performed. Local regression tests verify the changes;
GitHub alert closure still requires publishing this candidate and a successful
new CodeQL/Dependabot analysis. Do not describe the remote alert list as cleared
before that analysis. Real provider OAuth/streaming remains a staging check.

## Recovery and additional dependency remediation — 2026-10-28

The previous fixes were saved in local commit `54699f0`, then removed from
active main by a reset to `origin/main`. The original commit is retained on
`codex/recovered-security-54699f0`; the remediation branch restores its changes
on top of the current remote main, including the native Phase 0 contracts.

GitHub now also reports GHSA-gcqx-w48m-w2h4 for `deepmerge` through Meyda's
unused Rollup build plugin. No patched deepmerge release is available. Pin
Meyda to 5.6.2, which omits that build dependency; the ESM implementation and
public declarations are identical to 5.6.3. The Node build imports its declared
DCT/FFT dependencies instead of bundling them. Audio-analysis regressions must
pass before publication. This removes the vulnerable dependency rather than
dismissing the alert or hiding it from audits.

Gitleaks mistook prose in the media-attachment verification checklist for a
generic key. The anchored exception permits only that exact phrase, allowing
line wrapping in historical copies; credential patterns and CodeQL rules remain
enabled.

The first published candidate's CodeQL analysis returned zero results. CI also
caught a missing Docker build input for the shared Vite upstream validator and
an incorrect new pgTAP expectation about the account-deletion RPC's EXECUTE
grant. The image now includes the specific helper. The SQL test invokes the RPC
as anon and requires the existing Authentication required exception before any
account action, rather than treating callable and authorized as equivalent.
Fresh GitHub checks still need to validate these integration corrections.

## Historical publication baseline — 2026-10-20

Checked on 2026-10-20. This records the scope of checks, not a penetration-test
or an assurance that no vulnerabilities exist.

## Secrets and existing public-facing material

Gitleaks 8.30.1 was downloaded from its official release and checked against
the published SHA-256. Scans covered publication files, all 22 pre-release Git
commits, and all 21 existing Actions log archives. There were no credential
findings after reviewing one false positive: the identifier assignment
`dropboxClientId` assigned to `dropboxClientId` in `src/lib/env.ts`. The scanner configuration
allows only that exact identifier-to-identifier match, not Dropbox keys generally.
The remote had one branch (`main`), no tags/releases, and no Actions artifacts.
Run both scans again for the final commit before publication.

## Dependency updates

Compatible npm security updates were applied to both lockfiles. After updates,
the media worker audit reports no known vulnerabilities. The frontend has two
moderate findings attributed to React Router 6 and its wrapper; no high/critical
production dependency findings remain.

The remaining upstream advisories are:

- <https://github.com/advisories/GHSA-wrjc-x8rr-h8h6>: backslash-based open redirect
  in Link/useNavigate. Avoid passing untrusted destinations to navigation.
- <https://github.com/advisories/GHSA-337j-9hxr-rhxg>: SSR error-deserialization
  constructor injection. MxTrove's Vite client does not use SSR hydration;
  introducing SSR requires reassessing this advisory.

npm proposes a breaking move to React Router 7 to eliminate these remaining
findings. That migration is separate work and is not silently applied as part
of licensing the project. Scheduled audits fail on high or critical production
findings and continue to display moderate findings. Reassess upstream fixes and
the actual installed versions before each release.

## Limits

The current machine has no Docker daemon. A clean Supabase migration/RLS run
and real Docker image builds are checked in GitHub CI, not established by a
frontend demo. Real OAuth/provider and multi-user playback acceptance require
dedicated test accounts. Existing production data was not modified.
