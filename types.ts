
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export enum GameStatus {
  SPLASH = 'SPLASH',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  GEM = 'GEM',
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE',
  POWERUP_INVINCIBILITY = 'POWERUP_INVINCIBILITY',
  POWERUP_SCORE_MULTIPLIER = 'POWERUP_SCORE_MULTIPLIER',
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; // For letters (G, E, M...)
  color?: string;
  targetIndex?: number; // Index in the GEMINI target word
  points?: number; // Score value for gems
  hasFired?: boolean; // For Aliens
  powerUpType?: 'INVINCIBILITY' | 'SCORE_MULTIPLIER';
  isSnowball?: boolean; // For wide obstacles
  rotation?: [number, number, number]; // For objects like fallen pawns
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 22.5;
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20; // Behind player

// Google-ish Neon Colors: Blue, Red, Yellow, Blue, Green, Red
export const LEVEL_TARGETS = [
    ['B', 'E', 'A', 'C', 'H'],
    ['H', 'O', 'T', 'L', 'A', 'V', 'A'],
    ['F', 'R', 'O', 'S', 'T', 'B', 'I', 'T', 'E'],
    ['W', 'O', 'O', 'D', 'L', 'A', 'N', 'D'],
    ['C', 'H', 'E', 'C', 'K', 'M', 'A', 'T', 'E'],
    ['C', 'R', 'Y', 'S', 'T', 'A', 'L'],
];

// Level 2: Hot Lava (Fiery colors)
const HOTLAVA_COLORS = [
    '#ff4500', // OrangeRed
    '#ff8c00', // DarkOrange
    '#ffd700', // Gold
    '#ff6347', // Tomato
    '#dc143c', // Crimson
    '#ffea00', // Yellow
    '#ff7f50', // Coral
    '#ff4500', 
    '#ff8c00',
];

// Level 3: Snow (Icy/cool colors)
const SNOW_COLORS = [
    '#e0f2fe', // sky-100
    '#a5f3fc', // cyan-200
    '#67e8f9', // cyan-300
    '#22d3ee', // cyan-400
    '#06b6d4', // cyan-500
    '#0891b2', // cyan-600
    '#0e7490', // cyan-700
    '#155e75', // cyan-800
    '#ffffff', // white
    '#e0e7ff', // indigo-100
    '#c7d2fe', // indigo-200
];

// Level 4: Forest (Earthy/Green colors)
const FOREST_COLORS = [
    '#22c55e', // green-500
    '#84cc16', // lime-500
    '#4d7c0f', // lime-800
    '#166534', // green-800
    '#a3e635', // lime-400
    '#15803d', // green-700
    '#65a30d', // lime-600
    '#14532d', // green-900
];

// Level 5: Chess (Black, White, Gold)
const CHESS_COLORS = [
    '#ffffff', // White
    '#000000', // Black (rendered as dark grey usually)
    '#ffd700', // Gold
    '#c0c0c0', // Silver
    '#ffffff',
    '#000000',
    '#ffd700',
    '#c0c0c0',
    '#ffffff',
];

// Level 6: Crystal Caves (Purple, Magenta, Cyan)
const CRYSTAL_COLORS = [
    '#d8b4fe', // purple-300
    '#c084fc', // purple-400
    '#a855f7', // purple-500
    '#e879f9', // fuchsia-400
    '#d946ef', // fuchsia-500
    '#22d3ee', // cyan-400
    '#818cf8', // indigo-400
];

// Level 1: Beach (Coastal colors)
const BEACH_COLORS = [
    '#00bfff', // DeepSkyBlue
    '#ffff00', // Yellow
    '#f0e68c', // Khaki
    '#add8e6', // LightBlue
    '#87ceeb', // SkyBlue
];

export const LEVEL_COLORS = [
    BEACH_COLORS,
    HOTLAVA_COLORS,
    SNOW_COLORS,
    FOREST_COLORS,
    CHESS_COLORS,
    CRYSTAL_COLORS,
];

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any; // Lucide icon component
    type: 'UPGRADE' | 'CONSUMABLE' | 'ABILITY';
    oneTime?: boolean; 
}
