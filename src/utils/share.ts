import type { Scores } from '../types';

export function serializeScores(scores: Scores): string {
  return `E${scores.E}I${scores.I}S${scores.S}N${scores.N}T${scores.T}F${scores.F}J${scores.J}P${scores.P}`;
}

export function deserializeScores(str: string): Scores | null {
  const match = str.match(/^E(\d+)I(\d+)S(\d+)N(\d+)T(\d+)F(\d+)J(\d+)P(\d+)$/);
  if (!match) return null;
  return {
    E: parseInt(match[1], 10),
    I: parseInt(match[2], 10),
    S: parseInt(match[3], 10),
    N: parseInt(match[4], 10),
    T: parseInt(match[5], 10),
    F: parseInt(match[6], 10),
    J: parseInt(match[7], 10),
    P: parseInt(match[8], 10),
  };
}
