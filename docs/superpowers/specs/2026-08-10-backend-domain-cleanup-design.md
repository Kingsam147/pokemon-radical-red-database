# Backend Domain/Feature Cleanup — Design

> Status: **Approved, ready for implementation plan.** Builds on
> [2026-08-10-backend-feature-domain-audit.md](2026-08-10-backend-feature-domain-audit.md).
> This is the prerequisite for
> [2026-08-10-nestjs-microservices-migration-design.md](2026-08-10-nestjs-microservices-migration-design.md),
> which stays paused until this lands.

## Goal

Fix the two-pipeline drift and misplaced-repository problems found in the audit,
reorganize the backend into the feature groups the audit proposed, and — beyond
what the audit originally scoped — introduce real encapsulation so this class of
bug (something bypassing domain validation by writing a raw object directly into
storage) can't recur.

## Decisions

1. **Domain objects become classes with private (`#`) fields, not plain-object
   factories.** External code can read via getters (getters return defensive
   copies for objects/arrays, never the live internal reference) but can only
   mutate through named methods on the class (e.g. `changeMoves()`,
   `changeAbility()`, `changeEVs()`), each of which re-validates. This applies to:
   - `PokemonEntity` (rewritten from its current `create()`/`fromHydrated()`
     factory-function form into a class)
   - `BoxEntity` (new — wraps a box's Pokemon map; currently boxes are raw
     objects mutated directly in `myBoxControllers.js`)
   - `TeamEntity` (new — wraps a team's roster + trainerInfo; currently raw
     objects mutated directly in `teamControllers.js`/`pokemonControllers.js`)

2. **Exactly one repository file per aggregate touches the database — no
   exceptions.** `BoxRepository` and `TeamRepository` become the *only* files
   that call `db.collection(...)`. This closes every direct-DB-access path found
   in the audit, including `AuthController.migrate` (currently calls
   `db.collection('myBoxes').updateMany()` directly — becomes
   `BoxRepository.reassignOwner(oldUserId, newUserId)` /
   `TeamRepository.reassignOwner(oldUserId, newUserId)`). Redis caching stays
   colocated with each repository (same pattern `jsonOptions.js` already uses
   for boxes today), since it's an implementation detail of that repository, not
   a separate concern.

3. **The two Pokemon-building pipelines (audit findings #1/#2) get unified.**
   Storage is always the lean `PokemonEntity` — never a hand-built hydrated
   blob. The import-text pipeline (`pokemonService.createPokemon`) is rewritten
   to: parse text → build a validated `PokemonEntity` → hand it to
   `BoxEntity`/`TeamEntity`. `HydrationService.hydrate(entity)` is called at the
   point of HTTP response (both for the box/team CRUD endpoints and the draft
   editor, which already does this). **The frontend-facing response shape does
   not change** — it's still the fully-hydrated view — only what's persisted
   internally does.

4. **Both `formService.js` bugs get fixed** (`checkMega`'s uncalled `getModels`,
   `addMega`'s undefined `species`/`species2` reference) as part of the move,
   not preserved.

5. **All dead/debug code gets deleted**: the 11 unused `practiceText` fixtures
   and the module-load self-test call in `pokemonService.js`; the `dummyPokemon`
   fixture and module-load call in `formService.js`.

6. **No new Users collection.** Auth0 already owns user identity/credentials
   end-to-end; a local shadow copy isn't needed. `userId` (Auth0's `sub`) stays
   the only cross-collection reference, exactly as it works today.

7. **Side effect worth flagging explicitly:** consolidating all team writes
   through `TeamRepository` means the optimistic-concurrency (version) check
   that today only protects `saveDraft` (via the existing `TeamRepository.
   savePokemon`) now also protects `teamControllers`/`pokemonControllers`'
   direct-write endpoints, which currently have no conflict detection at all.
   This is a behavior change — those endpoints can now return 409 on concurrent
   edits, where before they'd silently overwrite. It only changes behavior under
   concurrent edits to the same Pokemon/team, which nothing today handles
   correctly anyway; treating it as a fix, not a regression risk worth blocking
   on.

## Target structure (per the audit's proposed grouping)

```
Backend/
  pokemon/
    PokemonEntity.js        # class, private fields, change* methods
    HydrationService.js     # moved from infrastructure/hydration
    createFromImportText.js # replaces pokemonService.createPokemon's role
  legality/
    legalAbilities.js
    legalMoves.js
    pokemonMovesets.js
    validate.js              # CalculationDomainService, renamed for clarity
  stats/
    statCalculator.js
    typeInteractions.js
  import/
    parsePokemonText.js
    textConversion.js
  boxes/
    BoxEntity.js             # new
    BoxRepository.js         # new; absorbs box functions from Config/jsonOptions.js
    boxControllers.js        # moved from Controllers/myBoxControllers.js
  teams/
    TeamEntity.js             # new
    TeamRepository.js         # expanded from infrastructure/repositories/TeamRepository.js
    teamControllers.js        # moved from Controllers/teamControllers.js
    pokemonInTeamControllers.js # moved from Controllers/pokemonControllers.js
  editor/
    SessionService.js         # moved from Domain/session, rewritten as application service
    SessionStore.js           # moved from infrastructure/session (still in-memory; Redis move is Phase-1 NestJS work, not this pass)
    PokemonSessionController.js # moved from interfaces/controllers
  forms/
    changeActiveForm.js       # split out of Services/formService.js, moved next to battling
    checkMega.js / addMega.js # stays with box/team import feature, bugs fixed
  battling/
    damageController.js       # moved from Controllers
    CalculationService.js     # moved from infrastructure/calculation
    activePokemonControllers.js # moved from Controllers
  enemy-preview/
    enemyPreviewService.js
    publicControllers.js
  identity/
    jwtCheck.js
    resolveIdentity.js
    AuthController.js         # migrate() now calls repositories, not db directly
    GuestController.js
  game-data/
    miscControllers.js
    loadModels.js              # loadModels/getModels split out of Config/jsonOptions.js
    Models/                    # unchanged
  infrastructure/               # unchanged: logger, rateLimit, redisClient, mongodbOptions
```

Not part of this pass (explicitly out of scope, called out so it isn't assumed
fixed): `SessionStore`'s in-memory-`Map` correctness issue for multi-instance
deployments — that's Phase-1 NestJS work per the paused migration design, since
it only matters once the app runs as more than one process/instance.

## Spec self-review

- **Placeholders:** none — every decision above has a concrete answer.
- **Internal consistency:** checked against the audit doc; no contradictions.
- **Scope:** focused — this is one implementation plan's worth of work (backend
  reorg + encapsulation + pipeline unification), not multiple unrelated projects.
- **Ambiguity:** the version-conflict behavior change (decision #7) is the one
  place behavior visibly changes for API consumers; called out explicitly rather
  than left implicit.
