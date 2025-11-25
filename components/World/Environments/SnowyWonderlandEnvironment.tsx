
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
import { audio } from '../../System/Audio';

const CHUNK_LENGTH_SNOW = 400;

const SnowfallParticles = () => {
    const speed = useStore(state => state.speed);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 800; i++) { // Reduced count
            const z = -450 + Math.random() * 550;
            const x = (Math.random() - 0.5) * 400;
            const y = Math.random() * 200;
            const parallaxFactor = (0.3 + Math.random() * 0.4);
            const scale = (0.1 + Math.random() * 0.2);
            const driftSpeed = 1.0 + Math.random() * 2.0;
            const swayFrequency = 2.0 + Math.random() * 2.0;
            const swayAmplitude = 5.0 + Math.random() * 5.0;
            const windForce = 10.0 + Math.random() * 10.0; 
            
            temp.push({ 
                x, y, z, 
                parallaxFactor, 
                scale, 
                driftSpeed,
                swayFrequency,
                swayAmplitude,
                windForce,
                initialX: x,
                randomOffset: Math.random() * 100
            });
        }
        return temp;
    }, []);

    useFrame((state, delta) => {
        if (!instancedMeshRef.current) return;
        const activeSpeed = speed > 0 ? speed : 2;
        const time = state.clock.elapsedTime;
        
        particles.forEach((p, i) => {
            p.z += activeSpeed * delta * p.parallaxFactor;
            p.y -= delta * (3.5 + p.parallaxFactor * 4); 
            p.x -= delta * p.windForce; 
            const sway = Math.sin(time * p.swayFrequency + p.randomOffset) * p.swayAmplitude * delta;
            p.x += sway;

            if (p.y < -10) {
                p.y = 150 + Math.random() * 50;
            }
            if (p.z > 100) {
                p.z = -550 - Math.random() * 50;
                p.x = (Math.random() - 0.5) * 400; 
            }
            if (p.x < -250) p.x += 500;
            if (p.x > 250) p.x -= 500;
            
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
            <meshBasicMaterial color={'#ffffff'} transparent opacity={0.8} />
        </instancedMesh>
    );
};

const SnowyFloor = () => {
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -CHUNK_LENGTH_SNOW / 2]}>
            <planeGeometry args={[300, CHUNK_LENGTH_SNOW, 1, 1]} />
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
                        vec2 i1;
                        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
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
                        vec2 uv = vUv * vec2(10.0, 30.0);
                        float time = uTime * 0.1;
                        float noise = snoise(uv + vec2(0.0, -time));
                        float sparkles = snoise(uv * 5.0 + time);
                        vec3 snowColor = mix(vec3(0.9, 0.95, 1.0), vec3(0.7, 0.8, 0.95), smoothstep(-0.2, 0.2, noise));
                        if(sparkles > 0.9) {
                           snowColor = mix(snowColor, vec3(1.0, 1.0, 1.0), smoothstep(0.9, 0.95, sparkles));
                        }
                        gl_FragColor = vec4(snowColor, 1.0);
                    }
                `}
            />
        </mesh>
    );
};

const SnowyPineTrees = () => {
    const { laneCount } = useStore.getState();
    const trees = useMemo(() => {
        const temp: { position: [number, number, number], scale: number }[] = [];
        const baseOffset = (laneCount * LANE_WIDTH / 2);
        for (let i = 0; i < 60; i++) { // Reduced count
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (baseOffset + 10 + Math.random() * 150);
            const z = -Math.random() * CHUNK_LENGTH_SNOW;
            const y = -0.5;
            temp.push({ position: [x, y, z], scale: 1.5 + Math.random() * 2.5 });
        }
        return temp;
    }, [laneCount]);

    const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.2, 1.5, 4), []);
    const leavesGeo1 = useMemo(() => new THREE.ConeGeometry(1.0, 1.5, 5), []);
    const leavesGeo2 = useMemo(() => new THREE.ConeGeometry(0.8, 1.2, 5), []);
    const leavesGeo3 = useMemo(() => new THREE.ConeGeometry(0.6, 1.0, 5), []);
    const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a2c2a' }), []);
    const leavesMat = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({ color: '#1a4d2e', flatShading: true });
        mat.onBeforeCompile = (shader) => {
            shader.vertexShader = 'varying vec3 vWorldNormal;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                 vWorldNormal = normalize( transformedNormal );`
            );
            shader.fragmentShader = 'varying vec3 vWorldNormal;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                 vec3 snowColor = vec3(1.0, 1.0, 1.0);
                 float snowAmount = smoothstep(0.3, 0.6, vWorldNormal.y);
                 diffuseColor.rgb = mix(diffuseColor.rgb, snowColor, snowAmount);`
            );
        };
        return mat;
    }, []);

    return (
        <group>
            {trees.map((tree, i) => (
                <group key={i} position={tree.position} scale={tree.scale}>
                    <mesh castShadow position={[0, 0.75, 0]} geometry={trunkGeo} material={trunkMat} />
                    <mesh castShadow position={[0, 1.8, 0]} geometry={leavesGeo1} material={leavesMat} />
                    <mesh castShadow position={[0, 2.5, 0]} geometry={leavesGeo2} material={leavesMat} />
                    <mesh castShadow position={[0, 3.1, 0]} geometry={leavesGeo3} material={leavesMat} />
                </group>
            ))}
        </group>
    );
};

const SnowyTerrain = () => {
    const { laneCount } = useStore.getState();
    const terrainGeo = useMemo(() => {
        const width = 160; const length = 400; const widthSegments = 40; const lengthSegments = 60;
        const geo = new THREE.PlaneGeometry(width, length, widthSegments, lengthSegments);
        const { position } = geo.attributes;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i); const y = position.getY(i);
            const edgeFactor = 1 - Math.pow(Math.abs(x) / (width / 2), 2);
            const randomHeight = (Math.sin(y * 0.1 + x * 0.05) + Math.cos(y * 0.05)) * 2.5;
            position.setZ(i, (position.getZ(i) + randomHeight) * edgeFactor);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    const terrainMaterial = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);

    useMemo(() => {
        const { position } = terrainGeo.attributes;
        const colors: number[] = [];
        const snowColor = new THREE.Color('#ffffff');
        const iceColor = new THREE.Color('#d4f1f9');
        for (let i = 0; i < position.count; i++) {
            const height = position.getZ(i);
            const t = THREE.MathUtils.smoothstep(height, 0, 3.0);
            const color = snowColor.clone().lerp(iceColor, t);
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

const ParallaxPeaks = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const peaks = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 8; i++) { // Reduced count
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (250 + Math.random() * 200);
            const z = -Math.random() * CHUNK_LENGTH_SNOW;
            const s = 50 + Math.random() * 70;
            temp.push({ pos: [x, -30, z], scale: [s, s * 1.5, s] });
        }
        return temp;
    }, []);

    return (
        <group ref={ref} {...props}>
             {peaks.map((m, i) => (
                 <mesh key={i} position={m.pos as any} scale={m.scale as any}>
                     <coneGeometry args={[1, 1, 4]} />
                     <meshStandardMaterial color="#cbd5e1" roughness={0.5} fog={false} />
                 </mesh>
             ))}
        </group>
    );
});

const SnowyContent = React.forwardRef<THREE.Group, { position: [number, number, number] }>((props, ref) => {
    const { laneCount } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    return (
        <group ref={ref} {...props}>
            <SnowyFloor />
            <SnowyTerrain />
            <SnowyPineTrees />
            <group position={[0, 0.02, 0]}>
                 <mesh receiveShadow position={[0, -0.02, -CHUNK_LENGTH_SNOW / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[laneCount * LANE_WIDTH, CHUNK_LENGTH_SNOW]} />
                    <meshStandardMaterial color={'#e6f0ff'} />
                </mesh>
                {separators.map((x, i) => (
                    <mesh key={`sep-${i}`} position={[x, 0, -CHUNK_LENGTH_SNOW / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, CHUNK_LENGTH_SNOW]} />
                        <meshBasicMaterial color={'#90cdf4'} transparent opacity={0.4} />
                    </mesh>
                ))}
            </group>
        </group>
    );
});

const SnowyWonderlandEnvironment = () => {
    const speed = useStore(state => state.speed);
    const contentRef1 = useRef<THREE.Group>(null);
    const contentRef2 = useRef<THREE.Group>(null);
    const bgRef1 = useRef<THREE.Group>(null);
    const bgRef2 = useRef<THREE.Group>(null);

    useEffect(() => {
        audio.startSnowAmbience();
        return () => {
            audio.stopSnowAmbience();
        };
    }, []);

    useFrame((state, delta) => {
        const movement = speed * delta;
        if (contentRef1.current) {
            contentRef1.current.position.z += movement;
            if (contentRef1.current.position.z > CHUNK_LENGTH_SNOW) {
                contentRef1.current.position.z -= CHUNK_LENGTH_SNOW * 2;
            }
        }
        if (contentRef2.current) {
            contentRef2.current.position.z += movement;
            if (contentRef2.current.position.z > CHUNK_LENGTH_SNOW) {
                contentRef2.current.position.z -= CHUNK_LENGTH_SNOW * 2;
            }
        }

        const bgMovement = movement * 0.1;
        if (bgRef1.current) {
            bgRef1.current.position.z += bgMovement;
            if (bgRef1.current.position.z > CHUNK_LENGTH_SNOW) {
                bgRef1.current.position.z -= CHUNK_LENGTH_SNOW * 2;
            }
        }
        if (bgRef2.current) {
            bgRef2.current.position.z += bgMovement;
            if (bgRef2.current.position.z > CHUNK_LENGTH_SNOW) {
                bgRef2.current.position.z -= CHUNK_LENGTH_SNOW * 2;
            }
        }
    });

    return (
        <>
            <color attach="background" args={['#a6d1e1']} />
            <fog attach="fog" args={['#a6d1e1', 80, 250]} />
            <ambientLight intensity={1.2} color="#d0e0ff" />
            <directionalLight castShadow position={[50, 80, 50]} intensity={1.5} color="#ffffff" shadow-mapSize={[1024, 1024]} />
            
            <Sky sunPosition={[100, 20, -100]} turbidity={1} rayleigh={0.5} mieCoefficient={0.003} mieDirectionalG={0.7} />
             
            <group>
                <ParallaxPeaks ref={bgRef1} position={[0, 0, 0]} />
                <ParallaxPeaks ref={bgRef2} position={[0, 0, -CHUNK_LENGTH_SNOW]} />
            </group>

            <group>
                <SnowyContent ref={contentRef1} position={[0, 0, 0]} />
                <SnowyContent ref={contentRef2} position={[0, 0, -CHUNK_LENGTH_SNOW]} />
            </group>
            <SnowfallParticles />
        </>
    );
};

export default SnowyWonderlandEnvironment;
