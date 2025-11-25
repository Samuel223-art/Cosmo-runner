
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { LANE_WIDTH } from '../../../types';
import { BaseParticleField, GiantJellyfish } from './SharedComponents';
import { audio } from '../../System/Audio';

const CHUNK_LENGTH = 400;

// --- Visual Components ---

const VolcanicParticles = () => {
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 300; i++) { // Reduced count
            const isEmber = Math.random() > 0.8;
            const z = -450 + Math.random() * 550;
            const parallaxFactor = isEmber ? (0.5 + Math.random() * 0.5) : (3.0 + Math.random() * 2.0);
            const scale = isEmber ? (0.3 + Math.random() * 0.5) : (0.2 + Math.random()*0.3);
            temp.push({ x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 200 + 40, z, parallaxFactor, scale, isBubble: false, isFish: isEmber });
        }
        return temp;
    }, []);

    return <BaseParticleField particles={particles} color="#ff8c00" />;
};

const AshParticles = () => {
    const speed = useStore(state => state.speed);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 400; i++) { // Reduced count
            temp.push({ 
                x: (Math.random() - 0.5) * 400, 
                y: Math.random() * 200, 
                z: -450 + Math.random() * 550, 
                parallaxFactor: (0.4 + Math.random() * 0.5), 
                scale: (0.1 + Math.random() * 0.2), 
                drift: (Math.random() - 0.5) * 1.5,
                initialX: 0
            });
        }
        temp.forEach(p => p.initialX = p.x);
        return temp;
    }, []);

    useFrame((state, delta) => {
        if (!instancedMeshRef.current) return;
        const activeSpeed = speed > 0 ? speed : 2;
        
        particles.forEach((p, i) => {
            p.z += activeSpeed * delta * p.parallaxFactor;
            p.y -= delta * (2.0 + p.parallaxFactor * 4); 
            p.x = p.initialX + p.drift * Math.sin(state.clock.elapsedTime + p.z * 0.2); 

            if (p.y < -10) p.y = 150 + Math.random() * 50;
            if (p.z > 100) p.z = -550 - Math.random() * 50;
            
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particles.length]}>
            <sphereGeometry args={[0.5, 6, 6]} />
            <meshBasicMaterial color={'#222222'} transparent opacity={0.6} />
        </instancedMesh>
    );
};

const EruptionDebris = ({ isErupting }: { isErupting: boolean }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
        return new Array(80).fill(0).map(() => ({ // Reduced count
            active: false,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            scale: 1,
            life: 0
        }));
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const safeDelta = Math.min(delta, 0.1);

        if (isErupting) {
            let spawnCount = 0;
            for (let i = 0; i < particles.length; i++) {
                if (!particles[i].active && spawnCount < 3) { // Lower spawn rate
                    particles[i].active = true;
                    particles[i].life = 1.0 + Math.random();
                    const startX = (Math.random() - 0.5) * 200;
                    particles[i].pos.set(startX, -5, -200 - Math.random() * 100);
                    particles[i].vel.set(
                        (Math.random() - 0.5) * 20, 
                        40 + Math.random() * 40, 
                        80 + Math.random() * 40 
                    );
                    particles[i].scale = 0.4 + Math.random() * 0.6;
                    spawnCount++;
                }
            }
        }

        particles.forEach((p, i) => {
            if (p.active) {
                p.life -= safeDelta * 0.5;
                p.vel.y -= 80 * safeDelta; 
                p.pos.addScaledVector(p.vel, safeDelta);

                if (p.pos.y < -5 || p.life <= 0) {
                    p.active = false;
                    dummy.scale.set(0,0,0);
                    if (Math.random() < 0.1 && p.pos.z > -20 && p.pos.z < 20) {
                        audio.playSizzle();
                    }
                } else {
                    dummy.position.copy(p.pos);
                    dummy.scale.setScalar(p.scale);
                    dummy.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
                }
            } else {
                dummy.scale.set(0,0,0);
            }
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 80]}>
            <tetrahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial color="#ff4400" toneMapped={false} />
        </instancedMesh>
    );
};

