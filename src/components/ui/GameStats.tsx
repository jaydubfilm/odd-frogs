import { GameState } from '../../types/game';
import { CoinIcon } from './CoinIcon';

interface GameStatsProps {
  gameState: GameState;
  waveInfo: {
    current: number;
    total: number;
    timeUntilNext: number;
  };
  compact?: boolean;
}

export const GameStats = ({ gameState, waveInfo, compact = false }: GameStatsProps) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    const maxLives = 20;
    return (
      <div className="bg-white/90 rounded-lg p-1.5 shadow-lg">
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="grid grid-cols-10 gap-px leading-none">
            {Array.from({ length: maxLives }).map((_, i) => (
              <span key={i} className={`text-[10px] ${i < gameState.lives ? 'opacity-100' : 'opacity-20'}`}>
                ❤️
              </span>
            ))}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <CoinIcon size={16} />
            <span className="text-lg font-bold text-green-600">{gameState.money}</span>
          </div>
          <div className="flex-shrink-0">
            <span className="text-gray-700 font-semibold">W:</span>
            <span className="font-bold text-blue-600">{waveInfo.current}/{waveInfo.total}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-lg p-4 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Stats</h2>
      <div className="space-y-3">
        <div>
          <span className="text-gray-700 font-semibold">Lives:</span>
          <div className="grid grid-cols-10 gap-1 mt-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className={`text-sm text-center ${i < gameState.lives ? 'opacity-100' : 'opacity-20'}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Money:</span>
          <span className="text-2xl font-bold text-green-600 flex items-center gap-1">
            <CoinIcon size={22} />{gameState.money}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Wave:</span>
          <span className="text-xl font-bold text-blue-600">
            {waveInfo.current}/{waveInfo.total}
          </span>
        </div>

        {waveInfo.timeUntilNext > 0 && waveInfo.current < waveInfo.total && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-semibold">Next wave in:</span>
            <span className="text-lg font-bold text-orange-600">
              {formatTime(waveInfo.timeUntilNext)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Score:</span>
          <span className="text-xl font-bold text-purple-600">
            {gameState.score}
          </span>
        </div>

        {gameState.isPaused && !gameState.isGameOver && !gameState.isVictory && (
          <div className="mt-4 p-2 bg-yellow-100 border-2 border-yellow-400 rounded text-center">
            <span className="text-yellow-800 font-bold">PAUSED</span>
          </div>
        )}

        {gameState.isGameOver && (
          <div className="mt-4 p-2 bg-red-100 border-2 border-red-400 rounded text-center">
            <span className="text-red-800 font-bold">GAME OVER</span>
          </div>
        )}

        {gameState.isVictory && (
          <div className="mt-4 p-2 bg-green-100 border-2 border-green-400 rounded text-center">
            <span className="text-green-800 font-bold">VICTORY!</span>
          </div>
        )}
      </div>
    </div>
  );
};