
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center, Float } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, LEVEL_TARGETS, LEVEL_COLORS } from '../../types';
import { audio } from '../System/Audio';

// Helper to create a multi-colored beach ball geometry
const createBeachBallGeo = (): THREE.BufferGeometry => {
    const geo = new THREE.SphereGeometry(0.8, 32, 16);
    const colorsAttr: number[] = [];
    const palette = [
        new THREE.Color('#e63946'), // Red
        new THREE.Color('#f1faee'), // White
        new THREE.Color('#457b9d'), // Blue
        new THREE.Color('#ffc300'), // Yellow
    ];

    const position = geo.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        // atan2 gives angle from -PI to PI. Map it to 0-1
        const angle = Math.atan2(z, x);
        const t = (angle / (Math.PI * 2)) + 0.5;
        // 4 segments for the 4 colors
        const segmentIndex = Math.floor(t * 4);
        const color = palette[segmentIndex % 4];
        colorsAttr.push(color.r, color.g, color.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorsAttr, 3));
    return geo;
};
const BEACH_BALL_GEO = createBeachBallGeo();


// --- Level Themed Geometries ---
const OBSTACLE_GEOS = {
    1: BEACH_BALL_GEO,     // Beach Ball (Coastal)
    2: new THREE.IcosahedronGeometry(0.8, 1),      // Sea Urchin (Volcanic)
    3: new THREE.TetrahedronGeometry(1.2, 0),      // Ice Crystal (Snow)
    4: new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8), // Thorn Vine (Forest)
    5: new THREE.CylinderGeometry(0.2, 0.6, 1.5, 8), // Pawn (Chess)
    6: new THREE.CylinderGeometry(0.0, 0.5, 2.5, 5), // Crystal Spike
};
const OBSTACLE_GLOW_GEOS = {
    1: new THREE.SphereGeometry(0.82, 16, 8),
    2: new THREE.IcosahedronGeometry(0.82, 1),
    3: new THREE.TetrahedronGeometry(1.22, 0),
    4: new THREE.TorusKnotGeometry(0.62, 0.2, 64, 8),
    5: new THREE.CylinderGeometry(0.25, 0.65, 1.55, 8),
    6: new THREE.CylinderGeometry(0.05, 0.55, 2.55, 5),
};
const GEM_GEOS = {
    1: new THREE.OctahedronGeometry(0.35, 0),      // Coastal Gem
    2: new THREE.SphereGeometry(0.3, 16, 16),        // Volcanic Gem
    3: new THREE.IcosahedronGeometry(0.4, 0),    // Snow Gem
    4: new THREE.IcosahedronGeometry(0.4, 0),       // Forest Crystal
    5: new THREE.OctahedronGeometry(0.4, 0),        // Chess Gem
    6: new THREE.TetrahedronGeometry(0.4, 0),       // Crystal Gem
};
const SNOWBALL_GEO = new THREE.SphereGeometry(LANE_WIDTH * 0.8, 20, 16);
const SNOWBALL_GLOW_GEO = new THREE.SphereGeometry(LANE_WIDTH * 0.8 + 0.02, 20, 16);


// --- Shared Geometries ---
const SQUID_BODY_GEO = new THREE.ConeGeometry(0.5, 1.2, 8);
const SQUID_EYE_GEO = new THREE.SphereGeometry(0.15);
const INK_BLAST_CORE_GEO = new THREE.SphereGeometry(0.3, 8, 8);
const POWERUP_SHIELD_GEO = new THREE.OctahedronGeometry(0.4, 0);
const POWERUP_MULTIPLIER_GEO = new THREE.TorusKnotGeometry(0.3, 0.05, 64, 8, 2, 3);
const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(2, 0.6);
const SHADOW_GEM_GEO = new THREE.CircleGeometry(0.6, 32);
const SHADOW_SQUID_GEO = new THREE.CircleGeometry(0.8, 32);
const SHADOW_INK_BLAST_GEO = new THREE.CircleGeometry(0.5, 32);
const SHADOW_DEFAULT_GEO = new THREE.CircleGeometry(0.8, 6);
const WHIRLPOOL_GEO = new THREE.PlaneGeometry(1, 1, 64, 64);

