# 🐸 OddFrogs - Tower Defense Game

A unique browser-based tower defense game where you place frogs on lily pads to defend against waves of hungry food items!

## 🎮 Game Concept

OddFrogs is a vertical tower defense game set on a river filled with lily pads. Players place different types of frogs (towers) on lily pads to attack food items (enemies) floating along stream paths. Each frog has unique abilities, and strategic placement is key to success!

## 🛠️ Tech Stack

- **TypeScript** - Type-safe game logic
- **React** - UI components and menus
- **Tailwind CSS** - Styling
- **HTML Canvas API** - Game rendering
- **Vite** - Build tool and dev server

## 📁 Project Structure

```
oddfrogs/
├── src/
│   ├── game/              # Core game logic
│   │   ├── entities/      # Game entities (future use)
│   │   ├── systems/       # Game systems (Renderer, FrogSystem, etc.)
│   │   ├── utils/         # Utility functions (future use)
│   │   └── GameEngine.ts  # Main game engine
│   ├── components/        # React components
│   │   ├── game/         # Game-related components
│   │   └── ui/           # UI components
│   ├── types/            # TypeScript type definitions
│   ├── data/             # Game data and constants
│   ├── styles/           # CSS styles
│   └── assets/           # Game assets (future use)
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🎯 Game Features

### Grid System
- 4x5 vertical grid
- Lily pads (placement locations)
- Rocks (block frog tongues)
- Lilies (removable obstacles)

### Frogs (Towers)
Five unique frog types with different attributes:
- **Red Frog**: Balanced damage and speed
- **Blue Frog**: Fast attacks, longer range
- **Green Frog**: High damage, slow attacks
- **Yellow Frog**: Excellent range
- **Purple Frog**: Maximum damage, slowest

### Food (Enemies)
Different food types with varying health and speed:
- Cake
- Apple
- Beans
- Burger
- Pizza

### Stream Paths
- Flow left, right, and down (never up)
- 90-degree curves
- Multiple streams can share channels
- Food follows paths automatically

### Game Mechanics
- **Lives**: Start with 3 lives
- **Money**: Earn by destroying food
- **Upgrades**: Improve frog stats
- **Waves**: Progressive difficulty
- **Line of Sight**: Rocks block frog tongues

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 Development

### Key Systems

#### GameEngine
The main game loop controller that manages:
- Game state
- Entity updates
- Rendering pipeline
- Input handling

#### Renderer
Handles all canvas drawing:
- Background and water effects
- Grid cells (lily pads, rocks, lilies)
- Frogs with visual indicators
- Food with health bars
- UI overlays

#### FrogSystem
Manages frog behavior:
- Target acquisition
- Attack timing
- Line of sight checks
- Upgrades

#### FoodSystem
Handles food movement:
- Path following
- Position interpolation
- Speed variations

## 🎯 Future Enhancements

- [ ] Sound effects and music
- [ ] Particle effects for attacks
- [ ] More frog types and abilities
- [ ] Special abilities and power-ups
- [ ] Multiple levels with unique maps
- [ ] Boss waves
- [ ] Achievement system
- [ ] Save/load game state
- [ ] Mobile touch controls
- [ ] Sprite-based graphics

## 📝 Notes

This is a foundational structure. The game is playable but can be expanded with:
- Better graphics (sprites instead of shapes)
- Wave spawning system
- Level progression
- Sound and visual effects
- More frog and food varieties
- Special abilities

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.
