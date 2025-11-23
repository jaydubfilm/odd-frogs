import { 
  LevelData, 
  CellType, 
  StreamPath, 
  StreamDirection, 
  FoodType 
} from '../types/game';

// Level 1: Simple introduction level
export const LEVEL_1: LevelData = {
  id: 'level-1',
  name: 'Lily Pond Basics',
  startingMoney: 200,
  gridLayout: [
    [CellType.LILYPAD, CellType.EMPTY, CellType.LILYPAD, CellType.EMPTY],
    [CellType.EMPTY, CellType.LILYPAD, CellType.EMPTY, CellType.LILYPAD],
    [CellType.LILYPAD, CellType.EMPTY, CellType.ROCK, CellType.EMPTY],
    [CellType.EMPTY, CellType.LILYPAD, CellType.EMPTY, CellType.LILYPAD],
    [CellType.LILYPAD, CellType.EMPTY, CellType.LILYPAD, CellType.EMPTY],
  ],
  streams: [
    {
      id: 'stream-1',
      channels: [2, 2, 1, 2, 2], 
      offset: 0,
    },
  ],
  waves: [
    {
      waveNumber: 1,
      foods: [
        {
          type: FoodType.APPLE,
          count: 5,
          spawnInterval: 2,
          streamId: 'stream-1',
        },
      ],
    },
    {
      waveNumber: 2,
      foods: [
        {
          type: FoodType.APPLE,
          count: 3,
          spawnInterval: 1.5,
          streamId: 'stream-1',
        },
        {
          type: FoodType.CAKE,
          count: 2,
          spawnInterval: 3,
          streamId: 'stream-1',
        },
      ],
    },
    {
      waveNumber: 3,
      foods: [
        {
          type: FoodType.BURGER,
          count: 4,
          spawnInterval: 2,
          streamId: 'stream-1',
        },
        {
          type: FoodType.CAKE,
          count: 2,
          spawnInterval: 2.5,
          streamId: 'stream-1',
        },
      ],
    },
  ],
};

export const LEVELS: LevelData[] = [LEVEL_1];
