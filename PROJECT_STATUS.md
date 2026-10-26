# BubbleFun — project status

> This is the source of truth for picking up development later. Read
> [VISION.md](VISION.md), [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) and
> [REFACTORING.md](REFACTORING.md) before beginning new milestones.

**Updated:** 26 October 2026 (NZ)  
**Repo:** https://github.com/becciStuff/BubbleFun  
**Merged baseline:** v0.7.2 (PR #11), with temporary Gravity Lab  
**Current review branch:** `feature/gravity-in-main-remove-lab-080` — [PR #12](https://github.com/becciStuff/BubbleFun/pull/12)  
**Proposed release version:** **v0.8.0**, from `version.json` and mirrored in `package.json`  
**Current phase:** Bring all gravity motion into ordinary Arcade/Puzzles;
**remove Gravity Lab** instead of turning it into another play style.

## What players should see after PR #12 merges

BubbleFun is a vanilla JS free-to-play bubble shooter with only two
visible play styles: **Arcade** and **Puzzles** (Twin Towers,
Heartbreaker, The Crown). The older Bubble Pop mode stays archived and
hidden in `src/pop-mode.js`.

- Bubbles still match colours, bombs chain, disconnected pieces fall,
  scores/combos accumulate, and responsive mobile/desktop boards work.
- **Attached bubbles move naturally** as part of ordinary gameplay.
  Single-ceiling hangers have a small pendulum effect. Densely supported
  formations flex subtly instead of being totally still. **Shot impacts
  produce substantially more noticeable connected-bubble ripples.**
- Tiny translucent joints show when bubbles stretch their attachment a bit.
  Roof anchors do not move. Reduced-motion settings disable the animation.
- The visible bubble positions and actual projectile/aim/cascade collision
  geometry are shared. The resting hex grid continues to own colour matching
  and the final snapped shot slot.
- **No Gravity Lab, no Swing button, no Load Test Board, no in-game
  Gravity Surge button.** Standalone Lab source files and UI have been
  removed. The weight/strength analysis remains internally available for a
  future earned special.
- No ordinary gravity breaks ceiling-supported groups purely for being heavy.
  Extreme Gravity support breaking is not yet a feature in levels.

## Architecture

```text
src/config.js             Shared layout and tuning
src/grid.js               Hex lattice, neighbors, match and shared collision
src/supports.js           Load/ceiling anchor graph and break planning
src/sway.js               Shot impulses and damped connected motion
src/positions.js          Shared live attached positions
src/gravity.js            Detached/falling simulation + internal Surge API
src/attachment-visuals.js Small visual connector renderer
src/render.js             Bubble drawing and aim guide
src/game.js               Match, score, turn and progression coordinator
src/puzzles.js            Three handcrafted puzzle definitions
src/effects.js            Explosions, particles, pulses
src/app.js                Input, UI and scores
src/pop-mode.js           Archived Bubble Pop
tests/                    Node plus Playwright responsive browser coverage
```

**Avoid mega-files.** Keep geometry, support analysis, attached motion, falls,
visuals and gameplay orchestration in separate modules.

## Key design agreements

1. Gravity is **part of Arcade and Puzzles**, not a separate game mode.
2. Normal gravity keeps any ceiling-connected structure attached regardless
   of weight; lose the last ceiling path and it falls.
3. Distinct ceiling anchors count as independent supports. Two links back to
   one roof bubble aren't two separate anchors.
4. An eventual **Extreme Gravity** special can break overloaded weak bonds,
   but only with a tested multi-support load-sharing model, warnings, rewards
   and clear player activation.
5. **Render, aim, shot collision and falling origins must use the same live
   positions**. Stable hex cells remain the basis for matching and snapping.
6. Reduced motion, touch use, puzzle goals and fair gameplay matter on both
   mobile and desktop.
7. The release number comes from `version.json` and changes deliberately,
   with the npm version commands keeping `package.json` in sync.
8. Future: Fizzlings rescue adventure, earn-only coins, no paid power-ups,
   bosses, special shots, and worlds from VISION.md.

## Milestones

- [x] Structural refactor into small modules (PRs #1–4).
- [x] G1 separate support/weight calculations (PR #5).
- [x] G2 temporary Gravity Lab demo for physical comparisons (PR #8).
- [x] G3 initial subtle sway with shared hit positions (PR #9).
- [x] G3.1/G3.2 diagnostic pendulum and button fixes (PRs #10–11).
- [x] v0.8.0 code on review branch: retire Lab UI/code, react to actual
      shots in Arcade/Puzzles, add elastic-looking joints and replacement tests.
- [ ] Confirm final Node + browser CI for PR #12, then review and merge.
- [ ] Hand-play Arcade and all Puzzles after deploy on actual phones/desktops.
- [ ] Better spring/bond physics, real multi-anchor load sharing, controlled
      Extreme Gravity special *inside the real game*.

## Verification

At the time this document was initially written, the v0.8.0 branch
**passed 75 Node tests (0 failures)**. Chromium UI checks also ran
successfully before the documentation update; CI must be reconfirmed on
the final PR commit. Live GitHub Pages and real-device tests have not been
personally verified. Do not misstate automated checks as manual playtests.

## Handover note

> Continue BubbleFun from https://github.com/becciStuff/BubbleFun. Start by
> checking whether PR #12 (v0.8.0 gravity in main game, remove Gravity Lab)
> merged. Keep only Arcade and Puzzles as visible play styles, retain
> modular physics, and preserve shared moving hitboxes. Don't reintroduce
> the Lab. See GRAVITY_DESIGN.md and VISION.md for the planned advanced gravity
> and Fizzlings roadmap.