const PARTICLE_COUNT = 600;
const BASE_LETTER_INTERVAL = 150; 
const getLetterInterval = (level: number) => BASE_LETTER_INTERVAL * Math.pow(1.5, Math.max(0, level - 1));
const INK_BLAST_SPEED = 30;
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// --- Particle System ---
const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(), color: new THREE.Color()
    })), []);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color, burstAmount } = e.detail;
            let spawned = 0;
            const finalBurstAmount = burstAmount || 40; 

            for(let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 1.0 + Math.random() * 0.5; p.pos.fromArray(position);
                    const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2 + Math.random() * 10;
                    p.vel.set(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(speed);
                    p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    p.rotVel.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(5);
                    p.color.set(color);
                    spawned++;
                    if (spawned >= finalBurstAmount) break;
                }
            }
        };
        
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= safeDelta * 1.5; p.pos.addScaledVector(p.vel, safeDelta);
                p.vel.y -= safeDelta * 5; p.vel.multiplyScalar(0.98);
                p.rot.x += p.rotVel.x * safeDelta; p.rot.y += p.rotVel.y * safeDelta;
                dummy.position.copy(p.pos); const scale = Math.max(0, p.life * 0.25);
                dummy.scale.set(scale, scale, scale); dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
                dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0); dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
        </instancedMesh>
    );
};


