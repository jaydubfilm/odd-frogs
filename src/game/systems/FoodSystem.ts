import { FoodData, FoodType, StreamPath } from '../../types/game';
import { FOOD_STATS } from '@data/constants';
import { PathGenerator } from '../utils/PathGenerator'; 

export class FoodSystem {
  private foodIdCounter = 0;
  
  createFood(type: FoodType, streamId: string): FoodData {
    const baseStats = { ...FOOD_STATS[type] };

    return {
      id: `food-${this.foodIdCounter++}`,
      type,
      streamId,
      position: { x: 0, y: 0 },
      distanceTraveled: 0, 
      stats: baseStats,
      currentHealth: baseStats.health,
    };
  }
  
  updateFoods(
    foods: Map<string, FoodData>,
    streams: StreamPath[],
    deltaTime: number
  ): void {
    foods.forEach(food => {
      this.updateFoodPosition(food, streams, deltaTime);
    });
  }

  private updateFoodPosition(
    food: FoodData,
    streams: StreamPath[],
    deltaTime: number
  ): void {
    // Find the stream this food is on
    const stream = streams.find(s => s.id === food.streamId);
    if (!stream?.smoothPath) return;

    // Update distance traveled
    food.distanceTraveled += food.stats.speed * deltaTime;

    // Get position on the smooth path
    const result = PathGenerator.getPositionAtDistance(
      stream.smoothPath.points,
      food.distanceTraveled
    );

    // Update food position
    food.position = result.position;

    // Optional: Store completion status for hasReachedEnd check
    if (result.completed) {
      food.reachedEnd = true;
    }
  }
  
  hasReachedEnd(food: FoodData): boolean {
    return food.reachedEnd === true; 
  }
  
  spawnFoodOnStream(
    type: FoodType,
    stream: StreamPath,
    foods: Map<string, FoodData>
  ): FoodData {
    const food = this.createFood(type, stream.id);

    // Place at start of smooth path
    if (stream.smoothPath && stream.smoothPath.points.length > 0) {
      food.position = { ...stream.smoothPath.points[0] };
    }

    foods.set(food.id, food);
    return food;
  }
}
