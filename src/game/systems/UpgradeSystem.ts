import { FrogData } from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { FROG_STATS, UPGRADE_PATH_COSTS, POWER_FACTORS } from '@data/constants';

export class UpgradeSystem {
  canPurchaseUpgrade(frog: FrogData, upgradeChoice: string, playerMoney: number): boolean {
    const state = frog.upgradeState;

    if (state.level === 0) {
      return upgradeChoice === 'L1' && playerMoney >= UPGRADE_PATH_COSTS[0];
    }

    if (state.level === 1) {
      const validPaths = [UpgradePath.SPOTS, UpgradePath.CIRCLES, UpgradePath.HORIZONTAL_STRIPES, UpgradePath.VERTICAL_STRIPES];
      return validPaths.includes(upgradeChoice as UpgradePath) && playerMoney >= UPGRADE_PATH_COSTS[1];
    }

    if (state.level === 2) {
      return upgradeChoice === 'L3' && playerMoney >= UPGRADE_PATH_COSTS[2];
    }

    return false;
  }

  purchaseUpgrade(frog: FrogData, upgradeChoice: string): number {
    const state = frog.upgradeState;
    const cost = UPGRADE_PATH_COSTS[state.level];

    if (state.level === 0) {
      state.level = 1;
    } else if (state.level === 1) {
      state.level = 2;
      state.path = upgradeChoice as UpgradePath;
    } else if (state.level === 2) {
      state.level = 3;
    }

    state.totalSpent += cost;
    frog.totalSpent += cost;
    return cost;
  }

  getEffectiveStats(frog: FrogData, allFrogs: Map<string, FrogData>): { damage: number; attackSpeed: number; range: number } {
    const baseStats = FROG_STATS[frog.type];
    const range = baseStats.range;
    const state = frog.upgradeState;

    if (state.level === 0) {
      return { damage: baseStats.damage, attackSpeed: baseStats.attackSpeed, range };
    }

    const key = this.getPowerKey(state.level, state.path);
    const pf = POWER_FACTORS[key];
    if (!pf) {
      return { damage: baseStats.damage, attackSpeed: baseStats.attackSpeed, range };
    }

    let damage = baseStats.damage * pf.damage;
    const attackSpeed = baseStats.attackSpeed * pf.speed;

    if (pf.synergyPerNeighbor) {
      const neighbors = this.countSynergyNeighbors(frog, allFrogs);
      damage += neighbors * baseStats.damage * pf.synergyPerNeighbor;
    }

    return { damage, attackSpeed, range };
  }

  private getPowerKey(level: number, path: UpgradePath): string {
    if (level === 1) return 'L1';
    const prefix = level === 2 ? 'L2' : 'L3';
    switch (path) {
      case UpgradePath.SPOTS: return `${prefix}_SPOTS`;
      case UpgradePath.CIRCLES: return `${prefix}_CIRCLES`;
      case UpgradePath.HORIZONTAL_STRIPES: return `${prefix}_H_STRIPES`;
      case UpgradePath.VERTICAL_STRIPES: return `${prefix}_V_STRIPES`;
      default: return 'L1';
    }
  }

  private countSynergyNeighbors(frog: FrogData, allFrogs: Map<string, FrogData>): number {
    const state = frog.upgradeState;
    let count = 0;

    if (state.path === UpgradePath.CIRCLES) {
      // L2: cardinal only (4 max), L3: cardinal + diagonal (8 max)
      const offsets = state.level >= 3
        ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]
        : [[-1, 0], [1, 0], [0, -1], [0, 1]];
      allFrogs.forEach(other => {
        if (other.id === frog.id) return;
        if (other.upgradeState.path !== UpgradePath.CIRCLES) return;
        if (other.upgradeState.level < 2) return;
        for (const [dr, dc] of offsets) {
          if (other.gridPosition.row === frog.gridPosition.row + dr &&
            other.gridPosition.col === frog.gridPosition.col + dc) {
            count++;
            break;
          }
        }
      });
    } else if (state.path === UpgradePath.HORIZONTAL_STRIPES) {
      // Same row, max 3 (4 cols - 1)
      allFrogs.forEach(other => {
        if (other.id === frog.id) return;
        if (other.upgradeState.path !== UpgradePath.HORIZONTAL_STRIPES) return;
        if (other.upgradeState.level < 2) return;
        if (other.gridPosition.row === frog.gridPosition.row) {
          count++;
        }
      });
    } else if (state.path === UpgradePath.VERTICAL_STRIPES) {
      // Same column, max 4 (5 rows - 1)
      allFrogs.forEach(other => {
        if (other.id === frog.id) return;
        if (other.upgradeState.path !== UpgradePath.VERTICAL_STRIPES) return;
        if (other.upgradeState.level < 2) return;
        if (other.gridPosition.col === frog.gridPosition.col) {
          count++;
        }
      });
    }

    return count;
  }

  canApplyToken(frog: FrogData, tokenType: UpgradePath): boolean {
    const level = frog.upgradeState.level;
    if (level >= 3) return false;

    if (level === 0) return true; // Any token works for L0->L1

    if (level === 1) return true; // Any token works for L1->L2 (sets the path)

    // level === 2: only the matching path token works
    return frog.upgradeState.path === tokenType;
  }

  applyTokenUpgrade(frog: FrogData, tokenType: UpgradePath): void {
    const state = frog.upgradeState;

    if (state.level === 0) {
      state.level = 1;
    } else if (state.level === 1) {
      state.level = 2;
      state.path = tokenType;
    } else if (state.level === 2) {
      state.level = 3;
    }
  }

  getAvailableUpgrades(frog: FrogData): string[] {
    const state = frog.upgradeState;

    if (state.level === 0) return ['L1'];
    if (state.level === 1) return [UpgradePath.SPOTS, UpgradePath.CIRCLES, UpgradePath.HORIZONTAL_STRIPES, UpgradePath.VERTICAL_STRIPES];
    if (state.level === 2) return ['L3'];
    return [];
  }
}
