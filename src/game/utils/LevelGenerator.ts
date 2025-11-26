import { CellType, LevelData, StreamPath, PathSegment, ChannelSection, LaneSection, PathElement } from '../../types/game';
import { GAME_CONFIG } from '../../data/constants';
import { PathGenerator } from './PathGenerator';

export function generateRandomLevel(): LevelData {
  const gridLayout: CellType[][] = [];

  // Generate random grid
  for (let row = 0; row < GAME_CONFIG.gridRows; row++) {
    const gridRow: CellType[] = [];
    for (let col = 0; col < GAME_CONFIG.gridCols; col++) {
      const rand = Math.random();
      if (rand < 0.5) {
        gridRow.push(CellType.LILYPAD);
      } else if (rand < 0.65) {
        gridRow.push(CellType.ROCK);
      } else if (rand < 0.75) {
        gridRow.push(CellType.LILYPAD_WITH_LILY);
      } else {
        gridRow.push(CellType.EMPTY);
      }
    }
    gridLayout.push(gridRow);
  }

  // Generate 1-3 random streams
  const numStreams = 1 + Math.floor(Math.random() * 3);
  const streams = generateNonOverlappingStreams(numStreams);

  return {
    id: 'random-level',
    name: 'Random Pond',
    startingMoney: 200,
    gridLayout,
    streams,
    waves: [], // Use LEVEL_1 waves or generate random
  };
}

// Replace generateNonOverlappingStreams:
function generateNonOverlappingStreams(numStreams: number): StreamPath[] {
  const streamChannels: number[][] = Array(numStreams).fill(0).map(() => []);

  for (let row = 0; row < 5; row++) {
    const selectedChannels: number[] = [];

    if (row === 0 || row === 4) {
      const availableChannels = [1, 2, 3];
      for (let i = 0; i < numStreams; i++) {
        const randomIndex = Math.floor(Math.random() * availableChannels.length);
        selectedChannels.push(availableChannels[randomIndex]);
        availableChannels.splice(randomIndex, 1);
      }
    } else {
      for (let i = 0; i < numStreams; i++) {
        selectedChannels.push(Math.floor(Math.random() * 5));
      }
    }

    selectedChannels.sort((a, b) => a - b);

    for (let i = 0; i < numStreams; i++) {
      streamChannels[i][row] = selectedChannels[i];
    }
  }

  const LANE_GAP = 12;
  const centerIndex = (numStreams - 1) / 2;


  return streamChannels.map((channels, index) => {
    const { channelSections, laneSections } = channelsToPath(channels);

    // Calculate offset for this stream
    const relIndex = index - centerIndex;
    const offsetDistance = relIndex * LANE_GAP;

    // Generate smooth path
    const elements = channelsToSegments(channels);
    const segments = elements.filter((el): el is PathSegment => 'start' in el);
    const smoothPath = PathGenerator.generateSmoothPath(segments, offsetDistance);

    return {
      id: `stream-${index}`,
      channels,
      channelSections,
      laneSections,
      offset: offsetDistance,
      smoothPath,
    };
  });
}
export function channelsToPath(channels: number[]): {
  channelSections: ChannelSection[];
  laneSections: LaneSection[];
} {
  const channelSections: ChannelSection[] = [];
  const laneSections: LaneSection[] = [];

  // Generate channel sections (one per row)
  for (let row = 0; row < channels.length; row++) {
    channelSections.push({ row, channel: channels[row] });
  }

  // Generate lane sections (horizontal movements between rows)
  for (let lane = 0; lane < channels.length - 1; lane++) {
    const fromChannel = channels[lane];
    const toChannel = channels[lane + 1];

    if (fromChannel !== toChannel) {
      const minChannel = Math.min(fromChannel, toChannel);
      const maxChannel = Math.max(fromChannel, toChannel);

      // Create a lane section for each channel crossed
      for (let channel = minChannel; channel < maxChannel; channel++) {
        laneSections.push({ lane, channel });
      }
    }
  }

  return { channelSections, laneSections };
}

export function channelsToSegments(channels: number[]): PathElement[] {
  if (!channels || channels.length === 0) {
    return [];
  }

  const elements: PathElement[] = [];
  const topMargin = 60;
  const leftMargin = 60;
  const cornerRadius = 10;

  // Entry segment
  const entryX = leftMargin + channels[0] * GAME_CONFIG.cellSize;
  let currentY = topMargin + GAME_CONFIG.cellSize;

  elements.push({
    start: { x: entryX, y: 0 },
    end: { x: entryX, y: currentY - cornerRadius },
    isHorizontal: false,  // ← ADD THIS
  });

  // Process each row transition
  for (let row = 0; row < channels.length - 1; row++) {
    const currentChannel = channels[row];
    const nextChannel = channels[row + 1];
    const currentX = leftMargin + currentChannel * GAME_CONFIG.cellSize;
    const nextX = leftMargin + nextChannel * GAME_CONFIG.cellSize;
    currentY = topMargin + (row + 1) * GAME_CONFIG.cellSize;
    const nextY = topMargin + (row + 2) * GAME_CONFIG.cellSize;

    if (currentChannel !== nextChannel) {
      const goingRight = nextChannel > currentChannel;

      // Corner: vertical → horizontal
      elements.push({
        entry: { x: currentX, y: currentY - cornerRadius },
        exit: { x: currentX + (goingRight ? cornerRadius : -cornerRadius), y: currentY },
      });

      // Horizontal segment
      elements.push({
        start: { x: currentX + (goingRight ? cornerRadius : -cornerRadius), y: currentY },
        end: { x: nextX - (goingRight ? cornerRadius : -cornerRadius), y: currentY },
        isHorizontal: true,  // ← ADD THIS
      });

      // Corner: horizontal → vertical
      elements.push({
        entry: { x: nextX - (goingRight ? cornerRadius : -cornerRadius), y: currentY },
        exit: { x: nextX, y: currentY + cornerRadius },
      });

      // Vertical segment to next row
      elements.push({
        start: { x: nextX, y: currentY + cornerRadius },
        end: { x: nextX, y: nextY - cornerRadius },
        isHorizontal: false,  // ← ADD THIS
      });
    } else {
      // Straight vertical segment
      elements.push({
        start: { x: currentX, y: currentY - cornerRadius },
        end: { x: currentX, y: nextY - cornerRadius },
        isHorizontal: false,  // ← ADD THIS
      });
    }
  }

  // Exit segment
  const exitX = leftMargin + channels[channels.length - 1] * GAME_CONFIG.cellSize;
  const exitY = topMargin + channels.length * GAME_CONFIG.cellSize;
  elements.push({
    start: { x: exitX, y: exitY - cornerRadius },
    end: { x: exitX, y: GAME_CONFIG.canvasHeight },
    isHorizontal: false,  // ← ADD THIS
  });

  // DEBUG: Log all elements
  console.log(`Stream channels: [${channels.join(', ')}]`);
  elements.forEach((el, i) => {
    if ('start' in el) {
      console.log(`  [${i}] Segment: (${el.start.x}, ${el.start.y}) → (${el.end.x}, ${el.end.y})`);
    } else {
      console.log(`  [${i}] Corner: entry(${el.entry.x}, ${el.entry.y}) → exit(${el.exit.x}, ${el.exit.y})`);
    }
  });

  return elements;
}