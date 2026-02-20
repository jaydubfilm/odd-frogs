export enum UpgradePath {
  NONE = 'NONE',
  SPOTS = 'SPOTS',
  HORIZONTAL_STRIPES = 'HORIZONTAL_STRIPES',
  VERTICAL_STRIPES = 'VERTICAL_STRIPES',
}

export interface FrogUpgradeState {
  path: UpgradePath;
  level: number; // 0-3
  totalSpent: number;
}
