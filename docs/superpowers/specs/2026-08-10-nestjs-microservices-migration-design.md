# NestJS + Bounded-Context + Microservices/Kafka Migration — Design (DRAFT, PAUSED)

> Status: **Paused before final approval.** Sammy interrupted this design to first do a
> backend feature/domain cleanup pass (see "Prerequisite" below). Resume this doc once
> that cleanup is done — the bounded-context mapping below may shift once the Domain
> layer is fixed (e.g. once a proper Pokemon domain file exists instead of the
> definition living in `pokemonService.js`).

## Prerequisite (blocking, must happen first)

The current `Backend/Domain` + `Backend/Services` split is not well structured:
there is no dedicated Pokemon domain file, and the definition of what a Pokemon
*is* currently lives in a service file (`Services/pokemonService.js`) rather than
in `Domain/`. Before any NestJS/DDD/microservices work starts, the existing
Express codebase's features need to be labeled and the Domain/Service layout
cleaned up while preserving functionality. That is being tracked as a separate,
prior task — see the next spec/session for that work.

## Decisions confirmed so far (via clarifying questions)

- **Motivation:** primarily resume/learning value — not an existing performance
  bottleneck, not urgent anticipated growth. This means Kafka's payoff is judged
  honestly as "plumbing/learning value" rather than "fixes a real problem," and
  it's fine for that to be the case.
- **Hosting:** open to moving backend off Vercel serverless. Vercel stays for the
  Next.js frontend only. NestJS services (and Kafka) go on a platform that
  supports long-running processes — recommended Railway or Fly.io.
- **Scale:** moderate — a real small userbase, not just a portfolio demo, but not
  large/unpredictable either.
- **Sequencing:** phased. Phase 1 = NestJS + enforced DDD bounded contexts as a
  single deployable app (modular monolith). Phase 2 = split into microservices +
  Kafka, as a separate follow-up project.
- **Extra contexts:** Identity (auth/session) becomes its own bounded
  context/service, since both other contexts need "who is this user." Reference
  game data (species/moves/items) is NOT a service — it's a shared read-only
  library both services import.
- **Data ownership:** shared MongoDB cluster, but each service reads/writes only
  its own collections/schemas (logical separation now, physical split later is
  an easy follow-up).
- **Kafka use cases (all three selected):** cross-context sync events, async
  heavy computation, audit/analytics event log.
- **API entry point:** API Gateway/BFF in front of the services; frontend keeps
  calling one unified backend, gateway routes internally.

## Bounded context mapping (derived from tracing the actual current code)

Two things worth remembering when this is revisited: `activePokemonRoutes`
(form changes) is genuinely Battling — pure computation on a Pokemon object
passed in the request body, no DB read. `pokemonSessionRoutes`
(`activate`/`patchDraft`/`saveDraft`) is genuinely Editing/Storage despite the
word "active" in `SessionService.activate` — it's the box/team editor's draft
flow (hydrate → edit → validate → persist via `TeamRepository`), matching
Sammy's own definition ("saving changes made in the active editor").

**Important finding: Battling is currently stateless.** `CalculationService`
(Smogon damage calc) and the form-change logic both operate on data the client
already sends — there's no Battling-owned persistence today. If a persistent
"in-battle party state" feature is added later, that would introduce the first
real state Battling owns, and would be the natural consumer of the
`pokemon.saved` Kafka topic below.

| Context | Owns (current code) | Persistence |
|---|---|---|
| **Identity** (new 3rd context) | `jwtCheck`, `resolveIdentity`, `AuthController`, `GuestController`, guest cookie issuance | None of its own — reads Auth0, issues guest cookies |
| **Pokemon Editing/Storage** | `myBoxControllers`, `teamControllers`, `pokemonControllers`, `PokemonSessionController` (activate/draft/save), `PokemonEntity`, `HydrationService`, `CalculationDomainService.validate`, `TeamRepository` | MongoDB (boxes, teams collections) + Redis (drafts — see flag below) |
| **Pokemon Battling** | `damageController`/`CalculationService` (Smogon calc + RR ability fixes), `activePokemonControllers` (form changes) | None today; stateless compute |
| **Shared game-data lib** (not a service) | species/moves/items/abilities static datasets (`Config/jsonOptions`, `Models/`), `/misc` + `/public` routes | Loaded into memory at boot, same as today |

