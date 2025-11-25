
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { LANE_WIDTH } from '../../../types';
import { Sky } from '@react-three/drei';
import { CrystalCaveParticles } from './SharedComponents';
import { audio } from '../../System/Audio';

const CHUNK_LENGTH_FOREST = 400;

const ForestFloor = () => {
    const { laneCount } = useStore();
    return (
        <mesh receiveShadow position={[0, -0.02, -CHUNK_LENGTH_FOREST / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[laneCount * LANE_WIDTH, CHUNK_LENGTH_FOREST]} />
            <meshStandardMaterial color={'#5c4033'} /> 
        </mesh>
    );
};

const ForestTerrain = () => {
    const { laneCount } = useStore.getState();
    const terrainGeo = useMemo(() => {
        const width = 160; const length = CHUNK_LENGTH_FOREST; const widthSegments = 40; const lengthSegments = 60;
        const geo = new THREE.PlaneGeometry(width, length, widthSegments, lengthSegments);
        const { position } = geo.attributes;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i); const y = position.getY(i);
            const edgeFactor = 1 - Math.pow(Math.abs(x) / (width / 2), 2);
            const randomHeight = (Math.sin(y * 0.05 + x * 0.02) + Math.cos(y * 0.03)) * 25;
            position.setZ(i, (position.getZ(i) + randomHeight) * edgeFactor);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    const terrainMaterial = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);

    useMemo(() => {
        const { position } = terrainGeo.attributes;
        const colors: number[] = [];
        const darkGreen = new THREE.Color('#1a4d2e');
        const lightGreen = new THREE.Color('#4ade80');
        for (let i = 0; i < position.count; i++) {
            const height = position.getZ(i);
            const t = THREE.MathUtils.smoothstep(height, 0, 15.0);
            const color = darkGreen.clone().lerp(lightGreen, t);
            colors.push(color.r, color.g, color.b);
        }
        terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }, [terrainGeo]);

    const baseOffset = (laneCount * LANE_WIDTH / 2) + 80;

    return (
        <group>
            <mesh receiveShadow geometry={terrainGeo} material={terrainMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[-baseOffset, -0.5, -CHUNK_LENGTH_FOREST / 2]} />
            <mesh receiveShadow geometry={terrainGeo} material={terrainMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[baseOffset, -0.5, -CHUNK_LENGTH_FOREST / 2]} />
        </group>
    );
};

const ForestTrees = () => {
    const { laneCount } = useStore.getState();
    const trees = useMemo(() => {
        const temp: { position: [number, number, number], scale: number, type: 'pine' | 'deciduous' }[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 60; i++) { // Reduced count
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 10 + Math.random() * 150);
            const z = -Math.random() * CHUNK_LENGTH_FOREST;
            const y = -0.5;
            temp.push({ position: [x, y, z], scale: 1.8 + Math.random() * 2.8, type: Math.random() > 0.5 ? 'pine' : 'deciduous' });
        }
        return temp;
    }, [laneCount]);

    // Deciduous Tree
    const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.2, 1.5, 4), []);
    const leavesGeo = useMemo(() => new THREE.IcosahedronGeometry(0.8, 0), []);
    const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6e4a2e' }), []);
    const leavesMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2E8B57', flatShading: true }), []);

    // Pine Tree
    const pineLeavesGeo1 = useMemo(() => new THREE.ConeGeometry(1.0, 1.5, 5), []);
    const pineLeavesGeo2 = useMemo(() => new THREE.ConeGeometry(0.8, 1.2, 5), []);
    const pineLeavesGeo3 = useMemo(() => new THREE.ConeGeometry(0.6, 1.0, 5), []);
    const pineTrunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a2c2a' }), []);
    const pineLeavesMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a4d2e', flatShading: true }), []);

    return (
        <group>
            {trees.map((tree, i) => (
                <group key={i} position={tree.position} scale={tree.scale}>
                    {tree.type === 'deciduous' ? (
                        <>
                            <mesh castShadow position={[0, 0.75, 0]} geometry={trunkGeo} material={trunkMat} />
                            <mesh castShadow position={[0, 1.8, 0]} geometry={leavesGeo} material={leavesMat} />
                        </>
                    ) : (
                         <>
                            <mesh castShadow position={[0, 0.75, 0]} geometry={trunkGeo} material={pineTrunkMat} />
                            <mesh castShadow position={[0, 1.8, 0]} geometry={pineLeavesGeo1} material={pineLeavesMat} />
                            <mesh castShadow position={[0, 2.5, 0]} geometry={pineLeavesGeo2} material={pineLeavesMat} />
                            <mesh castShadow position={[0, 3.1, 0]} geometry={pineLeavesGeo3} material={pineLeavesMat} />
                        </>
                    )}
                </group>
            ))}
        </group>
    );
};