const LavaFloor = () => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    useFrame((state) => {
        if (matRef.current && matRef.current.uniforms.uTime) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
    }), []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, -CHUNK_LENGTH / 2]}>
            <planeGeometry args={[300, CHUNK_LENGTH, 40, 40]} />
            <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
                vertexShader={`
                    varying vec2 vUv;
                    uniform float uTime;
                    void main() {
                        vUv = uv;
                        vec3 pos = position;
                        float boil = sin(pos.x * 0.1 + uTime * 2.0) * cos(pos.y * 0.1 + uTime * 1.5) * 1.5;
                        pos.z += boil;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
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
                        vec2 i1;
                        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                        vec2 x1 = x0.xy + C.xx - i1;
                        vec2 x2 = x0.xy + C.zz;
                        i = mod(i, 289.0);
                        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
                        m = m*m ;
                        m = m*m ;
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
                        vec2 uv = vUv * 12.0;
                        float t = uTime * 0.5; 
                        float flow = snoise(uv * 0.5 + vec2(t * 0.5, t * 0.2));
                        float cracks = snoise(uv * 3.0 + vec2(t * 0.1, 0.0));
                        float crackMask = smoothstep(0.35, 0.45, abs(cracks)); 
                        float boil = snoise(uv * 8.0 + vec2(0.0, uTime * 2.0));
                        float boilMask = smoothstep(0.5, 0.9, boil);
                        vec3 darkRock = vec3(0.15, 0.05, 0.05);
                        vec3 magmaDark = vec3(0.6, 0.1, 0.0);
                        vec3 magmaBright = vec3(1.0, 0.4, 0.0);
                        vec3 hotWhite = vec3(1.0, 1.0, 0.8);
                        vec3 color = mix(magmaDark, magmaBright, flow * 0.5 + 0.5);
                        color = mix(color, darkRock, crackMask);
                        color = mix(color, hotWhite, boilMask);
                        color *= 1.0 + 0.15 * sin(uTime * 3.0 + uv.x);
                        gl_FragColor = vec4(color, 1.0);
                    }
                `}
            />
        </mesh>
    );
};

interface HoveringRockProps {
    position: [number, number, number];
    scale: number;
    rotation: [number, number, number];
}

const HoveringRock: React.FC<HoveringRockProps> = ({ position, scale, rotation }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [randomOffset] = useState(Math.random() * 100);
    const [rotationSpeed] = useState({
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2
    });

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;
        const bob = Math.sin(time * 1.5 + randomOffset) * 1.5;
        meshRef.current.position.y = position[1] + bob;
        meshRef.current.rotation.x += rotationSpeed.x * delta;
        meshRef.current.rotation.y += rotationSpeed.y * delta;
    });

    return (
        <mesh 
            ref={meshRef}
            position={position}
            scale={scale}
            rotation={rotation}
        >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
    );
};

const HoveringRocks = () => {
    const { laneCount } = useStore.getState();
    const rocks = useMemo(() => {
        const temp: HoveringRockProps[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 40; i++) { // Reduced
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 5 + Math.random() * 80);
            const z = -Math.random() * CHUNK_LENGTH;
            const scale = 2 + Math.random() * 6;
            const y = -2 + Math.random() * 4;
            temp.push({ 
                position: [x, y, z], 
                scale,
                rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]
            });
        }
        return temp;
    }, [laneCount]);

    return (
        <group>
            {rocks.map((rock, i) => (
                <HoveringRock 
                    key={i} 
                    {...rock}
                />
            ))}
        </group>
    );
};

