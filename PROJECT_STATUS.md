# BubbleFun — current project status

**Updated:** 30 October 2026 (NZ)  
**Merged baseline:** v0.9.2, all unwanted Gravity Shift features removed; stable spring physics retained.  
**Current review:** [PR #23](https://github.com/becciStuff/BubbleFun/pull/23) on `feature/configurable-depth-scoring-093`.  
**Proposed version:** **v0.10.0** (first configurable depth scoring release).  
**Current goal:** Reward deep, risky pops/drops with an adjustable 1×–3× per-bubble multiplier, without changing physics, combo detection or the user's unimplemented special tools.

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

## PR #17: correct colour-group matching (v0.8.5)

The user found that v0.8.4 caused already-connected matching bubbles to
pop when no genuinely new group had joined. The culprit was emitting a
new match on an old lattice bond's re-touch, and processing new redundant
sticky bonds without checking whether both endpoints were already linked
through other same-colour paths.

- `contact-matches.js` compares the same-colour connectivity **before**
  versus **after** fresh physical sticky bonds. Only an actual merger of
  previously separate colour groups can produce a match.
- A *six-connected-blue group plus a separate seventh blue* still bursts
  all seven with full combo scoring; a bouncing group of seven existing
  blues stays untouched.
- New redundant physical bonds remain valid support links, but don't
  accidentally score points or pop pre-existing same-colour groups.
- Remove the flawed re-touch match-event generator and obsolete
  `separatedBonds` state. `sway.js`, row insertion and actual spring/contact
  forces otherwise remain unchanged.
- Automated tests explicitly reject false pops from an old bond, a new
  redundant bond, and ordinary post-shot settling. Existing seven-bubble
  matches, bombs, puzzle solvability and row momentum must keep passing.

## PR #23 — Depth scoring as an independent configurable system

**First playable implementation of the agreed risk/reward mechanic:**

- **`src/scoring-config.js`** exposes independently tunable match, drop,
  bomb-victim and activation points; 1–3× smooth depth multiplier (power 1.5);
  danger-line offset, combo bounds and DEEP CLEAR thresholds.
- **`src/scoring.js`** owns all live Y-position depth calculations and
  awards for Arcade and Puzzle: standard matches, real new swinging-contact
  matches, bomb victims and detachments.
- The existing base values and combo behaviour remain. Each removed
  bubble earns its own depth reward *before leaving the board*.
  Floor bursts never add points; overlapping removals cannot count twice.
- **DEEP CLEAR!** appears for qualifying long low-hanging drops. It
  displays the actual award, but gives no extra points beyond depth.
- All depth comparisons are proportional to the playfield, not fixed
  mobile/desktop pixel rows. Puzzle goals and hit physics are unchanged.
- Existing Bomb Bubbles remain functional; no new bubble effects, player
  tools, random shifts or Extreme Gravity behaviour are implemented.
- This is an *initial balance configuration* that can be tuned from
  one file, independent of future tool-charge rules and coin economy.

## PR #21: Remove the rejected Gravity Shift experiment

The user does **not** want more Gravity Shift work. The permanent meters and
buttons of v0.9.0 and the rare event-host bubbles/Gravity Orbs of v0.9.1 were
not the intended design. **All their live mechanics, UI, drawing and dedicated
code/tests are removed.** No replacement gravity ability is planned in this
PR.

The safe method is restoring the exact **pre-shift code after PR #18**
(`23391979`) for `game.js`, `sway.js`, `gravity.js`, `app.js`,
`render.js`, `index.html`, `styles.css`, and the browser smoke tests;
then deleting the two experiment-only `gravity-events` modules.

**Do not regress the earlier gravity work:** actual spring-driven swaying,
elastic and sticky physical connections, full newly connected colour-group
matches (including 6+1), impact recoil, falling cascades, uninterrupted
momentum as a new ceiling row arrives, and Puzzle solvability. All of
those remain exactly as established in v0.8.5.

The independent depth-risk scoring requirement from PR #18 is still
documented in `VISION.md` and remains a future topic; this cleanup does
**not** change scoring. Release v0.9.2 marks deletion of the mistaken
experiment only. No other redesign intended.

## Architecture

```text
src/config.js             Dimensions and colour constants
src/grid.js               Resting hex grid, optional dynamic neighbour links
src/supports.js           Ceiling graph, anchor loads, future Extreme Gravity
src/physical-bonds.js     Sticky contacts, link graph and collision response
src/contact-matches.js    Whole-colour 3+ detection on new contact events
src/row-physics.js        Keep live positions, momentum and sticky bonds through row drops
src/sway.js               Gravity, spring integration, local shot/blast momentum
src/positions.js          Shared current physical bubble positions
src/gravity.js            Detachment and falling physics, unwired Surge API
src/attachment-visuals.js Real link rendering
src/render.js             Canvas and aim guide from live positions
src/game.js               Rules and thin scoring/physics orchestration
src/scoring.js            Scoring calculations and award events
src/scoring-config.js     Editable score weights, depth curve, combo caps
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
- [x] PR #15 merged: contact-match lifecycle and gel link visuals.
- [x] PR #16 merged (v0.8.4); continuous new-row gravity works.
- [x] PR #17 merged and stable matching verified by player.
- [x] PR #18 merged: preserve the future depth-risk scoring design.
- [ ] Review PR #21: fully remove Gravity Shift experiment, with no change to earlier physics.
- [ ] Hands-on test a 6+1 colour contact and Arcade row-drop momentum on a live
      desktop and phone. Automated tests are not a replacement for this.
- [x] PR #23: implement initial independent configurable depth scoring and scoring regressions.
- [ ] Playtest the 1×–3× curve and DEEP CLEAR threshold against long risky chains; tune in config only.
- [ ] After deploy, visually inspect screenshot-like side hangers, contacts,
      blast recoil and actual aim fairness on desktop and mobile.
- [ ] Later: refine multi-anchor tension distribution, bond strength, richer
      elastic structures, balanced Extreme Gravity as a real-game special.

## Checkpoint handover

> v0.9.2 remains the stable, real spring-gravity baseline. The user
> rejected the earlier experimental Gravity Shift systems and does not
> want those restored. Do not alter swinging, collision, sticky contacts,
> bomb effects, matching, falling dynamics or ceiling-row continuity.
>
> PR #23 / proposed v0.10.0 adds **only depth-sensitive scoring**.
> `src/scoring.js` calculates match, bomb and gravity-detachment points
> from *each bubble's actual live position*, while `src/scoring-config.js`
> keeps the defaults adjustable. Current range is **1× at the ceiling to
> 3× at the launcher danger line** with a smooth power-1.5 curve.
> Long low-hanging chains can earn a large reward if cleared skilfully.
> Floor impacts do not score again; the existing combo system is retained.
>
> The [effects and tools.md](effects%20and%20tools.md) spec remains
> **design-only** for new effects and earned one-use player tools.
> Their score-to-charge formulas are deliberately not implemented here.
