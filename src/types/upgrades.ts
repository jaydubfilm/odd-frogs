export enum UpgradePath {
  NONE = 'NONE',
  SPOTS = 'SPOTS',
  CIRCLES = 'CIRCLES',
  HORIZONTAL_STRIPES = 'HORIZONTAL_STRIPES',
  VERTICAL_STRIPES = 'VERTICAL_STRIPES',
}

export interface FrogUpgradeState {
  level: number;        // 0-3
  path: UpgradePath;    // chosen at L2 (NONE until L2)
  totalSpent: number;
}
