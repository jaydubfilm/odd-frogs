import { FrogData, FrogType, FirePattern, GridPosition, FoodData, GridCell } from '../../types/game';
import { FROG_STATS, GAME_CONFIG, UPGRADE_MULTIPLIER } from '@data/constants';
import { AudioManager } from './AudioManager';
import { createDefaultUpgradeTree } from '../../data/UpgradeTrees';

export class FrogSystem {
  private frogIdCounter = 0;
  private audioManager?: AudioManager;

  constructor(audioManager?: AudioManager) {
    this.audioManager = audioManager;
  }

  createFrog(type: FrogType, gridPosition: GridPosition): FrogData {
    const baseStats = { ...FROG_STATS[type] };

    return {
      id: `frog-${this.frogIdCounter++}`,
      type,
      gridPosition,
      level: 1,
      stats: baseStats,
      lastAttackTime: 0,
      targetFood: null,
      totalSpent: 0,
      upgradeState: {
        tree: createDefaultUpgradeTree(),
        totalSpent: 0
      },
    };
  }
 
  
  private findTargetInRange(
    frog: FrogData,
    foods: Map<string, FoodData>,
    grid: GridCell[][]
  ): FoodData | null {
    const cell = grid[frog.gridPosition.row]?.[frog.gridPosition.col];
    if (!cell) return null;
    const frogPos = cell.position;

    let priorityFood: FoodData | null = null;
    let maxDistanceTraveled = -1;

    foods.forEach(food => {
      // Check fire pattern restrictions
      if (!this.canTargetWithFirePattern(frogPos, food.position, frog.stats.firePattern)) {
        return;
      }

      // Check if line of sight is blocked by rocks
      if (this.isLineOfSightBlocked(frogPos, food.position, grid)) {
        return;
      }

      const distance = this.getDistance(frogPos, food.position);
      const rangeInPixels = frog.stats.range * GAME_CONFIG.cellSize;

      // Only consider food within range
      if (distance <= rangeInPixels) {
        // Prioritize food that has traveled the farthest (closest to end)
        if (food.distanceTraveled > maxDistanceTraveled) {
          priorityFood = food;
          maxDistanceTraveled = food.distanceTraveled;
        }
      }
    });

    return priorityFood;
  }

  private canTargetWithFirePattern(
    frogPos: { x: number; y: number },
    foodPos: { x: number; y: number },
    firePattern: FirePattern
  ): boolean {
    if (firePattern === FirePattern.OMNI) return true;

    const dx = foodPos.x - frogPos.x;
    const dy = foodPos.y - frogPos.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Cone width (total 20 degrees, so +/- 10)
    const t = 10;

    if (firePattern === FirePattern.STRAIGHT_UP) {
      // Up is -90. Check between -100 and -80
      return angle >= (-90 - t) && angle <= (-90 + t);
    }

    if (firePattern === FirePattern.LEFT_RIGHT) {
      // 1. Check RIGHT (0 degrees)
      const right = angle >= -t && angle <= t;

      // 2. Check LEFT (180 degrees)
      // We use Math.abs because left is the wrap-around point (-180/180)
      // This checks if angle is > 170 OR < -170
      const left = Math.abs(angle) >= (180 - t);

      return right || left;
    }

    return false;
  }
  
  private isLineOfSightBlocked(
    frogPos: { x: number; y: number },
    foodPos: { x: number; y: number },
    grid: GridCell[][]
  ): boolean {
    // Simple line-of-sight check: check if any rock is between frog and food
    // This is a simplified version - a more sophisticated raycasting could be added
    
    const steps = 20;
    const dx = (foodPos.x - frogPos.x) / steps;
    const dy = (foodPos.y - frogPos.y) / steps;
    
    for (let i = 1; i < steps; i++) {
      const checkX = frogPos.x + dx * i;
      const checkY = frogPos.y + dy * i;
      
      const gridPos = this.pixelToGrid(checkX, checkY);
      if (gridPos) {
        const cell = grid[gridPos.row]?.[gridPos.col];
        if (cell && cell.type === 'ROCK') {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private attackFood(frog: FrogData, food: FoodData): void {
    food.currentHealth -= frog.stats.damage;
    if (food.currentHealth < 0) {
      food.currentHealth = 0;
    }

    frog.tongue = {
      active: true,
      targetPosition: { ...food.position },
      progress: 0,
      startTime: performance.now() / 1000
    };

    // Play slurp sound
    if (this.audioManager) {
      this.audioManager.playSound('slurp', 0.3);
    }
  }

  upgradeFrog(frog: FrogData): void {
    frog.level++;

    // Apply upgrade multipliers
    frog.stats.damage *= UPGRADE_MULTIPLIER.DAMAGE;
    frog.stats.attackSpeed *= UPGRADE_MULTIPLIER.ATTACK_SPEED;
    frog.stats.range *= UPGRADE_MULTIPLIER.RANGE;
    frog.stats.upgradeCost = Math.floor(frog.stats.upgradeCost * 1.5);
  }
  
  private pixelToGrid(x: number, y: number): GridPosition | null {
    const topMargin = 60;
    const leftMargin = 60;

    const col = Math.floor((x - leftMargin) / GAME_CONFIG.cellSize);
    const row = Math.floor((y - topMargin) / GAME_CONFIG.cellSize);

    if (row >= 0 && row < GAME_CONFIG.gridRows && col >= 0 && col < GAME_CONFIG.gridCols) {
      return { row, col };
    }

    return null;
  }
  
  private getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  updateFrogs(
    frogs: Map<string, FrogData>,
    foods: Map<string, FoodData>,
    grid: GridCell[][],
    _deltaTime: number
  ): void {
    const currentTime = performance.now() / 1000;

    frogs.forEach(frog => {
      // Update tongue animation
      this.updateTongue(frog, currentTime);  // ← ADD THIS LINE

      // Find target in range
      const target = this.findTargetInRange(frog, foods, grid);

      if (target) {
        frog.targetFood = target.id;

        const timeSinceLastAttack = currentTime - frog.lastAttackTime;
        const attackInterval = 1 / frog.stats.attackSpeed;

        if (timeSinceLastAttack >= attackInterval) {
          this.attackFood(frog, target);
          frog.lastAttackTime = currentTime;
        }
      } else {
        frog.targetFood = null;
      }
    });
  }

  // ← ADD THIS NEW METHOD
  private updateTongue(frog: FrogData, currentTime: number): void {
    if (!frog.tongue || !frog.tongue.active) return;

    const TONGUE_DURATION = 0.15; // Total animation time in seconds
    const elapsed = currentTime - frog.tongue.startTime;

    if (elapsed >= TONGUE_DURATION) {
      // Animation complete
      frog.tongue.active = false;
      frog.tongue = undefined;
    } else {
      // Update progress (0 -> 1 -> 0)
      const normalizedTime = elapsed / TONGUE_DURATION;
      if (normalizedTime < 0.5) {
        // Extending (0 to 1)
        frog.tongue.progress = normalizedTime * 2;
      } else {
        // Retracting (1 to 0)
        frog.tongue.progress = 2 - normalizedTime * 2;
      }
    }
  }
}
