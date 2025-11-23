import React, { useEffect, useRef } from 'react';
import { LevelProgress } from '../../types/game';

interface LevelMapProps {
  progress: LevelProgress[];
  onSelectLevel: (levelNumber: number) => void;
}

export function LevelMap({ progress, onSelectLevel }: LevelMapProps) {
  // --- CONFIGURATION ---
  // We use a fixed logical width for calculations. 
  // The CSS will scale this to fit the phone screen automatically.
  const GRID_WIDTH = 500;
  const LEVEL_SPACING = 140;

  // Reduced amplitude to ensure it never touches the screen edge
  // Center is 250. Swing is 100. Range: 150px to 350px. 
  // Safe zone of 150px on each side.
  const AMPLITUDE = 100;
  const FREQUENCY = 0.5;

  const BOTTOM_PADDING = 200;
  const TOP_PADDING = 200;

  const MAP_HEIGHT = (progress.length * LEVEL_SPACING) + BOTTOM_PADDING + TOP_PADDING;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- MATH HELPERS ---

  const getNodePosition = (index: number) => {
    // Y: Starts at bottom, moves up
    const y = MAP_HEIGHT - BOTTOM_PADDING - (index * LEVEL_SPACING);
    // X: Sine wave based on fixed GRID_WIDTH
    const x = (GRID_WIDTH / 2) + (AMPLITUDE * Math.sin(index * FREQUENCY));
    return { x, y };
  };

  const generateRiverPath = () => {
    let path = "";
    const steps = 150; // Higher resolution for smoother curves

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Start/End points extended well beyond the visible nodes
      const startY = MAP_HEIGHT;
      const endY = 0;

      const currentY = startY - ((startY - endY) * t);

      // Reverse engineer the index from Y to get the X curve
      // (This matches the node math perfectly)
      const logicalIndex = (MAP_HEIGHT - BOTTOM_PADDING - currentY) / LEVEL_SPACING;
      const currentX = (GRID_WIDTH / 2) + (AMPLITUDE * Math.sin(logicalIndex * FREQUENCY));

      const command = i === 0 ? "M" : "L";
      path += `${command} ${currentX} ${currentY} `;
    }
    return path;
  };

  // Auto-scroll to unlocked level
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentLevelIndex = progress.findLastIndex(p => p.unlocked) || 0;
      const pos = getNodePosition(currentLevelIndex);

      // Center the camera on the node
      const scrollY = pos.y - (window.innerHeight / 2);

      scrollContainerRef.current.scrollTo({
        top: scrollY,
        behavior: 'instant' // Instant on load, smooth for users
      });
    }
  }, [progress]);

  return (
    // OUTER WRAPPER: Full screen background
    <div className="w-full h-screen bg-gradient-to-b from-teal-200 to-blue-400 overflow-hidden">

      {/* SCROLL CONTAINER: Handles the vertical scrolling */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth relative"
      >

        {/* GAME CONTENT CONTAINER: Centered and Width-Constrained 
            This ensures the math (based on 500px) always looks correct,
            scaling down for phones or centering on desktop.
        */}
        <div
          className="relative mx-auto"
          style={{
            height: `${MAP_HEIGHT}px`,
            width: '100%',
            maxWidth: '500px' // Matches GRID_WIDTH mostly, but allows flex
          }}
        >

          {/* 1. TITLE (Floating in the game world) */}
          <div className="absolute top-20 left-0 w-full text-center z-20 pointer-events-none">
            <h1 className="text-4xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] tracking-wider">
              FROG SAGA
            </h1>
          </div>

          {/* 2. THE RIVER LAYER (SVG) */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${GRID_WIDTH} ${MAP_HEIGHT}`}
              // 'slice' ensures the river is never squashed.
              // It will crop the sides if the screen is narrower than the design, 
              // BUT our safe zones (amplitude) prevent content loss.
              preserveAspectRatio="xMidYMid slice"
              className="drop-shadow-xl"
            >
              <defs>
                <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>

              {/* The River Water */}
              <path
                d={generateRiverPath()}
                stroke="url(#riverGradient)"
                strokeWidth="110"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Water Highlights */}
              <path
                d={generateRiverPath()}
                stroke="#93c5fd"
                strokeWidth="15"
                fill="none"
                opacity="0.3"
                transform="translate(-20, 0)"
              />
              <path
                d={generateRiverPath()}
                stroke="#1e3a8a"
                strokeWidth="5"
                fill="none"
                opacity="0.1"
                transform="translate(30, 0)"
              />
            </svg>
          </div>

          {/* 3. THE NODE LAYER */}
          {progress.map((level, index) => {
            const pos = getNodePosition(index);

            // Map the GRID_WIDTH coordinate to a percentage for CSS
            const leftPercent = (pos.x / GRID_WIDTH) * 100;

            return (
              <div
                key={level.levelNumber}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: `${leftPercent}%`,
                  top: `${pos.y}px`,
                }}
              >
                <button
                  onClick={() => level.unlocked && onSelectLevel(level.levelNumber)}
                  disabled={!level.unlocked}
                  className={`
                    relative w-20 h-20 rounded-full border-[6px] 
                    flex items-center justify-center
                    transition-all duration-200 active:scale-95
                    ${level.unlocked
                      ? 'bg-yellow-100 border-yellow-400 cursor-pointer shadow-[0_4px_0_#b45309] hover:-translate-y-1'
                      : 'bg-slate-300 border-slate-400 cursor-not-allowed text-slate-500 shadow-none'
                    }
                    ${level.completed ? 'bg-green-100 border-green-500 shadow-[0_4px_0_#15803d]' : ''}
                  `}
                >
                  {level.unlocked ? (
                    <span className={`text-2xl font-black ${level.completed ? 'text-green-700' : 'text-yellow-700'}`}>
                      {level.levelNumber}
                    </span>
                  ) : (
                    <span className="text-2xl">🔒</span>
                  )}

                  {/* Stars */}
                  {level.completed && (
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {[1, 2, 3].map(star => (
                        <svg key={star} className={`w-5 h-5 ${star <= level.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 fill-gray-400'}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            );
          })}

          {/* Start Marker */}
          <div
            className="absolute w-full text-center pointer-events-none"
            style={{ top: `${MAP_HEIGHT - 80}px` }}
          >
            <div className="inline-block px-4 py-1 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg animate-bounce">
              START
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}