const ForestMotes = () => <CrystalCaveParticles color="#e0f2fe" />;

const ParallaxHills = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const hills = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 8; i++) { // Reduced count
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (250 + Math.random() * 200);
            const z = -Math.random() * CHUNK_LENGTH_FOREST;
            const s = 60 + Math.random() * 80;
            temp.push({ pos: [x, -25, z], scale: [s, s * 0.8, s] });
        }
        return temp;
    }, []);

    return (
        <group ref={ref} {...props}>
             {hills.map((m, i) => (
                 <mesh key={i} position={m.pos as any} scale={m.scale as any}>
                     <sphereGeometry args={[1, 16, 8]} />
                     <meshStandardMaterial color="#064e3b" roughness={0.9} fog={false} />
                 </mesh>
             ))}
        </group>
    );
});

const ForestContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group ref={ref} {...props}>
            <ForestFloor />
            <ForestTerrain />
            <ForestTrees />
            <group position={[0, 0.02, 0]}>
                {separators.map((x, i) => (
                    <mesh key={`sep-${i}`} position={[x, 0, -CHUNK_LENGTH_FOREST / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, CHUNK_LENGTH_FOREST]} />
                        <meshBasicMaterial color={'#84cc16'} transparent opacity={0.4} />
                    </mesh>
                ))}
            </group>
        </group>
    );
});


const EnchantedForestEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);
    const bgRef1 = useRef<THREE.Group>(null);
    const bgRef2 = useRef<THREE.Group>(null);

    useEffect(() => {
        audio.startForestAmbience();
        return () => {
            audio.stopForestAmbience();
        };
    }, []);

    useFrame((state, delta) => {
        const movement = speed * delta;
        
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH_FOREST) {
                contentRef1.current.position.z -= CHUNK_LENGTH_FOREST * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH_FOREST) {
                contentRef2.current.position.z -= CHUNK_LENGTH_FOREST * 2;
            }
        }

        const bgMovement = movement * 0.15;
        if (bgRef1.current) {
            bgRef1.current.position.z += bgMovement;
            if (bgRef1.current.position.z > CHUNK_LENGTH_FOREST) {
                bgRef1.current.position.z -= CHUNK_LENGTH_FOREST * 2;
            }
        }
        if (bgRef2.current) {
            bgRef2.current.position.z += bgMovement;
            if (bgRef2.current.position.z > CHUNK_LENGTH_FOREST) {
                bgRef2.current.position.z -= CHUNK_LENGTH_FOREST * 2;
            }
        }
    });

    return (
        <>
            <fog attach="fog" args={['#87CEEB', 100, 300]} />
            <ambientLight intensity={1.0} color="#ffffff" />
            <directionalLight castShadow position={[50, 50, 20]} intensity={1.5} color="#ffffdd" shadow-mapSize={[1024, 1024]} />
            
            <Sky sunPosition={[100, 40, -100]} turbidity={1} rayleigh={0.6} mieCoefficient={0.005} mieDirectionalG={0.8} />

            <group>
                <ParallaxHills ref={bgRef1} position={[0, 0, 0]} />
                <ParallaxHills ref={bgRef2} position={[0, 0, -CHUNK_LENGTH_FOREST]} />
            </group>

            <group>
                <ForestContent ref={contentRef1} position={[0, 0, 0]} />
                <ForestContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH_FOREST]} />
            </group>
            <ForestMotes />
        </>
    );
};

export default EnchantedForestEnvironment;
