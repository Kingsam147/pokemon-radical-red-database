# Guest Starter Pikachu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests (unauthenticated users) see a pre-built Level 8 Pikachu already sitting in Player 1's active slot (bench index 0) the moment the app loads, without ever affecting authenticated users or persisting past a real team pick.

**Architecture:** A new public, edge-cached backend endpoint (`GET /public/guest-starter-pikachu`) serves a hardcoded, already-resolved Pokemon object, mirroring the existing `Backend/enemy-preview/` feature's file layout and header conventions exactly. The frontend fetches it in parallel with the existing guest-init fast path in `Frontend/app/page.tsx` and seeds `player1Bench[0]` only if the guest hasn't already picked (or cleared) a team.

**Tech Stack:** Node/Express (Backend), Next.js/React + TypeScript + Vitest (Frontend unit tests), Playwright (Frontend e2e), Jest (Backend tests).

---

## Reference values (computed for this plan — do not recompute)

Species data pulled from `Backend/game-data/seed/species2.json` (`Pikachu`, ID 25):
base stats `HP 35 / Atk 55 / Def 40 / SpA 50 / SpD 50 / Spe 90`, abilities `Static` / `Lightning Rod`, both types `Electric` (mono-type — per `Backend/pokemon/HydrationService.js:72`, when `type1 === type2` the resolved `type2` becomes `'None'`).

Moves pulled from `Backend/game-data/seed/moves.json`:

| Move | num | accuracy | basePower | category | pp | priority | type | secondary |
|---|---|---|---|---|---|---|---|---|
| Volt Tackle | 344 | 100 | 120 | Physical | 15 | 0 | Electric | `{ chance: 10, status: 'par' }` |
| Thunderbolt | 85 | 100 | 90 | Special | 15 | 0 | Electric | `{ chance: 10, status: 'par' }` |
| Iron Tail | 231 | 75 | 100 | Physical | 15 | 0 | Steel | `{ chance: 30, boosts: { def: -1 } }` |
| Quick Attack | 98 | 100 | 40 | Physical | 30 | 1 | Normal | `null` |

Nature `Naughty` = `{ increase: 'Atk', decrease: 'SpD' }` (`Backend/game-data/seed/natures.json`).
Item `Light Ball` = `{ name: 'Light Ball', spriteName: 'light-ball', description: '' }` (`Backend/game-data/seed/items.json`).
Ability `Lightning Rod` = `{ name: 'Lightning Rod', description: '', toggle: false }` (`Backend/game-data/seed/abilities.json`).

Final stats computed via the project's own formula (`Backend/stats/statCalculator.js`) at Level 8, IVs all 31, EVs `252 Atk / 252 Spe` (rest 0), Naughty nature:

| Stat | Base | Calculation | Final |
|---|---|---|---|
| HP | 35 | `floor((2*35+31+floor(0/4))*8/100) + 8 + 10` | **26** |
| Atk | 55 | `floor((floor((2*55+31+floor(252/4))*8/100)+5) * 1.1)` | **23** |
| Def | 40 | `floor((2*40+31+0)*8/100)+5` (neutral) | **13** |
| SpA | 50 | `floor((2*50+31+0)*8/100)+5` (neutral) | **15** |
| SpD | 50 | `floor((floor((2*50+31+0)*8/100)+5) * 0.9)` | **13** |
| Spe | 90 | `floor((floor((2*90+31+floor(252/4))*8/100)+5) * 1)` | **26** |

Electric type chart multipliers (`Backend/game-data/seed/typeChart.json`, `Electric` entry):
`Normal:1, Fire:1, Water:1, Electric:0.5, Grass:1, Ice:1, Fighting:1, Poison:1, Ground:2, Flying:0.5, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1`.

Sprite URL follows the same convention as `HARDCODED_BULBASAUR` (`Backend/enemy-preview/enemyPreviewService.js:17`): `https://raw.githubusercontent.com/funnotbun/funnotbun.github.io/main/data/species/frontspr/gFrontSprite025Pikachu.png` (3-digit zero-padded National Dex ID + species name).

