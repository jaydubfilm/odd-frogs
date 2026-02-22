import { WaveData, FoodData, StreamPath } from '../../types/game';
import { FoodSystem } from './FoodSystem';

interface SpawnQueueItem {
  foodType: string;
  streamId: string;
  spawnTime: number;
}

export class WaveSystem {
  private foodSystem: FoodSystem;
  private currentWave: WaveData | null = null;
  private waveStartTime = 0;
  private isWaveActive = false;
  private waitingForFirstWave = false;
  private spawnQueue: SpawnQueueItem[] = [];
  private spawnedCount = 0;
  private nextWaveStartTime = 0;

  constructor(foodSystem: FoodSystem) {
    this.foodSystem = foodSystem;
  }

  startWave(wave: WaveData, currentTime: number): void {
    this.currentWave = wave;
    this.waveStartTime = currentTime;
    this.nextWaveStartTime = currentTime + wave.duration;
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

  isWaveComplete(currentTime: number): boolean {
    if (this.waitingForFirstWave) return false;

    // Wave is complete when:
    // 1. A wave is/was active
    // 2. All enemies are spawned (queue empty)
    // 3. Timer expired
    const complete = this.spawnQueue.length === 0 &&
      currentTime >= this.nextWaveStartTime;

    if (complete && this.isWaveActive) {
      this.isWaveActive = false; // Mark as inactive when truly complete
    }

    return complete;
  }

  canCallNextWave(currentTime: number, foods: Map<string, FoodData>): boolean {
    if (this.waitingForFirstWave) return true;
    if (!this.currentWave || !this.isWaveActive) return false;

    const elapsed = currentTime - this.waveStartTime;
    const threshold = this.currentWave.duration * 0.25; // 25% of wave duration

    // Can call next wave if:
    // 1. All enemies spawned AND all enemies dead (immediate)
    // OR
    // 2. 25% of wave time has elapsed
    const allEnemiesDead = this.spawnQueue.length === 0 && foods.size === 0;
    const timeThresholdMet = elapsed >= threshold;

    return allEnemiesDead || timeThresholdMet;
  }

  callNextWaveEarly(currentTime: number, foods: Map<string, FoodData>): number {
    if (this.waitingForFirstWave) {
      this.waitingForFirstWave = false;
      return 0;
    }
    if (!this.currentWave || !this.canCallNextWave(currentTime, foods)) return 0;

    const timeRemaining = this.nextWaveStartTime - currentTime;
    const totalDuration = this.currentWave.duration;

    // Calculate bonus: $0.50 per second remaining
    const bonus = Math.floor(timeRemaining / 2);

    // Force wave to complete by setting next wave time to now
    this.nextWaveStartTime = currentTime;
    // Clear the spawn queue to mark all spawns as done
    this.spawnQueue = [];
    // Keep isWaveActive true so isWaveComplete can detect it
    // isWaveComplete will set it to false

    return bonus;
  }

  getTimeUntilNextWave(currentTime: number): number {
    return Math.max(0, this.nextWaveStartTime - currentTime);
  }

  /** Returns 0..1 fraction of how far through the wave timer we are (1 = next wave imminent) */
  getWaveTimerProgress(currentTime: number): number {
    if (!this.currentWave || this.currentWave.duration <= 0) return 1;
    const elapsed = currentTime - this.waveStartTime;
    return Math.min(1, Math.max(0, elapsed / this.currentWave.duration));
  }

  isActive(): boolean {
    return this.isWaveActive || this.waitingForFirstWave;
  }

  isWaitingForFirstWave(): boolean {
    return this.waitingForFirstWave;
  }

  hasSpawnedAllEnemies(): boolean {
    return this.spawnQueue.length === 0;
  }

  reset(): void {
    this.currentWave = null;
    this.waveStartTime = 0;
    this.nextWaveStartTime = 0;
    this.isWaveActive = false;
    this.waitingForFirstWave = false;
    this.spawnQueue = [];
    this.spawnedCount = 0;
  }

  prepareForFirstWave(): void {
    this.waitingForFirstWave = true;
  }
}