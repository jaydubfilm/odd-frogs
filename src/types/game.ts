// Core game types and interfaces

export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export enum CellType {
  EMPTY = 'EMPTY',
  LILYPAD = 'LILYPAD',
  LILYPAD_WITH_LILY = 'LILYPAD_WITH_LILY',
  ROCK = 'ROCK',
}

export enum FrogType {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  PURPLE = 'PURPLE',
}

export enum FoodType {
  CAKE = 'CAKE',
  APPLE = 'APPLE',
  BEANS = 'BEANS',
  BURGER = 'BURGER',
  PIZZA = 'PIZZA',
}

export enum StreamDirection {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
}



export interface FrogStats {
  damage: number;
  attackSpeed: number; // attacks per second
  range: number; // in grid units
  cost: number;
  upgradeCost: number;
  color: string;
}

export interface FrogData {
  id: string;
  type: FrogType;
  gridPosition: GridPosition;
  level: number;
  stats: FrogStats;
  lastAttackTime: number;
  targetFood: string | null;
}

export interface FoodStats {
  health: number;
  maxHealth: number;
  speed: number; // pixels per second
  reward: number; // money earned when destroyed
}

export interface FoodData {
  id: string;
  type: FoodType;
  streamId: string; // ADD THIS
  position: Position;
  pathIndex: number;
  pathProgress: number;
  stats: FoodStats;
  currentHealth: number;
}

export interface PathSegment {
  start: Position;
  end: Position;
  channelSection?: ChannelSection;  // For vertical segments
  laneSection?: LaneSection;        // For horizontal segments
  isHorizontal: boolean;            // Direction flag
}

export interface Corner {
  entry: Position;
  exit: Position;
}

export type PathElement = PathSegment | Corner;

export interface GridCell {
  type: CellType;
  gridPosition: GridPosition;
  position: Position; // actual pixel position for rendering
  frog: FrogData | null;
}

export interface GameState {
  lives: number;
  money: number;
  wave: number;
  score: number;
  isPaused: boolean;
  isGameOver: boolean;
  selectedFrogType: FrogType | null;
  selectedGridCell: GridPosition | null;
}

export interface LevelData {
  id: string;
  name: string;
  gridLayout: CellType[][]; // 4x5 grid
  streams: StreamPath[];
  waves: WaveData[];
  startingMoney: number;
}

export interface WaveData {
  waveNumber: number;
  foods: {
    type: FoodType;
    count: number;
    spawnInterval: number; // seconds between spawns
    streamId: string;
  }[];
}

export interface GameConfig {
  gridRows: number;
  gridCols: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  startingLives: number;
  lilyRemovalCost: number;
}

export type ChannelSection = {
  row: number;
  channel: number;
};

export type LaneSection = {
  lane: number;
  channel: number;
};
export interface StreamPath {
  id: string;
  channels: number[]; // Channel index for each row (5 numbers for 5 rows)
  channelSections: ChannelSection[];
  laneSections: LaneSection[];
  offset: number;
}