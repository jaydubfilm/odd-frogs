# OddFrogs Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         React App                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ FrogSelector│  │  GameCanvas  │  │  GameStats   │      │
│  └──────┬──────┘  └──────┬───────┘  └──────▲───────┘      │
│         │                │                  │               │
│         │  selectedFrog  │                  │ gameState     │
│         └───────────────►│◄─────────────────┘               │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          │ Canvas Reference
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     GameEngine                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Game Loop (requestAnimationFrame)                     │ │
│  │    - Update (deltaTime)                                │ │
│  │    - Render                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Game State  │  │     Grid     │  │    Level     │     │
│  │  - lives     │  │  GridCell[][]│  │  LevelData   │     │
│  │  - money     │  │              │  │              │     │
│  │  - wave      │  │              │  │              │     │
│  │  - score     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │    Frogs     │  │    Foods     │                        │
│  │  Map<id, F>  │  │  Map<id, F>  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Uses Systems
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Game Systems                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Renderer   │  │  FrogSystem  │  │  FoodSystem  │     │
│  │  - render    │  │  - update    │  │  - update    │     │
│  │    grid      │  │  - attack    │  │  - move      │     │
│  │  - render    │  │  - find      │  │  - spawn     │     │
│  │    frogs     │  │    targets   │  │              │     │
│  │  - render    │  │              │  │              │     │
│  │    foods     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  WaveSystem  │  │ CollisionSys │                        │
│  │  - spawn     │  │  - check     │                        │
│  │  - manage    │  │              │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Initialization
```
User loads page
    ↓
App.tsx renders
    ↓
GameCanvas mounts
    ↓
GameEngine created with canvas ref
    ↓
Level loaded → Grid initialized
    ↓
Game loop starts (requestAnimationFrame)
```

### 2. Game Loop (Every Frame)
```
requestAnimationFrame callback
    ↓
Calculate deltaTime
    ↓
Update Phase:
    ├─ WaveSystem.update()
    │   └─ Spawn new foods on streams
    ├─ FoodSystem.updateFoods()
    │   └─ Move foods along paths
    ├─ FrogSystem.updateFrogs()
    │   ├─ Find targets in range
    │   └─ Attack if cooldown ready
    ├─ Check destroyed foods
    │   └─ Award money & score
    └─ Check foods reached end
        └─ Decrease lives
    ↓
Render Phase:
    ├─ Clear canvas
    ├─ Render background
    ├─ Render streams
    ├─ Render grid (lily pads, rocks)
    ├─ Render frogs
    ├─ Render foods (with health bars)
    └─ Render UI overlay
    ↓
Request next frame
```

### 3. Player Interaction
```
Player selects frog type
    ↓
App updates selectedFrogType
    ↓
Player clicks canvas
    ↓
GameEngine.handleCanvasClick()
    ├─ Convert pixel → grid position
    ├─ Check if placement valid
    ├─ Check player money
    ├─ Deduct cost
    └─ Create frog & add to grid
    ↓
Frog added to frogs Map
    ↓
Next frame: Frog starts attacking
```

### 4. Wave Management
```
Game starts
    ↓
Wave 0 (ready state)
    ↓
WaveSystem checks if should start Wave 1
    ↓
Build spawn queue from wave data
    ↓
Update loop checks spawn times
    ↓
Spawn food on stream at scheduled time
    ↓
Food moves along path
    ↓
All foods spawned & destroyed/escaped
    ↓
Wave complete → Start next wave
```

## Component Relationships

### GameEngine Dependencies
- **Renderer**: Draws everything to canvas
- **FrogSystem**: Manages frog behavior & attacks
- **FoodSystem**: Manages food movement
- **WaveSystem**: Manages wave progression
- **CollisionSystem**: Helper for collision checks

### Data Structures

**GridCell**
```typescript
{
  type: CellType,           // LILYPAD, ROCK, etc.
  gridPosition: {row, col},
  position: {x, y},         // Pixel position
  frog: FrogData | null     // Placed frog
}
```

**FrogData**
```typescript
{
  id: string,
  type: FrogType,
  gridPosition: {row, col},
  level: number,
  stats: {damage, attackSpeed, range, cost},
  lastAttackTime: number,
  targetFood: string | null
}
```

**FoodData**
```typescript
{
  id: string,
  type: FoodType,
  position: {x, y},        // Current pixel position
  pathIndex: number,        // Current segment
  pathProgress: number,     // 0-1 along segment
  stats: {health, speed, reward},
  currentHealth: number
}
```

**StreamPath**
```typescript
{
  id: string,
  segments: PathSegment[], // Array of line segments
  offset: number           // For multiple streams
}
```

## Key Algorithms

### 1. Food Movement
```
For each food:
  1. Get current stream segment
  2. Calculate distance to move (speed × deltaTime)
  3. Convert to progress increment (distance / segmentLength)
  4. Add to pathProgress
  5. If pathProgress >= 1:
     - Move to next segment
     - Reset pathProgress to 0
  6. Interpolate position along segment
```

### 2. Frog Targeting
```
For each frog:
  1. Get frog pixel position
  2. For each food:
     - Calculate distance
     - Check if within range
     - Check line of sight (no rocks blocking)
     - Track closest food
  3. If target found and cooldown ready:
     - Deal damage to food
     - Reset attack timer
```

### 3. Line of Sight Check
```
Given: Frog position, Food position
  1. Create ray from frog to food
  2. Sample 20 points along ray
  3. For each point:
     - Convert to grid position
     - Check if cell is ROCK
     - If rock found: blocked
  4. Return blocked/clear
```

### 4. Wave Spawning
```
When wave starts:
  1. Build spawn queue from wave data
  2. Sort by spawn time
  
Each frame:
  1. Check if current time >= next spawn time
  2. If yes:
     - Spawn food on specified stream
     - Remove from queue
```

## Performance Considerations

### Optimizations Implemented
- **Map data structures** for O(1) entity lookup
- **Delta time** for frame-rate independent movement
- **Early exits** in update loops
- **Minimal canvas clears** (full clear each frame is fine for this game size)

### Potential Optimizations
- **Spatial partitioning** for large numbers of entities
- **Object pooling** for food/projectile creation
- **Dirty rectangles** for partial canvas updates
- **Layered canvases** for static/dynamic elements
- **Web Workers** for heavy computations

## Extension Points

### Adding New Features

**New Frog Types:**
1. Add to FrogType enum
2. Add stats to FROG_STATS
3. Update renderer if special visuals needed

**New Food Types:**
1. Add to FoodType enum
2. Add stats to FOOD_BASE_STATS
3. Update renderer

**New Levels:**
1. Create LevelData object
2. Define grid layout
3. Define stream paths
4. Define wave composition
5. Add to LEVELS array

**Special Abilities:**
1. Add ability field to FrogData
2. Create AbilitySystem
3. Handle activation in update loop
4. Add UI for activation

**Upgrades:**
1. Add upgrade UI component
2. Implement upgrade logic in FrogSystem
3. Update frog stats
4. Persist upgrade state

---

This architecture provides a solid foundation for expansion while maintaining clean separation of concerns between rendering, game logic, and UI.