Note: the `Pokemon` TypeScript interface (`Frontend/lib/utils/types.ts`) has no Tera Type field — it is not represented anywhere in the data model, so it is intentionally omitted here.

---

## Task 1: Backend — hardcoded Pikachu constant

**Files:**
- Create: `Backend/guest-starter/guestStarterService.js`
- Test: `Backend/__tests__/unit/guest-starter/guestStarterService.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { GUEST_STARTER_PIKACHU } = require('../../../guest-starter/guestStarterService');

describe('guestStarterService', () => {
  test('exports a fully-resolved Level 8 Pikachu with the expected build', () => {
    expect(GUEST_STARTER_PIKACHU.name).toBe('Pikachu');
    expect(GUEST_STARTER_PIKACHU.ID).toBe(25);
    expect(GUEST_STARTER_PIKACHU.level).toBe(8);
    expect(GUEST_STARTER_PIKACHU.gender).toBe('M');
    expect(GUEST_STARTER_PIKACHU.nature).toEqual({ name: 'Naughty', increase: 'Atk', decrease: 'SpD' });
    expect(GUEST_STARTER_PIKACHU.ability).toEqual({ name: 'Lightning Rod', description: '', toggle: false });
    expect(GUEST_STARTER_PIKACHU.item).toEqual({ name: 'Light Ball', spriteName: 'light-ball', description: '' });
    expect(GUEST_STARTER_PIKACHU.type1.name).toBe('Electric');
    expect(GUEST_STARTER_PIKACHU.type2.name).toBe('None');
    expect(GUEST_STARTER_PIKACHU.IVs).toEqual({ HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 });
    expect(GUEST_STARTER_PIKACHU.EVs).toEqual({ HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 });
    expect(GUEST_STARTER_PIKACHU.finalStats).toEqual({ HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 });
    expect(GUEST_STARTER_PIKACHU.moveset.map((m) => m.name)).toEqual([
      'Volt Tackle', 'Thunderbolt', 'Iron Tail', 'Quick Attack',
    ]);
    expect(GUEST_STARTER_PIKACHU.moveset[0]).toMatchObject({ basePower: 120, category: 'Physical', type: 'Electric' });
    expect(GUEST_STARTER_PIKACHU.forms.Pikachu.formName).toBe('Pikachu');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && npx jest __tests__/unit/guest-starter/guestStarterService.test.js`
Expected: FAIL with "Cannot find module '../../../guest-starter/guestStarterService'"

- [ ] **Step 3: Write the implementation**

