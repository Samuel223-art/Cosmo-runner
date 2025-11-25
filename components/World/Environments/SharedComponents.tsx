/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';

export const BaseParticleField: React.FC<{particles: any[], color: string}> = ({ particles, color }) => {
    const speed = useStore(state => state.speed);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    useFrame((state, delta) => {
        if (!instancedMeshRef.current) return;
        
        const activeSpeed = speed > 0 ? speed : 2;

        particles.forEach((p, i) => {
            let { x, y, z, scale } = p;
            z += activeSpeed * delta * p.parallaxFactor;
            
            if (p.isBubble || p.isFish) { // isFish used for embers rising
                y += delta * 2.0 * p.parallaxFactor;
                if (y > 150) y = -50 - Math.random() * 50;
            }

            if (z > 100) {
                z = -550 - Math.random() * 50;
                y = (p.isBubble || p.isFish) ? -50 - Math.random() * 50 : (Math.random() - 0.5) * 200 + 40;
                x = (Math.random() - 0.5) * 400;
            }

            p.x = x; p.y = y; p.z = z;
            
            dummy.position.set(x, y, z);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particles.length]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
        </instancedMesh>
    );
};

export const GiantJellyfish: React.FC<{ color?: string }> = ({ color = '#00ffaa' }) => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const sunGroupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (matRef.current && matRef.current.uniforms.uTime) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        if (sunGroupRef.current) {
            sunGroupRef.current.position.y = 30 + Math.sin(state.clock.elapsedTime * 0.2) * 2.0;
            sunGroupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
        }
    });

    const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }), [color]);

    return (
        <group ref={sunGroupRef} position={[0, 30, -180]}>
            <mesh>
                <sphereGeometry args={[35, 32, 32]} />
                <shaderMaterial ref={matRef} uniforms={uniforms} transparent side={THREE.FrontSide} blending={THREE.AdditiveBlending} depthWrite={false}
                    vertexShader={`varying vec3 vNormal; varying vec3 vPosition; void main() { vNormal = normalize(normalMatrix * normal); vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
                    fragmentShader={`uniform float uTime; uniform vec3 uColor; varying vec3 vNormal; varying vec3 vPosition; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); float pulse = 0.6 + 0.4 * sin(uTime * 2.0); float bands = sin(vPosition.y * 0.5 + uTime); vec3 finalColor = uColor * intensity * pulse; finalColor += uColor * 0.2 * smoothstep(0.8, 0.9, bands); gl_FragColor = vec4(finalColor, 1.0); }`}
                />
            </mesh>
        </group>
    );
};

export const CrystalCaveParticles: React.FC<{color?: string}> = ({ color = "#ee82ee" }) => {
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 1500; i++) {
            const isSpore = Math.random() > 0.9;
            const z = -450 + Math.random() * 550;
            const parallaxFactor = isSpore ? (0.7 + Math.random() * 0.7) : (2.5 + Math.random() * 2.0);
            const scale = isSpore ? (0.2 + Math.random() * 0.3) : 0.15;
            temp.push({ x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 200 + 40, z, parallaxFactor, scale, isBubble: false, isFish: false });
        }
        return temp;
    }, []);

    return <BaseParticleField particles={particles} color={color} />;
};