# BubbleFun — project status

> **Living handover document.** Use this as the first stop when resuming BubbleFun in a new ChatGPT conversation or development session. This records the **current implementation**, decisions and next steps; [VISION.md](VISION.md) covers the longer-term game design, and [REFACTORING.md](REFACTORING.md) contains the engineering plan.

**Last reviewed:** 26 October 2026 (NZ)  
**Repository:** [becciStuff/BubbleFun](https://github.com/becciStuff/BubbleFun)  
**Branch:** `main`  
**Prototype version:** `0.5.0` (from `package.json`)  
**Current phase:** Refactor planned; **implementation has not started**  
**Pre-refactor reference commit:** `fe1b23ccabcd7f52261fd3a45e1c73c15be0146c`

## One-minute summary

BubbleFun is a free, static browser bubble-shooter prototype, written in plain HTML, CSS and JavaScript. The playable modes are **Arcade** and **Puzzles**. We want to grow it into a polished, physics-led rescue adventure about cute creatures called **Fizzlings**, with clever gravity, strategic special shots, bosses and earned-only in-game coins.

**The immediate decision:** improve the code structure *before* adding more features. Extract common grid logic and the gravity engine into separate testable modules, preserving v0.5 behaviour throughout. The detailed steps and acceptance criteria are in [REFACTORING.md](REFACTORING.md).

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

**Bubble Pop/Burst is not an active mode.** Its older rules remain in `src/game.js` and its tests for possible future use. Do not reintroduce it as part of the refactor.

## What is *not* implemented yet

- A full attached-bubble gravity engine: physical swinging, support strength, stickiness and breakage under **Extreme Gravity**.
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
src/game.js      Most rules, grid, puzzles, gravity and archived Pop logic
tests/game.test.js
package.json     ES modules; npm test uses node --test
VISION.md        Game vision and feature roadmap
REFACTORING.md   Proposed technical reorganisation
PROJECT_STATUS.md  This handover
```

The **future** `config.js`, `grid.js`, `gravity.js`, `puzzles.js` and other proposed modules do not exist yet. Their purpose and order are recorded in [REFACTORING.md](REFACTORING.md).

## Next development work

**Active milestone: structural refactor with no gameplay changes.**

- [ ] **Phase 0 — baseline:** Capture additional characterisation tests for aiming/collision, bomb-cascade ordering, falling completion and delayed row descent; preserve current behaviour.
- [ ] **Phase 1 — configuration and grid:** Extract shared constants, hex coordinates, neighbour traversal and support connectivity to `config.js` and `grid.js`.
- [ ] **Phase 2 — puzzles:** Isolate puzzle data and add focused tests without changing the three playable solutions.
- [ ] **Phase 3 — gravity:** Move current detachment and falling-bubble simulation to `gravity.js`; expose clean events/results for scoring and visual effects.
- [ ] **Phase 4 — tidy orchestration:** Keep `game.js` as the turn coordinator; optionally extract effects and archived Pop logic where helpful.
- [ ] **Refactor verification:** Run Node tests and browser checks on desktop/mobile, then confirm GitHub Pages compatibility.

**Only after that milestone** should we begin the separate advanced-gravity feature: attached-cluster sway, gravity strengths, support breakage and Gravity Surge. Then continue the priorities in [VISION.md](VISION.md).

## Verification and current risks

- **Verified on 26 October 2026:** `npm test` completed successfully for the current v0.5 code (Node reports one passing test file; the file contains the existing gameplay assertions).
- **Not yet verified here:** A live GitHub Pages deployment and a fresh hands-on browser smoke test. Do not mark them as passed based on a Node test alone.
- **Engineering risk:** `src/game.js` mixes several responsibilities; extracting gravity without moving shared grid rules could create circular imports.
- **Gameplay risk for future physics:** Moving attached bubbles while keeping old fixed hitboxes would make aiming feel unfair. Resolve position ownership before implementing sway.
- **Scope risk:** Refactoring and feature work must be separate checkpoints. A clean module split is not evidence that advanced gravity has shipped.

## How to resume in a new chat

Use the GitHub repository as the source of truth, not the previous chat's memory. A useful starter message:

> We're continuing BubbleFun: https://github.com/becciStuff/BubbleFun  
> Please read `PROJECT_STATUS.md`, `REFACTORING.md`, `VISION.md` and the current source before editing.  
> We're at the pre-refactor stage. Follow the next unchecked milestone, avoid gameplay changes, test the result and update `PROJECT_STATUS.md` with what actually shipped.

## Update rules for future sessions

After each meaningful implementation or design session:

1. Update the **current phase**, completed checkboxes and the **next specific task**.
2. Add new **confirmed** decisions or issues; clearly distinguish ideas from implemented behaviour.
3. Note which tests and browser checks really ran, and whether they passed.
4. Record the relevant commit or pull request when code lands, without treating an old commit as the current head forever.
5. Keep historical details in commits/PRs; keep this file a concise **current snapshot**, not an endless diary.

---

*Initial status document created before the planned refactor. No gameplay changes are included with this document.*
