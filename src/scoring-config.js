// The tuning knobs for Arcade and Puzzle shooter scoring. Edit values here
// without touching gameplay, spring physics, or the scoring calculations.
// Future tools can use awarded score deltas but need their own charge rules.
export const SCORING_CONFIG = Object.freeze({
  matchPointsPerBubble: 20,  // Direct 3+ colour match or new sticky-contact match.
  dropPointsPerBubble: 30,   // Detached due to losing ceiling support.
  bombPointsPerBubble: 25,  // Each bubble caught by a bomb's radial blast.
  bombActivationPoints: 50, // Fixed bonus per activated bomb, unaffected by depth.
  minimumDepthMultiplier: 1,
  maximumDepthMultiplier: 3,
  depthExponent: 1.5,       // Smooth curve: bigger payoff near the danger line.
  dangerLineOffset: 47,    // Matches the existing visible launcher danger line.
  maxComboMultiplier: 8,
  minBombComboMultiplier: 2,
  deepClearMinimumBubbles: 6,
  deepClearMinimumAverageDepth: .65,
});
