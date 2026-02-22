import { FoodData, GameState } from '../../types/game';
import { CONSUMABLE_CONFIG, GAME_CONFIG } from '@data/constants';

export interface WhirlpoolEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  createdAt: number;
  duration: number;
  lastDamageTick: number;
}

export interface RainEffect {
  createdAt: number;
  duration: number;
}

export class ConsumableSystem {
  private whirlpools: WhirlpoolEffect[] = [];
  private rainEffect: RainEffect | null = null;
  private nextWhirlpoolId = 0;

  addWhirlpool(x: number, y: number): void {
    this.whirlpools.push({
      id: `wp_${this.nextWhirlpoolId++}`,
      x,
      y,
      radius: CONSUMABLE_CONFIG.WHIRLPOOL_RADIUS_GRID * GAME_CONFIG.cellSize,
      createdAt: performance.now() / 1000,
      duration: CONSUMABLE_CONFIG.WHIRLPOOL_DURATION_S,
      lastDamageTick: 0,
    });
  }

  applyRain(foods: Map<string, FoodData>): void {
    for (const food of foods.values()) {
      food.currentHealth -= CONSUMABLE_CONFIG.RAIN_DAMAGE;
    }
    this.rainEffect = {
      createdAt: Date.now(),
      duration: CONSUMABLE_CONFIG.RAIN_VISUAL_DURATION,
    };
  }

  applyHeal(gameState: GameState): void {
    gameState.lives += CONSUMABLE_CONFIG.HEAL_AMOUNT;
  }

  update(deltaTime: number, foods: Map<string, FoodData>): void {
    const now = performance.now() / 1000;

    // Update whirlpools
    this.whirlpools = this.whirlpools.filter(wp => {
      const age = now - wp.createdAt;
      if (age > wp.duration) return false;

      // Damage tick every WHIRLPOOL_TICK_INTERVAL seconds
      const ticksSinceCreation = Math.floor(age / CONSUMABLE_CONFIG.WHIRLPOOL_TICK_INTERVAL);
      if (ticksSinceCreation > wp.lastDamageTick) {
        wp.lastDamageTick = ticksSinceCreation;

        // Damage all food within radius
        for (const food of foods.values()) {
          const dx = food.position.x - wp.x;
          const dy = food.position.y - wp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= wp.radius) {
            food.currentHealth -= CONSUMABLE_CONFIG.WHIRLPOOL_DAMAGE;
          }
        }
      }

      return true;
    });

    // Expire rain visual
    if (this.rainEffect) {
      const elapsed = Date.now() - this.rainEffect.createdAt;
      if (elapsed > this.rainEffect.duration) {
        this.rainEffect = null;
      }
    }
  }

  getWhirlpools(): WhirlpoolEffect[] {
    return this.whirlpools;
  }

  getRainEffect(): RainEffect | null {
    return this.rainEffect;
  }
}
