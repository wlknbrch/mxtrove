# Security policy

## Reporting a vulnerability

Email **mxtrove@wlknbrch.com** with the subject **MxTrove security report**.
Do not post an exploitable vulnerability, credentials, or private user content
in a public issue. GitHub private vulnerability reporting may also be used
when it is enabled on the repository.

Include affected versions, reproduction steps using synthetic data, impact,
and a proposed fix if available. Redact secrets and personal information.
Please coordinate public disclosure while a fix is prepared. No response
deadline or paid bug bounty is promised.

Test against your own instance and accounts. Publishing this source code does
not authorize testing the official service, probing other people's systems,
accessing their cloud files, or disrupting a service.

## Supported versions

Security fixes target the latest release and the `main` branch. Older releases
do not have a separate maintenance promise. Self-hosters are responsible for
updating their instance, OS, database, container images, and dependencies.

## Trust boundaries

- Supabase publishable keys are public; RLS and authenticated server checks
  enforce authorization. Server secret/service-role keys must stay server-side.
- Cloud OAuth sessions, signing keys, push private keys, private share URLs,
  and protected media must never be committed or included in frontend builds.
- Protected-media volumes must not be exposed as static files. Worker reads
  must validate identity/permission or a valid, limited share/signature.
- Only public, permitted metadata may enter a persistent shared browser cache.
- External pull requests run without production secrets or deployment rights.

Run `npm run security:scan` for the working tree and
`npm run security:scan -- --history` before publishing history. These checks
complement review; passing a scanner does not prove an absence of secrets or
vulnerabilities. If a secret is exposed, revoke/rotate it before cleaning Git.
