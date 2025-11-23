
// Core game types and interfaces

import { SmoothPath } from '../game/utils/PathGenerator';
import { FrogUpgradeState } from './upgrades'; 

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

export interface WaveData {
  waveNumber: number;
  duration: number;  // ← ADD THIS: seconds until next wave auto-starts
  foods: {
    type: FoodType;
    count: number;
    spawnInterval: number;
    streamId: string;
  }[];
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
  upgradeState: FrogUpgradeState;  
  tongue?: {
    active: boolean;
    targetPosition: Position;
    progress: number;
    startTime: number;
  };
}

export interface FoodStats {
  health: number;
  maxHealth: number;
  speed: number; // pixels per second
  reward: number; // money earned when destroyed
}

export interface FoodData {
  id: string;                    // ← ADD if missing
  type: FoodType;                // ← ADD if missing
  streamId: string;              // ← ADD if missing
  position: Position;            // ← ADD if missing
  distanceTraveled: number;      // ← ADD (replaces pathIndex/pathProgress)
  stats: {                       // ← ADD if missing
    health: number;
    maxHealth: number;
    speed: number;
    reward: number;
  };
  currentHealth: number;         // ← ADD if missing
  reachedEnd?: boolean;          // ← ADD (optional flag)
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
  isVictory: boolean;
  currentLevel: number;      
  selectedFrogType: FrogType | null;
  selectedGridCell: GridPosition | null;
  gameSpeed: number;
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
  smoothPath?: SmoothPath;
}

export interface LevelProgress {
  levelNumber: number;
  completed: boolean;
  stars: number; // 0-3 based on performance
  unlocked: boolean;
}

export interface GameProgress {
  levels: Map<number, LevelProgress>;
  currentLevel: number;
  highestUnlockedLevel: number;
}