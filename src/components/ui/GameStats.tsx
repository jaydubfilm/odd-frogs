import { GameState } from '../../types/game';

interface GameStatsProps {
  gameState: GameState;
}

export const GameStats: React.FC<GameStatsProps> = ({ gameState }) => {
  return (
    <div className="bg-white/90 rounded-lg p-4 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Stats</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Lives:</span>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full ${
                  i < gameState.lives ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                {i < gameState.lives && (
                  <span className="flex items-center justify-center text-white text-lg">
                    ❤️
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Money:</span>
          <span className="text-2xl font-bold text-green-600">
            ${gameState.money}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Wave:</span>
          <span className="text-xl font-bold text-blue-600">
            {gameState.wave}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Score:</span>
          <span className="text-xl font-bold text-purple-600">
            {gameState.score}
          </span>
        </div>
        
        {gameState.isPaused && (
          <div className="mt-4 p-2 bg-yellow-100 border-2 border-yellow-400 rounded text-center">
            <span className="text-yellow-800 font-bold">PAUSED</span>
          </div>
        )}
        
        {gameState.isGameOver && (
          <div className="mt-4 p-2 bg-red-100 border-2 border-red-400 rounded text-center">
            <span className="text-red-800 font-bold">GAME OVER</span>
          </div>
        )}
      </div>
    </div>
  );
};
