# Auth Sign-In Modal — Design

## Purpose

The header's "Log In" button currently calls `loginWithRedirect()` directly, sending
the user straight to Auth0's generic hosted page with no in-app choice or branding.
Replace it with an in-app popup that offers three explicit paths — Sign In, Create
Account, Continue with Google — each of which opens Auth0's existing hosted Universal
Login in a popup window (not a full-page redirect), scoped to the right screen/connection.

Auth0, the JWT middleware (`Backend/identity/jwtCheck.js`, `resolveIdentity.js`), and
the guest→account migration flow (`Backend/identity/AuthController.js`, wired from
`Frontend/app/page.tsx`) already exist and are already tested — none of that changes.
This is a frontend-only feature: a new modal component plus one call-site swap in
`header.tsx`.

## Non-goals

- No custom-branded credential form (no email/password `<input>` fields in this
  codebase). Auth0's hosted Universal Login still renders the actual form, inside a
  popup window instead of a full-page redirect. Rejected in brainstorming: would
  require enabling Auth0's Resource Owner Password Grant, which Auth0 itself
  discourages (no bot detection, no adaptive MFA) for meaningfully more code.
- No changes to `Backend/identity/*` — JWT validation and guest migration are unchanged.
- No changes to `Auth0ProviderWrapper.tsx`'s token/migration wiring — it already reacts
  to `isAuthenticated` flipping to `true`, which `loginWithPopup()` triggers exactly
  like `loginWithRedirect()` does today.
- Does not provision the Google Social Connection on the Auth0 tenant (see "Google
  connection setup" below) — that requires the user's own Google Cloud credentials
  and is a manual dashboard step, not something to script blindly.

## Frontend

### New: `Frontend/components/ui/dialog.tsx`

Standard shadcn-style wrapper around `@radix-ui/react-dialog` (already a dependency,
currently unused). Matches the pattern already established by
`Frontend/components/ui/{button,tabs,select}.tsx` — same CSS-variable-driven styling,
no new dependency. Exports `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`,
`DialogClose`, mirroring the shadcn primitive set other codebases in this style use.

### New: `Frontend/components/AuthModal.tsx`

```
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

- Wraps `DialogContent` around three buttons, matching the approved mockup: crest
  icon, "Join the battle" heading, Sign In (primary gradient), Create Account
  (outline), divider, Continue with Google (bordered, Google "G" glyph inline SVG —
  no emoji, per UI rules).
- Each button has its own `pending` boolean in local state. While pending: that
  button shows `lucide-react`'s `Loader2` with `animate-spin` (the same loading
  pattern already used in `PokemonBox/pokemonBox.tsx`), and **all three** buttons
  are disabled (matches the global rule: any element triggering a backend/auth
  request disables immediately on click, re-enables only after a result).
- Handlers, all via `useAuth0()`'s `loginWithPopup`:
  - Sign In: `loginWithPopup()`
  - Create Account: `loginWithPopup({ authorizationParams: { screen_hint: 'signup' } })`
  - Continue with Google: `loginWithPopup({ authorizationParams: { connection: 'google-oauth2' } })`
- On resolve: call `onOpenChange(false)` to close the modal. No manual state sync
  needed — `isAuthenticated`/`user` update through the existing `Auth0Provider`
  context, and `Auth0ProviderWrapper`'s existing effects (token getter registration,
  `frontendLogger.setUser`) and `page.tsx`'s existing guest-migration effect all fire
  off that same `isAuthenticated` flip, unchanged.
- On reject:
  - Confirmed against the installed `@auth0/auth0-spa-js@2.21.1` source
    (`PopupCancelledError`, `dist/auth0-spa-js.development.js`): closing the popup
    without finishing rejects with an error object where `err.error === 'cancelled'`
    (not an exported/instanceof-able class — auth0-react only re-exports `OAuthError`,
    so this is a plain string-property check). Treat this as a silent cancel: clear
    `pending`, no toast, no log.
  - Any other rejection: clear `pending`, show a `sonner` toast ("Sign-in failed —
    try again"), and log via
    `frontendLogger.error(err, { event: AUTH_EVENTS.LOGIN_ERROR })` — the same event
    key `Auth0ProviderWrapper.tsx` already uses for redirect-flow errors, so both
    paths land in the same Sentry/log bucket.

### Modified: `Frontend/components/header.tsx`

- Add `const [authModalOpen, setAuthModalOpen] = useState(false)`.
- Log In button: `onClick={() => loginWithRedirect()}` →
  `onClick={() => setAuthModalOpen(true)}`. Everything else about the button
  (styling, guard on `!isLoading && !isAuthenticated`) is unchanged.
- Render `<AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />` next to
  the existing auth-section JSX.
- `loginWithRedirect` import from `useAuth0()` is dropped from this file (moves
  conceptually into `AuthModal`, which uses `loginWithPopup` instead — `header.tsx`
  no longer calls either directly).

### Google connection setup (manual, outside this codebase)

Google is not yet enabled as a Social Connection on the Auth0 tenant
(`dev-mx272jsbb31suun5.us.auth0.com`). Before "Continue with Google" works end to end:

1. Auth0 Dashboard → Authentication → Social → create a Google connection.
2. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application), add the
   Auth0 callback URL (`https://dev-mx272jsbb31suun5.us.auth0.com/login/callback`) as
   an authorized redirect URI.
3. Paste the resulting Client ID/Secret into the Auth0 Google connection config,
   enable it for this app (`zrdXjBC7peXGrJ72Cbg0ory7f8CpkABr`).

This is a one-time dashboard action, not part of the implementation plan's file
changes. Until it's done, the Google button will surface the same "genuine
rejection" error path described above (logged, toast shown) rather than silently
failing.

### Allowed Callback URLs setup (manual, outside this codebase — discovered during manual verification)

Manual browser verification against the live tenant found that **Sign In and Create
Account also do not yet complete end to end** — not just Google. Both popups
correctly open Auth0's hosted Universal Login (URL matches `auth0.com`, correct
`screen_hint`/no-hint per button), but Auth0 then shows "Oops, something went
wrong — Callback URL mismatch" for `redirect_uri=http://localhost:3000`.

