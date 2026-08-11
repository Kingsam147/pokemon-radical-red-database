# Backend Feature/Domain Audit

> Status: **Analysis only — no code changed.** This labels every file/function in
> `Backend/Domain`, `Backend/Services`, `Backend/Controllers`, `Backend/interfaces`,
> and `Backend/infrastructure` by the feature it actually belongs to, so the
> Domain/Service cleanup can be planned with full visibility. This is a prerequisite
> for [2026-08-10-nestjs-microservices-migration-design.md](2026-08-10-nestjs-microservices-migration-design.md),
> which is paused until this cleanup happens.

## Executive summary — what's actually wrong

The "no Pokemon domain file, definition lives in a service file" problem is a
symptom of something bigger: **this codebase has two parallel, independently-built
pipelines for constructing and storing a Pokemon, and they've drifted.** The newer
one (Entity + Hydration) was added for the box/team draft editor feature but the
original box/team CRUD controllers were never migrated onto it.

1. **"What is a Pokemon" is built three separate times, with diverging logic:**
   - `Services/pokemonService.js: createPokemon()` — builds a *fully-hydrated*
     Pokemon (baseStats, finalStats, sprite, allMoves, forms, everything) straight
     from raw Pokemon-Showdown-style import text. Used by the old box/team CRUD
     controllers.
   - `infrastructure/hydration/HydrationService.js: hydrate()` — builds the same
     kind of fully-hydrated view, but from a *lean* `PokemonEntity`, on demand.
     Used only by the draft/editor session flow.
   - `Domain/pokemon/PokemonEntity.js` — the lean persisted shape (name, form,
     gender, level, nature, item, ability_id, move_ids, EVs, IVs, player, version,
     userId). Only the draft/editor flow uses this shape.

   These duplicate each other's job (gender inference, legal-ability resolution,
   move-pool filtering, form-building) with separately-written logic that can
   silently disagree — e.g. `HydrationService.hydrate()` has no equivalent of
   `pokemonService.createPokemon()`'s female/male/genderless name-list gender
   inference at all.

2. **The two pipelines write incompatible shapes into the same MongoDB
   collections.** `myBoxControllers`/`pokemonControllers`/`teamControllers` (via
   `pokemonService.createPokemon`) store the full hydrated blob into
   `myBoxes`/`myTeamSets`/`enemyTeamSets`. `PokemonSessionController.saveDraft`
   (via `TeamRepository.savePokemon`) overwrites the *same* fields with just the
   lean entity — no baseStats, finalStats, sprite, allMoves, or forms. Nothing
   re-hydrates on read (`findInBox`, `getAllMyBoxes`, `getTeam` all return
   whatever shape happens to be stored). Practical effect: a Pokemon that's never
   been opened in the draft editor returns the old full shape; one that has been
   saved once through the editor comes back missing its computed fields. The
   `resolveLegacyNatureName`/`resolveLegacyItemName` helpers in `SessionService`
   (literally named "legacy") are the seam papering over this gap.

3. **The real box/team repository logic lives in `Config/jsonOptions.js`**, not
   `infrastructure/repositories/`. It does real MongoDB reads/writes and Redis
   caching (`loadMyBoxes`, `saveMyBoxes`, `loadBox`, `loadTeams`, `saveTeams`,
   `findTeam`, box-count caching). `infrastructure/repositories/TeamRepository.js`
   — the properly-located file — is a thin one-method wrapper that itself just
   calls into `jsonOptions.js`. The real repository is misplaced; the
   correctly-placed one is incomplete.

4. **Form-change logic exists twice, unrelated to each other:**
   `Services/formService.js` (`checkMega`/`addMega`/`changeActiveForm`) handles
   mega-form detection at import time for the old box/team pipeline.
   `Controllers/activePokemonControllers.js` (`getOtherForms`/`changeForm`/
   `resetForm`) is a separate implementation of "switch a Pokemon's active form,"
   used by the Battling context. They don't share code.

5. **Dead/debug code in production files.** `pokemonService.js` has 11 unused
   `practiceText` fixtures and runs `createPokemon(practiceText3, 1)` at module
   load on every import. `formService.js` has a `dummyPokemon` fixture and runs
   `changeActiveForm(dummyPokemon, 'Blaziken-Mega')` at module load. Neither
   result is used.

