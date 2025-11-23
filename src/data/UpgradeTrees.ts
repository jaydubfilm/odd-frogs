import { UpgradeNode, UpgradeTree, UpgradeStat } from '../types/upgrades';

export function createDefaultUpgradeTree(): UpgradeTree {
  const nodes = new Map < string, UpgradeNode> ();

  // Root Node 1: Damage Path
  nodes.set('damage-root', {
    id: 'damage-root',
    name: 'Sharp Tongue',
    description: 'Increase base damage',
    stat: UpgradeStat.DAMAGE,
    maxLevel: 3,
    currentLevel: 0,
    costPerLevel: [50, 100, 150],
    valuePerLevel: [5, 10, 15],
    children: ['damage-crit', 'damage-pierce'],
    isUnlocked: true,
  });

  // Root Node 2: Attack Speed Path
  nodes.set('speed-root', {
    id: 'speed-root',
    name: 'Quick Reflex',
    description: 'Increase attack speed',
    stat: UpgradeStat.ATTACK_SPEED,
    maxLevel: 3,
    currentLevel: 0,
    costPerLevel: [50, 100, 150],
    valuePerLevel: [0.2, 0.4, 0.6],
    children: ['speed-burst', 'speed-double'],
    isUnlocked: true,
  });

  // Child Node 1-1: Damage Branch
  nodes.set('damage-crit', {
    id: 'damage-crit',
    name: 'Critical Strike',
    description: 'Massive damage bonus',
    stat: UpgradeStat.DAMAGE,
    maxLevel: 3,
    currentLevel: 0,
    costPerLevel: [100, 200, 300],
    valuePerLevel: [10, 20, 30],
    children: [],
    isUnlocked: false,
  });

  // Child Node 1-2: Damage Branch
  nodes.set('damage-pierce', {
    id: 'damage-pierce',
    name: 'Armor Pierce',
    description: 'Extra range for damage',
    stat: UpgradeStat.RANGE,
    maxLevel: 3,
    currentLevel: 0,
    costPerLevel: [100, 200, 300],
    valuePerLevel: [0.5, 1.0, 1.5],
    children: [],
    isUnlocked: false,
  });

  // Child Node 2-1: Speed Branch
  nodes.set('speed-burst', {
    id: 'speed-burst',
    name: 'Attack Burst',
    description: 'Even faster attacks',
    stat: UpgradeStat.ATTACK_SPEED,
    maxLevel: 3,
    currentLevel: 0,
    costPerLevel: [100, 200, 300],
    valuePerLevel: [0.5, 1.0, 1.5],
    children: [],
    isUnlocked: false,
  });

  // Child Node 2-2: Speed Branch
  nodes.set('speed-double', {
    id: 'speed-double',
    name: 'Extended Reach',
    description: 'Longer range from speed',
    stat: UpgradeStat.RANGE,
    maxLevel: 3,
    currentLevel: 0,
    costPerLevel: [100, 200, 300],
    valuePerLevel: [0.5, 1.0, 1.5],
    children: [],
    isUnlocked: false,
  });

  return {
    nodes,
    rootNodes: ['damage-root', 'speed-root'],
  };
}