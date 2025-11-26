import { LevelData, WaveData, FoodType, CellType } from '../../types/game';
import { generateRandomLevel } from './LevelGenerator';

export class ProceduralLevelGenerator {
  generateLevel(levelNumber: number): LevelData {
    // Use existing random level generator for grid layout
    const baseLevel = generateRandomLevel();

    // Generate waves based on difficulty
    const waves = this.generateWaves(levelNumber);

    // Scale starting money
    const startingMoney = 200 + (levelNumber - 1) * 50;

    return {
      ...baseLevel,
      id: `procedural-level-${levelNumber}`,
      name: `Level ${levelNumber}`,
      waves,
      startingMoney,
    };
  }

  private generateWaves(levelNumber: number): WaveData[] {
    const waves: WaveData[] = [];
    const baseWaveCount = 3;
    const waveCount = baseWaveCount + Math.floor(levelNumber / 2); // More waves as you progress

    for (let i = 0; i < waveCount; i++) {
      waves.push(this.generateWave(i + 1, levelNumber));
    }

    return waves;
  }

  private generateWave(waveNumber: number, levelNumber: number): WaveData {
    const basicFoodTypes = [FoodType.APPLE, FoodType.BEANS, FoodType.BURGER, FoodType.CAKE, FoodType.PIZZA];
    const allFoodTypes = [...basicFoodTypes];

    // Add tough enemies starting at level 5
    if (levelNumber >= 5) {
      allFoodTypes.push(FoodType.DONUT);
    }

    // Add fast enemies starting at level 3
    if (levelNumber >= 3) {
      allFoodTypes.push(FoodType.CHERRY);
    }

    // Difficulty scaling
    const enemiesPerWave = 5 + waveNumber * 2 + levelNumber * 2;
    const spawnInterval = Math.max(0.5, 2 - levelNumber * 0.1); // Faster spawns

    // Select food types (more variety in later levels)
    const foodTypesCount = Math.min(1 + Math.floor(levelNumber / 3), allFoodTypes.length);
    const selectedFoodTypes = this.shuffleArray([...allFoodTypes]).slice(0, foodTypesCount);

    const foods = selectedFoodTypes.map(type => ({
      type,
      count: Math.floor(enemiesPerWave / foodTypesCount),
      spawnInterval,
      streamId: 'stream-0', // Will be randomized by wave system
    }));

    return {
      waveNumber,
      duration: 30, // Time before auto-starting next wave
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