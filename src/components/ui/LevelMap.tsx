import { LevelProgress } from '../../types/game';

interface LevelMapProps {
  progress: LevelProgress[];
  onSelectLevel: (levelNumber: number) => void;
}

export function LevelMap({ progress, onSelectLevel }: LevelMapProps) {
  // River path: snake pattern across the screen
  const getNodePosition = (index: number): { x: number; y: number } => {
    const nodesPerRow = 5;
    const row = Math.floor(index / nodesPerRow);
    const col = index % nodesPerRow;

    // Snake pattern: reverse direction on odd rows
    const actualCol = row % 2 === 0 ? col : nodesPerRow - 1 - col;

    const spacing = 150;
    const startX = 100;
    const startY = 100;

    return {
      x: startX + actualCol * spacing,
      y: startY + row * spacing,
    };
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500 overflow-auto">
      {/* Title */}
      <div className="text-center py-8">
        <h1 className="text-6xl font-bold text-white drop-shadow-lg">
          ?? OddFrogs - Level Select ??
        </h1>
      </div>

      {/* River Path SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '1000px' }}>
        <defs>
          <linearGradient id="riverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Draw river path connecting nodes */}
        {progress.slice(0, -1).map((level, index) => {
          const start = getNodePosition(index);
          const end = getNodePosition(index + 1);

          return (
            <line
              key={`path-${index}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="url(#riverGradient)"
              strokeWidth="40"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Level Nodes */}
      {progress.map((level, index) => {
        const pos = getNodePosition(index);

        return (
          <div
            key={level.levelNumber}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{
              left: pos.x,
              top: pos.y,
            }}
          >
            <button
              onClick={() => level.unlocked && onSelectLevel(level.levelNumber)}
              disabled={!level.unlocked}
              className={`
                relative w-20 h-20 rounded-full border-4 font-bold text-2xl
                transition-all duration-200 shadow-xl
                ${level.unlocked
                  ? 'bg-white border-yellow-400 hover:scale-110 cursor-pointer hover:shadow-2xl'
                  : 'bg-gray-400 border-gray-500 cursor-not-allowed opacity-50'
                }
                ${level.completed ? 'bg-green-400 border-green-600' : ''}
              `}
            >
              {level.levelNumber}

              {/* Completion Stars */}
              {level.completed && level.stars > 0 && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {Array.from({ length: level.stars }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">?</span>
                  ))}
                </div>
              )}

              {/* Lock Icon */}
              {!level.unlocked && (
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl">
                  ??
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}