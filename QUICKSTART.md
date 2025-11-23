# 🐸 OddFrogs - Quick Start Guide

## What You Have

A complete, foundational browser-based tower defense game built with:
- **TypeScript** for type-safe game logic
- **React** for UI components
- **Tailwind CSS** for styling
- **HTML Canvas API** for rendering
- **Vite** for fast development

## Game Overview

**OddFrogs** is a vertical tower defense game where players place frogs on lily pads to defend against waves of food floating down streams. Each frog type has unique stats, and strategic placement is key!

## Getting Started

1. **Navigate to the project folder:**
   ```bash
   cd oddfrogs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser to:**
   ```
   http://localhost:3000
   ```

## How to Play

1. **Select a Frog**: Click on a frog type in the left panel
2. **Place Frog**: Click on any lily pad to place your selected frog
3. **Defend**: Frogs automatically attack food within range
4. **Earn Money**: Destroying food earns money for more frogs
5. **Survive**: Don't let food reach the bottom or you lose lives!

## Project Structure

```
oddfrogs/
├── src/
│   ├── game/              # Core game engine and systems
│   │   ├── systems/       # Renderer, FrogSystem, FoodSystem, WaveSystem
│   │   └── GameEngine.ts  # Main game loop controller
│   ├── components/        # React UI components
│   │   ├── game/         # GameCanvas
│   │   └── ui/           # FrogSelector, GameStats
│   ├── types/            # TypeScript type definitions
│   ├── data/             # Game constants and level data
│   └── styles/           # Tailwind CSS
├── index.html
├── vite.config.ts
├── package.json
└── README.md
```

## What's Implemented

✅ **Core Gameplay**
- Game loop with Canvas rendering
- 4x5 grid system with lily pads, rocks, and lilies
- 5 unique frog types with different stats
- 5 food types with varying health/speed
- Stream paths with automatic food movement
- Wave system with progressive spawning
- Attack mechanics with line-of-sight
- Health bars for damaged food
- Lives, money, and scoring systems

✅ **UI Components**
- Frog selector panel
- Game stats display
- Visual feedback for game state
- Responsive layout

## What's Next

Check **DEVELOPMENT.md** for:
- Detailed implementation roadmap
- Asset creation guides
- Code organization tips
- Performance optimization
- Testing checklist
- Balancing suggestions

## Key Game Mechanics

### Frog Types
- **Red**: Balanced damage & speed ($100)
- **Blue**: Fast attacks, long range ($120)
- **Green**: High damage, slow ($150)
- **Yellow**: Excellent range ($180)
- **Purple**: Maximum damage ($200)

### Grid Elements
- **Lily Pads**: Where frogs can be placed
- **Rocks**: Block frog tongues (line of sight)
- **Lilies**: Removable obstacles (costs money)

### Streams
- Flow left, right, down (never up)
- 90-degree curves
- Multiple streams can share channels

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Need Help?

- **README.md**: Full project documentation
- **DEVELOPMENT.md**: Developer guide and roadmap
- **src/types/game.ts**: All type definitions
- **src/data/constants.ts**: Game balance values

## Have Fun Building! 🎮

This is a complete foundation - now you can:
- Add more levels and waves
- Create sprite-based graphics
- Implement sound effects
- Add upgrade UI
- Create special abilities
- Build mobile controls
- Add achievements
- And much more!

---

Built with ❤️ using React, TypeScript, and Canvas API
