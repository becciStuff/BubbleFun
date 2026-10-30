// Sole owner of Arcade/Puzzle shooter point calculations. No rendering,
// physics, collision, or bubble removal lives here.
import { RADIUS } from './config.js';
import { cellKey } from './grid.js';
import { bubblePosition } from './positions.js';
import { SCORING_CONFIG } from './scoring-config.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Depth uses the actual LIVE centre of each attached bubble. Normalising by
// the playfield's ceiling and danger line keeps mobile/desktop scoring fair.
// Physical falling is not involved: callers score BEFORE detaching bodies.
export function bubbleDepth(y, layout, config = SCORING_CONFIG) {
  const ceiling = layout.top + RADIUS;
  const danger = layout.launchY - config.dangerLineOffset;
  return clamp((y - ceiling) / Math.max(1, danger - ceiling), 0, 1);
}

export function depthMultiplier(y, layout, config = SCORING_CONFIG) {
  const depth = bubbleDepth(y, layout, config);
  return config.minimumDepthMultiplier +
    (config.maximumDepthMultiplier - config.minimumDepthMultiplier) *
    Math.pow(depth, config.depthExponent);
}

export function nextComboMultiplier(current, kind, config = SCORING_CONFIG) {
  const minimum = kind === 'bomb' ? config.minBombComboMultiplier : 1;
  return Math.min(config.maxComboMultiplier, Math.max(minimum, current + 1));
}

const pointsPerBubble = (kind, config) => {
  switch (kind) {
    case 'match': return config.matchPointsPerBubble;
    case 'drop': return config.dropPointsPerBubble;
    case 'bomb': return config.bombPointsPerBubble;
    default: throw new RangeError(`Unknown scoring event: ${kind}`);
  }
};

// Awards each existing board bubble once *for this removal*. The game removes
// those cells directly afterwards; subsequent explosions cannot award them
// again. The bomb's activation bonus is deliberately FLAT, just as before.
// One final rounding avoids score changes from event ordering.
export function awardBubbleClear(state, cells, kind, combo = 1) {
  const config = state.scoringConfig ?? SCORING_CONFIG;
  const unit = pointsPerBubble(kind, config);
  const unique = new Set();
  let weighted = 0, count = 0, totalDepth = 0;
  for (const [row, col] of cells) {
    const key = cellKey(row, col);
    if (unique.has(key) || !state.board.has(key)) continue;
    unique.add(key);
    const { y } = bubblePosition(state, row, col);
    const depth = bubbleDepth(y, state.layout, config);
    totalDepth += depth;
    weighted += unit * depthMultiplier(y, state.layout, config);
    count++;
  }
  const fixed = kind === 'bomb' ? config.bombActivationPoints : 0;
  const points = Math.round((weighted + fixed) * combo);
  const basePoints = (count * unit + fixed) * combo;
  state.score += points;
  return {
    points, basePoints, depthBonus: points - basePoints,
    count, averageDepth: count ? totalDepth / count : 0,
  };
}

// A readable celebration for genuinely deep, substantial hanging clears.
// Does not award extra points: the depth bonus is already in the result.
export function isDeepClear(result, config = SCORING_CONFIG) {
  return result.count >= config.deepClearMinimumBubbles &&
    result.averageDepth >= config.deepClearMinimumAverageDepth &&
    result.depthBonus > 0;
}
