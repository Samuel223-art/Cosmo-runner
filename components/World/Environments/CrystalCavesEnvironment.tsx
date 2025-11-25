

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { LANE_WIDTH } from '../../../types';
import { Stars } from '@react-three/drei';
import { audio } from '../../System/Audio';

const CHUNK_LENGTH_CRYSTAL = 400;

// --- Shaders ---

const crystalVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const crystalFragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uResonance; 
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);
  
  // Fresnel for glassy edge glow
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.5);
  
  // Internal "sparkle" noise based on world position
  float sparkle = sin(vWorldPosition.x * 5.0 + uTime) * cos(vWorldPosition.y * 5.0 - uTime) * sin(vWorldPosition.z * 5.0);
  sparkle = smoothstep(0.7, 1.0, sparkle);
  
  vec3 coreColor = uColor;
  vec3 edgeColor = uColor + vec3(0.6); // Whiter edge
  
  vec3 finalColor = mix(coreColor, edgeColor, fresnel);
  
  // Add sparkles
  finalColor += vec3(1.0) * sparkle * 0.6;
  
  // Resonance Pulse (triggered by interaction)
  float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + vWorldPosition.y);
  finalColor *= (0.8 + 0.3 * pulse);
  finalColor += vec3(uResonance) * vec3(0.8, 0.9, 1.0); // Blue-white flash

  gl_FragColor = vec4(finalColor, 0.7 + 0.3 * fresnel); // Semi-transparent
}
`;

// --- Particle Systems ---

const CrystalParticles = () => {
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 1000; i++) {
            const z = -450 + Math.random() * 550;
            const parallaxFactor = 1.0 + Math.random();
            const scale = 0.1 + Math.random() * 0.2;
            temp.push({ 
                x: (Math.random() - 0.5) * 400, 
                y: Math.random() * 200, 
                z, 
                parallaxFactor, 
                scale
            });
        }
        return temp;
    }, []);

    const speed = useStore(state => state.speed);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    useFrame((state, delta) => {
        if (!instancedMeshRef.current) return;
        const activeSpeed = speed > 0 ? speed : 2;

        particles.forEach((p, i) => {
            let { x, y, z, scale } = p;
            z += activeSpeed * delta * p.parallaxFactor;
            
            if (z > 100) {
                z = -550 - Math.random() * 50;
                x = (Math.random() - 0.5) * 400;
                y = Math.random() * 200;
            }

            p.z = z; p.x = x; p.y = y;
            
            dummy.position.set(x, y, z);
            dummy.scale.setScalar(scale);
            dummy.rotation.x += delta;
            dummy.rotation.y += delta;
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
            
            instancedMeshRef.current!.setColorAt(i, new THREE.Color(Math.random() > 0.5 ? '#d8b4fe' : '#22d3ee'));
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        if(instancedMeshRef.current.instanceColor) instancedMeshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particles.length]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial metalness={0.8} roughness={0.1} emissive="#a855f7" emissiveIntensity={0.5} />
        </instancedMesh>
    );
};

const CrystalImpactEffect = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const [shards] = useState(() => Array.from({ length: 40 }, () => ({
        active: false, life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), rotVel: new THREE.Vector3()
    })));

    useEffect(() => {
        const handleHit = () => {
            // Spawn shards
            let count = 0;
            shards.forEach(s => {
                if (!s.active && count < 15) {
                    s.active = true;
                    s.life = 1.0;
                    // Start roughly at player position
                    s.pos.set(0, 1, 0); 
                    // Explode outward
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 5 + Math.random() * 10;
                    s.vel.set(Math.cos(angle) * speed, 5 + Math.random() * 10, Math.sin(angle) * speed);
                    s.rot.set(Math.random(), Math.random(), Math.random());
                    s.rotVel.set((Math.random()-0.5)*10, (Math.random()-0.5)*10, (Math.random()-0.5)*10);
                    count++;
                }
            });
        };
        window.addEventListener('player-hit', handleHit);
        return () => window.removeEventListener('player-hit', handleHit);
    }, [shards]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        shards.forEach((s, i) => {
            if (s.active) {
                s.life -= delta * 2.0;
                s.vel.y -= 30 * delta; // Gravity
                s.pos.addScaledVector(s.vel, delta);
                s.rot.addScaledVector(s.rotVel, delta);

                if (s.life <= 0) {
                    s.active = false;
                    dummy.scale.set(0,0,0);
                } else {
                    dummy.position.copy(s.pos);
                    dummy.rotation.setFromVector3(s.rot);
                    dummy.scale.setScalar(s.life * 0.4);
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
        <instancedMesh ref={meshRef} args={[undefined, undefined, 40]}>
            <tetrahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial color="#ccffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
};

// --- Environment Components ---

const CrystalFloor = () => {
    const { laneCount } = useStore();
    return (
        <mesh receiveShadow position={[0, -0.02, -CHUNK_LENGTH_CRYSTAL / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[laneCount * LANE_WIDTH * 2, CHUNK_LENGTH_CRYSTAL]} />
            <meshStandardMaterial color={'#1a0b2e'} roughness={0.2} metalness={0.8} /> 
        </mesh>
    );
};

interface CrystalClusterProps {
    position: [number, number, number];
    scale: number;
    rotation: [number, number, number];
    color: string;
    variant: number; // 0: Cone, 1: Spike, 2: Shard
}

const CrystalCluster: React.FC<CrystalClusterProps> = ({ position, scale, rotation, color, variant }) => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    
    // Geometries for variety
    const geo = useMemo(() => {
        if (variant === 1) return new THREE.CylinderGeometry(0, 0.4, 4, 5); // Spike
        if (variant === 2) return new THREE.DodecahedronGeometry(1, 0); // Chunk
        return new THREE.ConeGeometry(1, 4, 5); // Classic
    }, [variant]);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uResonance: { value: 0.0 }
    }), [color]);

    useFrame((state) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh 
            position={position} 
            scale={[scale * 0.3, scale, scale * 0.3]}
            rotation={rotation}
            geometry={geo}
        >
            <shaderMaterial 
                ref={matRef}
                vertexShader={crystalVertexShader}
                fragmentShader={crystalFragmentShader}
                transparent 
                uniforms={uniforms}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
};

const ResonantCrystal: React.FC<{position: [number, number, number]}> = ({ position }) => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const triggered = useRef(false);
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffffff') }, // White core
        uResonance: { value: 0.0 }
    }), []);

    useFrame((state) => {
        if (matRef.current && meshRef.current) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            
            // World position check for interaction
            const worldPos = new THREE.Vector3();
            meshRef.current.getWorldPosition(worldPos);

            // Interaction Zone: Z between -2 and 2 (near player)
            if (worldPos.z > -2 && worldPos.z < 2 && !triggered.current) {
                triggered.current = true;
                audio.playCrystalResonance();
                
                // Trigger visual pulse
                let flash = 1.0;
                const fade = () => {
                    if (!matRef.current) return;
                    flash -= 0.05;
                    matRef.current.uniforms.uResonance.value = Math.max(0, flash);
                    if (flash > 0) requestAnimationFrame(fade);
                };
                fade();
            }

            // Reset when far behind to allow re-trigger if looped (though environment chunks loop differently)
            if (worldPos.z > 20) {
                triggered.current = false;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={position} rotation={[0, Math.PI/4, 0]}>
             <cylinderGeometry args={[0, 0.5, 6, 6]} />
             <shaderMaterial 
                ref={matRef}
                vertexShader={crystalVertexShader}
                fragmentShader={crystalFragmentShader}
                transparent 
                uniforms={uniforms}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

const CrystalClusters = () => {
    const { laneCount } = useStore.getState();
    const clusters = useMemo(() => {
        const temp: any[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 60; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 8 + Math.random() * 60);
            const z = -Math.random() * CHUNK_LENGTH_CRYSTAL;
            const y = -2; 
            const variant = Math.floor(Math.random() * 3);
            temp.push({ 
                position: [x, y, z], 
                scale: 3 + Math.random() * 10, 
                rotation: [0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5],
                color: Math.random() > 0.6 ? '#d946ef' : '#8b5cf6',
                variant
            });
        }
        return temp;
    }, [laneCount]);

    // Add explicit Resonant Crystals along the path sides
    const resonantCrystals = useMemo(() => {
        const temp = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for(let i=0; i<3; i++) {
            const side = i % 2 === 0 ? 1 : -1;
             temp.push({
                 position: [side * (baseOffset + 4), 0, -100 - (i * 120)] as [number, number, number]
             })
        }
        return temp;
    }, [laneCount]);

    return (
        <group>
            {clusters.map((c, i) => (
                <CrystalCluster 
                    key={`cluster-${i}`}
                    position={c.position}
                    scale={c.scale}
                    rotation={c.rotation}
                    color={c.color}
                    variant={c.variant}
                />
            ))}
            {resonantCrystals.map((rc, i) => (
                <ResonantCrystal key={`resonant-${i}`} position={rc.position} />
            ))}
        </group>
    );
};

const CrystalContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group ref={ref} {...props}>
            <CrystalFloor />
            <CrystalClusters />
            <group position={[0, 0.02, 0]}>
                {separators.map((x, i) => (
                    <mesh key={`sep-${i}`} position={[x, 0, -CHUNK_LENGTH_CRYSTAL / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, CHUNK_LENGTH_CRYSTAL]} />
                        <meshBasicMaterial color={'#d8b4fe'} transparent opacity={0.3} />
                    </mesh>
                ))}
            </group>
        </group>
    );
});


const CrystalCavesEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);

    // Audio Ambience Management
    useEffect(() => {
        audio.startCrystalAmbience();
        return () => {
            audio.stopCrystalAmbience();
        };
    }, []);

    useFrame((state, delta) => {
        const movement = speed * delta;
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH_CRYSTAL) {
                contentRef1.current.position.z -= CHUNK_LENGTH_CRYSTAL * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH_CRYSTAL) {
                contentRef2.current.position.z -= CHUNK_LENGTH_CRYSTAL * 2;
            }
        }
    });

    return (
        <>
            <color attach="background" args={['#1a0b2e']} />
            <fog attach="fog" args={['#1a0b2e', 50, 300]} />
            <ambientLight intensity={0.5} color="#d8b4fe" />
            <directionalLight castShadow position={[20, 50, 20]} intensity={1.5} color="#a855f7" />
            <pointLight position={[0, 20, -50]} intensity={2} color="#22d3ee" distance={100} decay={2} />
            
            <Stars radius={150} depth={50} count={3000} factor={4} saturation={1} fade speed={0.5} />
            
            {/* Swirling Nebulae Replacement - Procedural */}
            <group position={[0, 50, -200]}>
                 <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[40, 32, 32]} />
                    <meshBasicMaterial color="#6b21a8" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
                 </mesh>
                 <mesh position={[50, -20, 50]}>
                    <sphereGeometry args={[30, 32, 32]} />
                    <meshBasicMaterial color="#db2777" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
                 </mesh>
            </group>

            <group>
                <CrystalContent ref={contentRef1} position={[0, 0, 0]} />
                <CrystalContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH_CRYSTAL]} />
            </group>
            <CrystalParticles />
            <CrystalImpactEffect />
        </>
    );
};

export default CrystalCavesEnvironment;