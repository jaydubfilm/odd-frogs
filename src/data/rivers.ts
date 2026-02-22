import { RiverDefinition } from '../types/game';

export const RIVERS: RiverDefinition[] = [
  {
    id: 'rio-ribbit',
    name: 'Rio Ribbit',
    levelCount: 20,
    unlockRequirement: null as RiverDefinition['unlockRequirement'],
    color: '#3b82f6',
    levelSetSource: 'json',
  },
  {
    id: 'rio-rapido',
    name: 'Rio Rapido',
    levelCount: 20,
    unlockRequirement: { riverId: 'rio-ribbit', stars: 40 },
    color: '#ef4444',
    levelSetSource: 'procedural',
  },
];
