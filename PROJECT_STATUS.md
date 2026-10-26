# BubbleFun — project status

> Living handover for future chats and development. Read [VISION.md](VISION.md)
> for the game, [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) for the physics rules, and
> [REFACTORING.md](REFACTORING.md) for the completed structural cleanup.

**Reviewed:** 26 October 2026 (NZ)  
**Repository:** https://github.com/becciStuff/BubbleFun  
**Merged production baseline:** v0.7.1, swinging Gravity Lab demonstration, PR #10  
**Current review branch:** `fix/gravity-swing-button-072` — v0.7.2 Swing activation fix  
**Proposed version:** v0.7.2 in both `version.json` and `package.json`  
**Status:** G3 normal-play sway and G3.1 lab demonstration are merged. G3.2 fixes an inert Swing button before board load and on reduced-motion devices.

## What's playable

BubbleFun is a free static HTML/CSS/JavaScript bubble shooter (no build system
or frameworks). Arcade and three puzzles (Twin Towers, Heartbreaker, The Crown)
have responsive desktop and mobile playfields, colour matching, bombs and
delayed bomb chains, scoring/combos and falling unsupported bubbles.
The archived Bubble Pop mode stays hidden in `src/pop-mode.js`.

G1 support analysis can calculate the weights and distinct ceiling anchors of
hanging structures. **Normal gravity does not tear down ceiling-connected
bubbles simply because of their weight.**

G2 v0.6.0 added **Gravity Lab** to Arcade as an isolated *test harness*:
load a predetermined board, compare a weak chain with independently braced
bubbles, press Gravity Surge, and watch the vulnerable branch fall.
**This is not a second game mode in the long-term design**, nor an earned
special in real levels.

**G3 v0.7.0 merged** brings subtle, damped attached-bubble
sway to **normal Arcade and all Puzzles**. Single-anchor structures move more;
multiply supported structures move very little; shot impacts add decaying
motion; ceiling anchors stay fixed. The renderer, aim guide, projectile hit
checks and falling-body origins share the same *current* positions. The hex
grid still controls matching, connection topology and shot snap locations.
Reduced-motion settings disable attached sway. The corrected Lab now has a
long hanging pendulum that swings visibly, a **Swing the chain** button,
and two-anchor bracing. Support wires follow actual positions. Reduced motion
keeps the Lab static and disables its Swing control.

## Engineering boundaries

```text
src/config.js           Dimensions and tuning
src/grid.js             Hex lattice, graph adjacency, match and hit predicate
src/supports.js         Distinct ceiling supports, load, vulnerable bonds
src/sway.js             Attached displacement simulation (merged in G3)
src/positions.js        Shared current physical attached positions (G3 branch)
src/gravity.js          Existing detachment/falling and opt-in Surge
src/gravity-lab.js      Isolated deterministic test-board data
src/gravity-hints.js    Lab marker geometry using supports
src/gravity-overlay.js  Canvas-only Lab diagnostics
src/game.js             Shooting, matches, turn sequencing, scores and status
src/puzzles.js          Puzzle boards and shot limits
src/effects.js          Particles, pulses and visual effects
src/render.js           Canvas view and aim guide, using live positions
src/app.js              Inputs, UI, optional sound and scores
src/pop-mode.js         Archived hidden mode
tests/                  Node and Chromium gameplay/physics regression checks
```

No React, bundler or monolithic physics-in-`game.js`. Keep one-way dependencies
and pure modules for geometry and support calculations.

## Important agreed behaviour

1. **Gravity is integrated into real gameplay**, not a permanent separate
   mode. Gravity Lab remains available only as a debug/demo environment.
2. **Normal Gravity** never detaches a ceiling-supported structure due to
   weight alone; loss of its actual ceiling path still causes a cascade.
3. **Extreme Gravity** may break weak, overloaded supports. Distinct ceiling
   anchors matter — two connections to one ceiling bubble are *not* two
   independent roof supports. Multiple real anchors protect a region until a
   later, more advanced load-sharing system is built.
4. **Fair aiming** is non-negotiable: visually moved bubbles, the aiming guide
   and projectile collisions must share live positions. Connected matching
   still uses a stable lattice for the initial constrained-sway milestone.
5. Fizzlings, rescue story, boss levels, free/earned-only in-game coins, no
   paid purchases. Desktop and mobile are equally important.
6. The JSON `version.json` file drives the visible version; `npm run
   version:minor` / `version:patch` updates it with `package.json`.

## Verification

- **PR #8 (v0.6.0):** Merged; Gravity Lab and browser smoke tests passed.
- **PR #9 (v0.7.0):** Merged, with **82 tests passing**.
- **v0.7.1 fix:** PR #10 merged with a long hanging pendulum and push button. **v0.7.2** makes one-click Swing available directly from Arcade, explicitly opts into Lab motion when OS requests reduced motion, and adds live pixel-displacement feedback. **83 Node tests pass; Chromium browser smoke passes at 1300px and 390px with reduced motion on and off** (runs 40249981474 and 40249981565). Real-device visual confirmation is still pending.
- **G3 browser automation:** desktop 1300px and phone-sized 390px Chromium
  smoke checks passed, including live displacement and collision checks on
  both board sizes. Full manual playtesting and live GitHub Pages deployment
  have not been verified for the new PR.
- Standard puzzle-solving and bomb regression tests remain in the full Node
  suite. Check all workflows again after final documentation commits.

## Next steps

- [x] Structural refactor — configuration, grid, puzzles, gravity, effects and
      archived mode extracted (PRs #1–4).
- [x] G1 support / weight and ceiling anchoring analysis (PR #5).
- [x] G2 Gravity Lab demo (PR #8).
- [x] G3 live sway, shared positions and tests merged in PR #9.
- [x] G3.1 visible Lab pendulum and one-button push — implemented and automated checks passed.
- [x] PR #10 merged, adding the lab's long pendulum and push control.
- [ ] Review the v0.7.2 Swing-button fix; check its CI and visually confirm motion after merge.
- [ ] Review and merge PR #9 after CI; manually play Arcade and each puzzle on
      desktop/mobile, including near misses and rebound shots.
- [ ] G4: advanced multi-anchor load sharing, stickiness and controlled Extreme
      Gravity failure. Avoid arbitrary normal-gravity detachment.
- [ ] G5: further elastic/pendulum-like movement, stretching and impact
      transmission. Maintain live collision/aim parity.
- [ ] Later: earned specials, Fizzlings adventure, puzzle worlds, bosses,
      skill bonuses and earn-only shop.

## Starting a fresh conversation

> We're continuing BubbleFun at https://github.com/becciStuff/BubbleFun.
> Please read PROJECT_STATUS.md, GRAVITY_DESIGN.md, VISION.md and the source.
> The structural refactor and G1/G2 are merged. PR #9 merged v0.7.0 with
> real-game attached sway and live projectile collisions. Please verify merge
> status before doing new work, and preserve normal vs Extreme Gravity rules.

Update this file after each substantial checkpoint. Keep feature ideas
clearly separated from implemented gameplay.
