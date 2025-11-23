import { FoodData, FoodType, StreamPath, Position } from '../../types/game';
import { FOOD_BASE_STATS } from '@data/constants';
import { channelsToSegments } from '../utils/LevelGenerator'; 

export class FoodSystem {
  private foodIdCounter = 0;
  
  createFood(type: FoodType, streamId: string): FoodData {
    const baseStats = { ...FOOD_BASE_STATS[type] };

    return {
      id: `food-${this.foodIdCounter++}`,
      type,
      streamId, // ADD THIS
      position: { x: 0, y: 0 },
      pathIndex: 0,
      pathProgress: 0,
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
    const stream = streams.find(s => s.id === this.getStreamIdForFood(food, streams));
    if (!stream) return;

    const elements = channelsToSegments(stream.channels);
    const segments = elements.filter(el => 'start' in el); // Only PathSegments
    const segment = segments[food.pathIndex];
    if (!segment) return;
    
    // Calculate distance to move
    const distanceToMove = food.stats.speed * deltaTime;
    
    // Calculate segment length
    const segmentLength = this.getSegmentLength(segment);
    
    // Update progress along segment
    const progressIncrement = distanceToMove / segmentLength;
    food.pathProgress += progressIncrement;
    
    // Check if we've completed this segment
    if (food.pathProgress >= 1) {
      food.pathProgress = 0;
      food.pathIndex++;
      
      // If we've completed all segments, mark for removal (handled by game engine)
      if (food.pathIndex >= segments.length) {
        return;
      }
    }
    
    // Update position based on current segment and progress
    this.updateFoodPositionOnSegment(food, stream);
  }
  
  private updateFoodPositionOnSegment(food: FoodData, stream: StreamPath): void {
    const elements = channelsToSegments(stream.channels);
    const segments = elements.filter(el => 'start' in el); // Only PathSegments
    const segment = segments[food.pathIndex];
    if (!segment) return;

    const t = food.pathProgress;

    food.position = {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t,
    };
  }
  
  private getSegmentLength(segment: { start: Position; end: Position }): number {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private getStreamIdForFood(food: FoodData, streams: StreamPath[]): string {
    return food.streamId;
  }
  
  hasReachedEnd(food: FoodData, streams: StreamPath[]): boolean {
    const stream = streams.find(s => s.id === this.getStreamIdForFood(food, streams));
    if (!stream) return false;

    const elements = channelsToSegments(stream.channels);
    const segments = elements.filter(el => 'start' in el); // Only PathSegments
    return food.pathIndex >= segments.length;
  }
  
  spawnFoodOnStream(
    type: FoodType,
    stream: StreamPath,
    foods: Map<string, FoodData>
  ): FoodData {
    const food = this.createFood(type, stream.id);

    // Place at start of first segment
    const elements = channelsToSegments(stream.channels);
    const segments = elements.filter(el => 'start' in el); // Only PathSegments
    const firstSegment = segments[0];
    if (firstSegment) {
      food.position = {
        x: firstSegment.start.x,
        y: firstSegment.start.y
      };
    }
    
    foods.set(food.id, food);
    return food;
  }
}
