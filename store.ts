
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { create } from 'zustand';
import { GameStatus, LEVEL_TARGETS, RUN_SPEED_BASE } from './types';

interface GameState {
  status: GameStatus;
  previousStatus: GameStatus | null;
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[]; 
  level: number;
  visualLevel: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;
  highScore: number;
  
  // Abilities & Upgrades
  hasDoubleJump: boolean;
  hasHover: boolean;
  
  // Timers & Durations
  powerUpDurationAdd: number; // Extra milliseconds
  damageShieldDuration: number; // Milliseconds

  // Active Effects
  isInvincible: boolean;
  invincibilityExpiry: number;
  invincibilityTotalDuration: number;

  isScoreMultiplierActive: boolean;
  scoreMultiplier: number;
  scoreMultiplierExpiry: number;
  scoreMultiplierTotalDuration: number;

  // Actions
  showMenu: () => void;
  startGame: (startLevel?: number) => void;
  restartGame: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  collectPowerUp: (type: 'INVINCIBILITY' | 'SCORE_MULTIPLIER') => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  
  // Shop
  buyItem: (id: string, cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateInvincibilityAbility: () => void;
}

const MAX_LEVEL = 6;
const BASE_POWERUP_DURATION = 15000;
const BASE_SHIELD_DURATION = 1500;

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.SPLASH,
  previousStatus: null,
  score: 0,
  lives: 3,
  maxLives: 3,
  speed: 0,
  collectedLetters: [],
  level: 1,
  visualLevel: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,
  highScore: parseInt(localStorage.getItem('geminiRunnerHighScore') || '0'),
  
  hasDoubleJump: false,
  hasHover: false,
  powerUpDurationAdd: 0,
  damageShieldDuration: BASE_SHIELD_DURATION,

  isInvincible: false,
  invincibilityExpiry: 0,
  invincibilityTotalDuration: 0,

  isScoreMultiplierActive: false,
  scoreMultiplier: 1,
  scoreMultiplierExpiry: 0,
  scoreMultiplierTotalDuration: 0,

  showMenu: () => set(state => ({ status: GameStatus.MENU, previousStatus: state.status })),

  startGame: (startLevel = 1) => {
    let newSpeed;
    if (startLevel === 2) {
        newSpeed = RUN_SPEED_BASE * 1.3; // 130%
    } else if (startLevel === 3) {
        newSpeed = RUN_SPEED_BASE * 1.6; // 160%
    } else if (startLevel === 4) {
        newSpeed = RUN_SPEED_BASE * 1.9; // 190%
    } else if (startLevel === 5) {
        newSpeed = RUN_SPEED_BASE * 2.2; // 220%
    } else if (startLevel === 6) {
        newSpeed = RUN_SPEED_BASE * 2.5; // 250%
    } else {
        newSpeed = RUN_SPEED_BASE; // 100%
    }
    
    set({ 
      status: GameStatus.PLAYING, 
      previousStatus: GameStatus.MENU,
      score: 0, 
      lives: 3, 
      maxLives: 3,
      speed: newSpeed,
      collectedLetters: [],
      level: startLevel,
      visualLevel: startLevel,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,
      
      hasDoubleJump: false,
      hasHover: false,
      powerUpDurationAdd: 0,
      damageShieldDuration: BASE_SHIELD_DURATION,
      isInvincible: false,
      invincibilityExpiry: 0,
      isScoreMultiplierActive: false,
      scoreMultiplierExpiry: 0
    });
  },

  restartGame: () => set(state => ({ 
    status: GameStatus.PLAYING,
    previousStatus: state.status, 
    score: 0, 
    lives: 3, 
    maxLives: 3,
    speed: RUN_SPEED_BASE,
    collectedLetters: [],
    level: 1,
    visualLevel: 1,
    laneCount: 3,
    gemsCollected: 0,
    distance: 0,
    hasDoubleJump: false,
    hasHover: false,
    powerUpDurationAdd: 0,
    damageShieldDuration: BASE_SHIELD_DURATION,
    isInvincible: false,
    invincibilityExpiry: 0,
    isScoreMultiplierActive: false,
    scoreMultiplierExpiry: 0
  })),

