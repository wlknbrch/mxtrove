# Publication security checks

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