6. **Two latent bugs in `formService.js`** (flagging, not fixing — needs a call
   on whether "maintain functionality" means preserve-as-is or fix-in-passing):
   - `checkMega`: `const { species2 } = getModels;` is missing the `()` call, so
     `species2` is always `undefined` here. Currently harmless only because
     `species2` isn't actually used inside `checkMega`.
   - `addMega`: references bare `species2` and `species` identifiers that are
     never imported or defined in the file — this would throw a `ReferenceError`
     if actually invoked. No test file covers `formService.js`, so this may
     already be broken in production without anything catching it.

7. **Test coverage gap.** The *old* pipeline (`myBoxControllers`,
   `pokemonControllers`, `teamControllers`, `activePokemonControllers`) has unit
   tests. The *newer* domain layer (`PokemonEntity`, `HydrationService`,
   `CalculationDomainService`, `SessionService`, `PokemonSessionController`,
   `pokemonService.js`, `formService.js`) has none at all. Any consolidation
   touching these needs tests added alongside, not after.

## Feature inventory

### A. Pokemon Domain (core definition — currently scattered, no single home)

| File / function | What it actually is | Flag |
|---|---|---|
| `Domain/pokemon/PokemonEntity.js: create()` | Validates + constructs the lean persisted Pokemon shape | Correctly placed (Domain), but only used by the newer draft flow |
| `Domain/pokemon/PokemonEntity.js: fromHydrated()` | Converts a legacy full-hydrated blob back into the lean shape | Compatibility shim for finding #2 above |
| `Services/pokemonService.js: createPokemon()` | **Actually builds the canonical "what is a Pokemon" object** from import text — this is the piece Sammy flagged as misplaced | Should be Domain logic, not a Service; duplicates `HydrationService.hydrate()`'s job |
| `Services/pokemonService.js: hasDuplicate()` | Trivial membership check (`name in box`) | Fine as a tiny utility, but currently bundled into a file that's mostly the misplaced domain logic above |
| `infrastructure/hydration/HydrationService.js: hydrate()` | Builds the full runtime view (stats, forms, move pool) from a lean entity | Correctly an infrastructure/application concern (it reads the game-data cache), but overlaps functionally with `pokemonService.createPokemon()` |
| `infrastructure/hydration/HydrationService.js: buildFormEntry()` | Builds one alternate-form's stat/move block | Internal helper, fine where it is |
| `infrastructure/hydration/HydrationService.js: load/getMove/getAbility()` | In-memory move/ability lookup cache | This is really game-data lookup, arguably belongs with the shared game-data layer, not "hydration" |

### B. Legality & Movepool Domain

| File | What it is | Flag |
|---|---|---|
| `Domain/legalAbilites.js` | Given an ability + Pokemon, resolve to the RR-legal version | Well-placed, pure domain function |
| `Domain/legalMoves.js` | Filters a move pool down to legal moves (handles Leech Seed/Toxic exceptions) | Well-placed |
| `Domain/pokemonMovesets.js` | Assembles the raw available-move pool (level-up + tutor + TM + egg) | Well-placed |
| `Domain/pokemon/CalculationDomainService.js: validate()` | Full legality validation of a draft entity (species/nature/item/ability/moves/EV/IV bounds) | Well-placed; this is the domain validation the editor flow uses before save |

### C. Stat & Type Domain

| File | What it is | Flag |
|---|---|---|
| `Domain/statCalculator.js` | `finalHP`/`finalStats` — core stat formula | Well-placed, pure |
| `Domain/typeInteractions.js` | `calcDefenseType` — weakness/resistance chart lookup | Well-placed, pure |
| `Domain/textConversion.js` | Name/move/ability/type ⇄ internal-ID format conversion | Well-placed, pure; not currently imported by anything read in this audit — worth confirming it's still used before the reorg |

### D. Import / Parsing

| File | What it is | Flag |
|---|---|---|
| `Domain/parsePokemonText.js: getPokemonInfo()` | Parses Showdown-style import text into raw fields | Well-placed, pure parsing logic |

### E. Box Storage feature (→ Editing/Storage context)

| File / function | What it is | Flag |
|---|---|---|
| `Controllers/myBoxControllers.js` (all 10 exports) | HTTP handlers for box CRUD: list, count, find, add, remove, add-Pokemon, find-in-box, delete-in-box, update-in-box, clear | Correctly a Controller, but calls `createPokemon` directly (old pipeline) instead of going through the Entity/Hydration/Validation domain layer |
| `Config/jsonOptions.js: loadMyBoxes/saveMyBoxes/loadBox/invalidate*BoxCache/*BoxCount*` | **The real box repository** — MongoDB `myBoxes` collection + Redis caching | Misplaced: this is `infrastructure/repositories`, not `Config` |

