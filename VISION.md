# BubbleFun — vision, story and roadmap 🫧

> **Living design document.** Captures Becci's agreed direction and the ideas we're still exploring. This is a plan, **not a claim that the features below are implemented**.

## The big idea

**BubbleFun is a free, joyful bubble-shooter adventure about rescuing a community of tiny creatures called the Fizzlings.**

The bubbles form a playful, physical world. Hanging groups wobble, swing and strain under gravity. Clever shots break supports, trigger special powers and send spectacular cascades tumbling down. Freed Fizzlings reunite with friends and family.

We want a game with strategic depth, memorable characters, satisfying animation and a distinctly *BubbleFun* personality — not simply a clone of another bubble shooter.

## What we've decided

- **Fizzlings are our preferred character direction.** They are original, cute, expressive little bubble-like beings. Their final appearance and lore are still to be designed.
- **Rescue is central to the story.** Players help Fizzlings free trapped friends and family; reunited characters give levels a purpose beyond clearing the board.
- **Boss levels belong in the adventure.** Bosses should change how a level plays, not just add an enormous health bar.
- **Gravity and moving bubble structures are a defining feature.** We want hanging groups to sway and react while attached, with a more dramatic physical collapse when supports fail.
- **Special bubbles, skill bonuses and unlockable effects are part of the vision.** They should reward tactical play, not replace it.
- **All in-game coins are earned through play.** No real-money purchases for coins or abilities. The existing game is also ad-free; keeping a friendly, non-exploitative experience is a design priority.
- **Arcade and Puzzles remain our present shooter play styles.** The older Bubble Pop/Burst mode is on hold, not erased from the source.
- **Desktop and mobile both matter.** Their layouts and controls can differ while preserving fair, readable gameplay.

## Story: the Fizzlings

**Premise:** The Fizzlings live together in colourful, buoyant little communities. Something has trapped groups of them in enormous bubble structures and scattered their families across different regions. The player helps bring everyone home.

The emotional payoff matters: rescued Fizzlings might cheer, hug, tumble into one another, react to close calls, or recognise relatives rescued earlier. Some could become recurring companions with harmless visual personalities; others might eventually teach or unlock new abilities.

**Story details still open:** Who trapped them, why, what their home looks like, whether individual Fizzlings have names, and how much narrative appears between levels. Keep the tone cute and funny without making it exclusively for children.

### Boss-level possibilities (concepts, not final characters)

| Boss idea | Mechanical twist | Rescue objective |
| --- | --- | --- |
| **The Web Weaver** | Sticky connections reinforce parts of the bubble lattice; break strategic anchors. | Release Fizzlings caught in its web. |
| **The Grumble Cloud** | Gusts or temporary gravity changes move the hanging structures. | Stabilise the board and free a trapped family. |
| **The Collector** | Protects captured Fizzlings behind layers of bubble armour. | Create a chain reaction that opens its cage. |

Boss levels should use the same understandable shooting, matching and gravity rules as ordinary levels, then add one learnable twist. Victory could mean rescuing everyone, breaking a machine, or reaching an exposed weak point — **not always clearing every bubble**.

## Special shots and effects

| Ability | Intended behaviour | Balancing/design note |
| --- | --- | --- |
| **Fireball** | Travels through bubbles, burning a line through everything it meets. | Powerful but limited; can trigger bombs along its path. |
| **Horizontal Blast** | Clears bubbles along a horizontal band from the impact. | Define its geometry clearly on our staggered hex grid. |
| **Vertical Blast** | Clears a vertical strip, opening a route to difficult targets. | Should give players a new choice, not solve every puzzle automatically. |
| **Colour Wipe** | Destroys every bubble of a selected colour. | Expensive, late-game or tightly limited. |
| **Mega Explosion** | Creates a much larger radial blast than an ordinary bomb. | Especially satisfying near several volatile bubbles. |
| **Gravity Surge** | Temporarily increases downward force so vulnerable hanging structures strain and can tear free. | Requires meaningful support-strength rules and clear visual warnings. |
| **Colour Shift** | Converts a chosen group or area from one colour into another. | Prefer a controlled area to unrestricted whole-board conversion. |

We should prototype just a few distinctive powers first, then expand after playtesting. The player must still be able to complete puzzles **without being forced to spend coins**.

## Scoring and skill

1. **Prismatic / different-colour bonus:** If a shot ultimately destroys colours other than the fired colour — through bombs, abilities or falling structures — award a bonus for the collateral variety. Count the entire shot's cascade once, without double-counting the same bubble.
2. **Optional aiming guide:** Let players choose to hide the trajectory guide. Guide-free shots award additional points (and possibly coins). Record the setting **when the shot fires** so it cannot be toggled just before impact for a free bonus.
3. **Combos and rescues:** More impressive collapses and successful rescues should have clear score feedback, with well-defined multipliers and sensible caps.
4. **Fair comparison:** If we add leaderboards or ranked challenges, consider tracking assisted and unassisted results separately.

