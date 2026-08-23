# Guest Starter Pikachu — Design

## Purpose

Every guest (unauthenticated) account should see a pre-built Pikachu already sitting
in Player 1's active slot (bench index 0) when the app loads, so guests have
something to inspect/damage-calc immediately instead of an empty team builder.
Authenticated users never see this — it is guest-only, and is not persisted for a
user once they pick a real team.

## Non-goals

- Not persisted across sessions/devices (no localStorage, no DB row per guest).
- Not shown to authenticated users under any circumstance.
- Does not fill bench slots 1–5 — it is a single "starter" Pokemon, not a full team.
- Does not survive the user picking or clearing a P1 team — it is a first-load
  convenience only.

## The Pokemon

Sourced from the provided reference image, Player 1 panel:

| Field | Value |
|---|---|
| Species | Pikachu |
| Level | 8 |
| Gender | Male |
| Nature | Naughty (+Atk, -SpD) |
| Ability | Lightning Rod |
| Item | Light Ball |
| Tera Type | Electric |
| IVs | 31 / 31 / 31 / 31 / 31 / 31 (HP/Atk/Def/SpA/SpD/Spe) |
| EVs | 0 HP / 252 Atk / 0 Def / 0 SpA / 0 SpD / 252 Spe |
| Moves | Volt Tackle (Electric/Physical/120), Thunderbolt (Electric/Special/90), Iron Tail (Steel/Physical/100), Quick Attack (Normal/Physical/40) |
| Status | Healthy, Current HP = Max HP |

## Backend

### Feature folder: `Backend/guest-starter/`

Mirrors the existing `Backend/enemy-preview/` feature's file layout (service +
controller only — no interface/domain/mapper). Per backend-conventions, features
with no invariants beyond the schema may skip those layers; this feature has no
database access at all, so the same reasoning applies even more strongly than it
does for enemy-preview.

- `Backend/guest-starter/guestStarterService.js`
  - Exports `GUEST_STARTER_PIKACHU`: a hardcoded, already-resolved Pokemon object
    (same shape/style as `HARDCODED_BULBASAUR` in `enemyPreviewService.js`) built
    from the table above.
- `Backend/guest-starter/publicControllers.js`
  - `getGuestStarterPikachu(_req, res)`:
    - Sets `Cache-Control: public, max-age=300, s-maxage=3600` and
      `CDN-Cache-Control: max-age=3600` (same as enemy-preview).
    - Returns `200 { pokemon: GUEST_STARTER_PIKACHU }`.
    - No 404 branch needed (unlike enemy-preview) since the data is a constant,
      never absent.

### Route

`GET /public/guest-starter-pikachu`, added to `Backend/Routes/publicRoutes.js`,
mounted under the existing `/public` prefix in `server.js` (already unauthenticated).

### Access control

- **Public** — no auth middleware, no ownership check. Marked at the route with
  `// PUBLIC — no auth required: static guest onboarding data, mirrors /public/enemy-preview`.
- **Idempotency**: not applicable — GET request, naturally safe to repeat.
- **Module dependencies**: none — self-contained, no cross-feature imports.

### Rate limiting

This codebase does not have a "read" tier — only `globalLimiter` (200/min, applied
to every route in `server.js`), `calcLimiter` (damage-calc specific), and
`guestInitLimiter` (guest-init specific) exist in
`Backend/infrastructure/rateLimit/rateLimiter.js`. The new route relies on the
existing `globalLimiter` only, exactly matching `/public/enemy-preview` — no new
limiter tier is introduced.

## Frontend

### API module: `Frontend/lib/api/guestStarterPikachu.ts`

- `fetchGuestStarterPikachu()` — `GET /public/guest-starter-pikachu`, no auth header,
  returns the raw `{ pokemon }` payload or `null` on failure.
- `loadGuestStarterPikachu()` — wraps the fetch and builds a `Pokemon` via the same
  resolver path `loadEnemyPreview` uses (`createPokemon` / `resolveEnemyTeam`-style
  construction, called with empty lookup maps since the backend sends fully
  resolved fields already).

### Wiring in `Frontend/app/page.tsx`

- Guarded by the existing `!isAuthenticated` check (no new "isGuest" flag needed).
- `loadGuestStarterPikachu()` is fired in parallel with the other guest-init calls
  during initial load, following the same fast-path pattern as the enemy preview
  fetch (doesn't block the rest of the pipeline).
- **Race guard**: a `player1TeamLockedRef` (`useRef(false)`) is set to `true`
  synchronously inside `handleTeamChange(1, ...)` and `deleteP1Team`, so a user
  action that races ahead of the still-pending fetch always wins.
- On resolve: if `!player1TeamLockedRef.current` AND
  `bench.player1Bench.every(p => p === null)`, call
  `bench.setPlayer1Bench([pikachu, null, null, null, null, null])`.
  - Bench slot 0 is what the UI already renders as P1's active Pokemon
    (`player1Active` derives from `bench.player1Bench[0]`), so no separate
    active-state wiring is required.
- Fetch failure is non-fatal: caught, `console.warn`-logged outside production,
  P1 simply stays empty — matching the enemy preview fast path's graceful
  degradation.

## Caching Plan

| # | Answer |
|---|---|
| What gets cached | The static starter-Pikachu response body — identical for every guest, never varies per user |
| Layer | **Edge only** (Cloudflare/CDN via `Cache-Control` / `CDN-Cache-Control` headers). No Redis (no DB work to save server-side). No localStorage (data is public and identical for all guests; edge caching already eliminates repeat computation without needing per-browser persistence) |
| Cache key | The URL `/public/guest-starter-pikachu` — stable, no query params |
| TTL | `max-age=300` (browser), `s-maxage=3600` (edge) — matches the existing enemy-preview convention, so a future edit to the hardcoded constant propagates within an hour rather than being cached indefinitely |
| Invalidation | TTL expiry only, no manual purge — consistent with the sibling endpoint |
| Cache miss / fetch failure | Falls through to `null`; P1 simply stays empty; failure logged in non-production |

## Testing

- Backend: controller test asserting 200, correct cache headers, and the expected
  Pokemon payload shape (mirrors the existing enemy-preview controller test).
- Frontend: unit test for `loadGuestStarterPikachu()` (success + failure-returns-null
  cases), and a test for the `page.tsx` wiring covering: (a) guest with empty P1
  bench gets seeded, (b) guest who already picked a team is not overwritten,
  (c) authenticated user never triggers the fetch.

## Files touched

**New:**
- `Backend/guest-starter/guestStarterService.js`
- `Backend/guest-starter/publicControllers.js`
- `Frontend/lib/api/guestStarterPikachu.ts`

**Modified:**
- `Backend/Routes/publicRoutes.js` — add the new route
- `Frontend/app/page.tsx` — parallel fetch, race guard ref, bench-seeding logic
