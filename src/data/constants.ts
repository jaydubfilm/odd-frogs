import { FrogType, FrogStats, FoodType, FirePattern, FoodStats, GameConfig } from '../types/game';


export const GAME_CONFIG: GameConfig = {
  gridRows: 5,
  gridCols: 4,
  cellSize: 120,
  canvasWidth: 600,    // 5 * 120 (for channels 0-4)
  canvasHeight: 660,
  startingLives: 3,
  lilyRemovalCost: 100,
};

export const FROG_STATS: Record<FrogType, FrogStats> = {
  [FrogType.RED]: {
    damage: 10,
    attackSpeed: 1.5,
    range: 999,
    cost: 100,
    upgradeCost: 150,
    color: '#E74C3C',
    firePattern: FirePattern.LEFT_RIGHT,
  },
  [FrogType.BLUE]: {
    damage: 5,
    attackSpeed: 3,
    range: 2,
    cost: 120,
    upgradeCost: 180,
    color: '#3498DB',
    firePattern: FirePattern.OMNI,
  },
  [FrogType.GREEN]: {
    damage: 15,
    attackSpeed: 3,
    range: 999,
    cost: 150,
    upgradeCost: 200,
    color: '#2ECC71',
    firePattern: FirePattern.STRAIGHT_UP,
  },
  [FrogType.YELLOW]: {
    damage: 8,
    attackSpeed: 2,
    range: 2.5,
    cost: 180,
    upgradeCost: 250,
    color: '#F39C12',
    firePattern: FirePattern.OMNI,
  },
  [FrogType.PURPLE]: {
    damage: 20,
    attackSpeed: 0.5,
    range: 1.5,
    cost: 200,
    upgradeCost: 300,
    color: '#9B59B6',
    firePattern: FirePattern.OMNI,
  },
};

export const FOOD_STATS: Record<FoodType, { health: number; maxHealth: number; speed: number; reward: number; size?: number }> = {
  [FoodType.CAKE]: { health: 150, maxHealth: 150, speed: 30, reward: 15 },
  [FoodType.APPLE]: { health: 90, maxHealth: 90, speed: 40, reward: 10 },
  [FoodType.BEANS]: { health: 120, maxHealth: 120, speed: 35, reward: 12 },
  [FoodType.BURGER]: { health: 180, maxHealth: 180, speed: 25, reward: 20 },
  [FoodType.PIZZA]: { health: 210, maxHealth: 210, speed: 20, reward: 25 },
  [FoodType.DONUT]: { health: 360, maxHealth: 360, speed: 15, reward: 40, size: 1.5 },
  [FoodType.CHERRY]: { health: 60, maxHealth: 60, speed: 80, reward: 15, size: 0.6 },
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
