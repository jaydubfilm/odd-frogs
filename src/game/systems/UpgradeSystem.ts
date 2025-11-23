import { FrogData } from '../../types/game';
import { UpgradeNode, UpgradeStat } from '../../types/upgrades';

export class UpgradeSystem {
  canPurchaseUpgrade(frog: FrogData, nodeId: string, playerMoney: number): boolean {
    const node = frog.upgradeState.tree.nodes.get(nodeId);
    if (!node || !node.isUnlocked || node.currentLevel >= node.maxLevel) {
      return false;
    }

    const cost = node.costPerLevel[node.currentLevel];
    return playerMoney >= cost;
  }

  purchaseUpgrade(frog: FrogData, nodeId: string): number {
    const node = frog.upgradeState.tree.nodes.get(nodeId);
    if (!node || !node.isUnlocked || node.currentLevel >= node.maxLevel) {
      return 0;
    }

    const cost = node.costPerLevel[node.currentLevel];
    const value = node.valuePerLevel[node.currentLevel];

    // Apply stat upgrade
    this.applyStatUpgrade(frog, node.stat, value);

    // Update node level
    node.currentLevel++;
    frog.upgradeState.totalSpent += cost;

    // Unlock children if maxed out
    if (node.currentLevel >= node.maxLevel) {
      node.children.forEach(childId => {
        const childNode = frog.upgradeState.tree.nodes.get(childId);
        if (childNode) {
          childNode.isUnlocked = true;
        }
      });
    }

    return cost;
  }

  private applyStatUpgrade(frog: FrogData, stat: UpgradeStat, value: number): void {
    switch (stat) {
      case UpgradeStat.DAMAGE:
        frog.stats.damage += value;
        break;
      case UpgradeStat.ATTACK_SPEED:
        frog.stats.attackSpeed += value;
        break;
      case UpgradeStat.RANGE:
        frog.stats.range += value;
        break;
    }
  }

  getAvailableUpgrades(frog: FrogData): UpgradeNode[] {
    const available: UpgradeNode[] = [];

    frog.upgradeState.tree.nodes.forEach(node => {
      if (node.isUnlocked && node.currentLevel < node.maxLevel) {
        available.push(node);
      }
    });

    return available;
  }
}