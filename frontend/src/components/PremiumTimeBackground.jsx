import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Apple-style Glass Rings - Mature, premium aesthetic
 * Inspired by Apple Vision Pro spatial design
 */
function GlassRings({ mouse }) {
  const groupRef = useRef();
  const ringsRef = useRef([]);

  const rings = useMemo(() => [
    { radius: 6, tube: 0.03, speed: 0.15, color: '#ff6b35', opacity: 0.4 },
    { radius: 4.5, tube: 0.025, speed: 0.25, color: '#8b5cf6', opacity: 0.35 },
    { radius: 3, tube: 0.02, speed: 0.4, color: '#00d4ff', opacity: 0.3 },
  ], []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;

    // Smooth, elegant rotation - not chaotic
    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;
      const config = rings[i];
      
      // Gentle, predictable rotation
      ring.rotation.x = Math.sin(time * config.speed * 0.5) * 0.3 + (y * 0.1);
      ring.rotation.y = time * config.speed + (x * 0.1);
      ring.rotation.z = Math.cos(time * config.speed * 0.3) * 0.1;
    });

    // Subtle group movement
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x * 0.5, 0.03);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y * 0.3, 0.03);
  });

  return (
    <group ref={groupRef}>
      {rings.map((config, i) => (
        <mesh
          key={i}
          ref={(el) => (ringsRef.current[i] = el)}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[config.radius, config.tube, 32, 128]} />
          <meshPhysicalMaterial
            color={config.color}
            metalness={0.1}
            roughness={0.05}
            transparent
            opacity={config.opacity}
            transmission={0.6}
            thickness={0.5}
            clearcoat={1}
            clearcoatRoughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Floating Orbs - Like Apple Music or Vision OS
 * Mature, minimal, elegant
 */
function FloatingOrbs({ mouse }) {
  const orbsRef = useRef([]);

  const orbs = useMemo(() => [
    { position: [-5, 2, -2], size: 0.8, color: '#ff6b35', speed: 0.8 },
    { position: [6, -1, -4], size: 1.2, color: '#8b5cf6', speed: 0.6 },
    { position: [3, 4, -3], size: 0.6, color: '#00d4ff', speed: 1 },
    { position: [-4, -3, -1], size: 0.9, color: '#ff6b35', speed: 0.7 },
  ], []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { x } = mouse.current;

    orbsRef.current.forEach((orb, i) => {
      if (!orb) return;
      const config = orbs[i];
      
      // Gentle floating - not erratic
      orb.position.y = config.position[1] + Math.sin(time * config.speed) * 0.3;
      orb.position.x = THREE.MathUtils.lerp(
        orb.position.x,
        config.position[0] + x * 0.3,
        0.02
      );
      
      // Subtle rotation
      orb.rotation.x = time * 0.1;
      orb.rotation.y = time * 0.15;
    });
  });

  return (
    <>
      {orbs.map((config, i) => (
        <Float
          key={i}
          speed={config.speed}
          rotationIntensity={0.1}
          floatIntensity={0.3}
        >
          <mesh
            ref={(el) => (orbsRef.current[i] = el)}
            position={config.position}
          >
            <sphereGeometry args={[config.size, 64, 64]} />
            <meshPhysicalMaterial
              color={config.color}
              metalness={0}
              roughness={0.2}
              transparent
              opacity={0.25}
              transmission={0.8}
              thickness={1}
              ior={1.5}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

/**
 * Time Particles - Minimal, like watch face particles
 * Inspired by luxury watch micro-branding
 */
function TimeParticles({ mouse }) {
  const count = 40;
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 5 + Math.sin(i * 0.5) * 2;
      const speed = 0.2 + (i % 3) * 0.1;
      const yOffset = (i % 5 - 2) * 0.8;
      
      return {
        angle,
        radius,
        speed,
        yOffset,
        baseX: Math.cos(angle) * radius,
        baseZ: Math.sin(angle) * radius * 0.5,
      };
    });
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;

    particles.forEach((p, i) => {
      const t = time * p.speed;
      
      // Smooth orbital motion
      const currentAngle = p.angle + t * 0.1;
      const currentRadius = p.radius + Math.sin(t * 0.5) * 0.2;
      
      dummy.position.set(
        Math.cos(currentAngle) * currentRadius + x * 0.2,
        p.yOffset + Math.sin(t * 0.3) * 0.2 + y * 0.1,
        Math.sin(currentAngle) * currentRadius * 0.5
      );
      
      // Scale pulsing
      const scale = 0.04 + Math.sin(t + i) * 0.015;
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

/**
 * Central Time Disc - Like a premium watch face
 */
function TimeDisc({ mouse }) {
  const discRef = useRef();
  const markersRef = useRef([]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;

    // Gentle breathing rotation
    discRef.current.rotation.z = time * 0.05;
    discRef.current.position.x = THREE.MathUtils.lerp(discRef.current.position.x, x * 0.2, 0.02);
    discRef.current.position.y = THREE.MathUtils.lerp(discRef.current.position.y, y * 0.2, 0.02);

    // Markers pulse
    markersRef.current.forEach((marker, i) => {
      if (!marker) return;
      const pulse = Math.sin(time * 2 + i * 0.5) * 0.1 + 1;
      marker.scale.setScalar(pulse);
    });
  });

  // 12 hour markers
  const markers = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return {
        position: [Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, 0],
        rotation: [0, 0, angle],
      };
    });
  }, []);

  return (
    <group>
      {/* Main disc */}
      <mesh ref={discRef}>
        <cylinderGeometry args={[2, 2, 0.05, 64]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.3}
          clearcoat={1}
        />
      </mesh>

      {/* Inner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 16, 64]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.5} />
      </mesh>

      {/* Hour markers */}
      {markers.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => (markersRef.current[i] = el)}
          position={m.position}
          rotation={m.rotation}
        >
          <boxGeometry args={[0.08, 0.2, 0.02]} />
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={1}
            roughness={0.1}
            emissive="#ffffff"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Center dot */}
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial
          color="#ff6b35"
          metalness={0.9}
          roughness={0.1}
          emissive="#ff6b35"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Ambient Light Rays - Subtle atmosphere
 */
function LightRays() {
  const raysRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    raysRef.current.rotation.z = time * 0.02;
    raysRef.current.material.opacity = 0.03 + Math.sin(time * 0.5) * 0.01;
  });

  return (
    <mesh ref={raysRef} position={[0, 0, -10]} rotation={[0, 0, Math.PI / 6]}>
      <planeGeometry args={[30, 30, 1, 1]} />
      <meshBasicMaterial
        color="#8b5cf6"
        transparent
        opacity={0.03}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Main Scene - Mature, premium composition
 */
function Scene({ mouse }) {
  return (
    <>
      {/* Lighting - Studio quality */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.5}
        color="#ffffff"
        castShadow={false}
      />
      <pointLight
        position={[-5, 5, 5]}
        intensity={0.4}
        color="#ff6b35"
        distance={20}
        decay={2}
      />
      <pointLight
        position={[5, -5, 5]}
        intensity={0.3}
        color="#8b5cf6"
        distance={20}
        decay={2}
      />
      <pointLight
        position={[0, 0, 8]}
        intensity={0.2}
        color="#00d4ff"
        distance={15}
        decay={2}
      />

      {/* Scene elements */}
      <GlassRings mouse={mouse} />
      <FloatingOrbs mouse={mouse} />
      <TimeDisc mouse={mouse} />
      <TimeParticles mouse={mouse} />
      <LightRays />

      {/* Post-processing for premium look */}
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
}

/**
 * Premium Time Background Component
 * Production-grade, mature aesthetic
 */
export function PremiumTimeBackground() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let rafId;
    let lastUpdate = 0;
    const throttleMs = 16; // ~60fps max

    const handleMouseMove = (e) => {
      const now = performance.now();
      if (now - lastUpdate < throttleMs) return;

      rafId = requestAnimationFrame(() => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
        lastUpdate = now;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Reduced motion check
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 70%, rgba(139,92,246,0.06) 0%, transparent 40%)
          `,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 12],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          premultipliedAlpha: false,
        }}
        performance={{ min: 0.5 }}
        style={{ background: 'transparent' }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}

export default PremiumTimeBackground;
