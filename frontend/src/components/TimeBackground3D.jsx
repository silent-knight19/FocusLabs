import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Trail, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Orbital Ring System - Represents time cycles
 * Smooth, fluid rotation like a premium chronometer
 */
function OrbitalRings({ mouse }) {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;
    
    // Smooth orbital rotation - different speeds for each ring
    // Represents seconds, minutes, hours
    ring1Ref.current.rotation.x = time * 0.3 + y * 0.1;
    ring1Ref.current.rotation.y = time * 0.5 + x * 0.1;
    
    ring2Ref.current.rotation.x = time * 0.2 - y * 0.08;
    ring2Ref.current.rotation.y = time * 0.3 - x * 0.08;
    ring2Ref.current.rotation.z = Math.sin(time * 0.1) * 0.2;
    
    ring3Ref.current.rotation.x = time * 0.1 + Math.sin(time * 0.2) * 0.3;
    ring3Ref.current.rotation.y = time * 0.15;
    
    // Gentle group float based on mouse
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x * 2, 0.05);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y * 1.5, 0.05);
  });

  // Premium materials - glass-like with subtle glow
  const ringMaterial1 = useMemo(() => (
    <meshPhysicalMaterial
      color="#ff6b35"
      metalness={0.8}
      roughness={0.2}
      transparent
      opacity={0.15}
      emissive="#ff6b35"
      emissiveIntensity={0.2}
      side={THREE.DoubleSide}
    />
  ), []);

  const ringMaterial2 = useMemo(() => (
    <meshPhysicalMaterial
      color="#8b5cf6"
      metalness={0.9}
      roughness={0.15}
      transparent
      opacity={0.12}
      emissive="#8b5cf6"
      emissiveIntensity={0.15}
      side={THREE.DoubleSide}
    />
  ), []);

  const ringMaterial3 = useMemo(() => (
    <meshPhysicalMaterial
      color="#00d4ff"
      metalness={0.7}
      roughness={0.25}
      transparent
      opacity={0.1}
      emissive="#00d4ff"
      emissiveIntensity={0.1}
      side={THREE.DoubleSide}
    />
  ), []);

  return (
    <group ref={groupRef}>
      {/* Outer ring - Hours */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[8, 0.08, 16, 100]} />
        {ringMaterial1}
      </mesh>
      
      {/* Middle ring - Minutes */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[6, 0.06, 16, 80]} />
        {ringMaterial2}
      </mesh>
      
      {/* Inner ring - Seconds */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[4, 0.04, 16, 60]} />
        {ringMaterial3}
      </mesh>
      
      {/* Central hub - like watch face */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={1}
          roughness={0.1}
          emissive="#ffffff"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

/**
 * Flowing Time Particles - Represents productivity flow
 * Smooth orbital movement without stutter
 */
function TimeFlow({ count = 60, mouse }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Create particles in orbital paths
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 5 + Math.random() * 4;
      const speed = 0.3 + Math.random() * 0.4;
      const offset = Math.random() * Math.PI * 2;
      
      return {
        angle,
        radius,
        speed,
        offset,
        yOffset: (Math.random() - 0.5) * 2,
        color: new THREE.Color(
          i % 3 === 0 ? '#ff6b35' : 
          i % 3 === 1 ? '#8b5cf6' : 
          '#00d4ff'
        ),
      };
    });
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;
    
    particles.forEach((p, i) => {
      // Smooth orbital motion
      const currentAngle = p.angle + time * p.speed + p.offset;
      const currentRadius = p.radius + Math.sin(time * 0.5 + p.offset) * 0.5;
      
      // Mouse influence (subtle)
      const mouseInfluenceX = x * 0.5;
      const mouseInfluenceY = y * 0.5;
      
      dummy.position.set(
        Math.cos(currentAngle) * currentRadius + mouseInfluenceX,
        p.yOffset + Math.sin(time * 0.3 + p.offset) * 0.5 + mouseInfluenceY * 0.5,
        Math.sin(currentAngle) * currentRadius * 0.3
      );
      
      dummy.scale.setScalar(0.08 + Math.sin(time * 2 + p.offset) * 0.02);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, p.color);
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) {
      mesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

/**
 * Chronometer Hands - Abstract watch hands
 */
function ChronometerHands({ mouse }) {
  const secondHand = useRef();
  const minuteHand = useRef();
  const hourHand = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;
    
    // Smooth second hand sweep (like mechanical watch)
    secondHand.current.rotation.z = -time * 0.5;
    
    // Minute hand
    minuteHand.current.rotation.z = -time * 0.1;
    
    // Hour hand
    hourHand.current.rotation.z = -time * 0.025;
    
    // Mouse parallax
    secondHand.current.position.x = THREE.MathUtils.lerp(secondHand.current.position.x, x * 0.3, 0.1);
    secondHand.current.position.y = THREE.MathUtils.lerp(secondHand.current.position.y, y * 0.3, 0.1);
  });

  return (
    <group>
      {/* Hour hand */}
      <mesh ref={hourHand} position={[0, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 0.05]} />
        <meshPhysicalMaterial
          color="#ff6b35"
          metalness={0.9}
          roughness={0.1}
          emissive="#ff6b35"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Minute hand */}
      <mesh ref={minuteHand} position={[1.5, 0, 0]}>
        <boxGeometry args={[3, 0.08, 0.05]} />
        <meshPhysicalMaterial
          color="#8b5cf6"
          metalness={0.9}
          roughness={0.1}
          emissive="#8b5cf6"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Second hand - sweeping */}
      <mesh ref={secondHand} position={[0, 2, 0.1]}>
        <boxGeometry args={[0.04, 4, 0.04]} />
        <meshPhysicalMaterial
          color="#00d4ff"
          metalness={0.8}
          roughness={0.15}
          emissive="#00d4ff"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

