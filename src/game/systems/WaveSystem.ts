import { WaveData, FoodData, StreamPath } from '../../types/game';
import { FoodSystem } from './FoodSystem';

interface SpawnQueueItem {
  foodType: string;
  streamId: string;
  spawnTime: number;
}

export class WaveSystem {
  private foodSystem: FoodSystem;
  private currentWaveIndex = 0;
  private waveStartTime = 0;
  private isWaveActive = false;
  private spawnQueue: SpawnQueueItem[] = [];
  private spawnedCount = 0;
  
  constructor(foodSystem: FoodSystem) {
    this.foodSystem = foodSystem;
  }
  
  startWave(wave: WaveData, currentTime: number): void {
    this.currentWaveIndex = wave.waveNumber - 1;
    this.waveStartTime = currentTime;
    this.isWaveActive = true;
    this.spawnedCount = 0;
    this.spawnQueue = [];
    
    // Build spawn queue
    wave.foods.forEach(foodGroup => {
      for (let i = 0; i < foodGroup.count; i++) {
        this.spawnQueue.push({
          foodType: foodGroup.type,
          streamId: foodGroup.streamId,
          spawnTime: this.waveStartTime + i * foodGroup.spawnInterval,
        });
      }
    });
    
    // Sort by spawn time
    this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
  }
  
  update(
    currentTime: number,
    foods: Map<string, FoodData>,
    streams: StreamPath[]
  ): void {
    if (!this.isWaveActive || this.spawnQueue.length === 0) {
      // Check if wave is complete (no more foods to spawn and no foods on screen)
      if (this.isWaveActive && this.spawnQueue.length === 0 && foods.size === 0) {
        this.isWaveActive = false;
      }
      return;
    }
    
    // Check if it's time to spawn the next food
    const nextSpawn = this.spawnQueue[0];
    if (currentTime >= nextSpawn.spawnTime) {
      this.spawnQueue.shift();
      this.spawnFood(nextSpawn, foods, streams);
      this.spawnedCount++;
    }
  }
  
  private spawnFood(
    spawnItem: SpawnQueueItem,
    foods: Map<string, FoodData>,
    streams: StreamPath[]
  ): void {
    // Pick random stream
    const randomStream = streams[Math.floor(Math.random() * streams.length)];
    if (!randomStream) return;

    this.foodSystem.spawnFoodOnStream(
      spawnItem.foodType as any,
      randomStream,
      foods
    );
  }

  isWaveComplete(foods: Map<string, FoodData>): boolean {
    return !this.isWaveActive && this.spawnQueue.length === 0 && foods.size === 0;
  }
  
  isActive(): boolean {
    return this.isWaveActive;
  }
  
  reset(): void {
    this.currentWaveIndex = 0;
    this.waveStartTime = 0;
    this.isWaveActive = false;
    this.spawnQueue = [];
    this.spawnedCount = 0;
  }
}