```javascript
// Manually hydrated, already-resolved Pokemon — mirrors HARDCODED_BULBASAUR in
// Backend/enemy-preview/enemyPreviewService.js. This is a static onboarding
// fixture (not real trainer/team data), so there is nothing to look up from a
// database and nothing to keep synced with a resolver pipeline.
const GUEST_STARTER_PIKACHU = {
  name: 'Pikachu',
  form: 'Pikachu',
  ID: 25,
  sprite: 'https://raw.githubusercontent.com/funnotbun/funnotbun.github.io/main/data/species/frontspr/gFrontSprite025Pikachu.png',
  femaleSprite: false,
  gender: 'M',
  level: 8,
  item: { name: 'Light Ball', spriteName: 'light-ball', description: '' },
  nature: { name: 'Naughty', increase: 'Atk', decrease: 'SpD' },
  ability: { name: 'Lightning Rod', description: '', toggle: false },
  abilities: [
    { name: 'Static', description: '', toggle: false },
    { name: 'Lightning Rod', description: '', toggle: false },
  ],
  type1: { name: 'Electric', Normal: 1, Fire: 1, Water: 1, Electric: 0.5, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  type2: { name: 'None' },
  baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 },
  EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
  IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 },
  statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  moveset: [
    { name: 'Volt Tackle', num: 344, accuracy: 100, basePower: 120, category: 'Physical', pp: 15, priority: 0, type: 'Electric', target: 'normal', secondary: { chance: 10, status: 'par' }, shortDesc: 'Has 33% recoil. 10% chance to paralyze target.' },
    { name: 'Thunderbolt', num: 85, accuracy: 100, basePower: 90, category: 'Special', pp: 15, priority: 0, type: 'Electric', target: 'normal', secondary: { chance: 10, status: 'par' }, shortDesc: '10% chance to paralyze the target.' },
    { name: 'Iron Tail', num: 231, accuracy: 75, basePower: 100, category: 'Physical', pp: 15, priority: 0, type: 'Steel', target: 'normal', secondary: { chance: 30, boosts: { def: -1 } }, shortDesc: "30% chance to lower the target's Defense by 1." },
    { name: 'Quick Attack', num: 98, accuracy: 100, basePower: 40, category: 'Physical', pp: 30, priority: 1, type: 'Normal', target: 'normal', secondary: null, shortDesc: 'Usually goes first.' },
  ],
  allMoves: [],
  forms: {},
  version: 0,
};
GUEST_STARTER_PIKACHU.forms = {
  Pikachu: {
    formName: 'Pikachu',
    ID: GUEST_STARTER_PIKACHU.ID,
    sprite: GUEST_STARTER_PIKACHU.sprite,
    type1: GUEST_STARTER_PIKACHU.type1,
    type2: GUEST_STARTER_PIKACHU.type2,
    ability: GUEST_STARTER_PIKACHU.ability,
    abilities: GUEST_STARTER_PIKACHU.abilities,
    baseStats: GUEST_STARTER_PIKACHU.baseStats,
    finalStats: GUEST_STARTER_PIKACHU.finalStats,
    allMoves: [],
  },
};

module.exports = { GUEST_STARTER_PIKACHU };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && npx jest __tests__/unit/guest-starter/guestStarterService.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/guest-starter/guestStarterService.js Backend/__tests__/unit/guest-starter/guestStarterService.test.js
git commit -m "feat: add hardcoded guest starter Pikachu data"
```

---

## Task 2: Backend — public controller

**Files:**
- Create: `Backend/guest-starter/publicControllers.js`
- Test: `Backend/__tests__/unit/guest-starter/publicControllers.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { getGuestStarterPikachu } = require('../../../guest-starter/publicControllers');
const { GUEST_STARTER_PIKACHU } = require('../../../guest-starter/guestStarterService');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

describe('getGuestStarterPikachu', () => {
  test('returns 200 with the starter Pikachu payload', async () => {
    const res = mockRes();

    await getGuestStarterPikachu({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ pokemon: GUEST_STARTER_PIKACHU });
  });

  test('sets edge-cacheable headers', async () => {
    const res = mockRes();

    await getGuestStarterPikachu({}, res);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300, s-maxage=3600');
    expect(res.set).toHaveBeenCalledWith('CDN-Cache-Control', 'max-age=3600');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && npx jest __tests__/unit/guest-starter/publicControllers.test.js`
Expected: FAIL with "Cannot find module '../../../guest-starter/publicControllers'"

- [ ] **Step 3: Write the implementation**

```javascript
const { GUEST_STARTER_PIKACHU } = require('./guestStarterService');

// PUBLIC — no auth required: static guest onboarding data, identical for every
// guest, mirrors /public/enemy-preview.
const getGuestStarterPikachu = async (_req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.set('CDN-Cache-Control', 'max-age=3600');
    return res.status(200).json({ pokemon: GUEST_STARTER_PIKACHU });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getGuestStarterPikachu };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && npx jest __tests__/unit/guest-starter/publicControllers.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/guest-starter/publicControllers.js Backend/__tests__/unit/guest-starter/publicControllers.test.js
git commit -m "feat: add guest starter Pikachu controller"
```

---

## Task 3: Backend — route wiring

**Files:**
- Modify: `Backend/Routes/publicRoutes.js`

- [ ] **Step 1: Add the route**

Current file:
```javascript
const express = require('express');
const router = express.Router();
const { getEnemyPreview } = require('../enemy-preview/publicControllers');

router.route('/enemy-preview').get(getEnemyPreview);

module.exports = router;
```

New file:
```javascript
const express = require('express');
const router = express.Router();
const { getEnemyPreview } = require('../enemy-preview/publicControllers');
const { getGuestStarterPikachu } = require('../guest-starter/publicControllers');

router.route('/enemy-preview').get(getEnemyPreview);
router.route('/guest-starter-pikachu').get(getGuestStarterPikachu);

module.exports = router;
```

