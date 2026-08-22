# Moderation and DSA readiness

This document records the privacy boundary of the MxTrove administration area
and the work required before treating the in-app reporting flow as a formal EU
Digital Services Act (DSA) notice-and-action mechanism. It is an engineering
readiness note, not legal advice.

## Current administration boundary

`/admin` is available only to profiles with a server-managed `moderator` or
`admin` role. Its database RPC deliberately exposes only:

- published posts whose visibility is `public` and which are not hidden;
- non-deleted comments on those public posts;
- profiles configured as public and discoverable;
- preview audio and artwork currently referenced by public posts; and
- aggregate report-queue statistics.

It does not expose private or follower-only posts, private library songs,
original audio, unused assets, projects, conversations, messages, or message
attachments. Reports remain separate moderation cases. A report about a
private surface must not become a general-purpose way to browse that surface.

## Existing report capability

MxTrove already stores typed reports and product feedback, supports internal
moderator notes, and provides narrowly scoped server-side moderation actions.
This is useful for community moderation, but the current signed-in report flow
must not yet be described as a complete Article 16 DSA mechanism.

## Required notice-and-action follow-up

Before public launch in the EU, review the service classification with legal
counsel and implement a dedicated, easy-to-find `Report illegal content` flow.
The planned flow should cover at least:

1. Electronic submission that is available to any individual or entity, not
   only an authenticated MxTrove account.
2. The exact content location, normally the canonical release/profile/comment
   URL plus an internal immutable target identifier.
3. A sufficiently substantiated explanation and the alleged legal basis.
4. Reporter name and email where required, with the statutory exception for
   certain child-sexual-abuse-related reports.
5. A good-faith declaration that the notice is accurate and complete.
6. Immediate receipt confirmation when contact information is supplied.
7. Timely, diligent, objective, and non-arbitrary case processing with a full
   audit trail.
8. A decision notice to the reporter and a statement of reasons to an affected
   user when content or account access is restricted.
9. A separate complaint or appeal workflow, including reversal tracking.
10. Moderation metrics needed for any applicable transparency reporting.

The case schema should distinguish alleged illegality from a Terms of Service
violation, record legal jurisdiction and legal ground, preserve the submitted
URL and evidence, and record acknowledgement, decision, reason, appeal, and
resolution timestamps. Reporter contact data should be kept separately from
the public target and protected by strict RLS and retention rules.

## Sources

- Regulation (EU) 2022/2065, especially Articles 16 and 17:
  https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng
- European Commission notice-and-action overview:
  https://digital-strategy.ec.europa.eu/en/policies/dsa-notice-and-action-mechanism

