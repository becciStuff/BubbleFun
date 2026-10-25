// Shared game dimensions, colours and tuning. No mutable game state here.
export const MOBILE_LAYOUT = Object.freeze({ width: 432, height: 700, left: 27, top: 56, launchY: 639, columns: 9 });
export const DESKTOP_LAYOUT = Object.freeze({ width: 760, height: 580, left: 44, top: 54, launchY: 527, columns: 16 });
export const WIDTH = MOBILE_LAYOUT.width;
export const HEIGHT = MOBILE_LAYOUT.height;
export const RADIUS = 21;
export const PITCH = RADIUS * 2;
export const ROW_HEIGHT = Math.sqrt(3) * RADIUS;
export const LEFT = 27;
export const TOP = 56;
export const LAUNCH_Y = 639;
export const SHOTS_PER_ROW = 5;
export const BOMB_RADIUS = 86;
// A little grace lets near-tangent shots skim past. Guide and projectile share this threshold.
export const SHOT_HIT_DISTANCE = PITCH - 4.5;
export const COLOURS = ['pink', 'blue', 'yellow', 'green', 'purple'];
export const SWATCHES = {
  pink: '#ff559c', blue: '#4ac6ff', yellow: '#ffc44b',
  green: '#51de9b', purple: '#a78afb',
};
