
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, MapPin, Diamond, TreePine, ArrowUpCircle, Shield, Activity, PlusCircle, Play, X, User, CheckSquare, Package, Star, Waves, Flame, Snowflake, Crown, Timer, Feather, Pause, Map, Home } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, LEVEL_COLORS, LEVEL_TARGETS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

// New Shop Items based on request
const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'POWER_EXT',
        name: 'CHRONOS CELL',
        description: 'Adds 5 seconds to all power-up durations.',
        cost: 1000,
        icon: Timer,
        type: 'UPGRADE'
    },
    {
        id: 'HULL_EXPANSION',
        name: 'HULL EXPANSION',
        description: 'Permanently adds +1 Max Hull Integrity.',
        cost: 1200,
        icon: Activity,
        type: 'UPGRADE'
    },
    {
        id: 'REFILL_LIFE',
        name: 'NANO-REPAIR',
        description: 'Fully restores Hull Integrity instantly.',
        cost: 2000,
        icon: PlusCircle,
        type: 'CONSUMABLE'
    },
    {
        id: 'REACTIVE_SHIELD',
        name: 'REACTIVE BARRIER',
        description: 'After damage, shields hold for 6 seconds.',
        cost: 1500,
        icon: Shield,
        type: 'UPGRADE',
        oneTime: true
    },
    {
        id: 'HYDRO_JETS',
        name: 'HYDRO JETS',
        description: 'Propel again in mid-air (Double Jump).',
        cost: 800,
        icon: ArrowUpCircle,
        type: 'ABILITY',
        oneTime: true
    },
    {
        id: 'GRAV_DAMPENERS',
        name: 'GRAV-DAMPENERS',
        description: 'Double tap jump to suspend gravity for 0.8s.',
        cost: 3100,
        icon: Feather,
        type: 'ABILITY',
        oneTime: true
    }
];

