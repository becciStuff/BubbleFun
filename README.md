# BubbleFun 🫧

A small, free-to-play bubble shooter built with plain HTML, CSS and JavaScript. No accounts, ads, build tools or paid services required. It is a growing arcade prototype, designed for desktop and mobile.

**Where we're going:** Read [VISION.md](VISION.md) for the agreed Fizzlings rescue-adventure concept, gravity and special-shot ideas, earn-only coin economy, boss levels and prioritised roadmap. Those future ideas are not all implemented yet.

**Before new features:** Read [REFACTORING.md](REFACTORING.md) for the staged module split and regression-test plan. Configuration, grid, puzzle setup and basic falling physics have been separated; advanced gravity features are still to come.

**Building gravity?** Read [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) for the staged support/weight physics and the rules that must stay fair. G1 is testable but **not yet active during play**.

**Picking up the project?** Start with [PROJECT_STATUS.md](PROJECT_STATUS.md) for the current baseline, agreed decisions, next tasks and a new-chat handover.

## Release tracking

**Current maintenance release: v0.5.1.** The refactor and first gravity
support/weight calculations are internal work. Swaying and Gravity Surge
are **not active** in the playable game yet. We plan to use **v0.6.0**
for the first visible gravity mechanics.

The header badge now simply reads **Version 0.5.1**, loading the number from
the root `version.json` file. That JSON file is the single source for the
on-screen version; `package.json` mirrors it for developer tooling and tests
prevent the two from drifting.

To release a new version from a Node.js terminal:

```bash
npm run version:patch   # e.g. 0.5.1 → 0.5.2
# or
npm run version:minor   # e.g. 0.5.1 → 0.6.0
npm test
```

Commit both changed files (`version.json` and `package.json`) with
the release. The version increases for releases, **not automatically
for every Git commit**. The browser fetches `version.json` without
using the browser cache, so a deployed release shows its updated number.

## What's new in v0.5 — Puzzles & responsive playfields

- **Real landscape desktop board:** the browser width selects a 760 × 580 playfield with 16/15 alternating columns, while narrower screens get the 432 × 700 portrait board with 9/8 columns. Mouse, touch and keyboard remain supported.
- **Handcrafted puzzles:** Twin Towers, Heartbreaker and The Crown have shaped formations, glowing bomb targets, curated opening ammunition and a limited number of shots. Clear the marked targets (by popping, blasting or dropping them) to win. The puzzles are available on both layouts.
- **Smoother movement:** board wobble on impact, staggered puzzle entrances, animated descending rows, refined aim indication and more responsive aiming.
- **More forgiving grazes:** the projectile collision distance is slightly smaller than the drawn bubble pair. The aiming guide now uses the same collision distance and wall-bounce rules as the real projectile.
- **Bubble Pop temporarily hidden:** Arcade and Puzzles are now the two play styles within Bubble Shooter. The earlier Bubble Pop rules remain in the code for possible reintroduction later.

## Previous version: v0.4 — Explosive Cascades

- **Bomb bubbles** appear as glowing, marked coloured bubbles on the shooter board. Include one in a normal match of 3+, or hit it with another bomb's blast, to detonate it.
- A bomb clears nearby bubbles regardless of colour, triggering any other bombs in its radius. A short delay between detonations makes chains readable.
- Bomb combos grow from **×2** to **×8**, with bonus points and visible combo announcements.
- Once the blasts finish, unsupported bubbles tumble all the way to the floor and burst into colourful particles, expanding shockwaves and bright flashes.
- The previous falling-bubble collision system was removed: it relied on an unlikely board configuration, so it didn't give players meaningful control over chains.
- Detonations and gravity cascades finish before the next shot; row descents also wait for the effects to settle.

## Earlier improvements from v0.2–v0.3

- Detached shooter bubbles obey gravity and burst after visibly falling.
- Gravity combo bonuses, glowing shot trails, expanding blast rings, sparkles and score pop-ups.
- More polished glass reflections, subtle screen shake and launcher recoil.
- Extra gameplay tests for falling physics and the delayed board-clear celebration.

## Play

Open the site in a browser using any static web server. For example, if Python is installed:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. Using a local server is recommended because the game's JavaScript uses ES modules.

## Play styles

**Arcade** — Aim with your mouse or finger, then click/tap to shoot. Match **3 or more** connected bubbles of the same colour. Glowing marked bubbles are bombs: if a matched group contains one, it explodes and removes surrounding bubbles, potentially setting off more bombs. Disconnected bubbles tumble down and burst on the floor for a gravity bonus. A new row descends after every five shots. Lose if the stack reaches the launcher, or win by clearing it.

**Puzzles** — Choose one of three shaped challenges. Each has glowing bomb targets and a shot limit. You only need to clear the marked targets, not the entire board. You can advance to the next puzzle after winning.

Both play styles support a restart button, optional sound effects and separate local high scores. **Left/Right** arrow keys and **Space** work on a keyboard. Glossy reflections, particle trails, expanding burst rings, floating score pop-ups and subtle impact feedback add an arcade feel. Sound starts muted, and screen shake is disabled when reduced motion is preferred.

The archived **Bubble Pop** rules remain in `src/pop-mode.js` and are tested but the mode is not presented in the UI.

## Run tests

Node.js 20 or later is sufficient; no `npm install` is needed.

```bash
npm test
```

## Publish as a website

The repository is static-site ready. On GitHub, you can enable **Settings → Pages**, choose **Deploy from a branch**, and publish the `main` branch from `/ (root)`. GitHub will provide a Pages URL once deployment finishes. Publishing is optional while the prototype is in development.

## Structure

- `index.html` — accessible menu, score display and game layout
- `styles.css` — classic arcade styling and responsive layout
- `src/config.js` — shared layouts, colours and gameplay constants
- `src/grid.js` — hex-grid geometry, matching, ceiling support and shared hit detection
- `src/puzzles.js` — handcrafted puzzle layouts, targets, ammunition and fresh board creation
- `src/supports.js` — gravity support graph, suspended weight and independent ceiling anchors (G1 branch)
- `src/gravity.js` — detached-bubble detection, falling motion and an opt-in surge prototype
- `src/game.js` — shooter rules, scoring and turn orchestration, retaining legacy exports during the refactor
- `src/effects.js` — visual effect creation, particles and effect lifetimes
- `src/pop-mode.js` — archived Bubble Pop logic (not shown in the UI)
- `src/render.js` — responsive canvas bubble graphics, aim guide and effects
- `src/app.js` — input, menus, scores, optional sound and persistence
- `tests/game.test.js` — gameplay regression tests, desktop geometry and verified puzzle solutions
- `tests/grid.test.js` — grid geometry, connectivity and projectile hit testing
- `tests/puzzles.test.js` — puzzle board definitions, desktop/mobile layouts and real solutions
- `tests/gravity.test.js` — independent detachment, falling physics, wall bounce and burst timing tests
- `tests/supports.test.js` — anchors, loaded bonds and surge planning (G1 branch)
- `tests/surge.test.js` — opt-in gravity detachment and scoring boundaries (G1 branch)
- `tests/modules.test.js` — visual effects and dormant Pop regression tests

## Ideas for later

- Levels, difficulty settings and saved progress
- A movable catching bottle and charged power shots
- New visual themes and music
- Daily challenges, leaderboards and accessibility improvements

The goal is to have fun with the basics before adding complexity.
