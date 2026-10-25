# BubbleFun 🫧

A small, free-to-play bubble arcade built with plain HTML, CSS and JavaScript. No accounts, ads, build tools or paid services required. This is the classic-arcade prototype, designed so we can expand it later.

## What's new in v0.4 — Explosive Cascades

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

## Two modes

**Bubble Shooter** — Aim with your mouse or finger, then click/tap to shoot. Match **3 or more** connected bubbles of the same colour. Glowing marked bubbles are bombs: if a matched group contains one, it explodes and removes surrounding bubbles, potentially setting off more bombs. Disconnected bubbles tumble down and burst on the floor for a gravity bonus. A new row descends after every five shots. Lose if the stack reaches the launcher, or win by clearing it. The **Left/Right** arrow keys and **Space** work on a keyboard too.

**Bubble Pop** — Click/tap groups of **2 or more** adjacent bubbles of the same colour. Bigger groups earn more points (`group size² × 5`). Bubbles fall and empty columns shift left. Clear the board for a bonus, or keep going until no groups remain.

Both modes support a restart button, optional sound effects and separate local high scores. Glossy reflections, particle trails, expanding burst rings, floating score pop-ups and subtle impact feedback add an arcade feel. The game is responsive for desktop and mobile browsers. Sound starts muted, and screen shake is disabled when reduced motion is preferred.

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
- `src/game.js` — game rules and state (kept independent of display)
- `src/render.js` — canvas bubble graphics, aim line and effects
- `src/app.js` — input, menus, scores, optional sound and persistence
- `tests/game.test.js` — basic gameplay regression tests

## Ideas for later

- Levels, difficulty settings and saved progress
- A movable catching bottle and charged power shots
- New visual themes and music
- Daily challenges, leaderboards and accessibility improvements

The goal is to have fun with the basics before adding complexity.