**Correctness flag (not scope creep — required for the target architecture to
work at all):** `SessionStore` (the draft store) is currently an in-process
`Map`. This already doesn't survive across Vercel's stateless function
invocations reliably, but it becomes a hard bug once Editing/Storage runs as a
horizontally-scaled Nest microservice — a draft written on one replica is
invisible to a request served by another. Must move to Redis as part of
Phase 1.

## Phase 1 — NestJS modular monolith

**Monorepo tooling: Nx workspace (recommended)** over plain pnpm workspaces or
no restructuring. Reasoning: Nx's `@nx/enforce-module-boundaries` turns
"bounded contexts" into a build-time-enforced rule instead of a naming
convention — a cross-context import fails lint/build. It also has generators
for lifting a lib into its own deployable app later, which is exactly the
Phase 1 → Phase 2 move.

One Nest application (`apps/backend`), assembled from Nx libs:

- `libs/identity` — guards/strategies wrapping Auth0 JWT verification + guest
  cookie resolution, exposed as an `AuthModule`; other modules import only the
  guard, never internals.
- `libs/editing-storage` — feature modules for boxes, teams, drafts; Mongoose
  schemas; draft store rewritten onto Redis.
- `libs/battling` — damage-calc module, form-change module. No DB dependency,
  matching its actual statelessness.
- `libs/game-data` — species/moves/items loader, imported read-only by both
  feature libs.
- `apps/backend` — thin composition root wiring modules together, replacing
  `server.js`.

Existing Jest unit/integration tests get ported alongside their logic (mostly
a 1:1 port — `CalculationDomainService`, `HydrationService`, etc. become
injectable Nest providers with the same logic). Playwright e2e stays pointed
at the same HTTP surface to validate the migration didn't change behavior.

## Phase 2 — microservices + Kafka (separate follow-up project)

- `apps/gateway` — NestJS BFF, frontend's only entry point; routes internally
  to the other services (Nest supports hybrid HTTP+microservice apps).
- `apps/identity`, `apps/editing-storage`, `apps/battling` — each lib above
  lifted into its own deployable app via `nx g @nx/nest:app`, same module code.
- Kafka broker: avoid self-managed Kafka+ZooKeeper (heavy ops for this scale).
  Recommended **Redpanda** locally via docker-compose, **Upstash Kafka** or
  **Confluent Cloud free tier** in production, via `@nestjs/microservices`'
  Kafka transport (app code doesn't know the difference).
- **Topics:**
  - `pokemon.saved` / `pokemon.box.changed` — published by Editing/Storage on
    writes. Nothing consumes these yet (Battling is stateless today) — this is
    future-proofing for a persistent battle-state feature, worth being honest
    that the payoff here is learning/plumbing value, not an existing bottleneck.
  - `damage.calculated` — published fire-and-forget (off the response path)
    for the audit/analytics use case.
  - A small `apps/analytics-consumer` worker subscribes to all topics — the
    concrete home for the "async heavy computation" use case (e.g. bulk
    hydration recompute) if that's ever needed.
- Hosting: Railway or Fly.io for the Nest services (long-running Docker
  processes, persistent Kafka connections, reasonable hobby tier); Vercel
  stays for the Next.js frontend only.

## Open items when this resumes

- Re-validate the bounded-context table above against whatever the Domain
  cleanup produces (a proper Pokemon domain file may reshuffle what
  `libs/editing-storage` vs `libs/battling` actually contains).
- Confirm Nx vs. plain workspace after seeing the cleaned-up structure — a
  cleaner Domain layer might make the case for/against Nx different.
- Migration/testing strategy detail (how existing Jest/Playwright suites map
  onto the new module boundaries) still needs to be fleshed out into an actual
  phased implementation plan (writing-plans skill), not yet done.