const LavaSplashes = () => {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const splashCount = 10; // Reduced
    
    const splashes = useMemo(() => new Array(splashCount).fill(0).map(() => ({
        active: false,
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
    })), []);

    const { laneCount } = useStore.getState();

    useFrame((state, delta) => {
        if (!instancedMeshRef.current) return;
        
        if (Math.random() < 0.08) {
            const splash = splashes.find(s => !s.active);
            if (splash) {
                splash.active = true;
                splash.life = 1.0;
                
                const side = Math.random() > 0.5 ? 1 : -1;
                const baseOffset = (laneCount * LANE_WIDTH / 2);
                const x = side * (baseOffset + 2 + Math.random() * 10);
                const z = -Math.random() * CHUNK_LENGTH;

                splash.pos.set(x, -4.5, z);
                splash.vel.set((Math.random() - 0.5) * 5, 12 + Math.random() * 12, (Math.random() - 0.5) * 5);
            }
        }
        
        splashes.forEach((s, i) => {
            if (s.active) {
                s.life -= delta * 1.5;
                if (s.life <= 0) {
                    s.active = false;
                    dummy.scale.set(0, 0, 0);
                } else {
                    s.pos.addScaledVector(s.vel, delta);
                    s.vel.y -= 25 * delta;
                    dummy.position.copy(s.pos);
                    const scale = Math.sin(Math.PI * (1.0 - s.life)) * (0.5 + Math.random() * 0.8);
                    dummy.scale.set(scale, scale, scale);
                }
            } else {
                dummy.scale.set(0, 0, 0);
            }
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, splashCount]}>
            <sphereGeometry args={[0.5, 6, 6]} />
            <meshBasicMaterial color="#ffcc00" toneMapped={false} />
        </instancedMesh>
    );
};

const VolcanicLaneGuides: React.FC = () => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group position={[0, 0.02, 0]}>
            <mesh receiveShadow position={[0, -0.02, -CHUNK_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[laneCount * LANE_WIDTH, CHUNK_LENGTH]} />
                <meshStandardMaterial color={'#180800'} />
            </mesh>
            {separators.map((x, i) => (
                <mesh key={`sep-${i}`} position={[x, 0, -CHUNK_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.05, CHUNK_LENGTH]} />
                    <meshBasicMaterial color={'#ff8c00'} transparent opacity={0.4} />
                </mesh>
            ))}
        </group>
    );
};

const ParallaxVolcanoes = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const volcanoes = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 4; i++) { // Reduced count
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (250 + Math.random() * 150);
            const z = -Math.random() * CHUNK_LENGTH;
            const s = 60 + Math.random() * 60;
            temp.push({ pos: [x, -20, z], scale: [s, s * 0.8, s] });
        }
        return temp;
    }, []);

    return (
        <group ref={ref} {...props}>
             {volcanoes.map((m, i) => (
                 <mesh key={i} position={m.pos as any} scale={m.scale as any}>
                     <coneGeometry args={[1, 1, 4]} />
                     <meshStandardMaterial color="#3f0e04" roughness={0.9} fog={false} />
                 </mesh>
             ))}
        </group>
    );
});

// --- Dynamic Event Components ---

const FallingRock = ({ position, active }: { position: THREE.Vector3, active: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state, delta) => {
        if (!meshRef.current || !active) return;
        meshRef.current.position.copy(position);
        meshRef.current.rotation.x += delta * 2;
        meshRef.current.rotation.y += delta;
    });

    if (!active) return null;

    return (
        <mesh ref={meshRef} scale={[3, 3, 3]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#222" emissive="#ff2200" emissiveIntensity={0.5} roughness={0.9} />
            <mesh scale={[1.1, 1.1, 1.1]}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#ff4400" transparent opacity={0.3} wireframe />
            </mesh>
        </mesh>
    );
};

const CameraShaker = ({ isShaking }: { isShaking: boolean }) => {
    const { camera } = useThree();
    const shaking = useRef(false);

    useFrame(() => {
        if (isShaking) {
            if (!shaking.current) {
                shaking.current = true;
            }
            const strength = 0.3;
            camera.position.x += (Math.random() - 0.5) * strength;
            camera.position.y += (Math.random() - 0.5) * strength;
        } else {
            shaking.current = false;
        }
    });
    return null;
}