### F. Team Storage feature (→ Editing/Storage context)

| File / function | What it is | Flag |
|---|---|---|
| `Controllers/teamControllers.js` (all 6 exports) | HTTP handlers for team CRUD: get, get-all, add, remove, remove-all, save-full-team | Correctly a Controller; doesn't touch Pokemon-building logic directly |
| `Controllers/pokemonControllers.js` (all 5 exports) | HTTP handlers for individual-Pokemon CRUD *within* a team (add/find/delete/update) | Same issue as `myBoxControllers` — calls `createPokemon` directly (old pipeline) |
| `Config/jsonOptions.js: loadTeams/saveTeams/findTeam` | **The real team repository** — MongoDB `myTeamSets`/`enemyTeamSets` collections + Redis caching for the enemy (player 2) side | Misplaced, same as box repository |
| `infrastructure/repositories/TeamRepository.js: savePokemon()` | Ownership check + optimistic-concurrency (version) check, then delegates to `jsonOptions.saveTeams` | Correctly placed, but it's the *only* team write path with conflict detection — the plain `teamControllers`/`pokemonControllers` writes above have none |

### G. Draft/Editor Session feature (→ Editing/Storage context)

| File / function | What it is | Flag |
|---|---|---|
| `interfaces/controllers/PokemonSessionController.js` (activate/patchDraft/saveDraft) | HTTP handlers for the active-editor draft lifecycle | Correctly placed and named; this is genuinely "saving changes made in the active editor" per Sammy's definition |
| `Domain/session/SessionService.js` (activate/getSession/patchDraft/getDraftEntity/removeDraft) | Orchestrates: load stored Pokemon → convert to Entity → hydrate for editing → patch → validate → persist | This is really an **application service** (orchestration across Entity + Hydration + Repository), currently sitting in `Domain/` which should hold pure domain logic only |
| `Domain/session/SessionService.js: resolveLegacyNatureName/resolveLegacyItemName` | Compatibility shims for reading old full-hydrated-blob Pokemon into the new Entity shape | Direct evidence of finding #2; should be deletable once storage is unified |
| `infrastructure/session/SessionStore.js` | In-process `Map` holding active drafts, 30-min TTL | **Correctness issue, not just placement**: in-memory store won't survive multiple instances/serverless cold starts reliably — flagged already in the paused NestJS design as needing to move to Redis |

### H. Form-Change feature (currently split across two unrelated implementations)

