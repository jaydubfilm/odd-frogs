import { FrogType, FrogStats, FoodType, FoodStats, GameConfig } from '../types/game';

export const GAME_CONFIG: GameConfig = {
  gridRows: 5,
  gridCols: 4,
  cellSize: 120,
  canvasWidth: 600,    // 5 * 120 (for channels 0-4)
  canvasHeight: 660,
  startingLives: 3,
  lilyRemovalCost: 50,
};

export const FROG_STATS: Record<FrogType, FrogStats> = {
  [FrogType.RED]: {
    damage: 10,
    attackSpeed: 1.5,
    range: 1.5,
    cost: 100,
    upgradeCost: 150,
    color: '#E74C3C',
  },
  [FrogType.BLUE]: {
    damage: 5,
    attackSpeed: 3,
    range: 2,
    cost: 120,
    upgradeCost: 180,
    color: '#3498DB',
  },
  [FrogType.GREEN]: {
    damage: 15,
    attackSpeed: 0.8,
    range: 1,
    cost: 150,
    upgradeCost: 200,
    color: '#2ECC71',
  },
  [FrogType.YELLOW]: {
    damage: 8,
    attackSpeed: 2,
    range: 2.5,
    cost: 180,
    upgradeCost: 250,
    color: '#F39C12',
  },
  [FrogType.PURPLE]: {
    damage: 20,
    attackSpeed: 0.5,
    range: 1.5,
    cost: 200,
    upgradeCost: 300,
    color: '#9B59B6',
  },
};

export const FOOD_BASE_STATS: Record<FoodType, FoodStats> = {
  [FoodType.CAKE]: {
    health: 30,
    maxHealth: 30,
    speed: 30,
    reward: 15,
  },
  [FoodType.APPLE]: {
    health: 10,
    maxHealth: 10,
    speed: 40,
    reward: 5,
  },
  [FoodType.BEANS]: {
    health: 50,
    maxHealth: 50,
    speed: 35,
    reward: 25,
  },
  [FoodType.BURGER]: {
    health: 20,
    maxHealth: 20,
    speed: 60,
    reward: 10,
  },
  [FoodType.PIZZA]: {
    health: 40,
    maxHealth: 40,
    speed: 25,
    reward: 20,
  },
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

export const UPGRADE_MULTIPLIER = {
  DAMAGE: 1.5,
  ATTACK_SPEED: 1.2,
  RANGE: 1.1,
};
