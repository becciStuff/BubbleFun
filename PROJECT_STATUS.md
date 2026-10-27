# BubbleFun — current project status

**Updated:** 28 October 2026 (NZ)  
**Repository:** https://github.com/becciStuff/BubbleFun  
**Merged baseline:** v0.8.2 (PR #14), spring gravity and sticky physical contacts  
**Current review:** [PR #15](https://github.com/becciStuff/BubbleFun/pull/15) on `feature/contact-match-soft-bonds-083`  
**Proposed version:** **v0.8.3**, mirrored in `version.json` and `package.json`  
**Current goal:** Turn real, new sticky contacts into automatic same-colour
3+ pops, and make connection threads look like soft stretched bonds.

Read [VISION.md](VISION.md), [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) and
[REFACTORING.md](REFACTORING.md) before adding more features.

## Player feedback that drives this milestone

The user provided screenshots showing (1) long single-supported side-hanging
groups staying static in hex positions, (2) bubbles failing to connect when
their swing brings them into physical contact, (3) pop/bomb explosions that
do not convincingly shake survivors, and (4) an artificial synchronized
back-and-forth motion incorrectly presented as gravity.

**These are requirements, not cosmetic polish.** Earlier Node tests passed
but didn't adequately reflect how the game looked and felt.

## What PR #14 changes

- The only visible play styles remain **Arcade** and **Puzzles** (Twin
  Towers, Heartbreaker, The Crown). Gravity Lab remains removed.
- `src/sway.js` now integrates **gravity, elastic adhesive bonds, damping
  and collision forces** instead of sinusoidal animation or static sag targets.
- `src/physical-bonds.js` manages actual spring links and contacts. If a
  moving chain meets another bubble, it forms a sticky bond.
- Dynamic contacts also participate in `grid.js` colour matching, ceiling
  connectivity and `supports.js` support analysis. Removing the original
  support won't drop a group while its newer attachment holds it.
- The same attached-position map controls sprite placement, aiming, real
  projectile collision and falling spawn points. A shot at a moved target
  physically joins near the visible hit before relaxing towards its grid cell.
- Popped matches and bombs inject real **local recoil** into surviving
  bubbles, which propagates through springs, oscillates and damps out.
- Ceiling row bubbles stay pinned. Supported bubbles do not snap under
  normal gravity. Unsupported groups fall. Reduced-motion preferences
  keep attached bubbles static.
- Arcade/Puzzle scoring, existing puzzle designs, bombs, rows and combo
  logic continue to be owned by `game.js`.

## New PR #15 functionality

- `physical-bonds.js` records newly touched physical bonds as events.
- `contact-matches.js` detects a whole connected same-colour group of 3+
  joined by a NEW bond, with no duplicate processing.
- `game.js` awards regular match points, triggers the same pop particles and
  bomb queue, then settles falling bubbles. No extra shot is consumed.
- A Puzzle can finish in fewer shots thanks to an additional contact match;
  every Puzzle must still need player input and remain completable within its
  previously known solution path.
- `attachment-visuals.js` draws short translucent, gently curved gel threads
  only where bubble rims actually separate, rather than bright centre-to-centre rods.
- Gravity Lab remains removed. Physical coordinates remain authoritative
  across drawing, aiming, collisions and falling.

## Architecture

```text
src/config.js             Dimensions and colour constants
src/grid.js               Resting hex grid, optional dynamic neighbour links
src/supports.js           Ceiling graph, anchor loads, future Extreme Gravity
src/physical-bonds.js     Sticky contacts, link graph and collision response
src/contact-matches.js    Pure 3+ match detection on newly created bonds
src/sway.js               Gravity, spring integration, local shot/blast momentum
src/positions.js          Shared current physical bubble positions
src/gravity.js            Detachment and falling physics, unwired Surge API
src/attachment-visuals.js Real link rendering
src/render.js             Canvas and aim guide from live positions
src/game.js               Rules, scoring and thin physics calls
src/app.js                Input and UI
src/puzzles.js            Handcrafted puzzles
src/effects.js            Visual effects separate from physical motion
src/pop-mode.js           Archived Bubble Pop mode, hidden
tests/                    Physics, puzzle, support, browser regression checks
```

Do not grow a monolithic `game.js`. Keep spring/contact behaviour isolated
and ensure visual movement never disagrees with the real hit tests.

## Hard rules

1. Gravity is **part of the actual game**, never another mode.
2. Weight makes singly supported branches droop/swing. The connection itself
   doesn't snap under Normal Gravity; only loss of all supports detaches.
3. Newly touching bubbles **stick physically**, provide support paths and
   may become colour-connected groups.
4. Explosions should drive neighbouring connected structures into motion,
   transferring momentum through real attachments, then settling.
5. No periodic animation masquerading as physics.
6. A future player-earned Extreme Gravity power can break overloaded bonds,
   subject to playtesting and puzzle balance. It is NOT currently playable.
7. `version.json` controls the on-screen version.
8. No payments/pay-to-win; planned Fizzlings rescue world, bosses and earn-only
   currency are in [VISION.md](VISION.md).

## Next actions

- [x] Structural refactor PRs #1–4.
- [x] G1 weight/support graph (PR #5).
- [x] Early temporary Gravity Lab and swaying prototypes (PRs #8–11).
- [x] Integrated movement / removed Lab (PR #12).
- [x] Initial bounded sag and blast impulses (PR #13).
- [x] New physically driven spring/contact code on the PR #14 branch.
- [x] **CI on the PR #14 physics head:** 90 Node tests passed (0 failures), including a cantilever forming a new bond naturally and a projectile attaching near the actual displaced target (run 40574875781). Chromium smoke passed at 1300px/390px with reduced motion enabled and disabled (run 40574876036). Recheck on the final review commit.
- [x] PR #14 merged: actual spring gravity and physical sticky bonds.
- [ ] Review PR #15 after Node and browser CI confirms contact pop and Puzzle handling.
- [ ] Inspect v0.8.3 on the deployed game — especially matching through contact,
      bomb cascades and softer lines.
- [ ] After deploy, visually inspect screenshot-like side hangers, contacts,
      blast recoil and actual aim fairness on desktop and mobile.
- [ ] Later: refine multi-anchor tension distribution, bond strength, richer
      elastic structures, balanced Extreme Gravity as a real-game special.

## Checkpoint handover

> BubbleFun is at PR #15 for v0.8.3. Spring gravity, recoil and sticky
> physical contacts are merged (PR #14). PR #15 adds automatic 3+ matching
> when moving bubbles touch, plus translucent gel-like connection art.
> Verify merge/CI before new work. Gravity Lab stays removed; the single
> live-position map still governs aim, rendering and collisions.
