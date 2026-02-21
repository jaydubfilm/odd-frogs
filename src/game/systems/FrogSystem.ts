import { FrogData, FrogType, GridPosition, FoodData, GridCell } from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { FROG_STATS, GAME_CONFIG } from '@data/constants';
import { AudioManager } from './AudioManager';
import { UpgradeSystem } from './UpgradeSystem';
import { AoeEffectSystem } from './AoeEffectSystem';

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
      stats: baseStats,
      lastAttackTime: 0,
      targetFood: null,
      totalSpent: 0,
      upgradeState: {
        path: UpgradePath.NONE,
        level: 0,
        totalSpent: 0,
      },
    };
  }


  private findTargetInRange(
    frog: FrogData,
    foods: Map<string, FoodData>,
    grid: GridCell[][],
    effectiveRange: number
  ): FoodData | null {
    const cell = grid[frog.gridPosition.row]?.[frog.gridPosition.col];
    if (!cell) return null;
    const frogPos = cell.position;

    let priorityFood: FoodData | null = null;
    let maxDistanceTraveled = -1;

    const minRangePixels = (frog.stats.minRange ?? 0) * GAME_CONFIG.cellSize;

    foods.forEach(food => {
      // Check line of sight: blocked by rocks (unless frog ignores rocks) or by other frogs
      if (this.isLineOfSightBlocked(frogPos, food.position, grid, frog.gridPosition, frog)) {
        return;
      }

      const distance = this.getDistance(frogPos, food.position);
      const rangeInPixels = effectiveRange * GAME_CONFIG.cellSize;

      // Only consider food within range and outside min range
      if (distance <= rangeInPixels && distance >= minRangePixels) {
        // Prioritize food that has traveled the farthest (closest to end)
        if (food.distanceTraveled > maxDistanceTraveled) {
          priorityFood = food;
          maxDistanceTraveled = food.distanceTraveled;
        }
      }
    });

    return priorityFood;
  }

  private isLineOfSightBlocked(
    frogPos: { x: number; y: number },
    foodPos: { x: number; y: number },
    grid: GridCell[][],
    frogGridPos?: GridPosition,
    shootingFrog?: FrogData
  ): boolean {
    const steps = 10;
    const dx = (foodPos.x - frogPos.x) / steps;
    const dy = (foodPos.y - frogPos.y) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = frogPos.x + dx * i;
      const checkY = frogPos.y + dy * i;

      const gridPos = this.pixelToGrid(checkX, checkY);
      if (!gridPos) continue;

      // Skip the frog's own cell
      if (frogGridPos && gridPos.row === frogGridPos.row && gridPos.col === frogGridPos.col) continue;

      const cell = grid[gridPos.row]?.[gridPos.col];
      if (cell && cell.type === 'ROCK' && !shootingFrog?.stats.ignoresRocks) {
        return true;
      }
      if (cell && cell.frog && shootingFrog?.stats.blockedByFrogs) {
        return true;
      }
    }

    return false;
  }

  private findOptimalAoeCenter(
    primaryTarget: FoodData,
    foods: Map<string, FoodData>,
    aoeRadiusPixels: number
  ): { x: number; y: number } {
    const candidates: { x: number; y: number }[] = [];

    // Try each food position as a candidate AoE center
    foods.forEach(food => {
      // Center must keep primary target within AoE radius
      if (this.getDistance(food.position, primaryTarget.position) <= aoeRadiusPixels) {
        candidates.push({ ...food.position });
      }
    });

    // Fallback to primary target position
    if (candidates.length === 0) {
      return { ...primaryTarget.position };
    }

    let bestCenter = { ...primaryTarget.position };
    let bestCount = 0;

    for (const center of candidates) {
      let count = 0;
      foods.forEach(food => {
        if (this.getDistance(center, food.position) <= aoeRadiusPixels) {
          count++;
        }
      });
      if (count > bestCount) {
        bestCount = count;
        bestCenter = center;
      }
    }

    return bestCenter;
  }

  private attackFood(frog: FrogData, food: FoodData, effectiveDamage: number, foods?: Map<string, FoodData>, aoeEffectSystem?: AoeEffectSystem): void {
    const aoeRadius = frog.stats.aoeRadius;
    const aoePixels = aoeRadius ? aoeRadius * GAME_CONFIG.cellSize : 0;

    if (aoeRadius && foods) {
      // Find optimal AoE center that maximizes hits while including primary target
      const center = this.findOptimalAoeCenter(food, foods, aoePixels);

      // Damage all foods within AoE radius of the center
      foods.forEach(target => {
        if (this.getDistance(center, target.position) <= aoePixels) {
          target.currentHealth -= effectiveDamage;
          if (target.currentHealth < 0) target.currentHealth = 0;
        }
      });

      // Tongue aims at AoE center
      frog.tongue = {
        active: true,
        targetPosition: { ...center },
        progress: 0,
        startTime: performance.now() / 1000
      };

      // Trigger AoE visual
      if (aoeEffectSystem) {
        aoeEffectSystem.add(center.x, center.y, aoePixels);
      }
    } else if (frog.stats.slowAmount) {
      // Slow effect - no damage, just reduce speed
      const currentTime = performance.now() / 1000;
      const slowDuration = 1 / (frog.stats.attackSpeed || 1);
      food.slowEffect = {
        multiplier: frog.stats.slowAmount,
        endTime: currentTime + slowDuration + 0.5,
      };

      frog.tongue = {
        active: true,
        targetPosition: { ...food.position },
        progress: 0,
        startTime: currentTime
      };
    } else {
      // Normal single-target attack
      food.currentHealth -= effectiveDamage;
      if (food.currentHealth < 0) food.currentHealth = 0;

      frog.tongue = {
        active: true,
        targetPosition: { ...food.position },
        progress: 0,
        startTime: performance.now() / 1000
      };
    }

    // Play slurp sound
    if (this.audioManager) {
      this.audioManager.playSound('slurp', 0.3);
    }
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
    _deltaTime: number,
    upgradeSystem: UpgradeSystem,
    aoeEffectSystem?: AoeEffectSystem
  ): void {
    const currentTime = performance.now() / 1000;

    frogs.forEach(frog => {
      // Update tongue animation
      this.updateTongue(frog, currentTime);

      // Compute effective stats with upgrade buffs
      const effective = upgradeSystem.getEffectiveStats(frog, frogs);

      // Find target in range using effective range
      const target = this.findTargetInRange(frog, foods, grid, effective.range);

      if (target) {
        frog.targetFood = target.id;

        const timeSinceLastAttack = currentTime - frog.lastAttackTime;
        const attackInterval = 1 / effective.attackSpeed;

        if (timeSinceLastAttack >= attackInterval) {
          this.attackFood(frog, target, effective.damage, foods, aoeEffectSystem);
          frog.lastAttackTime = currentTime;
        }
      } else {
        frog.targetFood = null;
      }
    });
  }

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