  takeDamage: () => {
    const { lives, isInvincible } = get();
    if (isInvincible) return;

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      set(state => ({ lives: 0, status: GameStatus.GAME_OVER, previousStatus: state.status, speed: 0 }));
    }
  },

  addScore: (amount) => set((state) => ({ score: state.score + (amount * state.scoreMultiplier) })),
  
  collectGem: (value) => {
    const { scoreMultiplier } = get();
    set((state) => ({ 
      score: state.score + (value * scoreMultiplier), 
      gemsCollected: state.gemsCollected + 1 
    }));
  },

  setDistance: (dist) => {
    set({ distance: dist });
    const { score, highScore } = get();
    if (score > highScore) {
      set({ highScore: score });
      localStorage.setItem('geminiRunnerHighScore', score.toString());
    }
  },

  collectLetter: (index) => {
    const { collectedLetters, level } = get();
    
    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];
      
      set({ 
        collectedLetters: newLetters,
      });

      const currentTarget = LEVEL_TARGETS[level - 1];
      if (newLetters.length === currentTarget.length) {
        if (level < MAX_LEVEL) {
            get().advanceLevel();
        } else {
            set(state => ({
                status: GameStatus.VICTORY,
                previousStatus: state.status,
                score: get().score + 5000
            }));
        }
      }
    }
  },
  
  collectPowerUp: (type) => {
    const duration = BASE_POWERUP_DURATION + get().powerUpDurationAdd;
    const now = Date.now();
    
    if (type === 'INVINCIBILITY') {
        const newExpiry = now + duration;
        set({ 
            isInvincible: true, 
            invincibilityExpiry: newExpiry, 
            invincibilityTotalDuration: duration 
        });
        
        // Timeout to turn off, checking timestamp to handle overlaps/extensions
        setTimeout(() => {
            if (Date.now() >= get().invincibilityExpiry) {
                set({ isInvincible: false });
            }
        }, duration);

    } else if (type === 'SCORE_MULTIPLIER') {
        const newExpiry = now + duration;
        set({ 
            isScoreMultiplierActive: true, 
            scoreMultiplier: 2, 
            scoreMultiplierExpiry: newExpiry,
            scoreMultiplierTotalDuration: duration
        });
        
        setTimeout(() => {
             if (Date.now() >= get().scoreMultiplierExpiry) {
                set({ isScoreMultiplierActive: false, scoreMultiplier: 1 });
             }
        }, duration);
    }
  },

  advanceLevel: () => {
      const { level } = get();
      const nextLevel = level + 1;
      
      let newSpeed;
      if (nextLevel === 2) {
          newSpeed = RUN_SPEED_BASE * 1.3;
      } else if (nextLevel === 3) {
          newSpeed = RUN_SPEED_BASE * 1.6;
      } else if (nextLevel === 4) {
          newSpeed = RUN_SPEED_BASE * 1.9;
      } else if (nextLevel === 5) {
          newSpeed = RUN_SPEED_BASE * 2.2;
      } else if (nextLevel === 6) {
          newSpeed = RUN_SPEED_BASE * 2.5;
      } else {
          newSpeed = RUN_SPEED_BASE;
      }

      set(state => ({
          level: nextLevel,
          status: GameStatus.PLAYING,
          previousStatus: state.status,
          speed: newSpeed,
          collectedLetters: []
      }));
  },

  openShop: () => set(state => ({ status: GameStatus.SHOP, previousStatus: state.status })),
  
  closeShop: () => set((state) => {
    const nextStatus = state.previousStatus === GameStatus.PAUSED ? GameStatus.PAUSED : GameStatus.PLAYING;
    if (state.level > state.visualLevel) {
        return { 
            status: nextStatus, 
            previousStatus: GameStatus.SHOP,
            visualLevel: state.level 
        };
    }
    return { status: nextStatus, previousStatus: GameStatus.SHOP };
  }),

  buyItem: (id, cost) => {
      const { score, maxLives, lives } = get();
      
      if (score >= cost) {
          // Deduct score
          set({ score: score - cost });
          
          switch (id) {
              case 'POWER_EXT':
                  set(state => ({ powerUpDurationAdd: state.powerUpDurationAdd + 5000 }));
                  break;
              case 'HULL_EXPANSION':
                  set({ maxLives: maxLives + 1, lives: lives + 1 });
                  break;
              case 'REFILL_LIFE':
                  set({ lives: maxLives });
                  break;
              case 'REACTIVE_SHIELD':
                  set({ damageShieldDuration: 6000 });
                  break;
              case 'HYDRO_JETS':
                  set({ hasDoubleJump: true });
                  break;
              case 'GRAV_DAMPENERS':
                  set({ hasHover: true });
                  break;
          }
          return true;
      }
      return false;
  },

  activateInvincibilityAbility: () => {
    // Placeholder if we add manual activation abilities later
  },

  setStatus: (status) => set((state) => ({ status, previousStatus: state.status })),
}));
