

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { LANE_WIDTH } from '../../../types';
import { Sky } from '@react-three/drei';
import { CrystalCaveParticles } from './SharedComponents';
import { audio } from '../../System/Audio';

const CHUNK_LENGTH_COASTAL = 400;

const WaterFloor = () => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    useFrame((state) => {
        if (matRef.current && matRef.current.uniforms.uTime) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00aaff') },
        uWaveSpeed: { value: 0.8 },
        uWaveFrequency: { value: new THREE.Vector2(6, 3) },
        uWaveHeight: { value: 0.1 },
    }), []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -150]}>
            <planeGeometry args={[300, 400, 100, 100]} />
            <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
                vertexShader={`
                    uniform float uTime;
                    uniform float uWaveSpeed;
                    uniform vec2 uWaveFrequency;
                    uniform float uWaveHeight;
                    varying float vElevation;
                    varying vec2 vUv;
                    varying vec3 vPosition;

                    void main() {
                        vUv = uv;
                        vec3 pos = position;
                        float wave1 = sin(pos.x * uWaveFrequency.x + uTime * uWaveSpeed);
                        float wave2 = cos(pos.y * uWaveFrequency.y + uTime * uWaveSpeed * 0.7);
                        float wave3 = sin(pos.x * uWaveFrequency.x * 2.1 + pos.y * uWaveFrequency.y * 1.5 + uTime * uWaveSpeed * 1.2);
                        float elevation = (wave1 + wave2 + wave3 * 0.5) * uWaveHeight;
                        pos.z += elevation;
                        vElevation = elevation;
                        vPosition = pos;

                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform vec3 uColor;
                    uniform float uTime;
                    uniform float uWaveHeight;
                    varying float vElevation;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                    float snoise(vec2 v) {
                        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                        vec2 i  = floor(v + dot(v, C.yy) );
                        vec2 x0 = v -   i + dot(i, C.xx);
                        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                        vec2 x1 = x0.xy + C.xx - i1;
                        vec2 x2 = x0.xy + C.zz;
                        i = mod(i, 289.0);
                        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
                        m = m*m ; m = m*m ;
                        vec3 x = 2.0 * fract(p * C.www) - 1.0;
                        vec3 h = abs(x) - 0.5;
                        vec3 ox = floor(x + 0.5);
                        vec3 a0 = x - ox;
                        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                        vec3 g;
                        g.x  = a0.x  * x0.x  + h.x  * x0.y;
                        g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
                        return 130.0 * dot(m, g);
                    }

                    void main() {
                        // Animated Caustics Pattern
                        vec2 uv = vUv * 15.0; // Higher density for web-like look
                        float t = uTime * 0.4;
                        
                        // Domain warping for fluid look
                        vec2 q = vec2(snoise(uv + vec2(0.0, t)), snoise(uv + vec2(5.2, 1.3)));
                        vec2 r = vec2(snoise(uv + 4.0 * q + vec2(1.7, 9.2) - t), snoise(uv + 2.0 * q + vec2(8.3, 2.8)));
                        float n = snoise(uv + 4.0 * r);

                        // Sharpen noise to create lines
                        float caustic = smoothstep(0.65, 0.85, n * 0.5 + 0.5); 
                        
                        // Base color mix
                        vec3 deepColor = vec3(0.0, 0.3, 0.7);
                        vec3 shallowColor = vec3(0.0, 0.8, 0.9);
                        vec3 finalColor = mix(deepColor, shallowColor, vElevation / uWaveHeight * 0.5 + 0.5);
                        
                        // Add bright caustics
                        finalColor += vec3(0.8, 0.9, 1.0) * caustic * 0.6;
                        
                        float fresnel = 1.0 - abs(vElevation / uWaveHeight);
                        gl_FragColor = vec4(finalColor, 0.7 + fresnel * 0.3);
                    }
                `}
                transparent
            />
        </mesh>
    );
};

