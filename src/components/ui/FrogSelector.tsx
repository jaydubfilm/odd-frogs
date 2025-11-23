import { FrogType } from '../../types/game';
import { FROG_STATS } from '@data/constants';

interface FrogSelectorProps {
  selectedFrog: FrogType | null;
  onSelectFrog: (frogType: FrogType) => void;
  playerMoney: number;
}

export const FrogSelector: React.FC<FrogSelectorProps> = ({
  selectedFrog,
  onSelectFrog,
  playerMoney,
}) => {
  const frogTypes = Object.values(FrogType);
  
  return (
    <div className="bg-white/90 rounded-lg p-4 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Frog</h2>
      <div className="space-y-2">
        {frogTypes.map(frogType => {
          const stats = FROG_STATS[frogType];
          const canAfford = playerMoney >= stats.cost;
          const isSelected = selectedFrog === frogType;
          
          return (
            <button
              key={frogType}
              onClick={() => onSelectFrog(frogType)}
              disabled={!canAfford}
              className={`
                frog-button w-full p-3 rounded-lg flex items-center justify-between
                ${isSelected ? 'selected ring-4 ring-yellow-400' : ''}
                ${canAfford ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                bg-white border-2 border-gray-300
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full border-2 border-gray-400"
                  style={{ backgroundColor: stats.color }}
                />
                <div className="text-left">
                  <div className="font-bold text-gray-800">{frogType}</div>
                  <div className="text-xs text-gray-600">
                    DMG: {stats.damage} | SPD: {stats.attackSpeed}/s | RNG: {stats.range}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-green-600">${stats.cost}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