const VolcanicEventController = ({ setErupting }: { setErupting: (v: boolean) => void }) => {
    const [rockActive, setRockActive] = useState(false);
    const [rockPos] = useState(new THREE.Vector3(0, 50, -100));
    const [isShaking, setIsShaking] = useState(false);
    const rockVelocity = useRef(0);
    const timer = useRef(0);
    const state = useRef<'IDLE' | 'FALLING' | 'ERUPTING'>('IDLE');

    useFrame((_, delta) => {
        if (state.current === 'IDLE') {
            timer.current += delta;
            if (timer.current > 10 + Math.random() * 15) {
                state.current = 'FALLING';
                setRockActive(true);
                rockVelocity.current = 0;
                rockPos.set((Math.random() - 0.5) * 100, 60, -150 - Math.random() * 100);
            }
        } else if (state.current === 'FALLING') {
            rockVelocity.current += 30 * delta; // Gravity
            rockPos.y -= rockVelocity.current * delta;
            
            if (rockPos.y < -5) {
                state.current = 'ERUPTING';
                setRockActive(false);
                audio.playLavaSplash();
                
                setTimeout(() => {
                    audio.playEruption();
                    setErupting(true);
                    setIsShaking(true);
                    
                    setTimeout(() => setIsShaking(false), 2000);
                    setTimeout(() => {
                        setErupting(false);
                        state.current = 'IDLE';
                        timer.current = 0;
                    }, 4000);
                }, 200);
            }
        }
    });

    return (
        <>
            <FallingRock position={rockPos} active={rockActive} />
            <CameraShaker isShaking={isShaking} />
        </>
    );
};

// --- Main Environment ---

const VolcanicContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    return (
        <group ref={ref} {...props}>
            <LavaFloor />
            <VolcanicLaneGuides />
            <HoveringRocks />
            <LavaSplashes />
        </group>
    );
});

const VolcanicRealmEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);
    const bgRef1 = useRef<THREE.Group>(null);
    const bgRef2 = useRef<THREE.Group>(null);
    const [isErupting, setErupting] = useState(false);

    useEffect(() => {
        audio.startVolcanicAmbience();
        return () => {
            audio.stopVolcanicAmbience();
        };
    }, []);

    useFrame((state, delta) => {
        const movement = speed * delta;
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH) {
                contentRef1.current.position.z -= CHUNK_LENGTH * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH) {
                contentRef2.current.position.z -= CHUNK_LENGTH * 2;
            }
        }

        const bgMovement = movement * 0.1;
        if (bgRef1.current) {
            bgRef1.current.position.z += bgMovement;
            if (bgRef1.current.position.z > CHUNK_LENGTH) {
                bgRef1.current.position.z -= CHUNK_LENGTH * 2;
            }
        }
        if (bgRef2.current) {
            bgRef2.current.position.z += bgMovement;
            if (bgRef2.current.position.z > CHUNK_LENGTH) {
                bgRef2.current.position.z -= CHUNK_LENGTH * 2;
            }
        }
    });

    return (
        <>
            <color attach="background" args={['#200000']} />
            <fog attach="fog" args={['#200000', 40, 160]} />
            <ambientLight intensity={0.2} color="#401000" />
            <directionalLight position={[0, 20, -10]} intensity={1.5} color="#ff8c00" />
            <pointLight position={[0, 25, -150]} intensity={2} color="#ff4500" distance={200} decay={2} />
            <GiantJellyfish color='#ff4500' />
            <VolcanicParticles />
            <AshParticles />
            <EruptionDebris isErupting={isErupting} />
            <VolcanicEventController setErupting={setErupting} />

            <group>
                <ParallaxVolcanoes ref={bgRef1} position={[0, 0, 0]} />
                <ParallaxVolcanoes ref={bgRef2} position={[0, 0, -CHUNK_LENGTH]} />
            </group>

            <group>
                <VolcanicContent ref={contentRef1} position={[0, 0, 0]} />
                <VolcanicContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH]} />
            </group>
        </>
    );
};

export default VolcanicRealmEnvironment;
