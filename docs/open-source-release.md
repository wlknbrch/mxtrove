# Open-source release checklist

This is a publication checklist, not a claim that all external GitHub settings
or a fresh production installation have already been verified.

## Before publication

- Verify the project/license/asset rights and third-party attributions. The
  platform is AGPL-3.0-only, copyright Tom Maucksch; no current SDK exception.
- Fetch and inspect all remote branches/tags. Run `npm run security:scan` and
  `npm run security:scan -- --history`. Inspect findings without publishing
  their secret values. Revoke real exposed secrets before cleaning history.
- Review commit author information, screenshots, seed data, and other personal
  information. Synthetic seed accounts/passwords must stay local-only.
- Review **all** existing GitHub Actions logs, artifacts, releases, packages,
  issues, PRs, and other material that becomes public with the repository.
- Install both dependency sets, regenerate third-party notices, run CI checks,
  test a fresh local database, and validate the self-hosting recipe.
- Confirm a public source URL for the exact deployed frontend/worker versions.
- Keep production credentials and protected-media volumes outside publication.

## Repository settings

- Publish under the existing `wlknbrch/mxtrove` identity and preserve attribution
  and history once safe. Do not force-push a cleanup without a recovery plan.
- Description: "Open-source music collaboration, versioned releases, and
  protected cloud playback. Self-hostable under AGPL-3.0."
- Topics: `music`, `collaboration`, `self-hosted`, `supabase`, `react`, `agpl`.
- Enable issues, Dependabot/security alerts, private vulnerability reporting,
  secret scanning/push protection where available, and code scanning.
- Protect `main`: require passing CI and review before merge, prevent force
  pushes, and restrict release/deployment rights to maintainers.
- Approve public fork workflows according to repository policy. No workflow
  should check out untrusted code with production secrets or write privileges.

## First release

Create an immutable version tag matching an approved commit. Publish a source
release with installation links, license/branding scope, compatibility notes,
known limits, and the checks actually performed. Do not create a version tag
pointing at the pre-license code. Never overwrite an existing version tag.

Initial scope: source plus Docker build recipes. Publish prebuilt containers
only after the exact-image dependency/source compliance work described in
[licensing.md](licensing.md). A public code release does not deploy the live app.

## Ongoing work

Use [the roadmap](roadmap.md) and focused starter issues. Keep both npm lockfiles
and notices current. Keep the private reporting contact monitored. Record which
source revision matches each production deployment and each public release.