/**
 * Energy Flow Trail - Represents productivity and focus
 */
function EnergyFlow({ mouse }) {
  const trailRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { x, y } = mouse.current;
    
    // Figure-8 infinity pattern representing continuous time
    const t = time * 0.4;
    trailRef.current.position.x = Math.sin(t) * 6 + x * 1;
    trailRef.current.position.y = Math.sin(t * 2) * 3 + y * 1;
    trailRef.current.position.z = Math.cos(t) * 2;
    
    // Smooth rotation following path
    trailRef.current.rotation.z = t * 0.5;
  });

  return (
    <Trail
      width={3}
      color="#ff6b35"
      length={8}
      decay={1}
      local={false}
      stride={0}
      interval={0.02}
      attenuation={(width) => width * 0.8}
    >
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#ff6b35" />
      </mesh>
    </Trail>
  );
}

/**
 * Time Markers - Like watch hour markers
 */
function TimeMarkers() {
  const markers = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return {
        position: [
          Math.cos(angle) * 7,
          Math.sin(angle) * 7,
          0
        ],
        rotation: [0, 0, angle + Math.PI / 2],
      };
    });
  }, []);

  return (
    <group>
      {markers.map((marker, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={marker.position} rotation={marker.rotation}>
            <boxGeometry args={[0.15, 0.4, 0.05]} />
            <meshPhysicalMaterial
              color="#ffffff"
              metalness={1}
              roughness={0.1}
              emissive="#ffffff"
              emissiveIntensity={0.5}
              transparent
              opacity={0.9}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/**
 * Main Scene
 */
function Scene({ mouse }) {
  return (
    <>
      {/* Ambient lighting for premium look */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, -10, -5]} intensity={0.6} color="#ff6b35" distance={30} />
      <pointLight position={[10, 10, 5]} intensity={0.4} color="#8b5cf6" distance={30} />
      <pointLight position={[0, -10, 10]} intensity={0.3} color="#00d4ff" distance={30} />
      
      {/* Time-themed elements */}
      <OrbitalRings mouse={mouse} />
      <TimeFlow count={50} mouse={mouse} />
      <ChronometerHands mouse={mouse} />
      <EnergyFlow mouse={mouse} />
      <TimeMarkers />
    </>
  );
}

/**
 * Main Time Background Component
 */
export function TimeBackground3D() {
  const mouse = useRef({ x: 0, y: 0 });
  const frameRef = useRef();

  useEffect(() => {
    let rafId;
    let lastTime = 0;
    const targetFPS = 30; // Cap at 30fps for smooth performance
    const frameInterval = 1000 / targetFPS;
    
    const handleMouseMove = (e) => {
      const now = performance.now();
      if (now - lastTime < frameInterval) return;
      
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
        lastTime = now;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Check for reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(255,107,53,0.05), transparent 70%)',
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
        camera={{ position: [0, 0, 18], fov: 50 }}
        dpr={[1, 1.5]} // Optimize for retina displays
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        performance={{ min: 0.5 }}
        style={{ background: 'transparent' }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}

export default TimeBackground3D;
