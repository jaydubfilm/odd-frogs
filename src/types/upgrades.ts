export enum UpgradeStat {
  DAMAGE = 'DAMAGE',
  ATTACK_SPEED = 'ATTACK_SPEED',
  RANGE = 'RANGE',
}

export interface UpgradeNode {
  id: string;
  name: string;
  description: string;
  stat: UpgradeStat;
  maxLevel: number;
  currentLevel: number;
  costPerLevel: number[];  // Cost for each level [level1, level2, level3]
  valuePerLevel: number[]; // Value increase for each level
  children: string[];      // IDs of child nodes
  isUnlocked: boolean;
}

export interface UpgradeTree {
  nodes: Map<string, UpgradeNode>;
  rootNodes: string[];     // IDs of root nodes
}

export interface FrogUpgradeState {
  tree: UpgradeTree;
  totalSpent: number;
}
