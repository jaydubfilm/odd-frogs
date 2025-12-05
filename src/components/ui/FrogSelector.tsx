import { FrogType } from '../../types/game';
import { FROG_STATS } from '@data/constants';
import { FrogPreview } from './FrogPreview';  // ← ADD THIS IMPORT

interface FrogSelectorProps {
  selectedFrog: FrogType | null;
  onSelectFrog: (frogType: FrogType) => void;
  playerMoney: number;
}

export const FrogSelector = ({
  selectedFrog,
  onSelectFrog,
  playerMoney,
}: FrogSelectorProps) => {
  const frogTypes = Object.values(FrogType);

  return (
    <div className="bg-white/90 rounded-lg p-2 shadow-lg">
      <div className="flex gap-2 justify-center">
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
                flex flex-col items-center gap-1 p-2 rounded-lg
                ${isSelected ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'bg-white'}
                ${canAfford ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                border-2 border-gray-300
              `}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <FrogPreview frogType={frogType} size={48} />
                </div>
                <div className="font-bold text-sm text-green-600">${stats.cost}</div>
              </button>
            );
          })}
      </div>
    </div>
  );
};