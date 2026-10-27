# BubbleFun — current project status

**Updated:** 28 October 2026 (NZ)  
**Repository:** https://github.com/becciStuff/BubbleFun  
**Merged baseline:** v0.8.1 (PR #13), static sag plus small explosion impulses  
**Current review:** [PR #14](https://github.com/becciStuff/BubbleFun/pull/14) on `feature/real-gravity-contacts-082`  
**Proposed version:** **v0.8.2**, mirrored in `version.json` and `package.json`  
**Current goal:** Replace global artificial swaying with actual gravity-driven
movement, new contact bonds and visible explosion recoil in normal play.

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

## Architecture

```text
src/config.js             Dimensions and colour constants
src/grid.js               Resting hex grid, optional dynamic neighbour links
src/supports.js           Ceiling graph, anchor loads, future Extreme Gravity
src/physical-bonds.js     Sticky contacts, link graph and collision response
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
- [x] **CI on PR #14 current head:** 88 Node tests passed (0 failures); Chromium smoke passed at 1300px/390px with reduced motion enabled and disabled (runs 40573850984 and 40573850927).
- [ ] Review and merge PR #14 when happy, followed by a hands-on deployed game feel check.
- [ ] After deploy, visually inspect screenshot-like side hangers, contacts,
      blast recoil and actual aim fairness on desktop and mobile.
- [ ] Later: refine multi-anchor tension distribution, bond strength, richer
      elastic structures, balanced Extreme Gravity as a real-game special.

## Checkpoint handover

> BubbleFun is at PR #14 for v0.8.2. Previous faux sine swaying was
> rejected in user playtesting. The new work uses gravity, spring constraints,
> sticky contacts, shared hitboxes and true explosion impulses. Look at
> `GRAVITY_DESIGN.md`; verify PR merge/CI before doing more. Gravity Lab stays
> removed. Preserve modular architecture and avoid overclaiming automatic tests
> as proof of subjective motion quality.