Exact bonus percentages, multipliers and coin rewards are **not decided yet**.

## Gravity: the signature mechanic

Attached bubbles should feel connected but not completely rigid:

- A broad, well-supported block barely moves.
- A long cluster suspended from one or two supports gently sways like a hanging mobile.
- Impacts transfer a small, damped motion through nearby connected bubbles.
- Weak or overburdened connections visibly strain. A later shot — or **Gravity Surge** — may cause them to give way.
- Once a cluster detaches, it becomes freely falling physics objects, with satisfying collisions, trails and floor bursts.

**Important engineering guardrail:** The collision and aiming rules must agree with what players see. If a cluster visibly swings away from a shot, the game should not secretly collide with its previous grid position. We may begin with modest constrained swaying before attempting full dynamic matching physics. Keep the simulation deterministic, understandable and fast on mobile.

## Earn-only coin economy

Players earn in-game coins for useful, skilled play:

- Popping bubbles and clearing larger groups.
- Combos, multi-colour collateral damage and gravity cascades.
- Rescuing Fizzlings, solving puzzles and finishing levels.
- Optional extra challenge, such as playing without guides.

An in-game shop (working name: **Fizz Shop**) would let players spend those coins on special shots such as Fireball, Colour Wipe, Mega Explosion, Gravity Surge and Colour Shift.

**No real-money purchases.** Avoid paid currencies, artificial waiting timers and deliberately impossible levels. Costs and earn rates should be set by playtesting after the specials have stable effects. No prices have been approved yet.

## Visual and audio direction

- **Cute without becoming bland:** recognisable Fizzling faces, squishy silhouettes, expressive body language, funny animations and family reunions.
- **Rich 2.5D look:** beautifully shaded transparent bubbles, convincing glass highlights, reflections, depth, soft shadows and subtle parallax; full 3D is optional.
- **Spectacular effects:** fiery trails, directional lightning, colourful fragments, expanding shockwaves, sparkling gravity cascades, oversized combo celebrations and distinctive boss effects.
- **Better motion:** anticipation, squash-and-stretch, soft pendulum movement, springy impacts, clear easing and time for explosions to breathe.
- **Sound with personality:** popping, fizzing, creaking supports, celebratory creature noises and memorable special-ability audio; user-controlled sound and reduced-motion options.
- **Performance:** maintain responsive play on desktop and phones. Reuse cached art and cap expensive particles/effects where necessary.

## The gameplay loop we are aiming for

1. Enter a themed level and see its rescue objective.
2. Study the arrangement, weak supports and available shots or specials.
3. Aim, pop, detonate and manipulate gravity to free trapped Fizzlings.
4. Watch the physics-driven cascade, celebrate rescues, earn points and coins.
5. Use earned coins strategically, unlock new worlds and meet the next friends, families or boss.

Not every level needs all these mechanics. Introduce abilities gradually so the player learns them naturally.

## Agreed implementation priority

Order is agreed in principle; these are **priorities, not promised release numbers or dates**.

| Priority | Work | Main goal |
| --- | --- | --- |
| **1** | Gravity, swaying connected structures and smoother animation | Make the bubbles feel like a living physical world. |
| **2** | Prototype Fireball, horizontal/vertical blasts and Gravity Surge | Give players meaningful tactical powers. |
| **3** | Guide-free rewards and different-colour bonuses | Reward skill and clever cascades. |
| **4** | Fizzling character designs, rescue animations and family story | Give the game identity and heart. |
| **5** | Earnable coins and the Fizz Shop | Add an enjoyable, fair reward loop. |
| **6** | Worlds, richer puzzles, boss encounters and sustained visual polish | Build an adventure worth coming back to. |

**Design work can overlap implementation:** We can sketch Fizzlings, story themes and bosses early, even if the core physics and abilities are built first.

## Current prototype baseline

As of **v0.5**, BubbleFun already has:

- Responsive portrait/landscape Bubble Shooter.
- Arcade mode and three handcrafted puzzles: Twin Towers, Heartbreaker and The Crown.
- Matching, bombs, chained detonations, detached falling bubbles, basic particle effects and optional sound.
- Browser-local high scores; no accounts, real-money payments or adverts.

The richer connected-cluster gravity, special shop, Fizzling rescue story and boss levels described in this document are **future ideas, not features already shipped**.

## Open decisions for our next design conversations

- What do Fizzlings actually look and sound like? Do they have names, families, individual traits or abilities?
- Who or what is trapping them? What is the tone of the story and its world map?
- Which two or three specials should be prototyped first, and how do they interact?
- What support-strength model feels intuitive? How much sway is fun before aiming becomes frustrating?
- Which rewards should be points, which should be coins, and what should never be purchasable?
- How should boss objectives, progression, hints, retries and accessibility work?
- Should the movable bottle catch falling bubbles to charge specials, or be a separate active mechanic?

---

*Keep updating this document as we make decisions. When an idea becomes a real feature, link its implementation or test plan here and mark it as shipped.*
