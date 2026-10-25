# BubbleFun — project status

> **Living handover document.** Use this as the first stop when resuming BubbleFun in a new ChatGPT conversation or development session. This records the **current implementation**, decisions and next steps; [VISION.md](VISION.md) covers the longer-term game design, and [REFACTORING.md](REFACTORING.md) contains the engineering plan.

**Last reviewed:** 26 October 2026 (NZ)  
**Repository:** [becciStuff/BubbleFun](https://github.com/becciStuff/BubbleFun)  
**Working branch:** `fix/version-tracking-051` (version synchronisation PR; gravity support PR #5 merged)  
**Prototype version:** `0.5.1` (maintenance/refactor release, on version-fix branch)  
**Current phase:** G1 support/weight calculations merged but dormant in normal play; version display fix pending; G2 visual feedback next  
**Pre-refactor reference commit:** `fe1b23ccabcd7f52261fd3a45e1c73c15be0146c`

## One-minute summary

BubbleFun is a free, static browser bubble-shooter prototype, written in plain HTML, CSS and JavaScript. The playable modes are **Arcade** and **Puzzles**. We want to grow it into a polished, physics-led rescue adventure about cute creatures called **Fizzlings**, with clever gravity, strategic special shots, bosses and earned-only in-game coins.

**The immediate priority:** validate weight and independent support analysis in `src/supports.js` before connecting extreme gravity to gameplay. The modular refactor is merged. `game.js` still owns scoring and turns. See [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) for the new physics roadmap.

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

- A playable attached-bubble gravity engine: movement, springy sway, live hitboxes, visual strain and an activatable Extreme Gravity special. **G1 adds support/weight calculations and an opt-in release API only**.
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
src/supports.js  Pure support graph, weights, roof anchors and strain (G1 branch)
src/game.js      Shooter orchestration, scoring and bomb chains
tests/game.test.js
tests/grid.test.js     Grid geometry, connectivity and collision tests
tests/puzzles.test.js  Puzzle regression tests
tests/gravity.test.js  Gravity regression tests
src/effects.js    Visual effect data and animation updates
src/pop-mode.js   Archived Bubble Pop mode
tests/modules.test.js   Extraction regression tests
tests/supports.test.js Support structure, load and surge planning (G1 branch)
tests/surge.test.js    Physics integration without scoring (G1 branch)
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
- [ ] **Version release tracking:** PR pending to bring the visible badge and package version to v0.5.1, with a bump script and consistency test.
- [ ] **Future G2:** Visual strain feedback and player activation; G3 load sharing; G4 moving attached clusters with collision/aim/render parity.
- [ ] **Browser verification:** Recheck desktop/mobile and GitHub Pages once gravity is wired into gameplay.

The G1 prototype intentionally has **no effect on normal play**. The physics engine can release vulnerable cells if an external caller explicitly requests it. See [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md).

## Verification and current risks

- **G1 verification:** GitHub Actions passed all 62 tests on gravity PR #5. Version-fix PR adds a test comparing the badge, JS version constant and `package.json`; its full CI results must be checked independently.
- **Browser behaviour:** No player-facing changes are intentionally wired into the loop. New G1 browser and mobile tests remain pending.
- **Not yet verified:** A live GitHub Pages deployment, mobile browser interaction and the full manual gameplay checklist. Do not mark them as passed based only on Node tests or a desktop smoke test.
- **Engineering design:** Keep the dependency chain `config → grid → supports → gravity → game`; avoid circular imports or a growing `game.js`.
- **Future risk:** Visually moving attached bubbles must use the same live positions for rendering, projectile collision and aim guide.
- **Model limitation:** The first support model captures single roof-anchor regions and cut bonds, but does not yet distribute load across multiple ceiling supports.

## How to resume in a new chat

Use the GitHub repository as the source of truth, not the previous chat's memory. A useful starter message:

> We're continuing BubbleFun: https://github.com/becciStuff/BubbleFun  
> Please read `PROJECT_STATUS.md`, `REFACTORING.md`, `VISION.md` and the current source before editing.  
  > All four refactoring phases and G1 support analysis are merged. Version tracking is in `fix/version-tracking-051`; reserve v0.6.0 for the first visible gravity changes. No physics movement or Gravity Surge activation is present during normal play.

## Update rules for future sessions

After each meaningful implementation or design session:

1. Update the **current phase**, completed checkboxes and the **next specific task**.
2. Add new **confirmed** decisions or issues; clearly distinguish ideas from implemented behaviour.
3. Note which tests and browser checks really ran, and whether they passed.
4. Record the relevant commit or pull request when code lands, without treating an old commit as the current head forever.
5. Keep historical details in commits/PRs; keep this file a concise **current snapshot**, not an endless diary.

---

*Updated for version tracking after the G1 merge. Gravity swaying and player-triggered Surge are not implemented.*