const FoamParticles = () => {
    const speed = useStore(state => state.speed);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 300; i++) {
            temp.push({ 
                x: (Math.random() - 0.5) * 200, 
                y: -0.5, 
                z: -Math.random() * CHUNK_LENGTH_COASTAL, 
                scale: 0.2 + Math.random() * 0.4,
                life: Math.random(),
                speed: 0.5 + Math.random() * 0.5
            });
        }
        return temp;
    }, []);

    useFrame((state, delta) => {
        if (!instancedMeshRef.current) return;
        const moveSpeed = speed > 0 ? speed : 2;

        particles.forEach((p, i) => {
            // Move with world
            p.z += moveSpeed * delta;
            
            // Rise and fade
            p.life -= delta * 0.5;
            p.y += delta * p.speed;
            
            if (p.z > 50 || p.life <= 0) {
                p.z = -CHUNK_LENGTH_COASTAL - Math.random() * 50;
                p.y = -0.5;
                p.life = 1.0;
                p.x = (Math.random() - 0.5) * 200;
            }

            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.setScalar(p.scale * p.life); // Fade out size
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particles.length]}>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial color="#ccffff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
};

const BeachTerrain = () => {
    const { laneCount } = useStore.getState();
    const terrainGeo = useMemo(() => {
        const width = 160; const length = 400; const widthSegments = 60; const lengthSegments = 100;
        const geo = new THREE.PlaneGeometry(width, length, widthSegments, lengthSegments);
        const { position } = geo.attributes;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i); const y = position.getY(i);
            const edgeFactor = 1 - Math.pow(Math.abs(x) / (width / 2), 2);
            const randomHeight = (Math.sin(y * 0.1 + x * 0.05) + Math.cos(y * 0.05)) * 1.5;
            position.setZ(i, (position.getZ(i) + randomHeight) * edgeFactor);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    const terrainMaterial = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);

    useMemo(() => {
        const { position } = terrainGeo.attributes;
        const colors: number[] = [];
        const sandColor = new THREE.Color('#c2b280');
        const grassColor = new THREE.Color('#3A5F0B');
        for (let i = 0; i < position.count; i++) {
            const height = position.getZ(i);
            const t = THREE.MathUtils.smoothstep(height, 0, 2.5);
            const color = sandColor.clone().lerp(grassColor, t);
            colors.push(color.r, color.g, color.b);
        }
        terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }, [terrainGeo]);

    const baseOffset = (laneCount * LANE_WIDTH / 2) + 80;

    return (
        <group>
            <mesh receiveShadow geometry={terrainGeo} material={terrainMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[-baseOffset, -0.5, -150]} />
            <mesh receiveShadow geometry={terrainGeo} material={terrainMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[baseOffset, -0.5, -150]} />
        </group>
    );
};

const LowPolyTrees = () => {
    const { laneCount } = useStore.getState();
    const trees = useMemo(() => {
        const temp: { position: [number, number, number], scale: number }[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 120; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 5 + Math.random() * 150);
            const z = -Math.random() * 400;
            const y = -0.5;
            temp.push({ position: [x, y, z], scale: 1.2 + Math.random() * 1.8 });
        }
        return temp;
    }, [laneCount]);

    const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.2, 1.5, 5), []);
    const leavesGeo = useMemo(() => new THREE.IcosahedronGeometry(0.8, 0), []);
    const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6e4a2e' }), []);
    const leavesMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2E8B57', flatShading: true }), []);

    return (
        <group>
            {trees.map((tree, i) => (
                <group key={i} position={tree.position} scale={tree.scale}>
                    <mesh castShadow position={[0, 0.75, 0]} geometry={trunkGeo} material={trunkMat} />
                    <mesh castShadow position={[0, 1.8, 0]} geometry={leavesGeo} material={leavesMat} />
                </group>
            ))}
        </group>
    );
};

