import { FrogData } from '../../types/game';
import { UpgradePath } from '../../types/upgrades';
import { FROG_STATS, UPGRADE_PATH_COSTS, UPGRADE_PATH_BUFFS } from '@data/constants';

export class UpgradeSystem {
  canPurchaseUpgrade(frog: FrogData, path: UpgradePath, playerMoney: number): boolean {
    const state = frog.upgradeState;

    // Can't upgrade NONE path
    if (path === UpgradePath.NONE) return false;

    // If already committed to a different path, can't switch
    if (state.path !== UpgradePath.NONE && state.path !== path) return false;

    // Max level is 3
    if (state.level >= 3) return false;

    const cost = UPGRADE_PATH_COSTS[state.level];
    return playerMoney >= cost;
  }

  purchaseUpgrade(frog: FrogData, path: UpgradePath): number {
    const state = frog.upgradeState;
    const cost = UPGRADE_PATH_COSTS[state.level];

    // Lock in path
    state.path = path;
    state.level++;
    state.totalSpent += cost;
    frog.totalSpent += cost;

    return cost;
  }

  getEffectiveStats(frog: FrogData, allFrogs: Map<string, FrogData>): { damage: number; attackSpeed: number; range: number } {
    const baseStats = FROG_STATS[frog.type];
    let damage = baseStats.damage;
    let attackSpeed = baseStats.attackSpeed;
    const range = baseStats.range;

    const state = frog.upgradeState;

    // Apply spots self-buff (multiplicative on base)
    if (state.path === UpgradePath.SPOTS && state.level > 0) {
      const buffs = UPGRADE_PATH_BUFFS[UpgradePath.SPOTS];
      damage *= buffs.damageMult![state.level - 1];
      attackSpeed *= buffs.attackSpeedMult![state.level - 1];
    }

    // Receive buffs from stripe frogs in same row/col (NOT self)
    allFrogs.forEach(other => {
      if (other.id === frog.id) return;
      if (other.upgradeState.level === 0) return;

      const otherState = other.upgradeState;

      if (otherState.path === UpgradePath.HORIZONTAL_STRIPES &&
        other.gridPosition.row === frog.gridPosition.row) {
        const buffs = UPGRADE_PATH_BUFFS[UpgradePath.HORIZONTAL_STRIPES];
        damage += buffs.damageBonus![otherState.level - 1];
        attackSpeed += buffs.attackSpeedBonus![otherState.level - 1];
      }

      if (otherState.path === UpgradePath.VERTICAL_STRIPES &&
        other.gridPosition.col === frog.gridPosition.col) {
        const buffs = UPGRADE_PATH_BUFFS[UpgradePath.VERTICAL_STRIPES];
        damage += buffs.damageBonus![otherState.level - 1];
        attackSpeed += buffs.attackSpeedBonus![otherState.level - 1];
      }
    });

    return { damage, attackSpeed, range };
  }

  getAvailablePaths(frog: FrogData): UpgradePath[] {
    const state = frog.upgradeState;

    // Already maxed
    if (state.level >= 3) return [];

    // Already committed to a path
    if (state.path !== UpgradePath.NONE) return [state.path];

    // All three available
    return [UpgradePath.SPOTS, UpgradePath.HORIZONTAL_STRIPES, UpgradePath.VERTICAL_STRIPES];
  }
}