This is a pre-existing Auth0 Application configuration gap, not a regression from
this feature: `Auth0ProviderWrapper.tsx` passes `redirect_uri: window.location.origin`
unchanged from what the old `loginWithRedirect()` call already used, so the old
redirect-based login would have hit the identical error — it was never caught
before because the previous e2e test only asserted navigation reached an
`auth0.com` URL and never exercised a full login round-trip.

Before any of the three buttons can complete a real login in any environment:

1. Auth0 Dashboard → Applications → this app (`zrdXjBC7peXGrJ72Cbg0ory7f8CpkABr`) →
   Settings → Allowed Callback URLs.
2. Add `http://localhost:3000` (local dev) and the production origin(s) this app is
   deployed to.

Until this is done, Sign In/Create Account will surface the same "genuine
rejection" error path (logged, toast shown) as an unconfigured Google connection
does — the popup opens, then rejects.

## Data flow

```
Header "Log In" click
  → setAuthModalOpen(true)
  → AuthModal renders (Radix Dialog, focus-trapped, Esc/overlay-click to close)
  → user clicks Sign In | Create Account | Continue with Google
  → loginWithPopup(...) opens Auth0 popup window
  → [Auth0 hosted UI: login form | signup form | Google consent — unchanged, not our code]
  → popup resolves
      → isAuthenticated: true (Auth0Provider context)
      → Auth0ProviderWrapper effects fire (unchanged): token getter registered, user set on logger
      → page.tsx's existing guest-migration effect fires (unchanged): POST to migrate guest boxes/teams
      → AuthModal's own .then() closes the modal
      → header swaps to avatar/logout view (existing conditional render, unchanged)
  → popup rejects (user closed it, or real error)
      → pending cleared; cancel is silent, real error toasts + logs
```

No new backend routes, no new database writes beyond what the existing migration
endpoint already does.

## Caching Plan

Not applicable — this feature makes no new data-fetching, API, or computation calls
that would benefit from caching. `loginWithPopup()` is a one-shot auth flow; nothing
here is cached at any layer (browser, Redis, or edge).

## Testing

- **Unit** (`Frontend/components/AuthModal.test.tsx`, new): mock `useAuth0`, assert
  each of the three buttons calls `loginWithPopup` with the documented params; assert
  `onOpenChange(false)` fires on resolve; assert `popup_closed` rejection clears
  pending without a toast/log call while a generic rejection triggers both.
- **E2E** (`Frontend/e2e/auth.spec.ts`, modified): the existing
  `'login flow redirects to Auth0 when triggered'` test no longer holds — clicking
  Log In now opens the modal instead of navigating away. Replace it with: clicking
  Log In shows the modal with all three buttons visible; clicking Sign In inside the
  modal opens an Auth0 popup (assert via Playwright's `page.waitForEvent('popup')`
  and check the popup URL matches `auth0.com`). The existing
  `'logs in and sees migrated guest data'` test needs its login step updated to open
  the modal and click Sign In before filling Auth0's credential fields (which now
  live in the popup page, not the main page) — the migration assertion itself is
  unchanged.

## Files touched

**New:**
- `Frontend/components/ui/dialog.tsx`
- `Frontend/components/AuthModal.tsx`
- `Frontend/components/AuthModal.test.tsx`

**Modified:**
- `Frontend/components/header.tsx` — modal state + call-site swap
- `Frontend/e2e/auth.spec.ts` — updated for the popup-modal flow
