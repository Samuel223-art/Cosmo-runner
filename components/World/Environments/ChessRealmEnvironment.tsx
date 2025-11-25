

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { LANE_WIDTH } from '../../../types';
import { Stars } from '@react-three/drei';
import { BaseParticleField } from './SharedComponents';
import { audio } from '../../System/Audio';

const CHUNK_LENGTH_CHESS = 400;

const ChessParticles = () => {
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 800; i++) {
            const z = -450 + Math.random() * 550;
            const parallaxFactor = 1.0 + Math.random();
            const scale = 0.2 + Math.random() * 0.3;
            // White or Black cubes
            temp.push({ 
                x: (Math.random() - 0.5) * 400, 
                y: Math.random() * 150, 
                z, 
                parallaxFactor, 
                scale, 
                isBubble: false, 
                isFish: false 
            });
        }
        return temp;
    }, []);

    // We can reuse BaseParticleField, but we might want cubes instead of spheres.
    // BaseParticleField uses spheres. Let's make a custom one for cubes.
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
                y = Math.random() * 150;
            }

            p.z = z; p.x = x; p.y = y;
            
            dummy.position.set(x, y, z);
            dummy.scale.setScalar(scale);
            dummy.rotation.x += delta;
            dummy.rotation.y += delta;
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
            
            // Randomly color black or white
            const isWhite = i % 2 === 0;
            instancedMeshRef.current!.setColorAt(i, isWhite ? new THREE.Color('#ffffff') : new THREE.Color('#111111'));
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        if(instancedMeshRef.current.instanceColor) instancedMeshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particles.length]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial metalness={0.5} roughness={0.2} />
        </instancedMesh>
    );
};

const ChessFloor = () => {
    const { laneCount } = useStore();
    // Sleek dark polished floor instead of checkerboard
    return (
        <mesh receiveShadow position={[0, -0.02, -CHUNK_LENGTH_CHESS / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[laneCount * LANE_WIDTH * 10, CHUNK_LENGTH_CHESS]} />
            <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.6} />
        </mesh>
    );
};

const GiantChessPieces = () => {
    const { laneCount } = useStore.getState();
    const pieces = useMemo(() => {
        const temp: { position: [number, number, number], scale: number, type: 'rook' | 'knight' }[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 40; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 15 + Math.random() * 80);
            const z = -Math.random() * CHUNK_LENGTH_CHESS;
            const y = -2; // Slightly buried
            temp.push({ 
                position: [x, y, z], 
                scale: 5 + Math.random() * 5, 
                type: Math.random() > 0.5 ? 'rook' : 'knight' 
            });
        }
        return temp;
    }, [laneCount]);

    // Simple Primitives for background pieces
    const rookGeo = useMemo(() => new THREE.CylinderGeometry(1, 1.2, 4, 8), []);
    const knightGeo = useMemo(() => new THREE.ConeGeometry(1, 3, 4), []); // Abstract knight
    
    const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#eeeeee', roughness: 0.1 }), []);
    const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.1 }), []);

    return (
        <group>
            {pieces.map((p, i) => (
                <mesh 
                    key={i} 
                    position={p.position} 
                    scale={[p.scale, p.scale, p.scale]}
                    geometry={p.type === 'rook' ? rookGeo : knightGeo}
                    material={i % 2 === 0 ? whiteMat : blackMat}
                    castShadow
                />
            ))}
        </group>
    );
};


const ChessContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group ref={ref} {...props}>
            <ChessFloor />
            <GiantChessPieces />
            <group position={[0, 0.02, 0]}>
                {separators.map((x, i) => (
                    <mesh key={`sep-${i}`} position={[x, 0, -CHUNK_LENGTH_CHESS / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, CHUNK_LENGTH_CHESS]} />
                        <meshBasicMaterial color={'#ffd700'} transparent opacity={0.5} />
                    </mesh>
                ))}
            </group>
        </group>
    );
});


const ChessRealmEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);

    // Audio Ambience Management
    useEffect(() => {
        audio.startChessAmbience();
        return () => {
            audio.stopChessAmbience();
        };
    }, []);

    useFrame((state, delta) => {
        const movement = speed * delta;
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH_CHESS) {
                contentRef1.current.position.z -= CHUNK_LENGTH_CHESS * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH_CHESS) {
                contentRef2.current.position.z -= CHUNK_LENGTH_CHESS * 2;
            }
        }
    });

    return (
        <>
            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#000000', 80, 350]} />
            <ambientLight intensity={0.4} color="#8888cc" />
            <directionalLight castShadow position={[50, 80, 50]} intensity={1.2} color="#ffffff" shadow-mapSize={[1024, 1024]} />
            <spotLight position={[0, 100, 0]} angle={0.5} penumbra={1} intensity={1} color="#ffd700" />
            
            <Stars radius={120} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            
            {/* Big Moon */}
            <mesh position={[0, 60, -250]}>
                <sphereGeometry args={[30, 32, 32]} />
                <meshBasicMaterial color="#ffffee" fog={false} />
            </mesh>

            <group>
                <ChessContent ref={contentRef1} position={[0, 0, 0]} />
                <ChessContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH_CHESS]} />
            </group>
            <ChessParticles />
        </>
    );
};

export default ChessRealmEnvironment;