const getRandomLane = (laneCount: number) => {
    const max = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { status, speed, collectGem, collectLetter, collectPowerUp, collectedLetters, laneCount, setDistance, openShop, level, visualLevel, isInvincible } = useStore();
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);
  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
        objectsRef.current = []; setRenderTrigger(t => t + 1);
        distanceTraveled.current = 0; nextLetterDistance.current = getLetterInterval(1);
    } else if (isLevelUp && level > 1) {
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);
        objectsRef.current.push({ id: uuidv4(), type: ObjectType.SHOP_PORTAL, position: [0, 0, -100], active: true });
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
        setRenderTrigger(t => t + 1);
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        setDistance(Math.floor(distanceTraveled.current));
    }
    prevStatus.current = status; prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) playerObjRef.current = group.children[0];
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05); 
    const dist = speed * safeDelta;
    distanceTraveled.current += dist;
    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    if (playerObjRef.current) playerObjRef.current.getWorldPosition(playerPos);

    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of currentObjects) {
        let moveAmount = dist;
        if (obj.type === ObjectType.MISSILE) moveAmount += INK_BLAST_SPEED * safeDelta;
        
        const prevZ = obj.position[2];
        obj.position[2] += moveAmount;

        if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
             if (obj.position[2] > -90) {
                 obj.hasFired = true;
                 newSpawns.push({ id: uuidv4(), type: ObjectType.MISSILE, position: [obj.position[0], 1.0, obj.position[2] + 2], active: true, color: '#ffffff' });
                 hasChanges = true;
                 window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: '#aa00ff' } }));
             }
        }

        let keep = true;
        if (obj.active) {
            const zThreshold = 2.0; 
            const inZZone = (prevZ < playerPos.z + zThreshold) && (obj.position[2] > playerPos.z - zThreshold);
            
            if (obj.type === ObjectType.SHOP_PORTAL) {
                if (Math.abs(obj.position[2] - playerPos.z) < 2) { 
                     openShop(); obj.active = false; hasChanges = true; keep = false; 
                }
            } else if (inZZone) {
                const collisionThreshold = obj.isSnowball ? LANE_WIDTH : 0.9;
                if (Math.abs(obj.position[0] - playerPos.x) < collisionThreshold) {
                     const isDamageSource = obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE;
                     if (isDamageSource) {
                         const playerBottom = playerPos.y; const playerTop = playerPos.y + 1.8;
                         let objBottom = obj.position[1] - 0.5, objTop = obj.position[1] + 0.5;
                         if (obj.type === ObjectType.OBSTACLE) { objBottom = 0; objTop = obj.isSnowball ? LANE_WIDTH * 1.6 : 1.6; }
                         if ((playerBottom < objTop) && (playerTop > objBottom)) { 
                             if (isInvincible && obj.type === ObjectType.OBSTACLE) {
                                 audio.playShatter();
                                 window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: '#a5f3fc', burstAmount: 100 }}));
                                 obj.active = false; hasChanges = true;
                             } else {
                                 window.dispatchEvent(new Event('player-hit')); obj.active = false; hasChanges = true;
                                 if (obj.type === ObjectType.MISSILE) window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: '#ffffff', burstAmount: 60 } }));
                             }
                         }
                     } else {
                         if (Math.abs(obj.position[1] - playerPos.y) < 2.5) {
                            let collected = false;
                            if (obj.type === ObjectType.GEM) { collectGem(obj.points || 50); audio.playGemCollect(); collected = true; }
                            if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) { collectLetter(obj.targetIndex); audio.playLetterCollect(); collected = true; }
                            if (obj.powerUpType) { collectPowerUp(obj.powerUpType); audio.playLetterCollect(); collected = true; }
                            if (collected) {
                                window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: obj.color || '#ffffff' } }));
                                obj.active = false; hasChanges = true;
                            }
                         }
                     }
                }
            }
        }

        if (obj.position[2] > REMOVE_DISTANCE) { keep = false; hasChanges = true; }
        if (keep) keptObjects.push(obj);
    }

    if (newSpawns.length > 0) keptObjects.push(...newSpawns);

    let furthestZ = Math.min(0, ...keptObjects.filter(o => o.type !== ObjectType.MISSILE).map(o => o.position[2]));
    
    const currentSpawnDistance = SPAWN_DISTANCE + (level - 1) * 60;

    if (furthestZ > -currentSpawnDistance) {
         const minGap = 12 + (speed * 0.4); 
         const spawnZ = Math.min(furthestZ - minGap, -currentSpawnDistance);
         const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

         if (isLetterDue) {
             const lane = getRandomLane(laneCount);
             const currentTarget = LEVEL_TARGETS[level - 1];
             const currentColors = LEVEL_COLORS[level - 1];
             const availableIndices = currentTarget.map((_, i) => i).filter(i => !collectedLetters.includes(i));
             if (availableIndices.length > 0) {
                 const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                 keptObjects.push({ id: uuidv4(), type: ObjectType.LETTER, position: [lane * LANE_WIDTH, 1.0, spawnZ], active: true, color: currentColors[chosenIndex], value: currentTarget[chosenIndex], targetIndex: chosenIndex });
                 nextLetterDistance.current += getLetterInterval(level); hasChanges = true;
             }
         } else if (Math.random() > 0.1) {
            const spawnLane = getRandomLane(laneCount); const p = Math.random();
            if (p < 0.08) {
                const isInvincibility = Math.random() > 0.5;
                keptObjects.push({ id: uuidv4(), active: true, position: [spawnLane * LANE_WIDTH, 1.2, spawnZ], type: isInvincibility ? ObjectType.POWERUP_INVINCIBILITY : ObjectType.POWERUP_SCORE_MULTIPLIER, powerUpType: isInvincibility ? 'INVINCIBILITY' : 'SCORE_MULTIPLIER', color: isInvincibility ? '#ffd700' : '#00ff88'});
            } else if (p < (visualLevel === 3 ? 0.95 : 0.80)) {
                const spawnSquid = visualLevel === 2 && Math.random() < 0.2;
                if (spawnSquid) {
                    keptObjects.push({ id: uuidv4(), type: ObjectType.ALIEN, position: [spawnLane * LANE_WIDTH, 2.5, spawnZ], active: true, color: '#55ccaa', hasFired: false });
                } else {
                     if (visualLevel === 3 && Math.random() < 0.25) { // 25% chance for a big snowball
                        const maxLane = Math.floor(laneCount / 2);
                        const startLane = Math.floor(Math.random() * (laneCount - 1)) - maxLane;
                        const snowballX = (startLane + 0.5) * LANE_WIDTH;
                        keptObjects.push({ id: uuidv4(), type: ObjectType.OBSTACLE, position: [snowballX, LANE_WIDTH * 0.8, spawnZ], active: true, color: '#ff4499', isSnowball: true });
                    } else {
                        const availableLanes = Array.from({length: laneCount}, (_, i) => i - Math.floor(laneCount/2)).sort(() => .5 - Math.random());
                        let countToSpawn;
                        if (visualLevel === 3 || visualLevel === 4) {
                            countToSpawn = Math.random() > 0.6 ? 4 : Math.random() > 0.2 ? 3 : 2;
                        } else {
                            countToSpawn = Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1;
                        }
                        
                        for (let i = 0; i < Math.min(countToSpawn, laneCount); i++) {
                            const yPos = 0.8; // All obstacles on ground now
                            keptObjects.push({ id: uuidv4(), type: ObjectType.OBSTACLE, position: [availableLanes[i] * LANE_WIDTH, yPos, spawnZ], active: true, color: '#ff4499' });
                        }
                    }
                }
            } else {
                keptObjects.push({ id: uuidv4(), type: ObjectType.GEM, position: [spawnLane * LANE_WIDTH, 1.2, spawnZ], active: true, color: '#ffffff', points: 50 });
            }
            hasChanges = true;
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => obj.active ? <GameEntity key={obj.id} data={obj} visualLevel={visualLevel} /> : null)}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject, visualLevel: number }> = React.memo(({ data, visualLevel }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);
    const shadowRef = useRef<THREE.Mesh>(null);
    const whirlpoolMatRef = useRef<THREE.ShaderMaterial>(null);
    const { laneCount } = useStore();
    
    useFrame((state, delta) => {
        if (groupRef.current) groupRef.current.position.set(data.position[0], 0, data.position[2]);
        if (whirlpoolMatRef.current && whirlpoolMatRef.current.uniforms.uTime) whirlpoolMatRef.current.uniforms.uTime.value = state.clock.elapsedTime;

        if (visualRef.current) {
            const baseHeight = data.position[1];
            if (data.type === ObjectType.ALIEN) {
                 visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.3;
                 visualRef.current.rotation.y += delta * 0.5;
            } else if (data.type !== ObjectType.OBSTACLE && data.type !== ObjectType.SHOP_PORTAL) {
                visualRef.current.rotation.y += delta * 2;
                const bobOffset = Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
                visualRef.current.position.y = baseHeight + bobOffset;
                if (shadowRef.current) shadowRef.current.scale.setScalar(1 - bobOffset);
            } else {
                visualRef.current.position.y = baseHeight;
            }
        }
    });

    const shadowGeo = useMemo(() => {
        if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
        if (data.type === ObjectType.GEM || data.powerUpType) return SHADOW_GEM_GEO;
        if (data.type === ObjectType.SHOP_PORTAL) return null;
        if (data.type === ObjectType.ALIEN) return SHADOW_SQUID_GEO;
        if (data.type === ObjectType.MISSILE) return SHADOW_INK_BLAST_GEO;
        if (data.isSnowball) return new THREE.CircleGeometry(LANE_WIDTH * 0.8, 32);
        return SHADOW_DEFAULT_GEO; 
    }, [data.type, data.powerUpType, data.isSnowball]);
    
    const colors = useMemo(() => ({
        obstacle: { 1: '#ffffff', 2: '#331122', 3: '#60a5fa', 4: '#582f0e', 5: '#222222', 6: '#d8b4fe' }[visualLevel],
        obstacleGlow: { 1: '#00ffff', 2: '#ff4499', 3: '#93c5fd', 4: '#70e000', 5: '#ffffff', 6: '#a855f7' }[visualLevel],
        gem: { 1: '#ff88ff', 2: '#ffffff', 3: '#ffffff', 4: '#ccff33', 5: '#ffd700', 6: '#22d3ee' }[visualLevel],
        gemEmissive: { 1: '#ff00ff', 2: '#dddddd', 3: '#a5f3fc', 4: '#70e000', 5: '#ffffff', 6: '#22d3ee' }[visualLevel],
    }), [visualLevel]);

    return (
        <group ref={groupRef}>
            {shadowGeo && <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}><meshBasicMaterial color="#000000" opacity={0.3} transparent /></mesh>}
            <group ref={visualRef} position={[0, data.position[1], 0]} rotation={data.rotation || [0, 0, 0]}>
                {data.type === ObjectType.SHOP_PORTAL && (<><Center position={[0, 5, 0.6]}><Text3D font={FONT_URL} size={1.2} height={0.2}>ABYSSAL FORGE<meshBasicMaterial color="#ffff00" /></Text3D></Center><mesh rotation={[-Math.PI/2, 0, 0]} scale={[laneCount * LANE_WIDTH * 1.5, laneCount * LANE_WIDTH * 1.5, 1]} geometry={WHIRLPOOL_GEO}><shaderMaterial ref={whirlpoolMatRef} transparent uniforms={{ uTime: { value: 0 }, uColor: { value: new THREE.Color('#00ffff') } }} vertexShader={`varying vec2 vUv; uniform float uTime; void main() { vUv = uv; vec2 c = vec2(0.5, 0.5); float d = distance(vUv, c); float a = atan(vUv.y - c.y, vUv.x - c.x); float r = d * (1.0 + 0.2 * sin(d * 10.0 - uTime * 2.0)); vec3 pos = position; pos.z += sin(d * 10.0 + uTime) * 0.2; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); }`} fragmentShader={`varying vec2 vUv; uniform float uTime; uniform vec3 uColor; void main() { vec2 c = vec2(0.5, 0.5); float d = distance(vUv, c); float a = atan(vUv.y - c.y, vUv.x - c.x) / (2.0 * 3.14159); float spiral = mod(a + d * 5.0 - uTime * 0.5, 0.2); float alpha = smoothstep(0.5, 0.0, d) * (1.0 - smoothstep(0.05, 0.0, spiral)); gl_FragColor = vec4(uColor, alpha); }`} /></mesh></>)}
                {data.type === ObjectType.OBSTACLE && (<group><mesh geometry={data.isSnowball ? SNOWBALL_GEO : OBSTACLE_GEOS[visualLevel as keyof typeof OBSTACLE_GEOS]} castShadow><meshStandardMaterial color={colors.obstacle} roughness={data.isSnowball ? 0.9 : 0.6} metalness={0.8} vertexColors={!data.isSnowball && visualLevel === 1} /></mesh><mesh geometry={data.isSnowball ? SNOWBALL_GLOW_GEO : OBSTACLE_GLOW_GEOS[visualLevel as keyof typeof OBSTACLE_GLOW_GEOS]}><meshBasicMaterial color={colors.obstacleGlow} wireframe transparent opacity={0.3} /></mesh></group>)}
                {data.type === ObjectType.ALIEN && (<group><mesh castShadow geometry={SQUID_BODY_GEO} position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={0.5} roughness={0.5} metalness={0.8} /></mesh><mesh position={[0.3, 0.3, 0.3]} geometry={SQUID_EYE_GEO}><meshBasicMaterial color="#ffff00" /></mesh><mesh position={[-0.3, 0.3, 0.3]} geometry={SQUID_EYE_GEO}><meshBasicMaterial color="#ffff00" /></mesh></group>)}
                {data.type === ObjectType.MISSILE && (<mesh geometry={INK_BLAST_CORE_GEO}><meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={5} toneMapped={false} /></mesh>)}
                {data.type === ObjectType.GEM && (<mesh castShadow geometry={GEM_GEOS[visualLevel as keyof typeof GEM_GEOS]} rotation={visualLevel === 2 ? [Math.PI/2,0,0] : [0,0,0]}><meshStandardMaterial color={colors.gem} roughness={0.1} metalness={0.2} emissive={colors.gemEmissive} emissiveIntensity={0.2} /></mesh>)}
                {data.type === ObjectType.LETTER && (<group scale={[1.5, 1.5, 1.5]}><Center><Text3D font={FONT_URL} size={0.8} height={0.5} bevelEnabled bevelThickness={0.02} bevelSize={0.02} bevelSegments={5}>{data.value}<meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.5} /></Text3D></Center></group>)}
                {data.type === ObjectType.POWERUP_INVINCIBILITY && (
                    <Float>
                        <mesh geometry={POWERUP_SHIELD_GEO}><meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={2} metalness={1} roughness={0.1} /></mesh>
                        <Center position={[0, 1.0, 0]}>
                            <Text3D font={FONT_URL} size={0.3} height={0.05}>
                                SHIELD
                                <meshBasicMaterial color={data.color} toneMapped={false} />
                            </Text3D>
                        </Center>
                    </Float>
                )}
                {data.type === ObjectType.POWERUP_SCORE_MULTIPLIER && (
                    <Float>
                        <mesh geometry={POWERUP_MULTIPLIER_GEO}><meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={2} metalness={1} roughness={0.1} /></mesh>
                        <Center position={[0, 0.8, 0]}>
                            <Text3D font={FONT_URL} size={0.5} height={0.05}>
                                2X
                                <meshBasicMaterial color={data.color} toneMapped={false} />
                            </Text3D>
                        </Center>
                    </Float>
                )}
            </group>
        </group>
    );
});
