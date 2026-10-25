# BubbleFun — project status

> **Living handover document.** Use this as the first stop when resuming BubbleFun in a new ChatGPT conversation or development session. This records the **current implementation**, decisions and next steps; [VISION.md](VISION.md) covers the longer-term game design, and [REFACTORING.md](REFACTORING.md) contains the engineering plan.

**Last reviewed:** 26 October 2026 (NZ)  
**Repository:** [becciStuff/BubbleFun](https://github.com/becciStuff/BubbleFun)  
**Working branch:** `feature/gravity-lab-g2` (v0.6.0 experimental Gravity Lab for review)  
**Prototype version:** `0.6.0` on G2 review branch (`version.json` + `package.json`)  
**Current phase:** G2 visible Gravity Lab and test-only Surge added on review branch. Normal modes remain unchanged.  
**Pre-refactor reference commit:** `fe1b23ccabcd7f52261fd3a45e1c73c15be0146c`

## One-minute summary

BubbleFun is a free, static browser bubble-shooter prototype, written in plain HTML, CSS and JavaScript. The playable modes are **Arcade** and **Puzzles**. We want to grow it into a polished, physics-led rescue adventure about cute creatures called **Fizzlings**, with clever gravity, strategic special shots, bosses and earned-only in-game coins.

**The immediate priority:** review the G2 experimental lab, verify CI and manually test visuals on desktop/mobile. `supports.js` owns support calculations; `gravity.js` owns falling; `gravity-lab.js` owns preset data; the UI is isolated from game physics. See [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md).

## What is working now

| Area | Current implementation |
| --- | --- |
| Arcade | Aim and shoot coloured bubbles; match groups of three or more; descend a new row after a set number of shots. |
| Puzzles | Three handcrafted shaped puzzles: **Twin Towers**, **Heartbreaker** and **The Crown**, each with marked bomb targets and shot limits. |
| Bombs | Matched bombs cause area blasts; caught bombs can detonate in a timed chain. |
| Basic gravity | Bubbles disconnected from the ceiling fall as separate animated objects and burst on the floor, producing effects and score. |
| Shooting | Wall bounces, an aim guide and projectile collision calculations with a little grace for near-tangent shots. |
| Presentation | Shaded/glossy bubbles, particles, impact wobble, explosions, combos, responsive desktop/mobile canvas layouts. |
| Input and settings | Mouse, touch, keyboard, optional sound and browser-local best scores. |
| Hosting | Static HTML/CSS/ES modules with no runtime dependency or build requirement; GitHub Pages setup is documented in README. A live Pages deployment has **not** been confirmed in this review. |

**Bubble Pop/Burst remains hidden** and its older rules live in `src/pop-mode.js`. Do not reintroduce it without a separate decision.

## What is *not* implemented yet

- A finished attached-bubble physics system: springy sway, live moving hitboxes and a balanced Gravity Surge special for real levels. **G2 adds a visible diagnostic and a deliberately isolated test button only**.
- Piercing Fireball, horizontal/vertical blasts, Gravity Surge and the planned purchasable special shots.
- Guide-off scoring bonus and multi-colour collateral bonus.
- Fizzling characters, trapped friends/family, rescue animations, story progression, worlds and boss levels.
- Earn-only coins, Fizz Shop and special-shot inventory.
- The additional richer 2.5D effects and polish described in the vision.

The present impact **wobble is visual feedback**; it is not the proposed simulated hanging-cluster physics.

## Agreed design decisions to preserve

1. **Fizzlings:** original cute creatures; the game's story is about rescuing their friends and families. Bosses should add interesting mechanics.
2. **Normal gravity:** a bubble hanging from just one support can sway but must **not** fall merely because of weight.
3. **Extreme gravity:** weak, singly supported groups may detach. Two bubbles that are **independently** supported should withstand more than a lone dangling bubble. Count cluster weight, stickiness and actual support paths, not just the number of touching bubbles.
4. **Fair collisions:** if attached bubbles eventually move, the renderer, aim guide and projectile must all use the same live bubble positions and collision geometry.
5. **No real-money economy:** any special shots/coins should be obtained through gameplay. Keep the experience fair and ad-free.
6. **Desktop and mobile are both first-class:** layouts adapt to the device without making the desktop site look like an oversized phone.
7. **Arcade/Puzzles remain playable:** new physics must be introduced carefully so existing puzzles stay fair and solvable.

For the full ideas, including visuals, bonuses, shops and bosses, see [VISION.md](VISION.md). Decisions not settled there remain open; do not silently invent them as fixed specifications.

## Current code map

```text
index.html        Menus and canvas
styles.css       Responsive interface
src/app.js       Browser input, UI, sound, score persistence
src/render.js    Canvas rendering and effects drawing
src/config.js    Layouts, colours and shared constants
src/grid.js      Hex-grid geometry, matching, ceiling connectivity and shot hits
src/puzzles.js   Puzzle designs and pure board/target setup
src/gravity.js   Detached-cluster decisions, falling motion and optional surge release
src/supports.js  Pure support graph, weights, roof anchors and strain
src/game.js      Shooter orchestration, scoring and bomb chains
tests/game.test.js
tests/grid.test.js     Grid geometry, connectivity and collision tests
tests/puzzles.test.js  Puzzle regression tests
tests/gravity.test.js  Gravity regression tests
src/effects.js    Visual effect data and animation updates
src/pop-mode.js   Archived Bubble Pop mode
tests/modules.test.js   Extraction regression tests
tests/supports.test.js Support structure, load and surge planning
tests/surge.test.js    Physics integration without scoring
src/gravity-lab.js   Test-board definition (G2 branch)
src/gravity-hints.js Support marker data (G2 branch)
src/gravity-overlay.js Canvas warning graphics (G2 branch)
tests/gravity-lab.test.js Lab workflow and safety checks (G2 branch)
package.json     ES modules; npm test uses node --test
GRAVITY_DESIGN.md  Support model, limitations and staged physics roadmap
VISION.md        Game vision and feature roadmap
REFACTORING.md   Proposed technical reorganisation
PROJECT_STATUS.md  This handover
```

The original refactor modules (`config.js`, `grid.js`, `puzzles.js`, `gravity.js`, `effects.js`, and `pop-mode.js`) are merged on `main`. The new `supports.js` and G1 tests are on the review branch; no player-facing gravity controls were added.

## Next development work

**Active milestone: G1 physics prototype, separate from the structural refactor.** PR #4 was merged. G1 was merged in PR #5. The new version synchronisation fix is on a separate review branch.

- [x] **Phase 0 — baseline:** Existing bomb/cascade/falling/row-timing tests retained, with added direct-hit and detached-chain regression cases.
- [x] **Phase 1 — configuration and grid:** Extracted shared constants, hex coordinates, neighbour traversal and ceiling connectivity to `config.js` and `grid.js`; guide and projectile now share one collision predicate, with focused grid tests.
- [x] **Phase 2 — puzzles:** Isolated puzzle data and fresh board/target construction; added focused tests, including all three real solutions on both layouts.
- [x] **Phase 3 — gravity (merged):** Moved current ceiling-detachment policy and falling simulation to `gravity.js`, exposing synchronous spark/burst callbacks while scoring and game outcomes stay in `game.js`.
- [x] **Phase 4 — tidy orchestration (merged):** Extracted effects and archived Pop logic; `game.js` remains the turn coordinator.
- [x] **G1 prototype code (on review branch):** Add independent ceiling-anchor and vulnerable-bridge analysis, weight and configurable stickiness, plus an explicit opt-in surge-release API.
- [x] **G1 merge:** PR #5 merged and the 62-test GitHub Actions suite passed.
- [x] **Version bump infrastructure:** PR #6 merged v0.5.1 and release-bump commands.
- [ ] **JSON version display:** Review PR for root `version.json` source, `Version` label, and JSON-driven release bumps; tests must pass before merge.
- [x] **G2 prototype (review branch):** Show amber weak-support and mint independent-brace indicators; load a deterministic board; trigger one test Surge; retain scoring and gameplay separation.
- [ ] **G2 release verification:** Automated tests, mobile and desktop browser smoke checks, then merge PR.
- [ ] **Future G3/G4:** Improve load sharing, then introduce moving attached clusters with collision/aim/render parity.
- [ ] **Browser verification:** Recheck desktop/mobile and GitHub Pages once gravity is wired into gameplay.

The G2 Gravity Lab allows a player to try Surge on a dedicated test board. Arcade and puzzle rules are unchanged. See [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md).

## Verification and current risks

- **G1 verification:** GitHub Actions passed all 62 tests on gravity PR #5. Version PR #6 tests passed (64 total). The JSON version-display PR adds new loader and bump tests; check its CI before merging.
- **Browser behaviour:** No player-facing changes are intentionally wired into the loop. New G1 browser and mobile tests remain pending.
- **Not yet verified:** A live GitHub Pages deployment, mobile browser interaction and the full manual gameplay checklist. Do not mark them as passed based only on Node tests or a desktop smoke test.
- **Engineering design:** Keep the dependency chain `config → grid → supports → gravity → game`; avoid circular imports or a growing `game.js`.
- **Future risk:** Visually moving attached bubbles must use the same live positions for rendering, projectile collision and aim guide.
- **Model limitation:** The first support model captures single roof-anchor regions and cut bonds, but does not yet distribute load across multiple ceiling supports.

## How to resume in a new chat

Use the GitHub repository as the source of truth, not the previous chat's memory. A useful starter message:

> We're continuing BubbleFun: https://github.com/becciStuff/BubbleFun  
> Please read `PROJECT_STATUS.md`, `REFACTORING.md`, `VISION.md` and the current source before editing.  
  > All four refactoring phases and G1 support analysis are merged. JSON version display was merged in PR #7. G2 Gravity Lab is in `feature/gravity-lab-g2` targeting **v0.6.0**. It is a demo only, not a real level special. No physics movement or Gravity Surge activation is present during normal play.

## Update rules for future sessions

After each meaningful implementation or design session:

1. Update the **current phase**, completed checkboxes and the **next specific task**.
2. Add new **confirmed** decisions or issues; clearly distinguish ideas from implemented behaviour.
3. Note which tests and browser checks really ran, and whether they passed.
4. Record the relevant commit or pull request when code lands, without treating an old commit as the current head forever.
5. Keep historical details in commits/PRs; keep this file a concise **current snapshot**, not an endless diary.

---

*Updated for version tracking after the G1 merge. Gravity swaying and player-triggered Surge are not implemented.*
