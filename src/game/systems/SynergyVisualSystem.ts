import { FrogData, GridCell } from '../../types/game';
import { UpgradePath } from '../../types/upgrades';

export interface SynergyConnection {
  x1: number; y1: number;
  x2: number; y2: number;
  path: UpgradePath;
}

export class SynergyVisualSystem {
  private connections: SynergyConnection[] = [];

  update(frogs: Map<string, FrogData>, grid: GridCell[][]): void {
    this.connections = [];
    const seen = new Set<string>();

    frogs.forEach(frog => {
      const state = frog.upgradeState;
      if (state.level < 2 || state.path === UpgradePath.NONE) return;

      const frogCell = grid[frog.gridPosition.row]?.[frog.gridPosition.col];
      if (!frogCell) return;

      frogs.forEach(other => {
        if (other.id === frog.id) return;
        if (other.upgradeState.path !== state.path) return;
        if (other.upgradeState.level < 2) return;

        const pairKey = frog.id < other.id ? `${frog.id}:${other.id}` : `${other.id}:${frog.id}`;
        if (seen.has(pairKey)) return;

        if (!this.isInSynergyZone(frog, other)) return;

        seen.add(pairKey);
        const otherCell = grid[other.gridPosition.row]?.[other.gridPosition.col];
        if (!otherCell) return;

        this.connections.push({
          x1: frogCell.position.x,
          y1: frogCell.position.y,
          x2: otherCell.position.x,
          y2: otherCell.position.y,
          path: state.path,
        });
      });
    });
  }

  private isInSynergyZone(frog: FrogData, other: FrogData): boolean {
    const state = frog.upgradeState;

    if (state.path === UpgradePath.CIRCLES) {
      const offsets = state.level >= 3
        ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]
        : [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of offsets) {
        if (other.gridPosition.row === frog.gridPosition.row + dr &&
          other.gridPosition.col === frog.gridPosition.col + dc) {
          return true;
        }
      }
      return false;
    }

    if (state.path === UpgradePath.HORIZONTAL_STRIPES) {
      return other.gridPosition.row === frog.gridPosition.row;
    }

    if (state.path === UpgradePath.VERTICAL_STRIPES) {
      return other.gridPosition.col === frog.gridPosition.col;
    }

    return false;
  }

  getConnections(): SynergyConnection[] {
    return this.connections;
  }
}
