import { FrogType, FrogStats, FoodType, FoodStats, GameConfig } from '../types/game';
import { UpgradePath } from '../types/upgrades';

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
  startingLives: 3,
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
    damage: 15,
    attackSpeed: 0.75,
    range: 4,
    minRange: 2,
    ignoresRocks: true,
    aoeRadius: 1,
    cost: 12,
    color: '#E74C3C',
  },
  [FrogType.YELLOW]: {
    damage: 0,
    attackSpeed: 1,
    range: 1.25,
    slowAmount: 0.5,
    cost: 14,
    color: '#F39C12',
  },
  [FrogType.GREEN]: {
    damage: 25,
    attackSpeed: 0.75,
    range: 1.5,
    cost: 16,
    color: '#2ECC71',
  },
  [FrogType.PURPLE]: {
    damage: 80,
    attackSpeed: 0.33,
    range: 999,
    blockedByFrogs: true,
    cost: 20,
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

export const UPGRADE_PATH_COSTS = [5, 10, 15]; // Cost for levels 1, 2, 3

export const UPGRADE_PATH_BUFFS: Record<UpgradePath, {
  damageMult?: number[];
  attackSpeedMult?: number[];
  damageBonus?: number[];
  attackSpeedBonus?: number[];
}> = {
  [UpgradePath.NONE]: {},
  [UpgradePath.SPOTS]: {
    damageMult: [1.4, 1.8, 2.5],
    attackSpeedMult: [1.2, 1.4, 1.7],
  },
  [UpgradePath.HORIZONTAL_STRIPES]: {
    damageBonus: [3, 6, 10],
    attackSpeedBonus: [0.3, 0.6, 1.0],
  },
  [UpgradePath.VERTICAL_STRIPES]: {
    damageBonus: [3, 6, 10],
    attackSpeedBonus: [0.3, 0.6, 1.0],
  },
};
