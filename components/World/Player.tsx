
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Physics Constants
const GRAVITY = 90; // Snappier gravity for responsive feel
const JUMP_FORCE = 27; // High force to compensate gravity
const LANDING_DURATION = 0.15; // Time for landing squash animation
const AIR_CONTROL_FACTOR = 8; // Slower lerp in air for "floaty" control feel
const GROUND_CONTROL_FACTOR = 20; // Snappy lerp on ground
const SLIDE_DURATION = 0.8; // Seconds

// Static Geometries
const TORSO_GEO = new THREE.CylinderGeometry(0.25, 0.15, 0.6, 4);
const JETPACK_GEO = new THREE.BoxGeometry(0.3, 0.4, 0.15);
const GLOW_STRIP_GEO = new THREE.PlaneGeometry(0.05, 0.2);
const HEAD_GEO = new THREE.BoxGeometry(0.25, 0.3, 0.3);
const ARM_GEO = new THREE.BoxGeometry(0.12, 0.6, 0.12);
const JOINT_SPHERE_GEO = new THREE.SphereGeometry(0.07);
const HIPS_GEO = new THREE.CylinderGeometry(0.16, 0.16, 0.2);
const LEG_GEO = new THREE.BoxGeometry(0.15, 0.7, 0.15);
const SHADOW_GEO = new THREE.CircleGeometry(0.5, 32);

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  // Limb Refs for Animation
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const { status, laneCount, takeDamage, hasDoubleJump, hasHover, activateInvincibilityAbility, isInvincible, damageShieldDuration, visualLevel, setSliding } = useStore();
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  // Physics State
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 
  const spinRotation = useRef(0); 
  
  // Hover State
  const hoverTimer = useRef(0);
  const isHovering = useRef(false);

  // Slide State
  const slideTimer = useRef(0);
  const isSlidingRef = useRef(false); // Local ref for loop

  // Animation State
  const jumpBuffer = useRef(0);
  const landingTimer = useRef(0);
  const wasAirborne = useRef(false);
  const lastStepTime = useRef(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const postDamageInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  // Memoized Materials
  const { armorMaterial, jointMaterial, glowMaterial, shadowMaterial } = useMemo(() => {
      const armorColor = isInvincible ? '#ffd700' : '#e0e0e0';
      const glowColor = isInvincible ? '#ffffff' : '#00aaff';
      
      return {
          armorMaterial: new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.3, metalness: 0.8 }),
          jointMaterial: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.7, metalness: 0.5 }),
          glowMaterial: new THREE.MeshBasicMaterial({ color: glowColor }),
          shadowMaterial: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.3, transparent: true })
      };
  }, [isInvincible]);

  // --- Reset State on Game Start ---
  useEffect(() => {
      if (status === GameStatus.PLAYING) {
          isJumping.current = false;
          jumpsPerformed.current = 0;
          velocityY.current = 0;
          spinRotation.current = 0;
          isHovering.current = false;
          hoverTimer.current = 0;
          landingTimer.current = 0;
          jumpBuffer.current = 0;
          wasAirborne.current = false;
          lastStepTime.current = 0;
          isSlidingRef.current = false;
          slideTimer.current = 0;
          setSliding(false);
          
          if (groupRef.current) groupRef.current.position.y = 0;
          if (bodyRef.current) {
              bodyRef.current.rotation.x = 0;
              bodyRef.current.scale.set(1, 1, 1);
              bodyRef.current.position.y = 1.1;
          }
      }
  }, [status, setSliding]);
  
  // Safety: Clamp lane if laneCount changes
  useEffect(() => {
      const maxLane = Math.floor(laneCount / 2);
      if (Math.abs(lane) > maxLane) {
          setLane(l => Math.max(Math.min(l, maxLane), -maxLane));
      }
  }, [laneCount, lane]);

  const performJump = useCallback(() => {
        if (isSlidingRef.current) return; // Cannot jump while sliding
        
        audio.playJump(false);
        isJumping.current = true;
        jumpsPerformed.current = 1;
        velocityY.current = JUMP_FORCE;
        // Reset landing animation if we jump immediately
        landingTimer.current = 0;
        if(bodyRef.current) bodyRef.current.scale.setScalar(1);
  }, []);

  const triggerSlide = useCallback(() => {
      if (isJumping.current) {
          // Fast fall if in air
          velocityY.current = -30;
      }
      
      isSlidingRef.current = true;
      slideTimer.current = SLIDE_DURATION;
      setSliding(true);
      // audio.playSlide(); // TODO: Add slide sound
  }, [setSliding]);

  // --- Controls (Keyboard & Touch) ---
  const triggerJump = useCallback(() => {
    if (isSlidingRef.current) return;
    
    const maxJumps = (hasDoubleJump || hasHover) ? 2 : 1;

    if (!isJumping.current) {
        performJump();
    } else if (jumpsPerformed.current < maxJumps) {
        audio.playJump(true);
        jumpsPerformed.current += 1;
        
        // Double Jump Logic
        if (hasDoubleJump) {
             velocityY.current = JUMP_FORCE;
             spinRotation.current = 0;
        }

        // Hover Logic
        if (hasHover) {
             isHovering.current = true;
             hoverTimer.current = 0.8; 
             if (!hasDoubleJump) {
                 velocityY.current = 0; 
             }
        }
    } else {
        // Jump Buffering: Store jump attempt
        jumpBuffer.current = Date.now();
    }
  }, [hasDoubleJump, hasHover, performJump]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') triggerJump();
      else if (e.key === 'ArrowDown' || e.key === 's') triggerSlide();
      else if (e.key === 'Enter') activateInvincibilityAbility();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, triggerJump, activateInvincibilityAbility, triggerSlide]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    window.addEventListener('touchstart', handleTouchStart);
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, []); 

  useEffect(() => {
    const handleTouchEnd = (e: TouchEvent) => {
        if (status !== GameStatus.PLAYING) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const maxLane = Math.floor(laneCount / 2);

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
             if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
             else setLane(l => Math.max(l - 1, -maxLane));
        } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
             if (deltaY < -30) triggerJump();
             else if (deltaY > 30) triggerSlide();
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            activateInvincibilityAbility();
        }
    };

    window.addEventListener('touchend', handleTouchEnd);
    return () => window.removeEventListener('touchend', handleTouchEnd);
  }, [status, laneCount, triggerJump, activateInvincibilityAbility, triggerSlide]);

  // --- Animation Loop ---
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    const safeDelta = Math.min(delta, 0.1);

    // 1. Horizontal Position (Air Control)
    targetX.current = lane * LANE_WIDTH;
    // Smoother lerp in air for "floaty" feel, snappy on ground
    const lerpSpeed = isJumping.current ? AIR_CONTROL_FACTOR : GROUND_CONTROL_FACTOR;
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX.current, safeDelta * lerpSpeed);

    // 2. Physics (Jump, Hover, Slide)
    
    // Slide Logic
    if (isSlidingRef.current) {
        slideTimer.current -= safeDelta;
        if (slideTimer.current <= 0) {
            isSlidingRef.current = false;
            setSliding(false);
        }
    }

    if (isJumping.current) {
        wasAirborne.current = true;
        
        if (isHovering.current) {
            hoverTimer.current -= safeDelta;
            if (hoverTimer.current <= 0) {
                isHovering.current = false;
            }
        } else {
            velocityY.current -= GRAVITY * safeDelta;
        }

        groupRef.current.position.y += velocityY.current * safeDelta;

        // Ground collision
        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0;
            isJumping.current = false;
            isHovering.current = false;
            jumpsPerformed.current = 0;
            velocityY.current = 0;
            if (bodyRef.current) bodyRef.current.rotation.x = 0;

            // Landing Trigger
            if (wasAirborne.current) {
                landingTimer.current = LANDING_DURATION;
                wasAirborne.current = false;
                
                // Play Snow Landing Sound if in Zone 3
                if (visualLevel === 3) {
                    audio.playSnowLand();
                }

                // Jump Buffer Check (200ms window)
                if (Date.now() - jumpBuffer.current < 200) {
                    performJump();
                    jumpBuffer.current = 0;
                }
            }
        }

        // Spin animation for double jump
        if (jumpsPerformed.current === 2 && bodyRef.current && !isHovering.current) {
             spinRotation.current -= safeDelta * 15;
             if (spinRotation.current < -Math.PI * 2) spinRotation.current = -Math.PI * 2;
             bodyRef.current.rotation.x = spinRotation.current;
        }
    }

    // Banking Rotation
    const xDiff = targetX.current - groupRef.current.position.x;
    groupRef.current.rotation.z = -xDiff * 0.2; 
    groupRef.current.rotation.x = isJumping.current ? 0.1 : 0.05; 

    // 3. Animation Control
    const time = state.clock.elapsedTime * 25; 

    // Slide Squash Animation
    if (bodyRef.current) {
        if (isSlidingRef.current && !isJumping.current) {
            // Squash for slide
            bodyRef.current.scale.lerp(new THREE.Vector3(1.2, 0.5, 1.2), safeDelta * 15);
            bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.6, safeDelta * 15);
        } else if (landingTimer.current > 0) {
            // Landing Squash
            landingTimer.current -= safeDelta;
            const t = 1 - (landingTimer.current / LANDING_DURATION); 
            const squash = Math.sin(t * Math.PI) * 0.3; 
            bodyRef.current.scale.set(1 + squash * 0.4, 1 - squash * 0.4, 1 + squash * 0.4);
            bodyRef.current.position.y = 1.1;
        } else if (!isJumping.current) {
             // Return to normal
            bodyRef.current.scale.lerp(new THREE.Vector3(1,1,1), safeDelta * 10);
            bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 1.1, safeDelta * 10);
        }
    }
    
    // Limb Animations
    if (isJumping.current && bodyRef.current) {
        // Jump Pose
        const isDoubleJumping = jumpsPerformed.current === 2 && !isHovering.current;
        const jumpPoseSpeed = safeDelta * 15;

        if (!isDoubleJumping) {
            // Knees up, Arms up
            if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, -1.5, jumpPoseSpeed);
            if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -1.0, jumpPoseSpeed);
            if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -2.5, jumpPoseSpeed);
            if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -2.5, jumpPoseSpeed);
            
            // Stretch effect based on velocity
            if (velocityY.current > 0) {
                 bodyRef.current.scale.lerp(new THREE.Vector3(0.9, 1.1, 0.9), safeDelta * 5);
            }
        }
    } else if (isSlidingRef.current && bodyRef.current) {
         // Slide Pose: Legs forward, arms back
         if (leftLegRef.current) leftLegRef.current.rotation.x = -1.5;
         if (rightLegRef.current) rightLegRef.current.rotation.x = -1.5;
         if (leftArmRef.current) leftArmRef.current.rotation.x = 0.5;
         if (rightArmRef.current) rightArmRef.current.rotation.x = 0.5;
         if (bodyRef.current) bodyRef.current.rotation.x = -0.2; // Slight lean back
    } else {
        // Run Cycle
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time) * 0.7;
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time + Math.PI) * 0.7;
        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time + Math.PI) * 1.0;
        if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time) * 1.0;
        if (bodyRef.current) {
            bodyRef.current.position.y = 1.1 + Math.abs(Math.sin(time)) * 0.15;
            bodyRef.current.rotation.x = 0.2; // Forward lean running
        }
    }

    // 4. Dynamic Shadow
    if (shadowRef.current) {
        const height = groupRef.current.position.y;
        const scale = Math.max(0.2, 1 - (height / 2.5) * 0.5);
        shadowRef.current.scale.set(scale, scale, scale);
        const material = shadowRef.current.material as THREE.MeshBasicMaterial;
        if (material && !Array.isArray(material)) material.opacity = Math.max(0.1, 0.3 - (height / 2.5) * 0.2);
    }

    // Invincibility Effect
    const showFlicker = postDamageInvincible.current || isInvincible;
    if (showFlicker) {
        if (postDamageInvincible.current) {
             if (Date.now() - lastDamageTime.current > damageShieldDuration) {
                postDamageInvincible.current = false;
                groupRef.current.visible = true;
             } else {
                groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
             }
        } 
        if (isInvincible) {
            groupRef.current.visible = true; 
        }
    } else {
        groupRef.current.visible = true;
    }
  });

  // Damage Handler
  useEffect(() => {
     const checkHit = (e: any) => {
        if (postDamageInvincible.current || isInvincible) return;
        audio.playDamage();
        takeDamage();
        postDamageInvincible.current = true;
        lastDamageTime.current = Date.now();
        if (groupRef.current) {
            window.dispatchEvent(new CustomEvent('particle-burst', {
                detail: {
                    position: groupRef.current.position.toArray(),
                    color: '#ff4400',
                    burstAmount: 80
                }
            }));
        }
     };
     window.addEventListener('player-hit', checkHit);
     return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isInvincible, damageShieldDuration]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={bodyRef} position={[0, 1.1, 0]}> 
        
        {/* Torso */}
        <mesh castShadow position={[0, 0.2, 0]} geometry={TORSO_GEO} material={armorMaterial} />

        {/* Jetpack */}
        <mesh position={[0, 0.2, -0.2]} geometry={JETPACK_GEO} material={jointMaterial} />
        <mesh position={[-0.08, 0.1, -0.28]} geometry={GLOW_STRIP_GEO} material={glowMaterial} />
        <mesh position={[0.08, 0.1, -0.28]} geometry={GLOW_STRIP_GEO} material={glowMaterial} />

        {/* Head */}
        <group ref={headRef} position={[0, 0.6, 0]}>
            <mesh castShadow geometry={HEAD_GEO} material={armorMaterial} />
        </group>

        {/* Arms */}
        <group position={[0.32, 0.4, 0]}>
            <group ref={rightArmRef}>
                <mesh position={[0, -0.25, 0]} castShadow geometry={ARM_GEO} material={armorMaterial} />
                <mesh position={[0, -0.55, 0]} geometry={JOINT_SPHERE_GEO} material={glowMaterial} />
            </group>
        </group>
        <group position={[-0.32, 0.4, 0]}>
            <group ref={leftArmRef}>
                 <mesh position={[0, -0.25, 0]} castShadow geometry={ARM_GEO} material={armorMaterial} />
                 <mesh position={[0, -0.55, 0]} geometry={JOINT_SPHERE_GEO} material={glowMaterial} />
            </group>
        </group>

        {/* Hips */}
        <mesh position={[0, -0.15, 0]} geometry={HIPS_GEO} material={jointMaterial} />

        {/* Legs */}
        <group position={[0.12, -0.25, 0]}>
            <group ref={rightLegRef}>
                 <mesh position={[0, -0.35, 0]} castShadow geometry={LEG_GEO} material={armorMaterial} />
            </group>
        </group>
        <group position={[-0.12, -0.25, 0]}>
            <group ref={leftLegRef}>
                 <mesh position={[0, -0.35, 0]} castShadow geometry={LEG_GEO} material={armorMaterial} />
            </group>
        </group>
      </group>
      
      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHADOW_GEO} material={shadowMaterial} />
    </group>
  );
};
