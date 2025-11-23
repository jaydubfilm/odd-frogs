import { FrogData, FoodData } from '../../types/game';

export class CollisionSystem {
  checkCollisions(
    frogs: Map<string, FrogData>,
    foods: Map<string, FoodData>
  ): void {
    // This system is primarily used for additional collision detection
    // The main attack logic is handled in FrogSystem
    // This can be extended for special effects, area damage, etc.
  }
  
  checkCircleCollision(
    pos1: { x: number; y: number },
    radius1: number,
    pos2: { x: number; y: number },
    radius2: number
  ): boolean {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < radius1 + radius2;
  }
  
  checkRectCollision(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }
}
