import { LevelData, WaveData, FoodType, CellType, StreamPath, PathSegment, RiverDefinition } from '../../types/game';
import { channelsToPath, channelsToSegments } from './LevelGenerator';
import { PathGenerator } from './PathGenerator';
import { PURCHASE_SLOTS_FOR_LEVEL, GAME_CONFIG } from '../../data/constants';
import levelSet from '../../data/levelSet.json';

type CellChar = 'E' | 'L' | 'W' | 'R';

const CHAR_TO_CELL: Record<CellChar, CellType> = {
  E: CellType.EMPTY,
  L: CellType.LILYPAD,
  W: CellType.LILYPAD_WITH_LILY,
  R: CellType.ROCK,
};

const LANE_GAP = 12;

// Seeded RNG (mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash;
}

function hydrateStreams(streamChannels: number[][]): StreamPath[] {
  const numStreams = streamChannels.length;
  const centerIndex = (numStreams - 1) / 2;

  return streamChannels.map((channels, i) => {
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
}

export class ProceduralLevelGenerator {
  generateLevel(levelNumber: number, river?: RiverDefinition): LevelData {
    if (!river || river.levelSetSource === 'json') {
      return this.generateFromJson(levelNumber);
    }
    return this.generateProcedural(levelNumber, river);
  }

  private generateFromJson(levelNumber: number): LevelData {
    const index = ((levelNumber - 1) % levelSet.levels.length);
    const entry = levelSet.levels[index];

    const gridLayout: CellType[][] = entry.grid.map(row =>
      row.map(ch => CHAR_TO_CELL[ch as CellChar])
    );

    const streams = hydrateStreams(entry.streams);

    const waves = (entry as any).waves
      ? ((entry as any).waves as any[]).map(w => ({
          waveNumber: w.waveNumber,
          duration: w.duration,
          foods: w.foods.map((f: any) => ({
            type: f.type as FoodType,
            count: f.count,
            spawnInterval: f.spawnInterval,
            streamId: f.streamId,
          })),
        }))
      : this.generateWaves(levelNumber);

    const startingMoney = 10 + 5 * levelNumber;

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

  private generateProcedural(levelNumber: number, river: RiverDefinition): LevelData {
    const seed = hashString(`${river.id}-${levelNumber}`);
    const rng = mulberry32(seed);

    const gridLayout = this.generateProceduralGrid(rng, levelNumber);
    const streamChannels = this.generateProceduralStreams(rng, levelNumber);
    const streams = hydrateStreams(streamChannels);
    const waves = this.generateWavesSeeded(rng, levelNumber);
    const startingMoney = 10 + 5 * levelNumber;

    return {
      id: `${river.id}-${levelNumber}`,
      name: `${river.name} - Level ${levelNumber}`,
      gridLayout,
      streams,
      waves,
      startingMoney,
      purchaseSlots: PURCHASE_SLOTS_FOR_LEVEL(levelNumber),
    };
  }

  private generateProceduralGrid(rng: () => number, levelNumber: number): CellType[][] {
    const gridLayout: CellType[][] = [];
    // Scale probabilities with level: more rocks/lilies at higher levels
    const rockProb = 0.15 + levelNumber * 0.005;
    const lilyProb = 0.10 + levelNumber * 0.005;

    for (let row = 0; row < GAME_CONFIG.gridRows; row++) {
      const gridRow: CellType[] = [];
      for (let col = 0; col < GAME_CONFIG.gridCols; col++) {
        const rand = rng();
        if (rand < 0.5 - rockProb - lilyProb + 0.25) {
          gridRow.push(CellType.LILYPAD);
        } else if (rand < 0.5 - rockProb - lilyProb + 0.25 + rockProb) {
          gridRow.push(CellType.ROCK);
        } else if (rand < 0.5 - rockProb - lilyProb + 0.25 + rockProb + lilyProb) {
          gridRow.push(CellType.LILYPAD_WITH_LILY);
        } else {
          gridRow.push(CellType.EMPTY);
        }
      }
      gridLayout.push(gridRow);
    }
    return gridLayout;
  }

  private generateProceduralStreams(rng: () => number, levelNumber: number): number[][] {
    let numStreams: number;
    if (levelNumber <= 7) numStreams = 1;
    else if (levelNumber <= 14) numStreams = 2;
    else numStreams = 3;

    const streamChannels: number[][] = Array(numStreams).fill(0).map(() => []);

    for (let row = 0; row < 5; row++) {
      const selectedChannels: number[] = [];

      if (row === 0 || row === 4) {
        const availableChannels = [1, 2, 3];
        for (let i = 0; i < numStreams; i++) {
          const randomIndex = Math.floor(rng() * availableChannels.length);
          selectedChannels.push(availableChannels[randomIndex]);
          availableChannels.splice(randomIndex, 1);
        }
      } else {
        for (let i = 0; i < numStreams; i++) {
          selectedChannels.push(Math.floor(rng() * 5));
        }
      }

      selectedChannels.sort((a, b) => a - b);

      for (let i = 0; i < numStreams; i++) {
        streamChannels[i][row] = selectedChannels[i];
      }
    }

    return streamChannels;
  }

  private generateWavesSeeded(rng: () => number, levelNumber: number): WaveData[] {
    const waves: WaveData[] = [];
    const baseWaveCount = 3;
    const waveCount = baseWaveCount + Math.floor(levelNumber / 2);

    for (let i = 0; i < waveCount; i++) {
      waves.push(this.generateWaveSeeded(rng, i + 1, levelNumber));
    }

    return waves;
  }

  private generateWaveSeeded(rng: () => number, waveNumber: number, levelNumber: number): WaveData {
    const basicFoodTypes = [FoodType.APPLE, FoodType.BEANS, FoodType.BURGER, FoodType.CAKE, FoodType.PIZZA];
    const allFoodTypes = [...basicFoodTypes];

    if (levelNumber >= 5) allFoodTypes.push(FoodType.DONUT);
    if (levelNumber >= 3) allFoodTypes.push(FoodType.CHERRY);

    const enemiesPerWave = 3 + waveNumber + Math.floor(levelNumber * 0.8);
    const spawnInterval = Math.max(0.8, 2.5 - levelNumber * 0.08);
    const foodTypesCount = Math.min(1 + Math.floor(levelNumber / 3), allFoodTypes.length);

    // Seeded shuffle
    const shuffled = [...allFoodTypes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedFoodTypes = shuffled.slice(0, foodTypesCount);

    const foods = selectedFoodTypes.map(type => ({
      type,
      count: Math.floor(enemiesPerWave / foodTypesCount),
      spawnInterval,
      streamId: 'stream-0',
    }));

    return { waveNumber, duration: 30, foods };
  }

  private generateWaves(levelNumber: number): WaveData[] {
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
