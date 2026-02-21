import { LevelData, WaveData, FoodType, CellType, StreamPath, PathSegment } from '../../types/game';
import { channelsToPath, channelsToSegments } from './LevelGenerator';
import { PathGenerator } from './PathGenerator';
import { PURCHASE_SLOTS_FOR_LEVEL } from '../../data/constants';
import levelSet from '../../data/levelSet.json';

type CellChar = 'E' | 'L' | 'W' | 'R';

const CHAR_TO_CELL: Record<CellChar, CellType> = {
  E: CellType.EMPTY,
  L: CellType.LILYPAD,
  W: CellType.LILYPAD_WITH_LILY,
  R: CellType.ROCK,
};

const LANE_GAP = 12;

export class ProceduralLevelGenerator {
  generateLevel(levelNumber: number): LevelData {
    // Wrap for levelNumber > 100
    const index = ((levelNumber - 1) % levelSet.levels.length);
    const entry = levelSet.levels[index];

    // Hydrate grid
    const gridLayout: CellType[][] = entry.grid.map(row =>
      row.map(ch => CHAR_TO_CELL[ch as CellChar])
    );

    // Hydrate streams
    const numStreams = entry.streams.length;
    const centerIndex = (numStreams - 1) / 2;
    const streams: StreamPath[] = entry.streams.map((channels, i) => {
      const { channelSections, laneSections } = channelsToPath(channels);
      const relIndex = i - centerIndex;
      const offsetDistance = relIndex * LANE_GAP;
      const elements = channelsToSegments(channels);
      const segments = elements.filter((el): el is PathSegment => 'start' in el);
      const smoothPath = PathGenerator.generateSmoothPath(segments, offsetDistance);

      return {
        id: `stream-${i}`,
        channels,
        channelSections,
        laneSections,
        offset: offsetDistance,
        smoothPath,
      };
    });

    // Generate waves procedurally
    const waves = this.generateWaves(levelNumber);

    // Use starting money from JSON (scales with level index)
    const startingMoney = entry.startingMoney;

    return {
      id: entry.id,
      name: entry.name,
      gridLayout,
      streams,
      waves,
      startingMoney,
      purchaseSlots: PURCHASE_SLOTS_FOR_LEVEL(levelNumber),
    };
  }

  private generateWaves(levelNumber: number): WaveData[] {
    // Level 2: cherry swarm — forces the player to use the rapid-fire Blue frog
    if (levelNumber === 2) {
      return [
        { waveNumber: 1, duration: 30, foods: [
          { type: FoodType.CHERRY, count: 8, spawnInterval: 0.6, streamId: 'stream-0' },
        ]},
        { waveNumber: 2, duration: 30, foods: [
          { type: FoodType.CHERRY, count: 12, spawnInterval: 0.5, streamId: 'stream-0' },
        ]},
        { waveNumber: 3, duration: 30, foods: [
          { type: FoodType.CHERRY, count: 10, spawnInterval: 0.4, streamId: 'stream-0' },
          { type: FoodType.APPLE, count: 3, spawnInterval: 1.5, streamId: 'stream-0' },
        ]},
        { waveNumber: 4, duration: 30, foods: [
          { type: FoodType.CHERRY, count: 15, spawnInterval: 0.35, streamId: 'stream-0' },
          { type: FoodType.APPLE, count: 4, spawnInterval: 1.2, streamId: 'stream-0' },
        ]},
      ];
    }

    const waves: WaveData[] = [];
    const baseWaveCount = 3;
    const waveCount = baseWaveCount + Math.floor(levelNumber / 2);

    for (let i = 0; i < waveCount; i++) {
      waves.push(this.generateWave(i + 1, levelNumber));
    }

    return waves;
  }

  private generateWave(waveNumber: number, levelNumber: number): WaveData {
    const basicFoodTypes = [FoodType.APPLE, FoodType.BEANS, FoodType.BURGER, FoodType.CAKE, FoodType.PIZZA];
    const allFoodTypes = [...basicFoodTypes];

    if (levelNumber >= 5) {
      allFoodTypes.push(FoodType.DONUT);
    }

    if (levelNumber >= 3) {
      allFoodTypes.push(FoodType.CHERRY);
    }

    const enemiesPerWave = 3 + waveNumber + Math.floor(levelNumber * 0.8);
    const spawnInterval = Math.max(0.8, 2.5 - levelNumber * 0.08);

    const foodTypesCount = Math.min(1 + Math.floor(levelNumber / 3), allFoodTypes.length);
    const selectedFoodTypes = this.shuffleArray([...allFoodTypes]).slice(0, foodTypesCount);

    const foods = selectedFoodTypes.map(type => ({
      type,
      count: Math.floor(enemiesPerWave / foodTypesCount),
      spawnInterval,
      streamId: 'stream-0',
    }));

    return {
      waveNumber,
      duration: 30,
      foods,
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
