import { FrogData } from '../../types/game';
import { UpgradeNode } from '../../types/upgrades';

interface RadialUpgradeMenuProps {
  frog: FrogData;
  position: { x: number; y: number };
  availableUpgrades: UpgradeNode[];
  playerMoney: number;
  onPurchase: (nodeId: string) => void;
  onClose: () => void;
}

export function RadialUpgradeMenu({
  frog,
  position,
  availableUpgrades,
  playerMoney,
  onPurchase,
  onClose,
}: RadialUpgradeMenuProps) {
  const spacing = 110; // Horizontal spacing between upgrade buttons

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Frog info - positioned below */}
      <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto" style={{ top: '60px' }}>
        <div className="bg-white rounded-lg shadow-lg p-3 text-center min-w-[120px] relative">
          {/* Close button - top right of info panel */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 
                       flex items-center justify-center text-xs font-bold hover:bg-red-600"
          >
            ✕
          </button>

          <div className="text-xs font-bold text-gray-600">Level {frog.level}</div>
          <div className="text-lg font-bold text-purple-600">{frog.type}</div>
          <div className="text-xs text-gray-500 mt-1">
            <div>DMG: {frog.stats.damage.toFixed(1)}</div>
            <div>SPD: {frog.stats.attackSpeed.toFixed(1)}</div>
            <div>RNG: {frog.stats.range.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Upgrade options - positioned above */}
      {availableUpgrades.map((node, index) => {
        const totalUpgrades = availableUpgrades.length;
        // Center the upgrades horizontally
        const x = (index - (totalUpgrades - 1) / 2) * spacing;
        const y = -80; // Fixed position above the frog

        const cost = node.costPerLevel[node.currentLevel];
        const canAfford = playerMoney >= cost;

        return (
          <div
            key={node.id}
            className="absolute pointer-events-auto"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <button
              onClick={() => canAfford && onPurchase(node.id)}
              disabled={!canAfford}
              className={`
                bg-white rounded-lg shadow-xl p-2 border-2 transition-all
                hover:scale-110 min-w-[100px]
                ${canAfford
                  ? 'border-green-400 hover:border-green-600 cursor-pointer'
                  : 'border-gray-300 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className="text-xs font-bold text-gray-700 truncate">
                {node.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Lvl {node.currentLevel}/{node.maxLevel}
              </div>
              <div className={`text-sm font-bold mt-1 ${canAfford ? 'text-green-600' : 'text-gray-400'}`}>
                ${cost}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}