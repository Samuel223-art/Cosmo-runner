
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './components/World/Environment';
import { Player } from './components/World/Player';
import { LevelManager } from './components/World/LevelManager';
import { Effects } from './components/World/Effects';
import { HUD } from './components/UI/HUD';
import { useStore } from './store';

// Dynamic Camera Controller
const CameraController = () => {
  const { camera, scene } = useThree();
  const shakeIntensity = useRef(0);
  const targetPos = useRef(new THREE.Vector3(0, 3.85, 8.0));
  const currentLookAt = useRef(new THREE.Vector3(0, -1, -30));

  useEffect(() => {
    const onPlayerHit = () => {
      shakeIntensity.current = 0.6; // Set shake intensity on hit
    };
    
    window.addEventListener('player-hit', onPlayerHit);
    return () => window.removeEventListener('player-hit', onPlayerHit);
  }, []);
  
  useFrame((state, delta) => {
    const playerGroup = scene.getObjectByName('PlayerGroup');
    // The playerGroup itself is static at 0,0,0. The actual player mesh is the first child.
    const playerMesh = playerGroup?.children[0];

    if (playerMesh) {
         // Follow player X with a slight lag for smoothness
         const pX = playerMesh.position.x;
         const pY = playerMesh.position.y; // Access inner body Y for jump tracking

         // Base target position
         // We want the camera to follow the player's lane exactly for a "locked in" feel
         const baseX = pX; 
         const baseY = 3.85 + (pY * 0.5); // Follow jump height partially
         const baseZ = 8.0; // Increased distance

         targetPos.current.set(baseX, baseY, baseZ);
         
         // Look target also shifts to maintain perspective
         const lookAtX = pX * 0.6; // Look slightly ahead/towards center relative to cam
         const lookAtY = (pY * 0.5) - 1;
         
         // Smoothly interpolate camera position
         camera.position.lerp(targetPos.current, delta * 5.0);
         
         // Apply Shake
         if (shakeIntensity.current > 0) {
             const shake = shakeIntensity.current;
             camera.position.x += (Math.random() - 0.5) * shake;
             camera.position.y += (Math.random() - 0.5) * shake;
             camera.position.z += (Math.random() - 0.5) * shake;
     
             // Decay shake
             shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, delta * 4.0);
             if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
         }
     
         // Dynamic LookAt
         const targetLookAt = new THREE.Vector3(lookAtX, lookAtY, -30);
         
         // IMPORTANT: Lerp the persistent ref vector, not a new vector every frame
         currentLookAt.current.lerp(targetLookAt, delta * 5.0);
         camera.lookAt(currentLookAt.current); 

    } else {
        // Fallback if player not found yet
        const defaultTarget = new THREE.Vector3(0, 3.85, 8.0);
        camera.position.lerp(defaultTarget, delta * 2.0);
        camera.lookAt(0, -1, -30);
    }
  });
  
  return null;
};

function Scene() {
  return (
    <>
        <Environment />
        <group>
            {/* Attach a userData to identify player group for LevelManager collision logic */}
            <group userData={{ isPlayer: true }} name="PlayerGroup">
                 <Player />
            </group>
            <LevelManager />
        </group>
        <Effects />
    </>
  );
}

function App() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <HUD />
      <Canvas
        shadows
        dpr={[1, 1.5]} 
        gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance" }}
        // Initial camera, matches the new fixed controller base
        camera={{ position: [0, 3.85, 8.0], fov: 60 }}
      >
        <CameraController />
        <Suspense fallback={null}>
            <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
