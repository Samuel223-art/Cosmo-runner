/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { LANE_WIDTH } from '../../../types';
import { BaseParticleField, GiantJellyfish } from './SharedComponents';

const CHUNK_LENGTH_UNDERWATER = 400;

const UnderwaterParticles = () => {
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 1500; i++) {
            const isBubble = Math.random() > 0.8;
            const z = -450 + Math.random() * 550;
            const parallaxFactor = isBubble ? (0.5 + Math.random() * 0.5) : (2.5 + Math.random() * 2.0);
            const scale = isBubble ? (0.1 + Math.random() * 0.2) : (0.1 + Math.random()*0.1);
            temp.push({ x: (Math.random() - 0.5) * 400, y: -50 + Math.random() * 200, z, parallaxFactor, scale, isBubble, isFish: false });
        }
        return temp;
    }, []);

    return <BaseParticleField particles={particles} color="#aaddff" />;
};

const MarineSnowParticles = () => {
    const speed = useStore(state => state.speed);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 1000; i++) {
            temp.push({ 
                x: (Math.random() - 0.5) * 400, 
                y: Math.random() * 200, 
                z: -450 + Math.random() * 550, 
                parallaxFactor: (0.5 + Math.random() * 0.6), 
                scale: (0.05 + Math.random() * 0.1), 
                drift: (Math.random() - 0.5) * 0.5,
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
            p.y -= delta * (0.5 + p.parallaxFactor * 1); // Fall slowly
            p.x = p.initialX + p.drift * Math.sin(state.clock.elapsedTime * 0.2 + p.z * 0.3);

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
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color={'#ccddff'} transparent opacity={0.3} />
        </instancedMesh>
    );
};

const FishSchool = () => {
    const speed = useStore(state => state.speed);
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const fishGeo = useMemo(() => {
        const geo = new THREE.ConeGeometry(0.1, 0.5, 6);
        geo.rotateX(Math.PI / 2);
        return geo;
    }, []);
    
    const particles = useMemo(() => Array.from({ length: 80 }, () => ({
        pos: new THREE.Vector3((Math.random() - 0.5) * 200, 5 + Math.random() * 20, -Math.random() * 400),
        speed: 5 + Math.random() * 10,
        parallax: 1.5 + Math.random(),
        initialYRotation: Math.random() > 0.5 ? Math.PI : 0
    })), []);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const activeSpeed = speed > 0 ? speed : 2;

        particles.forEach((p, i) => {
            const direction = p.initialYRotation === 0 ? 1 : -1;
            p.pos.x += p.speed * delta * direction;
            p.pos.z += activeSpeed * delta * p.parallax;

            if (p.pos.x * direction > 200) p.pos.x = -200 * direction;
            if (p.pos.z > 100) p.pos.z = -500;

            dummy.position.copy(p.pos);
            dummy.rotation.y = p.initialYRotation;
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[fishGeo, undefined, particles.length]}>
            <meshStandardMaterial color={'#88aaff'} roughness={0.4} metalness={0.5} />
        </instancedMesh>
    );
};

const UnderwaterFloor = () => {
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, -CHUNK_LENGTH_UNDERWATER / 2]}>
            <planeGeometry args={[300, CHUNK_LENGTH_UNDERWATER, 1, 1]} />
             <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
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
                        // Sand floor
                        vec2 sandUv = vUv * 15.0;
                        float sandNoise = snoise(sandUv);
                        vec3 sandColor = mix(vec3(0.1, 0.1, 0.2), vec3(0.2, 0.2, 0.35), smoothstep(-0.2, 0.2, sandNoise));
                        
                        // Caustics
                        vec2 causticsUv1 = vUv * 4.0 + vec2(uTime * 0.1, uTime * 0.15);
                        vec2 causticsUv2 = vUv * 5.0 + vec2(-uTime * 0.2, uTime * 0.1);
                        float c1 = (snoise(causticsUv1) + 1.0) / 2.0;
                        float c2 = (snoise(causticsUv2) + 1.0) / 2.0;
                        float caustics = smoothstep(0.6, 1.0, c1) * smoothstep(0.7, 1.0, c2);

                        vec3 finalColor = sandColor + vec3(0.2, 0.5, 0.6) * caustics * 0.5;
                        
                        gl_FragColor = vec4(finalColor, 1.0);
                    }
                `}
            />
        </mesh>
    );
};

const UnderwaterFlora = () => {
    const { laneCount } = useStore.getState();
    const flora = useMemo(() => {
        const temp: { position: [number, number, number], scale: [number, number, number], rotation: [number, number, number], type: 'kelp' | 'coral' }[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 100; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 3 + Math.random() * 100);
            const z = -Math.random() * CHUNK_LENGTH_UNDERWATER;
            
            if (Math.random() > 0.4) { // Kelp
                 const scaleY = 3 + Math.random() * 10;
                 temp.push({ 
                    position: [x, -5 + scaleY/2, z], 
                    scale: [1, scaleY, 1],
                    rotation: [0, 0, (Math.random() - 0.5) * 0.3],
                    type: 'kelp'
                });
            } else { // Coral
                const scale = 1 + Math.random() * 4;
                temp.push({ 
                    position: [x, -5 + scale/2, z], 
                    scale: [scale, scale, scale],
                    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
                    type: 'coral'
                });
            }
        }
        return temp;
    }, [laneCount]);

    const coralGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
    const kelpGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.1, 1, 6), []);
    const kelpMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f5121', roughness: 0.8 }), []);
    const coralMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff4499', roughness: 0.6, emissive: '#881133', emissiveIntensity: 0.3 }), []);

    return (
        <group>
            {flora.map((f, i) => (
                <mesh 
                    key={i} 
                    castShadow
                    position={f.position} 
                    scale={f.scale}
                    rotation={f.rotation}
                    geometry={f.type === 'kelp' ? kelpGeo : coralGeo}
                    material={f.type === 'kelp' ? kelpMat : coralMat}
                />
            ))}
        </group>
    );
};

const UnderwaterContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group ref={ref} {...props}>
            <UnderwaterFloor />
            <UnderwaterFlora />
            <group position={[0, 0.02, 0]}>
                 <mesh receiveShadow position={[0, -5.02, -CHUNK_LENGTH_UNDERWATER / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[laneCount * LANE_WIDTH, CHUNK_LENGTH_UNDERWATER]} />
                    <meshStandardMaterial color={'#050510'} />
                </mesh>
                {separators.map((x, i) => (
                    <mesh key={`sep-${i}`} position={[x, -4.98, -CHUNK_LENGTH_UNDERWATER / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.08, CHUNK_LENGTH_UNDERWATER]} />
                        <meshBasicMaterial color={'#00aaff'} emissive={'#00aaff'} toneMapped={false} transparent opacity={0.5} />
                    </mesh>
                ))}
            </group>
        </group>
    );
});

const UnderwaterRealmEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        const movement = speed * delta;
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH_UNDERWATER) {
                contentRef1.current.position.z -= CHUNK_LENGTH_UNDERWATER * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH_UNDERWATER) {
                contentRef2.current.position.z -= CHUNK_LENGTH_UNDERWATER * 2;
            }
        }
    });

    return (
        <>
            <color attach="background" args={['#020014']} />
            <fog attach="fog" args={['#020014', 20, 150]} />
            <ambientLight intensity={0.4} color="#0055aa" />
            <directionalLight castShadow position={[10, 30, -20]} intensity={2.0} color="#55aaff" />
            <pointLight position={[0, 15, -150]} intensity={5} color="#00ffff" distance={200} decay={2} />
            <GiantJellyfish color='#00aaff' />
            
            <group>
                <UnderwaterContent ref={contentRef1} position={[0, 0, 0]} />
                <UnderwaterContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH_UNDERWATER]} />
            </group>
            <UnderwaterParticles />
            <MarineSnowParticles />
            <FishSchool />
        </>
    );
};

export default UnderwaterRealmEnvironment;