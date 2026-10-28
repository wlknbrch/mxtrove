# Native identity and provider OAuth

Current-source facts and external requirements are separate below. Provider consoles, hosted Supabase settings and Apple entitlements were **not** inspected or changed. Official documentation checked 2026-10-27; recheck before implementation/distribution.

## Two independent authorization contexts

Supabase Auth identifies the MxTrove user. Google Drive/Dropbox/OneDrive access authorizes that user's personal files. A Google Supabase login does not prove Drive file access. Each provider connection metadata row can exist while the current device has no valid token.

| Flow | Current web implementation | Native adaptation / required configuration |
|---|---|---|
| Supabase email/password/session | auth API + browser Supabase client | Same project/publishable key/user UUID; native SDK auth, Keychain storage, refresh coordination and local-session signout |
| Supabase Google OAuth | redirect to current window origin `/`; pending Terms in sessionStorage | ASWebAuthenticationSession/SDK-supported flow; exact native callback in Supabase allowed redirects; persist pending auth intent securely, validate callback/state; same existing identity |
| Signup confirmation/password recovery | current-origin `/reset-password`; SDK auth events | Native callback/recovery route or supported web fallback; verify actual email template and redirect allowlist in staging |
| Google Drive | GIS browser token client, `drive.file`, in-memory provider state | Register iOS client for chosen bundle ID/reversed scheme; native Google authorization; preserve minimal scope and cloud folder/file IDs |
| Dropbox | popup + postMessage, code+PKCE S256, sessionStorage; short-lived token, explicit revoke on disconnect | Native public-client code+PKCE or SDK, registered redirect; same app-folder permissions; decide locally held refresh token lifetime explicitly |
| OneDrive | Microsoft common tenant code+PKCE, `openid profile email User.Read Files.ReadWrite`, sessionStorage | Register mobile platform/redirect; MSAL or compliant native PKCE; verify tenant/account types and least scopes; do not reuse SPA redirect blindly |

Google provider state is in memory, whereas Dropbox/OneDrive serialize sessions in sessionStorage; the masterplan's blanket “all cloud tokens in sessionStorage” is an approximation. The current Dropbox/OneDrive code does not implement a durable refresh-token flow; `restoreSession` rejects expired tokens. A native refresh policy is therefore a deliberate lifecycle difference, not a server metadata migration.

Supabase's Swift OAuth flow uses the platform authentication session and supports a redirectTo callback. Configure that exact callback instead of assuming the current web redirects will work in iOS. [Supabase Swift OAuth](https://supabase.com/docs/reference/swift/auth-signinwithoauth), [mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

Google distinguishes an iOS OAuth client and the URL scheme/configuration for it. Drive authorization remains separate from account sign-in. [Google iOS setup](https://developers.google.com/identity/sign-in/ios/start-integrating).

Dropbox's public-client PKCE flow avoids embedding an app secret, while refresh-token access requires the appropriate flow and secure local storage. Preserve the configured permissions rather than assuming the web code's lack of explicit scope means unrestricted access. [Dropbox OAuth](https://docs.dropboxapi.com/dropbox-api/docs/oauth).

## Session lifecycle / callback contract

1. Explicit environment configuration; no connection to production when a test/staging value is missing.
2. Restore Supabase session into SessionCoordinator, refresh with SDK; account UUID controls all caches/realtime/player state. Fetch profile, verify current Terms consent, then onboarding.
3. Keep a separate flow discriminator and random state/PKCE verifier for each cloud connection/auth/recovery. Reject unrecognized host/scheme/provider/state, consumed callbacks and replay. Cancellation leaves existing connection metadata intact.
4. Provider tokens only in Keychain, scoped to MxTrove account + provider + environment. Choose Keychain accessibility/background policy deliberately; never put credentials in UserDefaults, fixtures, telemetry or provider rows.
5. Reconnect expired provider session without creating another root or another MxTrove account. Check stored folder IDs and existing legacy MxShare structure before any folder creation.
6. On logout/account change: cancel subscriptions/tasks, stop unauthorized playback, clear private metadata/signed URLs/share tokens/queue, clear provider state and owner-scoped pending imports. Current web uses local-scope Supabase signout; do not unexpectedly log out other devices.
7. Foreground/network recovery reconciles jobs and current permission; don't continue an old JWT/private URL after account switch. Recent-auth proof for deletion is JWT amr within 10min, not merely a local password dialog.

## Mobile prerequisites to settle before 0.2/0.5

- Bundle identifier, callback scheme(s), environment-specific redirect allowlists and who administers provider registrations. No actual client IDs/secrets need to be pasted in chat.
- Supabase OAuth implementation choice (hosted flow versus supported native ID-token exchange) and safe identity-linking strategy; same email alone must not merge accounts.
- Microsoft mobile registration/redirect and chosen MSAL strategy; verify against [Microsoft identity documentation](https://learn.microsoft.com/en-us/entra/msal/objc/).
- Refresh-token persistence/revocation policy, including shared iPhone/provider account changes and revoked cloud permissions.
- Apple login-alternative/account-deletion/UGC review gates for the final distribution model. This audit does not conclude App Store compliance. Check current [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) before public distribution.
- Custom-scheme callbacks can be used for early local development if permitted by registrations; Universal Links/APNs are separate signing/entitlement/deployment gates. No Apple Team ID or paid capability is assumed.