| File / function | What it is | Flag |
|---|---|---|
| `Services/formService.js: checkMega/addMega` | Detects + resolves mega-Pokemon on **import** (old box/team pipeline) | Has the `getModels()`-not-called bug and the undefined-`species`/`species2` bug in `addMega` (finding #6) |
| `Services/formService.js: changeActiveForm` | Mutates a hydrated Pokemon object in place to switch its active form | Belongs to Battling per Sammy's definition ("features related to modifying the active Pokemon"), but currently lives in `Services/` next to the box-import logic it has nothing to do with |
| `Controllers/activePokemonControllers.js: getOtherForms/changeForm/resetForm` | HTTP handlers wrapping `changeActiveForm`, operating on a Pokemon passed in the request body (stateless) | Correctly a Battling-context Controller |

### I. Damage Calculation feature (→ Battling context)

| File | What it is | Flag |
|---|---|---|
| `Controllers/damageController.js: calculateDamage` | HTTP handler for damage calc | Well-placed |
| `infrastructure/calculation/CalculationService.js: calculate` | Wraps `@smogon/calc`, applies Radical Red ability-modifier fixes | Well-placed as an infrastructure adapter around a third-party lib |

### J. Enemy Preview feature

| File | What it is | Flag |
|---|---|---|
| `Services/enemyPreviewService.js` | Builds + Redis-caches a hydrated view of the enemy (player 2) team for public display | Reasonably placed; depends on the same `jsonOptions.loadTeams` repository misplacement noted above |
| `Controllers/publicControllers.js: getEnemyPreview` | Public, unauthenticated HTTP handler | Well-placed; correctly documents itself as intentionally public |

### K. Identity/Auth feature (→ new Identity context)

| File | What it is | Flag |
|---|---|---|
| `infrastructure/auth/jwtCheck.js` | Wraps `express-oauth2-jwt-bearer`, logs JWT validity | Well-placed |
| `infrastructure/auth/resolveIdentity.js` | Resolves either an authenticated user or a guest cookie into `req.userId`/`req.isGuest` | Well-placed |
| `interfaces/controllers/AuthController.js: migrate` | Migrates guest-owned boxes/teams to an authenticated account on login | Well-placed, though it reaches directly into MongoDB rather than going through the box/team repository |
| `interfaces/controllers/GuestController.js: initGuest` | Issues/resumes the signed guest cookie | Well-placed |

### L. Reference/Misc Data feature (→ shared game-data lib, per the paused design)

| File | What it is | Flag |
|---|---|---|
| `Controllers/miscControllers.js` (getItems/getNatures/getMoves/getTypes/getAbilities/getStatuses/getDefenseTypes/getVersion) | Read-only accessors over the in-memory game-data cache | Well-placed; `calcStats` (recompute stats for arbitrary input) is arguably Stat Domain logic exposed directly rather than going through a service, but it's small and harmless where it is |
| `Config/jsonOptions.js: loadModels/getModels` | Loads species/moves/items/etc. from Mongo into memory at boot | This part genuinely is config/bootstrapping, unlike the box/team repository functions in the same file |
| `Config/mongodbOptions.js`, `Config/tsOptions.js`, `Config/jsOptions.js` | Mongo connection + static option tables (banned lists, tutor tables) | Not read in full for this audit — worth a quick pass when the reorg plan is written, but nothing in the code traced here suggested misplacement |

### M. Infrastructure (cross-cutting, all correctly placed)

`infrastructure/logger/*`, `infrastructure/rateLimit/rateLimiter.js`,
`infrastructure/redis/redisClient.js` — all genuinely cross-cutting infrastructure,
already in the right layer, used consistently by every feature area above.

### N. Static Data Models

`Models/restrictedBannedStuff/*.js` (banned moves/abilities + exceptions),
`Models/avaliableTutors+TMS/*` (tutor table, available TMs), `Models/megaStones.json`
— all static reference data, correctly placed, no code to reorganize.

### O. Not part of the runtime feature architecture

`Backend/dataAlteringFiles/*` — one-off data-migration/scripting files
(`anotherRandomFile.js`, `randomeFile2.js`, `backgroundRemover.py`, etc.), not
imported by the running server. Out of scope for the feature reorg; flagging only
so they're not mistaken for a "feature" during the cleanup.

## Proposed feature grouping (for discussion, not yet a plan)

Based on the above, the natural target grouping — before any NestJS/bounded-context
work — is:

- **`pokemon/` domain** — merge `pokemonService.createPokemon`'s actual
  Pokemon-building logic with `PokemonEntity` + `HydrationService` into one
  consistent pipeline (lean entity is the single stored shape; hydration is
  always computed on read, never stored). This resolves findings #1 and #2
  together — they're the same fix.
- **`legality/` domain** — `legalAbilites.js`, `legalMoves.js`,
  `pokemonMovesets.js`, `CalculationDomainService.validate`.
- **`stats/` domain** — `statCalculator.js`, `typeInteractions.js`.
- **`import/` domain** — `parsePokemonText.js`, `textConversion.js`.
- **`boxes/` feature** — `myBoxControllers.js` + a real `BoxRepository` moved out
  of `jsonOptions.js` into `infrastructure/repositories/`.
- **`teams/` feature** — `teamControllers.js`, `pokemonControllers.js`,
  `TeamRepository.js`, and the rest of `jsonOptions.js`'s team functions moved
  into that repository.
- **`editor/` feature** — `PokemonSessionController.js`, `SessionService.js`
  (rewritten as an application service, not `Domain/`), `SessionStore.js`
  (rewritten onto Redis).
- **`forms/` feature** — split `changeActiveForm` out of `formService.js` into
  the Battling area next to `activePokemonControllers.js`; keep/repair
  `checkMega`/`addMega` with the box/team import feature, or fix the two bugs
  found in finding #6 as part of the move.
- **`battling/damage/` feature** — `damageController.js`,
  `CalculationService.js`, unchanged.
- **`enemy-preview/` feature** — `enemyPreviewService.js`,
  `publicControllers.getEnemyPreview`.
- **`identity/` feature** — `jwtCheck.js`, `resolveIdentity.js`,
  `AuthController.js`, `GuestController.js`.
- **`game-data/` shared lib** — `miscControllers.js`'s read-only accessors,
  `jsonOptions.loadModels/getModels`, `Models/`.

This grouping is what the next planning pass (clarifying questions → plan →
execution) would turn into actual file moves, once you confirm it's the right
shape.
