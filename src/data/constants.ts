import { FrogType, FrogStats, FoodType, FoodStats, GameConfig } from '../types/game';

export const FROG_UNLOCK_LEVEL: Record<FrogType, number> = {
  [FrogType.GREEN]: 1,
  [FrogType.BLUE]: 2,
  [FrogType.YELLOW]: 3,
  [FrogType.PURPLE]: 4,
  [FrogType.RED]: 5,
};

export function PURCHASE_SLOTS_FOR_LEVEL(levelNumber: number): number {
  if (levelNumber <= 1) return 1;
  if (levelNumber <= 2) return 2;
  return 3;
}


export const GAME_CONFIG: GameConfig = {
  gridRows: 5,
  gridCols: 4,
  cellSize: 120,
  canvasWidth: 600,    // 5 * 120 (for channels 0-4)
  canvasHeight: 660,
  startingLives: 20,
  lilyRemovalCost: 10,
};

export const FROG_STATS: Record<FrogType, FrogStats> = {
  [FrogType.BLUE]: {
    damage: 10,
    attackSpeed: 3,
    range: 1,
    cost: 10,
    color: '#3498DB',
  },
  [FrogType.RED]: {
    damage: 12,
    attackSpeed: 0.75,
    range: 4,
    minRange: 2,
    ignoresRocks: true,
    aoeRadius: 1,
    cost: 10,
    color: '#E74C3C',
  },
  [FrogType.YELLOW]: {
    damage: 0,
    attackSpeed: 1,
    range: 1.25,
    slowAmount: 0.35,
    cost: 10,
    color: '#F39C12',
  },
  [FrogType.GREEN]: {
    damage: 16,
    attackSpeed: 0.75,
    range: 1.5,
    cost: 10,
    color: '#2ECC71',
  },
  [FrogType.PURPLE]: {
    damage: 40,
    attackSpeed: 0.33,
    range: 999,
    blockedByFrogs: false,
    cost: 10,
    color: '#9B59B6',
  },
};

export const FOOD_STATS: Record<FoodType, { health: number; maxHealth: number; speed: number; reward: number; size?: number }> = {
  [FoodType.CAKE]: { health: 120, maxHealth: 120, speed: 25, reward: 2 },
  [FoodType.APPLE]: { health: 60, maxHealth: 60, speed: 32, reward: 1 },
  [FoodType.BEANS]: { health: 90, maxHealth: 90, speed: 28, reward: 1 },
  [FoodType.BURGER]: { health: 150, maxHealth: 150, speed: 20, reward: 2 },
  [FoodType.PIZZA]: { health: 180, maxHealth: 180, speed: 16, reward: 3 },
  [FoodType.DONUT]: { health: 300, maxHealth: 300, speed: 12, reward: 5, size: 1.5 },
  [FoodType.CHERRY]: { health: 40, maxHealth: 40, speed: 60, reward: 2, size: 0.6 },
};

export const COLORS = {
  WATER_LIGHT: '#87CEEB',
  WATER_DARK: '#4682B4',
  STREAM: '#6A9FB5',
  LILYPAD: '#90EE90',
  LILY: '#FFB6C1',
  ROCK: '#808080',
  EMPTY: 'transparent',
  HEALTH_BAR_BG: '#333333',
  HEALTH_BAR_FILL: '#00FF00',
  HEALTH_BAR_DAMAGED: '#FF0000',
};

export const UPGRADE_PATH_COSTS = [15, 35, 75]; // L1, L2, L3

export const CONSUMABLE_CONFIG = {
  STARTING_COUNT: 2,
  COOLDOWN_MS: 10000,
  RAIN_DAMAGE: 10,
  HEAL_AMOUNT: 5,
  WHIRLPOOL_RADIUS_GRID: 0.9,
  WHIRLPOOL_DURATION_S: 5,
  WHIRLPOOL_DAMAGE: 20,
  WHIRLPOOL_TICK_INTERVAL: 0.5,
  RAIN_VISUAL_DURATION: 1200,
};

// Power Factor table -- all damage/speed values are multipliers on base stats.
// synergyPerNeighbor is bonus damage per neighbor as a multiple of base damage.
// Any frog with matching path at L2+ counts as a neighbor regardless of its level.
//
// Max neighbors:  H-stripes=3 (4 cols)  V-stripes=4 (5 rows)
//                 L2 circles=4 (cardinal)  L3 circles=8 (cardinal+diagonal)
//
// L2 max totals:                          L3 max totals:
//   Spots:           6x                     Spots:            15x
//   H-stripe (3):    3 + 3*1.5 =  7.5x     H-stripe (3):     6 + 3*4  = 18x
//   V-stripe (4):    3 + 4*1.5 =  9x       V-stripe (4):     6 + 4*4  = 22x
//   Circle  (4):     3 + 4*1.5 =  9x       Circle  (8):      6 + 8*2  = 22x
export const POWER_FACTORS: Record<string, { damage: number; speed: number; synergyPerNeighbor?: number }> = {
  L1:            { damage: 2,  speed: 1.4 },
  L2_SPOTS:      { damage: 6,  speed: 2   },
  L3_SPOTS:      { damage: 15, speed: 3   },
  L2_CIRCLES:    { damage: 3,  speed: 1.6, synergyPerNeighbor: 1.5 },
  L3_CIRCLES:    { damage: 6,  speed: 2,   synergyPerNeighbor: 2   },
  L2_H_STRIPES:  { damage: 3,  speed: 1.6, synergyPerNeighbor: 1.5 },
  L3_H_STRIPES:  { damage: 6,  speed: 2,   synergyPerNeighbor: 4   },
  L2_V_STRIPES:  { damage: 3,  speed: 1.6, synergyPerNeighbor: 1.5 },
  L3_V_STRIPES:  { damage: 6,  speed: 2,   synergyPerNeighbor: 4   },
};