const SplashScreen: React.FC = () => {
    const showMenu = useStore(state => state.showMenu);

    useEffect(() => {
        const timer = setTimeout(() => {
            showMenu();
        }, 3000); // 3-second splash screen

        return () => clearTimeout(timer);
    }, [showMenu]);

    const title = "ZONES";
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff4400'];

    return (
        <div className="absolute inset-0 bg-[#020014] flex flex-col items-center justify-center z-[100] pointer-events-auto animate-in fade-in duration-1000">
            <div className="text-center">
                <h1 className="font-cyber text-5xl md:text-7xl font-black tracking-widest flex">
                    {title.split('').map((char, index) => (
                        <span 
                            key={index}
                            style={{ 
                                color: colors[index % colors.length],
                                textShadow: `0 0 15px ${colors[index % colors.length]}`,
                                animation: `fadeInUp 0.5s ${index * 0.1}s both`
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </h1>
                <h2 
                    className="font-cyber text-5xl md:text-7xl font-black tracking-[0.3em] text-cyan-400"
                    style={{
                        textShadow: `0 0 15px #00ffff`,
                        animation: `fadeInUp 0.5s 0.6s both`
                    }}
                >
                    RUNNER
                </h2>
            </div>
            <div className="absolute bottom-10 text-cyan-400/50 text-sm font-mono tracking-widest animate-pulse">
                LOADING ZONES...
            </div>
            {/* Inline style for keyframes to avoid needing a CSS file */}
            <style>
                {`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                `}
            </style>
        </div>
    );
};

const PowerUpTimer: React.FC<{ icon: React.ElementType, color: string, expiry: number, totalDuration: number }> = ({ icon: Icon, color, expiry, totalDuration }) => {
    const [progress, setProgress] = useState(1);
    const radius = 22; // Slightly smaller radius to fit stroke within 64x64 without clipping
    const center = 32;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        let animationFrameId: number;
        
        const update = () => {
            const now = Date.now();
            const remaining = Math.max(0, expiry - now);
            setProgress(remaining / totalDuration);
            
            if (remaining > 0) {
                animationFrameId = requestAnimationFrame(update);
            }
        };
        
        update();
        return () => cancelAnimationFrame(animationFrameId);
    }, [expiry, totalDuration]);

    if (Date.now() > expiry) return null;

    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            {/* SVG Progress Bar */}
            <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                {/* Background Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth="6"
                    fill="rgba(0,0,0,0.8)"
                />
                {/* Progress Value */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={color}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-75 ease-linear"
                />
            </svg>
            
            {/* Centered Icon */}
            <div className="relative z-10 flex items-center justify-center animate-pulse" style={{ color: color, filter: `drop-shadow(0 0 8px ${color})` }}>
                <Icon size={28} strokeWidth={2.5} />
            </div>
        </div>
    );
};

const ZONES = [
    { name: 'Coastal Run', icon: Waves, color: 'text-cyan-400' },
    { name: 'Volcanic Realm', icon: Flame, color: 'text-orange-400' },
    { name: 'Snowy Wonderland', icon: Snowflake, color: 'text-blue-300' },
    { name: 'Enchanted Forest', icon: TreePine, color: 'text-green-400' },
    { name: 'Royal Gambit', icon: Crown, color: 'text-yellow-100' },
    { name: 'Crystal Caves', icon: Diamond, color: 'text-purple-400' }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasHover, damageShieldDuration, lives, maxLives } = useStore();
    
    // Check if user already owns unique items
    const isOwned = (id: string) => {
        if (id === 'HYDRO_JETS') return hasDoubleJump;
        if (id === 'GRAV_DAMPENERS') return hasHover;
        if (id === 'REACTIVE_SHIELD') return damageShieldDuration > 2000;
        return false;
    };

    // Check if consumable is relevant
    const isRelevant = (id: string) => {
        if (id === 'REFILL_LIFE') return lives < maxLives;
        return true;
    };

    const getItemColor = (type: string) => {
        switch(type) {
            case 'ABILITY': return 'border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
            case 'UPGRADE': return 'border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
            case 'CONSUMABLE': return 'border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
            default: return 'border-gray-700 text-gray-400';
        }
    };

    return (
        <div className="absolute inset-0 bg-[#050510]/95 z-[100] text-white pointer-events-auto backdrop-blur-xl overflow-y-auto">
             {/* Tech Grid Background Overlay */}
             <div className="absolute inset-0 pointer-events-none opacity-20" 
                  style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
             />

             <div className="relative flex flex-col items-center min-h-full py-8 px-4 max-w-7xl mx-auto">
                 {/* Header */}
                 <div className="w-full flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                     <div>
                        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-cyber tracking-widest drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                            ABYSSAL MARKETPLACE
                        </h2>
                        <p className="text-gray-400 font-mono text-sm tracking-wider mt-1">AUTHORIZED PERSONNEL ONLY // SYSTEM.FORGE.V2</p>
                     </div>
                     <div className="flex items-center bg-black/60 px-6 py-3 rounded-xl border border-yellow-500/30">
                         <Diamond className="w-6 h-6 text-yellow-400 mr-3 animate-pulse" />
                         <span className="text-2xl font-bold font-mono text-yellow-400">{score.toLocaleString()}</span>
                         <span className="text-xs text-yellow-600 ml-2 font-bold tracking-widest">PEARLS</span>
                     </div>
                 </div>

                 {/* Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-8">
                     {SHOP_ITEMS.map(item => {
                         const Icon = item.icon;
                         const owned = isOwned(item.id);
                         const relevant = isRelevant(item.id);
                         const canAfford = score >= item.cost;
                         const locked = !relevant && !owned && item.type === 'CONSUMABLE';
                         
                         return (
                             <div 
                                key={item.id} 
                                className={`relative bg-gray-900/80 border-2 rounded-xl p-6 flex flex-col transition-all duration-300 group hover:-translate-y-1 hover:bg-gray-800 ${getItemColor(item.type)}`}
                             >
                                 <div className="flex items-start justify-between mb-4">
                                     <div className={`p-4 rounded-lg bg-black/50 ${owned ? 'opacity-50' : ''}`}>
                                         <Icon className="w-8 h-8" />
                                     </div>
                                     <div className="text-xs font-bold px-2 py-1 rounded bg-black/50 font-mono opacity-70">
                                         {item.type}
                                     </div>
                                 </div>
                                 
                                 <h3 className="text-xl font-bold mb-2 font-cyber tracking-wide">{item.name}</h3>
                                 <p className="text-gray-400 text-sm mb-6 flex-grow min-h-[40px] leading-relaxed">
                                    {item.description}
                                 </p>
                                 
                                 {owned ? (
                                    <button disabled className="w-full py-3 bg-gray-800 text-gray-500 font-bold rounded cursor-not-allowed border border-gray-700 font-mono tracking-widest">
                                        // ACQUIRED
                                    </button>
                                 ) : locked ? (
                                    <button disabled className="w-full py-3 bg-gray-800 text-gray-500 font-bold rounded cursor-not-allowed border border-gray-700 font-mono tracking-widest">
                                        // FULL INTEGRITY
                                    </button>
                                 ) : (
                                     <button 
                                        onClick={() => buyItem(item.id, item.cost)}
                                        disabled={!canAfford}
                                        className={`w-full py-3 font-bold rounded font-mono tracking-widest transition-all duration-200 flex justify-between items-center px-6
                                            ${canAfford 
                                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110 shadow-lg hover:shadow-cyan-500/25' 
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                            }`}
                                     >
                                         <span>PURCHASE</span>
                                         <span>{item.cost}</span>
                                     </button>
                                 )}
                             </div>
                         );
                     })}
                 </div>

                 {/* Footer Button */}
                 <button 
                    onClick={closeShop}
                    className="group relative px-12 py-4 bg-transparent border-2 border-white/20 text-white font-bold text-xl rounded-none hover:border-cyan-400 hover:text-cyan-400 transition-all duration-300 font-cyber tracking-[0.2em] overflow-hidden"
                 >
                     <span className="relative z-10 flex items-center">
                        RESUME RUN <Play className="ml-3 w-5 h-5 fill-current" />
                     </span>
                     <div className="absolute inset-0 bg-cyan-400/10 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                 </button>
             </div>
        </div>
    );
};

const ZoneSelectorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { startGame } = useStore();
    return (
        <div className="absolute inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-900/90 border border-cyan-500/30 rounded-2xl max-w-5xl w-full p-8 relative overflow-hidden">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={32} />
                </button>
                
                <h2 className="text-3xl md:text-5xl font-cyber font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8 tracking-widest">
                    ZONE SELECT
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ZONES.map((zone, idx) => {
                        const Icon = zone.icon;
                        const level = idx + 1;
                        return (
                            <button 
                                key={level}
                                onClick={() => {
                                    audio.init();
                                    startGame(level);
                                    onClose();
                                }}
                                className="group relative bg-black/50 border border-gray-700 hover:border-cyan-500 rounded-xl p-6 transition-all duration-300 hover:bg-gray-800 flex flex-col items-center overflow-hidden"
                            >
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br from-${zone.color.replace('text-', '')} to-transparent transition-opacity`} />
                                <div className={`p-4 rounded-full bg-black/50 mb-4 ${zone.color} shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform`}>
                                    <Icon size={40} />
                                </div>
                                <h3 className={`text-xl font-bold font-cyber ${zone.color} mb-1`}>{zone.name}</h3>
                                <p className="text-gray-500 font-mono text-sm">ZONE {level}</p>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

const THEME_COLORS = {
    1: { main: 'text-cyan-400', shadow: 'drop-shadow-[0_0_10px_#00ffff]', speed: 'text-cyan-500' }, // Coastal
    2: { main: 'text-orange-400', shadow: 'drop-shadow-[0_0_10px_#ffaa00]', speed: 'text-orange-500' }, // Volcanic
    3: { main: 'text-blue-300', shadow: 'drop-shadow-[0_0_10px_#93c5fd]', speed: 'text-blue-400' }, // Snow
    4: { main: 'text-green-400', shadow: 'drop-shadow-[0_0_10px_#22c55e]', speed: 'text-green-500' }, // Forest
    5: { main: 'text-yellow-100', shadow: 'drop-shadow-[0_0_10px_#ffffff]', speed: 'text-yellow-100' }, // Chess
    6: { main: 'text-purple-400', shadow: 'drop-shadow-[0_0_10px_#a855f7]', speed: 'text-purple-500' }, // Crystal Caves
};

export const HUD: React.FC = () => {
  const { score, lives, maxLives, collectedLetters, status, level, visualLevel, restartGame, startGame, gemsCollected, distance, isInvincible, invincibilityExpiry, invincibilityTotalDuration, isScoreMultiplierActive, scoreMultiplierExpiry, scoreMultiplierTotalDuration, speed, setStatus, openShop, showMenu } = useStore();
  const [displayedScore, setDisplayedScore] = useState(score);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const target = LEVEL_TARGETS[level - 1] || [];
  const letterColors = LEVEL_COLORS[level - 1] || [];
  const theme = THEME_COLORS[visualLevel as keyof typeof THEME_COLORS] || THEME_COLORS[1];
  
  useEffect(() => {
    // For the live counter effect during gameplay
    if (status !== GameStatus.PLAYING) {
        // When not playing, snap the score to the true value
        setDisplayedScore(score);
        return;
    }

    const interval = setInterval(() => {
        setDisplayedScore(prev => {
            if (prev === score) {
                clearInterval(interval);
                return score;
            }
            const diff = score - prev;
            const step = Math.max(1, Math.ceil(diff * 0.1));

            // Snap to final value if close
            if (diff < step) {
                return score;
            }
            return prev + step;
        });
    }, 40); // Update roughly 25 times per second

    return () => clearInterval(interval);
  }, [score, status]);


  // Common container style
  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50";

  if (status === GameStatus.SPLASH) {
      return <SplashScreen />;
  }
  
  if (status === GameStatus.SHOP) {
      return <ShopScreen />;
  }

  if (status === GameStatus.MENU) {
    return (
        <div className="absolute inset-0 z-[100] pointer-events-auto p-4 md:p-8">
            {showZoneSelector && <ZoneSelectorModal onClose={() => setShowZoneSelector(false)} />}
            <div className="absolute inset-x-0 bottom-20 flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
                 <button
                    onClick={() => setShowZoneSelector(true)}
                    className="flex items-center px-8 py-3 bg-gray-800/80 border border-gray-600 text-gray-300 font-bold text-lg rounded-xl hover:bg-gray-700 hover:text-white hover:border-cyan-500 transition-all font-mono"
                >
                    <Map className="mr-2 w-5 h-5" /> SELECT ZONE
                </button>
                <button
                    onClick={() => { audio.init(); startGame(1); }}
                    className="flex items-center px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xl rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)] animate-in fade-in slide-in-from-bottom-10 duration-500"
                >
                    START RUN <Play className="ml-2 w-5 h-5 fill-white" />
                </button>
            </div>
        </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-sm overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] font-cyber text-center">PRESSURE CRITICAL</h1>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 text-center mb-8 w-full max-w-md">
                    <div className="bg-gray-900/80 p-3 md:p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-yellow-400 text-sm md:text-base"><Trophy className="mr-2 w-4 h-4 md:w-5 md:h-5"/> ZONE</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{level} / 6</div>
                    </div>
                    <div className="bg-gray-900/80 p-3 md:p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-cyan-400 text-sm md:text-base"><Diamond className="mr-2 w-4 h-4 md:w-5 md:h-5"/> GEMS COLLECTED</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{gemsCollected}</div>
                    </div>
                    <div className="bg-gray-900/80 p-3 md:p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-purple-400 text-sm md:text-base"><MapPin className="mr-2 w-4 h-4 md:w-5 md:h-5"/> DEPTH</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{Math.floor(distance)} m</div>
                    </div>
                     <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg flex items-center justify-between mt-2">
                        <div className="flex items-center text-white text-sm md:text-base">TOTAL SCORE</div>
                        <div className="text-2xl md:text-3xl font-bold font-cyber text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{score.toLocaleString()}</div>
                    </div>
                </div>

                <div className="flex flex-col space-y-4 w-full max-w-xs items-center">
                    <button 
                    onClick={() => { audio.init(); restartGame(); }}
                    className="w-full px-8 py-3 md:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                    >
                        RUN AGAIN
                    </button>
                    
                    <button 
                    onClick={() => { audio.init(); showMenu(); }}
                    className="w-full px-8 py-3 bg-transparent border border-gray-600 text-gray-400 font-bold text-lg rounded hover:bg-gray-800 hover:text-white hover:border-gray-400 transition-all flex items-center justify-center"
                    >
                        <Home className="w-4 h-4 mr-2" /> MAIN MENU
                    </button>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.VICTORY) {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/90 to-black/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
            <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <Trophy className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]" />
                <h1 className="text-3xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-pink-500 mb-2 drop-shadow-[0_0_20px_rgba(255,165,0,0.6)] font-cyber text-center leading-tight">
                    SURFACE REACHED
                </h1>
                <p className="text-cyan-300 text-sm md:text-2xl font-mono mb-8 tracking-widest text-center">
                    YOU HAVE ESCAPED THE ABYSS
                </p>
                
                <div className="grid grid-cols-1 gap-4 text-center mb-8 w-full max-w-md">
                    <div className="bg-black/60 p-6 rounded-xl border border-yellow-500/30 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                        <div className="text-xs md:text-sm text-gray-400 mb-1 tracking-wider">FINAL SCORE</div>
                        <div className="text-3xl md:text-4xl font-bold font-cyber text-yellow-400">{score.toLocaleString()}</div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/60 p-4 rounded-lg border border-white/10">
                            <div className="text-xs text-gray-400">GEMS</div>
                            <div className="text-xl md:text-2xl font-bold text-cyan-400">{gemsCollected}</div>
                        </div>
                        <div className="bg-black/60 p-4 rounded-lg border border-white/10">
                             <div className="text-xs text-gray-400">DEPTH</div>
                            <div className="text-xl md:text-2xl font-bold text-purple-400">{Math.floor(distance)} m</div>
                        </div>
                     </div>
                </div>

                <div className="flex flex-col space-y-4 w-full max-w-xs items-center">
                    <button 
                    onClick={() => { audio.init(); restartGame(); }}
                    className="w-full px-8 py-4 bg-white text-black font-black text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] tracking-widest"
                    >
                        NEW RUN
                    </button>
                    <button 
                    onClick={() => { audio.init(); showMenu(); }}
                    className="w-full px-8 py-3 bg-transparent border border-gray-600 text-gray-400 font-bold text-lg rounded hover:bg-gray-800 hover:text-white hover:border-gray-400 transition-all flex items-center justify-center"
                    >
                        <Home className="w-4 h-4 mr-2" /> MAIN MENU
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // Fallback for PLAYING state
  const isPlaying = status === GameStatus.PLAYING;
  
  if (!isPlaying) return null; // Should not happen due to checks above, but as a safeguard.

  return (
    <div className={containerClass}>
        {/* Top Bar */}
        <div className="flex justify-between items-start w-full">
            <div className={`text-3xl md:text-5xl font-bold ${theme.main} ${theme.shadow} font-cyber`}>
                {displayedScore.toLocaleString()}
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
                <button 
                    onClick={() => { audio.init(); openShop(); }} 
                    className="pointer-events-auto p-2 bg-black/30 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
                    aria-label="Pause and Open Shop"
                >
                    <Pause className="w-6 h-6 text-white" />
                </button>
                <div className="flex space-x-1 md:space-x-2">
                    {[...Array(maxLives)].map((_, i) => (
                        <Heart 
                            key={i} 
                            className={`w-6 h-6 md:w-8 md:h-8 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-800 fill-gray-800'} drop-shadow-[0_0_5px_#ff0000]`} 
                        />
                    ))}
                </div>
            </div>
        </div>
        
        {/* Level Indicator - Moved to Top Center aligned with Score/Hearts */}
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-sm md:text-lg text-purple-300 font-bold tracking-wider font-mono bg-black/50 px-3 py-1 rounded-full border border-purple-500/30 backdrop-blur-sm z-50">
            ZONE {level} <span className="text-gray-500 text-xs md:text-sm">/ 6</span>
        </div>

        {/* Circular Active Powerup Indicators - Bottom Left */}
         <div className="absolute bottom-16 left-6 flex flex-col-reverse space-y-reverse space-y-4">
            {isInvincible && (
                <PowerUpTimer 
                    icon={Shield} 
                    color="#ffd700" 
                    expiry={invincibilityExpiry} 
                    totalDuration={invincibilityTotalDuration} 
                />
            )}
            {isScoreMultiplierActive && (
                 <PowerUpTimer 
                    icon={Star} 
                    color="#00ff88" 
                    expiry={scoreMultiplierExpiry} 
                    totalDuration={scoreMultiplierTotalDuration} 
                />
            )}
        </div>

        {/* Letter Collection Status */}
        <div className="absolute top-16 md:top-24 left-1/2 transform -translate-x-1/2 w-full px-4 flex flex-wrap justify-center gap-1 md:gap-2">
            {target.map((char, idx) => {
                const isCollected = collectedLetters.includes(idx);
                const color = letterColors[idx];

                return (
                    <div 
                        key={idx}
                        style={{
                            borderColor: isCollected ? color : 'rgba(55, 65, 81, 1)',
                            // Use dark text (almost black) when collected to contrast with neon background
                            color: isCollected ? 'rgba(0, 0, 0, 0.8)' : 'rgba(55, 65, 81, 1)',
                            boxShadow: isCollected ? `0 0 20px ${color}` : 'none',
                            backgroundColor: isCollected ? color : 'rgba(0, 0, 0, 0.9)'
                        }}
                        className={`w-8 h-10 md:w-10 md:h-12 flex items-center justify-center border-2 font-black text-lg md:text-xl font-cyber rounded-lg transform transition-all duration-300`}
                    >
                        {char}
                    </div>
                );
            })}
        </div>

        {/* Bottom Overlay */}
        <div className="w-full flex justify-end items-end">
             <div className={`flex items-center space-x-2 ${theme.speed} opacity-70`}>
                 <Zap className="w-4 h-4 md:w-6 md:h-6 animate-pulse" />
                 <span className="font-mono text-base md:text-xl">SPEED {Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
             </div>
        </div>
    </div>
  );
};