const CloudShadows = () => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    useFrame((state, delta) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, -150]}>
            <planeGeometry args={[500, 500]} />
            <shaderMaterial
                ref={matRef}
                transparent
                depthWrite={false}
                uniforms={{ uTime: { value: 0 } }}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform float uTime;
                    varying vec2 vUv;
                    
                    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                    float snoise(vec2 v) {
                        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                        vec2 i  = floor(v + dot(v, C.yy) );
                        vec2 x0 = v -   i + dot(i, C.xx);
                        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                        vec2 x1 = x0.xy + C.xx - i1;
                        vec2 x2 = x0.xy + C.zz;
                        i = mod(i, 289.0);
                        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
                        m = m*m ; m = m*m ;
                        vec3 x = 2.0 * fract(p * C.www) - 1.0;
                        vec3 h = abs(x) - 0.5;
                        vec3 ox = floor(x + 0.5);
                        vec3 a0 = x - ox;
                        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                        vec3 g;
                        g.x  = a0.x  * x0.x  + h.x  * x0.y;
                        g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
                        return 130.0 * dot(m, g);
                    }

                    void main() {
                        // Slow drifting clouds
                        vec2 uv = vUv * 4.0 + vec2(uTime * 0.05, uTime * 0.02);
                        float n = snoise(uv);
                        n += 0.5 * snoise(uv * 2.0);
                        
                        // Soft shadows
                        float shadow = smoothstep(0.4, 0.8, n);
                        
                        gl_FragColor = vec4(0.0, 0.0, 0.0, shadow * 0.3); // Black with transparency
                    }
                `}
            />
        </mesh>
    );
};

// --- Flying Seagull Logic ---

interface SeagullProps {
    id: number;
    isActive: boolean;
    startPos: THREE.Vector3;
    velocity: THREE.Vector3;
    offset: number; // For flap timing variation
}

const SeagullFlock = () => {
    // Manage a pool of seagulls. We want a flock of ~3-5 birds.
    // Pool size is larger to handle multiple waves if needed, though rare.
    const [seagulls, setSeagulls] = useState<SeagullProps[]>(
        Array.from({length: 10}).map((_, i) => ({ 
            id: i, 
            isActive: false, 
            startPos: new THREE.Vector3(), 
            velocity: new THREE.Vector3(),
            offset: Math.random() * Math.PI
        }))
    );
    
    const lastSpawnTime = useRef(0);
    const nextSpawnDelay = useRef(5); // Initial delay short

    useFrame((state, delta) => {
        // Spawn logic: Spawn a flock "once in a while" (15-25 seconds)
        if (state.clock.elapsedTime - lastSpawnTime.current > nextSpawnDelay.current) {
            lastSpawnTime.current = state.clock.elapsedTime;
            nextSpawnDelay.current = 15 + Math.random() * 10; // Random delay between 15-25s

            // Spawn a flock of exactly 3 or 4 birds
            const flockSize = 3 + Math.floor(Math.random() * 2); // 3 or 4
            const side = Math.random() > 0.5 ? 1 : -1;
            const startX = side * (60 + Math.random() * 20); // Start off-screen
            const startY = 15 + Math.random() * 10;
            const startZ = -20 - Math.random() * 60;
            
            // Base Velocity
            const speed = 15 + Math.random() * 5;
            const baseVelX = -side * speed; 
            const baseVelZ = (Math.random() - 0.5) * 5;
            
            let spawnedCount = 0;
            const newSeagulls = [...seagulls];

            for (let i = 0; i < newSeagulls.length; i++) {
                if (!newSeagulls[i].isActive) {
                    newSeagulls[i] = {
                        ...newSeagulls[i],
                        isActive: true,
                        // Offset each bird slightly to form a flock
                        startPos: new THREE.Vector3(
                            startX + (Math.random() - 0.5) * 10,
                            startY + (Math.random() - 0.5) * 5,
                            startZ + (Math.random() - 0.5) * 10
                        ),
                        velocity: new THREE.Vector3(
                            baseVelX + (Math.random() - 0.5), // slight speed variance
                            (Math.random() - 0.5) * 2, // slight vertical drift
                            baseVelZ + (Math.random() - 0.5)
                        )
                    };
                    spawnedCount++;
                    if (spawnedCount >= flockSize) break;
                }
            }
            setSeagulls(newSeagulls);
            
            // Play the call sound once for the whole flock
            audio.playSeagull();
        }
    });

    const handleDeactivate = (id: number) => {
        setSeagulls(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s));
    };

    return (
        <group>
            {seagulls.map(s => (
                <Seagull key={s.id} data={s} onComplete={() => handleDeactivate(s.id)} />
            ))}
        </group>
    );
};

const Seagull: React.FC<{ data: SeagullProps, onComplete: () => void }> = ({ data, onComplete }) => {
    const groupRef = useRef<THREE.Group>(null);
    const leftWingRef = useRef<THREE.Group>(null);
    const rightWingRef = useRef<THREE.Group>(null);
    const lastFlapRef = useRef(0);

    // Initial positioning
    useEffect(() => {
        if (data.isActive && groupRef.current) {
            groupRef.current.position.copy(data.startPos);
            // Look direction (velocity)
            const lookTarget = data.startPos.clone().add(data.velocity);
            groupRef.current.lookAt(lookTarget);
        }
    }, [data.isActive, data.startPos, data.velocity]);

    useFrame((state, delta) => {
        if (!data.isActive || !groupRef.current) return;

        // Move
        groupRef.current.position.addScaledVector(data.velocity, delta);

        // Animate wings
        // Flap Speed = ~3Hz (approx 18 rad/s)
        const flapCycle = Math.sin(state.clock.elapsedTime * 18 + data.offset);
        const flapAngle = flapCycle * 0.5;

        if (leftWingRef.current) leftWingRef.current.rotation.z = flapAngle;
        if (rightWingRef.current) rightWingRef.current.rotation.z = -flapAngle;

        // Trigger Flap Sound at the peak of the downstroke (approx when sin goes negative)
        // We use a simple latch to prevent multiple triggers per frame
        if (flapCycle < -0.8 && state.clock.elapsedTime - lastFlapRef.current > 0.3) {
            lastFlapRef.current = state.clock.elapsedTime;
            // Lower volume for distant birds would be ideal, but simple trigger is okay
            // Only play if somewhat close to Z=0 to avoid noise pollution
            if (groupRef.current.position.z > -150 && groupRef.current.position.z < 50) {
                 audio.playWingFlap();
            }
        }

        // Check bounds (if it flew off screen)
        if (Math.abs(groupRef.current.position.x) > 120) {
            onComplete();
        }
    });

    if (!data.isActive) return null;

    return (
        <group ref={groupRef}>
            {/* Body */}
            <mesh rotation={[Math.PI/2, 0, 0]}>
                <coneGeometry args={[0.2, 1, 8]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            
            {/* Left Wing Pivot */}
            <group position={[0, 0, 0]} ref={leftWingRef}>
                 <mesh position={[0.6, 0, 0]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[1.2, 0.05, 0.4]} />
                    <meshStandardMaterial color="#eeeeee" />
                 </mesh>
            </group>

            {/* Right Wing Pivot */}
            <group position={[0, 0, 0]} ref={rightWingRef}>
                 <mesh position={[-0.6, 0, 0]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[1.2, 0.05, 0.4]} />
                    <meshStandardMaterial color="#eeeeee" />
                 </mesh>
            </group>
        </group>
    );
};


const CoastalParticles = () => <CrystalCaveParticles color="#00ffff" />;

const DistantIslands = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const islands = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 6; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (150 + Math.random() * 200);
            const z = -Math.random() * CHUNK_LENGTH_COASTAL;
            const s = 30 + Math.random() * 40;
            temp.push({ pos: [x, -10, z], scale: [s, s * 0.5, s] });
        }
        return temp;
    }, []);

    return (
        <group ref={ref} {...props}>
             {islands.map((m, i) => (
                 <mesh key={i} position={m.pos as any} scale={m.scale as any}>
                     <dodecahedronGeometry args={[1, 1]} />
                     <meshStandardMaterial color="#1e293b" roughness={1} fog={true} />
                 </mesh>
             ))}
        </group>
    );
});

const ParallaxMountains = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const mountains = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 16; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            // Spread further out to frame the horizon
            const x = side * (200 + Math.random() * 300); 
            const z = -Math.random() * CHUNK_LENGTH_COASTAL;
            
            // Random scaling for jagged look
            const scaleX = 80 + Math.random() * 100;
            const scaleY = 60 + Math.random() * 80;
            const scaleZ = 80 + Math.random() * 100;
            
            temp.push({ 
                pos: [x, -25, z], 
                scale: [scaleX, scaleY, scaleZ],
                rot: [0, Math.random() * Math.PI, 0]
            });
        }
        return temp;
    }, []);

    return (
        <group ref={ref} {...props}>
             {mountains.map((m, i) => (
                 <mesh key={i} position={m.pos as any} scale={m.scale as any} rotation={m.rot as any}>
                     {/* Tetrahedron for jagged, mountain-like shape */}
                     <tetrahedronGeometry args={[1, 0]} />
                     <meshStandardMaterial color="#1e1b4b" roughness={0.9} fog={true} />
                 </mesh>
             ))}
        </group>
    );
});

const DynamicSkyClouds = () => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    useFrame((state) => {
        if(matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
        <mesh position={[0, 50, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <sphereGeometry args={[400, 32, 16]} />
            <shaderMaterial 
                ref={matRef}
                side={THREE.BackSide}
                transparent
                uniforms={{ uTime: { value: 0 } }}
                vertexShader={`
                    varying vec2 vUv;
                    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
                `}
                fragmentShader={`
                    uniform float uTime;
                    varying vec2 vUv;
                    
                    // Simple noise function
                    float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
                    float noise(vec2 x) {
                        vec2 i = floor(x);
                        vec2 f = fract(x);
                        float a = hash(i);
                        float b = hash(i + vec2(1.0, 0.0));
                        float c = hash(i + vec2(0.0, 1.0));
                        float d = hash(i + vec2(1.0, 1.0));
                        vec2 u = f * f * (3.0 - 2.0 * f);
                        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                    }

                    void main() {
                        vec2 uv = vUv * 6.0;
                        float t = uTime * 0.05;
                        
                        float n = noise(uv + vec2(t, t * 0.5));
                        n += 0.5 * noise(uv * 2.0 + vec2(-t, t));
                        
                        float cloud = smoothstep(0.4, 0.8, n);
                        vec3 skyColor = vec3(0.53, 0.81, 0.92); // Sky blue
                        vec3 cloudColor = vec3(1.0, 0.9, 0.95); // White/Pinkish
                        
                        // Add emissive glow at edges
                        cloudColor += vec3(0.2, 0.1, 0.3) * cloud;

                        vec3 finalColor = mix(skyColor, cloudColor, cloud * 0.8);
                        
                        // Fade to horizon
                        float horizon = smoothstep(0.48, 0.52, vUv.y); // Sphere UV y goes 0-1
                        
                        gl_FragColor = vec4(finalColor, 1.0); 
                    }
                `}
            />
        </mesh>
    );
}

const CoastalContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group ref={ref} {...props}>
            <WaterFloor />
            <BeachTerrain />
            <CloudShadows />
            <LowPolyTrees />
            <group position={[0, 0.02, 0]}>
                 <mesh receiveShadow position={[0, -0.02, -150]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[laneCount * LANE_WIDTH, 400]} />
                    <meshStandardMaterial color={'#080808'} />
                </mesh>
                {separators.map((x, i) => (
                    <mesh key={`sep-${i}`} position={[x, 0, -150]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, 400]} />
                        <meshBasicMaterial color={'#00aaff'} transparent opacity={0.4} />
                    </mesh>
                ))}
            </group>
        </group>
    );
});

const CoastalRunEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);
    const bgRef1 = useRef<THREE.Group>(null);
    const bgRef2 = useRef<THREE.Group>(null);
    
    // Player Splash Detection
    const playerY = useRef(0);
    const prevPlayerY = useRef(0);

    // Audio Ambience Management
    useEffect(() => {
        audio.startCoastalAmbience();
        return () => {
            audio.stopCoastalAmbience();
        };
    }, []);

    useFrame((state, delta) => {
        const movement = speed * delta;
        // Foreground
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH_COASTAL) {
                contentRef1.current.position.z -= CHUNK_LENGTH_COASTAL * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH_COASTAL) {
                contentRef2.current.position.z -= CHUNK_LENGTH_COASTAL * 2;
            }
        }

        // Background Parallax (Slower)
        const bgMovement = movement * 0.1;
        if (bgRef1.current) {
            bgRef1.current.position.z += bgMovement;
            if (bgRef1.current.position.z > CHUNK_LENGTH_COASTAL) {
                bgRef1.current.position.z -= CHUNK_LENGTH_COASTAL * 2;
            }
        }
        if (bgRef2.current) {
            bgRef2.current.position.z += bgMovement;
            if (bgRef2.current.position.z > CHUNK_LENGTH_COASTAL) {
                bgRef2.current.position.z -= CHUNK_LENGTH_COASTAL * 2;
            }
        }

        // --- Lava/Water Splash Logic ---
        // Find player object to track Y position
        const playerGroup = state.scene.getObjectByName('PlayerGroup');
        if (playerGroup && playerGroup.children.length > 0) {
            const player = playerGroup.children[0];
            playerY.current = player.position.y;

            // Detect landing: falling (prev > curr) and hitting ground (curr ~ 0)
            if (prevPlayerY.current > 0.05 && playerY.current <= 0.01) {
                 audio.playLavaSplash(); // Using heavy splash sound as requested
            }
            prevPlayerY.current = playerY.current;
        }
    });

    return (
        <>
            <fog attach="fog" args={['#87CEEB', 150, 350]} />
            <ambientLight intensity={0.7} color="#ffffff" />
            <directionalLight castShadow position={[50, 50, 20]} intensity={2.0} color="#ffffdd" shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-50, 20, -20]} intensity={0.5} color="#aaddff" />

            {/* Replaced Sky with Dynamic Cloud Shader */}
            <DynamicSkyClouds />

            <group>
                {/* Parallax Mountains and Islands */}
                <group>
                    <ParallaxMountains ref={bgRef1} position={[0, 0, 0]} />
                    <ParallaxMountains ref={bgRef2} position={[0, 0, -CHUNK_LENGTH_COASTAL]} />
                </group>
                <group position={[0, 0, -100]}> {/* Offset islands further back */}
                    <DistantIslands position={[0, 0, 0]} />
                </group>
            </group>

            <group>
                <CoastalContent ref={contentRef1} position={[0, 0, 0]} />
                <CoastalContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH_COASTAL]} />
            </group>
            <CoastalParticles />
            <FoamParticles />
            <SeagullFlock />
        </>
    );
};

export default CoastalRunEnvironment;