- [ ] **Step 2: Run the full backend unit suite to confirm nothing broke**

Run: `cd Backend && npm test`
Expected: PASS (all suites, including the two new ones from Tasks 1–2)

- [ ] **Step 3: Start the server locally and confirm the route responds**

Run: `cd Backend && npm start` (in one terminal), then in another:
`curl -i http://localhost:3500/public/guest-starter-pikachu`
Expected: `HTTP/1.1 200 OK`, `Cache-Control: public, max-age=300, s-maxage=3600` header present, JSON body `{"pokemon":{"name":"Pikachu",...}}`. Stop the server afterward (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add Backend/Routes/publicRoutes.js
git commit -m "feat: expose GET /public/guest-starter-pikachu"
```

---

## Task 4: Frontend — API module

**Files:**
- Create: `Frontend/lib/api/guestStarterPikachu.ts`
- Test: `Frontend/lib/api/guestStarterPikachu.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, test, expect, vi } from "vitest"

vi.mock("@/lib/infrastructure/apiClient", () => ({
  default: { get: vi.fn() },
}))

import apiClient from "@/lib/infrastructure/apiClient"
import { loadGuestStarterPikachu } from "@/lib/api/guestStarterPikachu"

describe("loadGuestStarterPikachu", () => {
  test("resolves the fetched raw Pokemon into a full Pokemon object", async () => {
    const rawPokemon = {
      name: "Pikachu", ID: 25, sprite: "sprite-url", femaleSprite: false, gender: "M",
      level: 8, item: { name: "Light Ball" }, nature: { name: "Naughty", increase: "Atk", decrease: "SpD" },
      ability: { name: "Lightning Rod", description: "", toggle: false },
      abilities: [{ name: "Static", description: "", toggle: false }, { name: "Lightning Rod", description: "", toggle: false }],
      type1: { name: "Electric" }, type2: { name: "None" },
      baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 },
      EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
      IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
      finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 },
      moveset: [{ name: "Volt Tackle", basePower: 120, category: "Physical", type: "Electric" }],
      allMoves: [],
      form: "Pikachu",
      forms: { Pikachu: { formName: "Pikachu", ID: 25, baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 }, finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 }, ability: { name: "Lightning Rod", description: "", toggle: false }, abilities: [], allMoves: [], type1: { name: "Electric" }, type2: { name: "None" } } },
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: { pokemon: rawPokemon } })

    const pokemon = await loadGuestStarterPikachu()

    expect(pokemon).not.toBeNull()
    expect(pokemon!.name).toBe("Pikachu")
    expect(pokemon!.level).toBe(8)
    expect(pokemon!.currentHp).toBe(26)
    expect(pokemon!.moveset[0].name).toBe("Volt Tackle")
  })

  test("returns null when the request fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("network error"))

    const pokemon = await loadGuestStarterPikachu()

    expect(pokemon).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Frontend && npx vitest run lib/api/guestStarterPikachu.test.ts`
Expected: FAIL with "Cannot find module '@/lib/api/guestStarterPikachu'"

- [ ] **Step 3: Write the implementation**

```typescript
import { Pokemon, RawPokemon, createPokemon } from "@/lib/utils/types.ts"
import apiClient from "@/lib/infrastructure/apiClient"

async function fetchGuestStarterPikachu(): Promise<RawPokemon | null> {
  try {
    const res = await apiClient.get("/public/guest-starter-pikachu")
    return res.data.pokemon
  } catch {
    return null
  }
}

export async function loadGuestStarterPikachu(): Promise<Pokemon | null> {
  const raw = await fetchGuestStarterPikachu()
  if (!raw) return null

  // Fields on `raw` are already fully resolved objects (hydrated server-side),
  // exactly like the enemy preview's RawPokemon — no lookup tables needed.
  return createPokemon(
    raw.name,
    String(raw.ID),
    raw.sprite ?? "",
    raw.type1 as import("@/lib/utils/types.ts").PokemonType,
    raw.type2 as import("@/lib/utils/types.ts").PokemonType,
    raw.level,
    raw.nature as import("@/lib/utils/types.ts").Nature,
    raw.item as import("@/lib/utils/types.ts").Item,
    raw.ability as import("@/lib/utils/types.ts").Ability,
    raw.abilities as import("@/lib/utils/types.ts").Ability[],
    raw.baseStats,
    raw.EVs,
    raw.IVs,
    raw.finalStats.HP,
    raw.finalStats,
    raw.moveset as import("@/lib/utils/types.ts").PokemonMove[],
    raw.allMoves as import("@/lib/utils/types.ts").PokemonMove[],
    raw.forms[raw.form as string] as unknown as import("@/lib/utils/types.ts").PokemonForm,
    raw.forms as unknown as import("@/lib/utils/types.ts").PokemonForms,
    raw.gender,
    raw.femaleSprite,
    { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 }
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Frontend && npx vitest run lib/api/guestStarterPikachu.test.ts`
Expected: PASS

- [ ] **Step 5: Run typecheck and lint**

Run: `cd Frontend && npx tsc --noEmit && npx eslint lib/api/guestStarterPikachu.ts lib/api/guestStarterPikachu.test.ts`
Expected: zero errors. If the inline `import(...)` type syntax is flagged, replace it with named type imports at the top of the file instead (`import { Pokemon, RawPokemon, PokemonType, Nature, Item, Ability, PokemonMove, PokemonForm, PokemonForms, createPokemon } from "@/lib/utils/types.ts"`) and use the plain type names — functionally identical, just import them normally rather than inline.

- [ ] **Step 6: Commit**

```bash
git add Frontend/lib/api/guestStarterPikachu.ts Frontend/lib/api/guestStarterPikachu.test.ts
git commit -m "feat: add frontend loader for the guest starter Pikachu"
```

---

## Task 5: Frontend — wire into page.tsx

**Files:**
- Modify: `Frontend/app/page.tsx`

- [ ] **Step 1: Add the import**

Find:
```typescript
import { loadEnemyPreview } from "@/lib/api/enemyPreview"
```
Replace with:
```typescript
import { loadEnemyPreview } from "@/lib/api/enemyPreview"
import { loadGuestStarterPikachu } from "@/lib/api/guestStarterPikachu"
```

- [ ] **Step 2: Add the race-guard ref**

Find:
```typescript
  const fullPipelineDoneRef = useRef(false)
```
Replace with:
```typescript
  const fullPipelineDoneRef = useRef(false)
  const player1TeamLockedRef = useRef(false)
```

- [ ] **Step 3: Fire the fetch in parallel, guarded to guests only**

Find:
```typescript
    // Fast path: the first enemy trainer is pre-hydrated and edge-cached,
    // so it can render immediately without waiting on guest-init or misc data.
    loadEnemyPreview()
      .then((preview) => {
        if (!preview || fullPipelineDoneRef.current) return
        teams.setP2Teams((prev) => ({
          ...prev,
          [preview.teamName]: preview.team,
        }))
        teams.setP2SelectedTeamIndex(preview.teamName)
        const slots = Object.entries(preview.team)
          .filter(([k, v]) => k !== "trainerInfo" && v !== null)
          .map(([_, v]) => v as Pokemon)
        const initialBench: (Pokemon | null)[] = Array(6).fill(null)
        slots.forEach((p, i) => { initialBench[i] = p })
        bench.setPlayer2Bench(initialBench)
        setIsP2Loading(false)
      })
      .catch(() => {}) // fast path is best-effort — the full pipeline below is authoritative

    run()
```
Replace with:
```typescript
    // Fast path: the first enemy trainer is pre-hydrated and edge-cached,
    // so it can render immediately without waiting on guest-init or misc data.
    loadEnemyPreview()
      .then((preview) => {
        if (!preview || fullPipelineDoneRef.current) return
        teams.setP2Teams((prev) => ({
          ...prev,
          [preview.teamName]: preview.team,
        }))
        teams.setP2SelectedTeamIndex(preview.teamName)
        const slots = Object.entries(preview.team)
          .filter(([k, v]) => k !== "trainerInfo" && v !== null)
          .map(([_, v]) => v as Pokemon)
        const initialBench: (Pokemon | null)[] = Array(6).fill(null)
        slots.forEach((p, i) => { initialBench[i] = p })
        bench.setPlayer2Bench(initialBench)
        setIsP2Loading(false)
      })
      .catch(() => {}) // fast path is best-effort — the full pipeline below is authoritative

    // Guest-only starter Pikachu: fills P1's active slot (bench[0]) on first
    // load so a guest with no team yet has something to inspect immediately.
    // Never runs for authenticated users. Dropped if the user already picked
    // or cleared a P1 team before this resolves (player1TeamLockedRef), or if
    // some other path already populated bench[0] by the time it resolves.
    if (!isAuthenticated) {
      loadGuestStarterPikachu()
        .then((pikachu) => {
          if (!pikachu || player1TeamLockedRef.current) return
          if (!bench.player1Bench.every((p) => p === null)) return
          bench.setPlayer1Bench([pikachu, null, null, null, null, null])
          // Display-only label for the P1 team selector — intentionally NOT
          // added to teams.p1Teams, since that dict backs real saved/deletable
          // teams. deleteP1Team (Step 5 below) is updated to treat any
          // selected index with no matching teams.p1Teams entry as "nothing
          // real is selected," so "Clear Team" never calls the backend DELETE
          // endpoint for this synthetic label.
          teams.setP1SelectedTeamIndex("Default Pikachu Box")
        })
        .catch(() => {}) // best-effort onboarding convenience — never blocks the real pipeline
    }

    run()
```

- [ ] **Step 4: Lock the ref the instant the user picks a P1 team**

Find:
```typescript
  const handleTeamChange = (player: 1 | 2, teamName: string) => {
    if (player === 1) {
      teams.setP1SelectedTeamIndex(teamName)
      const team = teams.p1Teams[teamName]
      if (team) {
        bench.player1Bench.forEach((_, index) => removePokemonFromBench(1, index))
        bench.setPlayer1Bench(team.slice(0, 6))
      }
    } else {
```
Replace with:
```typescript
  const handleTeamChange = (player: 1 | 2, teamName: string) => {
    if (player === 1) {
      player1TeamLockedRef.current = true
      teams.setP1SelectedTeamIndex(teamName)
      const team = teams.p1Teams[teamName]
      if (team) {
        bench.player1Bench.forEach((_, index) => removePokemonFromBench(1, index))
        bench.setPlayer1Bench(team.slice(0, 6))
      }
    } else {
```

- [ ] **Step 5: Lock the ref when a P1 team is cleared/deleted, and treat an unsaved selected label (e.g. the guest starter's "Default Pikachu Box") as nothing being selected**

Find:
```typescript
  const deleteP1Team = async () => {
    if (!teams.p1SelectedTeamIndex) {
      bench.setPlayer1Bench(Array(6).fill(null))
      return
    }
```
Replace with:
```typescript
  const deleteP1Team = async () => {
    player1TeamLockedRef.current = true
    // A selected index with no matching teams.p1Teams entry isn't a real
    // saved team — this is the case for the guest starter Pikachu's
    // "Default Pikachu Box" label. Treat it the same as nothing selected:
    // just clear the bench locally, don't call the backend DELETE endpoint
    // for a team that was never saved.
    if (!teams.p1SelectedTeamIndex || !teams.p1Teams[teams.p1SelectedTeamIndex]) {
      teams.setP1SelectedTeamIndex("")
      bench.setPlayer1Bench(Array(6).fill(null))
      return
    }
```

- [ ] **Step 6: Run typecheck, lint, and the frontend unit suite**

Run: `cd Frontend && npx tsc --noEmit && npx eslint app/page.tsx && npx vitest run`
Expected: zero errors, all existing tests still pass.

- [ ] **Step 7: Manual verification in the browser**

Run: `cd Frontend && npm run dev`, then open the app in a fresh/incognito browser window (no existing session).
Expected: Player 1's active slot shows a Level 8 Pikachu (Naughty nature, Lightning Rod, Light Ball, moves Volt Tackle/Thunderbolt/Iron Tail/Quick Attack) without picking any team, and the P1 team dropdown displays "Default Pikachu Box" as a label (it does not appear as a persisted, re-selectable option in the dropdown's option list, since it was never saved).
Then: log in (or open the app in a window with an existing authenticated session).
Expected: Player 1's slot starts empty — no Pikachu appears for an authenticated user.
Then, as a guest: pick a real P1 team from the team dropdown.
Expected: the real team replaces the Pikachu, and reloading with that team still selected does not bring the Pikachu back.
Then, as a guest with the starter Pikachu still showing under the "Default Pikachu Box" label: click "Clear Team" (the trash icon).
Expected: the bench clears immediately with no confirmation dialog and no error toast (this exercises the deleteP1Team early-return guard, confirming it never attempts a backend DELETE for the unsaved label).

- [ ] **Step 8: Commit**

```bash
git add Frontend/app/page.tsx
git commit -m "feat: seed P1's active slot with a starter Pikachu for guests"
```

---

## Task 6: Frontend — e2e coverage

**Files:**
- Create: `Frontend/e2e/guest-starter-pikachu-fast-path.spec.ts`

- [ ] **Step 1: Write the e2e spec**

```typescript
import { test, expect } from "@playwright/test"

test.describe("Guest starter Pikachu fast-path", () => {
  test("GET /public/guest-starter-pikachu is reachable with zero cookies or Authorization header", async ({
    browser,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    const context = await browser.newContext()
    const response = await context.request.get(
      `${apiUrl}/public/guest-starter-pikachu`,
      { failOnStatusCode: false },
    )

    if (response.status() !== 0) {
      expect(response.status()).not.toBe(401)
    }
    await context.close()
  })

  test("guest-starter-pikachu response sets edge-cacheable headers", async ({
    request,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    const response = await request.get(`${apiUrl}/public/guest-starter-pikachu`, {
      failOnStatusCode: false,
    })

    if (response.ok()) {
      expect(response.headers()["cache-control"]).toContain("s-maxage")
    }
  })

  test("the guest-starter-pikachu request fires on initial page load", async ({
    page,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    let starterRequested = false

    page.on("request", (req) => {
      if (req.url().includes("/public/guest-starter-pikachu")) starterRequested = true
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const health = await page.request
      .get(`${apiUrl}/health`, { failOnStatusCode: false })
      .catch(() => null)
    if (health?.ok()) {
      expect(starterRequested).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run the e2e suite**

Run: `cd Frontend && npx playwright test guest-starter-pikachu-fast-path`
Expected: PASS (or skipped assertions where the backend/health check isn't reachable, matching the sibling `enemy-preview-fast-path.spec.ts` suite's behavior)

- [ ] **Step 3: Commit**

```bash
git add Frontend/e2e/guest-starter-pikachu-fast-path.spec.ts
git commit -m "test: add e2e coverage for the guest starter Pikachu fast path"
```

---

## Self-review notes (already applied above)

- Spec coverage: species/stats/moves/nature/item/ability (spec table) → Task 1; public+edge-cached endpoint → Tasks 2–3; guest-only detection reusing `!isAuthenticated` → Task 5 Step 3; race guard → Task 5 Steps 2, 4, 5; caching plan (edge-only, no Redis, no localStorage) → Tasks 2–3 (headers) with no Redis/localStorage code introduced anywhere; e2e parity with enemy-preview → Task 6.
- No placeholders: every step has complete, runnable code.
- Type consistency: `loadGuestStarterPikachu` (Task 4) is the exact name used in the Task 5 import and call site.
- "Default Pikachu Box" label (added after initial approval, per follow-up user request): set on `teams.p1SelectedTeamIndex` only, never added to `teams.p1Teams` — Task 5 Step 3. `deleteP1Team`'s guard (Step 5) was generalized from `!teams.p1SelectedTeamIndex` to `!teams.p1SelectedTeamIndex || !teams.p1Teams[teams.p1SelectedTeamIndex]` specifically so "Clear Team" can't attempt a backend DELETE for this unsaved label. This was a genuine bug risk caught before implementation (see chat: user was asked to choose between three placements and picked the display-only label to avoid exactly this).
