# OddFrogs Development Guide

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   The game will be available at `http://localhost:3000`

3. **Build for Production**
   ```bash
   npm run build
   ```

## 📋 Current Implementation Status

### ✅ Completed
- [x] Project structure and configuration
- [x] TypeScript type definitions
- [x] Game engine with game loop
- [x] Grid system (lily pads, rocks, lilies)
- [x] Frog system (5 types with different stats)
- [x] Food system (movement along paths)
- [x] Stream rendering
- [x] Wave system (spawning enemies)
- [x] Basic rendering (Canvas API)
- [x] React UI components
- [x] Frog placement
- [x] Attack mechanics
- [x] Health bars
- [x] Money and scoring
- [x] Lives system
- [x] Game over detection

### 🔨 To Implement

#### High Priority
- [ ] **Start Wave Button**: Add UI button to manually start waves
- [ ] **Better Visual Feedback**: 
  - Frog tongue animations when attacking
  - Food destruction effects
  - Range indicators when selecting frogs
- [ ] **Upgrade System**: 
  - UI for selecting and upgrading placed frogs
  - Visual indication of upgraded frogs
- [ ] **Sound Effects**:
  - Frog attack sounds
  - Food destruction
  - Wave start/complete
  - Game over
- [ ] **Pause/Resume**: Functional pause button

#### Medium Priority
- [ ] **Multiple Levels**: Level selection screen
- [ ] **Save/Load**: Persist progress in localStorage
- [ ] **Better Graphics**: Replace geometric shapes with sprites
- [ ] **Particle Effects**: 
  - Water ripples
  - Attack impacts
  - Food destruction
- [ ] **Mobile Controls**: Touch-friendly UI
- [ ] **Tutorial**: First-time player guide
- [ ] **Difficulty Settings**: Easy/Normal/Hard modes

#### Low Priority
- [ ] **Achievement System**: Track milestones
- [ ] **Leaderboard**: High scores
- [ ] **Special Abilities**: Active frog powers
- [ ] **Boss Waves**: Special enemy types
- [ ] **Background Music**: Themed soundtrack

## 🎨 Asset Creation Guide

### Frog Sprites
Create 5 frog sprites (one for each color):
- Size: 64x64 pixels
- Colors: Red (#E74C3C), Blue (#3498DB), Green (#2ECC71), Yellow (#F39C12), Purple (#9B59B6)
- Include tongue animation frames (3-5 frames)

### Food Sprites
Create sprites for each food type:
- Size: 48x48 pixels
- Types: Cake, Apple, Beans, Burger, Pizza
- Include damaged states (3 levels)

### Environment
- Lily pad texture (circular, green)
- Rock texture (irregular gray)
- Lily flower (pink/white petals)
- Water background (flowing animation)
- Stream path texture (flowing water effect)

## 🔧 Code Organization

### Adding New Frog Types
1. Add enum to `src/types/game.ts`:
   ```typescript
   export enum FrogType {
     // ... existing
     ORANGE = 'ORANGE',
   }
   ```

2. Add stats to `src/data/constants.ts`:
   ```typescript
   [FrogType.ORANGE]: {
     damage: 12,
     attackSpeed: 1.8,
     range: 2,
     cost: 160,
     upgradeCost: 220,
     color: '#FF8C00',
   }
   ```

### Adding New Food Types
1. Add enum to `src/types/game.ts`
2. Add stats to `src/data/constants.ts`
3. Update rendering in `Renderer.ts`

### Creating New Levels
1. Create level data in `src/data/levels.ts`:
   ```typescript
   export const LEVEL_2: LevelData = {
     id: 'level-2',
     name: 'Rushing Rapids',
     startingMoney: 150,
     gridLayout: [...],
     streams: [...],
     waves: [...],
   };
   ```

2. Add to LEVELS array
3. Update level selector UI

## 🐛 Known Issues & Fixes

### Issue: Frogs not attacking
**Fix**: Check that:
- Frog is within range of food
- Line of sight is not blocked by rocks
- Attack speed cooldown has elapsed

### Issue: Food not moving
**Fix**: Ensure:
- Stream paths are properly defined
- Food is assigned to correct stream
- pathProgress is being updated

### Issue: Canvas not rendering
**Fix**: Verify:
- Canvas ref is properly set
- Game engine is initialized
- Game loop is running

## 🎯 Performance Optimization Tips

1. **Object Pooling**: Reuse food/frog objects instead of creating new ones
2. **Spatial Partitioning**: Only check nearby frogs for targeting
3. **Request Animation Frame**: Already implemented
4. **Canvas Optimization**: 
   - Use layered canvases for static elements
   - Only redraw changed areas
5. **Limit Particles**: Cap maximum particle count

## 📚 Resources

### Game Design
- [Tower Defense Design Patterns](https://www.gamedeveloper.com)
- [Balancing Tower Defense Games](https://www.gamedeveloper.com)

### Canvas API
- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React + TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## 🤝 Contributing Workflow

1. Create a feature branch
2. Implement feature
3. Test thoroughly
4. Update documentation
5. Submit pull request

## 📝 Testing Checklist

Before releasing:
- [ ] All frog types work correctly
- [ ] All food types move properly
- [ ] Waves spawn correctly
- [ ] Lives decrease when food reaches end
- [ ] Money system works
- [ ] Upgrade system functional
- [ ] Game over triggers correctly
- [ ] UI is responsive
- [ ] No console errors
- [ ] Performance is smooth (60 FPS)

## 🎮 Gameplay Balancing

Current balance (may need tuning):
- Starting Money: $200
- Starting Lives: 3
- Frog Costs: $100-$200
- Food Rewards: $5-$25
- Wave Progression: Gradually increasing difficulty

Suggested adjustments:
- Reduce early game difficulty
- Increase reward for tough enemies
- Balance frog upgrade costs
- Test multiple strategies work

---

**Happy Coding! 🐸**
