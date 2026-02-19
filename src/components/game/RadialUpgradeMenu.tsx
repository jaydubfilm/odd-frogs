import { FrogData } from '../../types/game';
import { UpgradeNode } from '../../types/upgrades';
import { CoinIcon } from '../ui/CoinIcon';

interface RadialUpgradeMenuProps {
  frog: FrogData;
  position: { x: number; y: number };
  availableUpgrades: UpgradeNode[];
  playerMoney: number;
  onPurchase: (nodeId: string) => void;
  onSell: () => void;
  onClose: () => void;
}

export function RadialUpgradeMenu({
  frog,
  position,
  availableUpgrades,
  playerMoney,
  onPurchase,
  onSell,
  onClose,
}: RadialUpgradeMenuProps) {
  const spacing = 200; // Horizontal spacing between upgrade buttons

  // Calculate sell value: half of (original cost + total upgrades)
  const sellValue = Math.floor((frog.stats.cost + frog.upgradeState.totalSpent) / 2);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Frog info - positioned above frog */}
      <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto" style={{ bottom: '40px' }}>
        <div className="bg-white rounded-lg shadow-lg p-4 text-center min-w-[160px] relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-8 h-8
                       flex items-center justify-center text-base font-bold hover:bg-red-600"
          >
            ✕
          </button>

          <div className="text-sm font-bold text-gray-600">Level {frog.level}</div>
          <div className="text-xl font-bold text-purple-600">{frog.type}</div>
          <div className="text-sm text-gray-500 mt-1">
            <div>DMG: {frog.stats.damage.toFixed(1)}</div>
            <div>SPD: {frog.stats.attackSpeed.toFixed(1)}</div>
            <div>RNG: {frog.stats.range.toFixed(1)}</div>
          </div>

          {/* Sell button */}
          <button
            onClick={onSell}
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white
                       font-bold py-2 px-4 rounded text-sm transition-colors"
          >
            Sell for <CoinIcon size={14} />{sellValue}
          </button>
        </div>
      </div>

      {/* Upgrade options - positioned above info panel */}
      {availableUpgrades.map((node, index) => {
        const totalUpgrades = availableUpgrades.length;
        const x = (index - (totalUpgrades - 1) / 2) * spacing;
        const y = -220; // Above the info panel

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
                bg-white rounded-lg shadow-xl p-4 border-3 transition-all
                hover:scale-110 min-w-[180px]
                ${canAfford
                  ? 'border-green-400 hover:border-green-600 cursor-pointer'
                  : 'border-gray-300 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className="text-base font-bold text-gray-700 truncate">
                {node.name}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Lvl {node.currentLevel}/{node.maxLevel}
              </div>
              <div className={`text-lg font-bold mt-1 flex items-center justify-center gap-0.5 ${canAfford ? 'text-green-600' : 'text-gray-400'}`}>
                <CoinIcon size={16} />{cost}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}