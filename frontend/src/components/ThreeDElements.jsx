import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles, Trail, Stars } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Floating particles with mouse interaction
 */
function FloatingParticles({ count = 100, mouse }) {
  const points = useRef();
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      size: Math.random() * 0.03 + 0.01,
      color: ['#ff6b35', '#bd00ff', '#00d4ff'][Math.floor(Math.random() * 3)],
    }))
  ).current;

  useFrame(() => {
    if (!points.current) return;
    const positions = points.current.geometry.attributes.position.array;
    
    particles.forEach((p, i) => {
      // Mouse influence
      const mx = mouse.current.x * 0.1;
      const my = mouse.current.y * 0.1;
      
      p.x += p.vx + mx * 0.01;
      p.y += p.vy + my * 0.01;
      
      // Wrap around
      if (p.x > 15) p.x = -15;
      if (p.x < -15) p.x = 15;
      if (p.y > 10) p.y = -10;
      if (p.y < -10) p.y = 10;
      
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  particles.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        color="#ff6b35"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Floating geometric shapes with glass material
 */
function FloatingShape({ position, type = 'sphere', color, scale = 1, speed = 1 }) {
  const mesh = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * speed;
    mesh.current.rotation.x = Math.sin(time * 0.3) * 0.2;
    mesh.current.rotation.y = Math.cos(time * 0.2) * 0.2;
    mesh.current.position.y = position[1] + Math.sin(time * 0.5) * 0.5;
  });

  const geometry = {
    sphere: <sphereGeometry args={[1, 32, 32]} />,
    icosahedron: <icosahedronGeometry args={[1, 0]} />,
    octahedron: <octahedronGeometry args={[1, 0]} />,
    torus: <torusGeometry args={[1, 0.3, 16, 32]} />,
  }[type] || geometry.sphere;

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={1.5}>
      <mesh
        ref={mesh}
        position={position}
        scale={hovered ? scale * 1.1 : scale}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {geometry}
        <meshPhysicalMaterial
          color={color}
          metalness={0.2}
          roughness={0.1}
          transmission={0.4}
          thickness={0.5}
          transparent
          opacity={0.7}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  );
}

/**
 * Light trails that follow paths
 */
function LightTrails() {
  const trailRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    trailRef.current.position.x = Math.sin(time * 0.5) * 10;
    trailRef.current.position.y = Math.cos(time * 0.3) * 5;
    trailRef.current.position.z = Math.sin(time * 0.2) * 2 - 5;
  });

  return (
    <Trail
      width={2}
      color="#ff6b35"
      length={5}
      decay={1}
      local={false}
      stride={0}
      interval={0.1}
      attenuation={(width) => width}
    >
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ff6b35" />
      </mesh>
    </Trail>
  );
}

/**
 * Main 3D scene
 */
function Scene({ mouse }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff6b35" />
      <pointLight position={[10, 10, 10]} intensity={0.3} color="#bd00ff" />
      
      {/* Particles */}
      <FloatingParticles count={80} mouse={mouse} />
      
      {/* Sparkles */}
      <Sparkles
        count={50}
        scale={[25, 15, 10]}
        size={2}
        speed={0.4}
        color="#ff6b35"
        opacity={0.5}
      />
      
      {/* Floating shapes */}
      <FloatingShape
        position={[-8, 3, -5]}
        type="icosahedron"
        color="#ff6b35"
        scale={1.2}
        speed={0.5}
      />
      <FloatingShape
        position={[9, -2, -8]}
        type="sphere"
        color="#bd00ff"
        scale={1.5}
        speed={0.3}
      />
      <FloatingShape
        position={[4, 5, -6]}
        type="torus"
        color="#00d4ff"
        scale={0.8}
        speed={0.6}
      />
      <FloatingShape
        position={[-5, -4, -4]}
        type="octahedron"
        color="#ff6b35"
        scale={0.9}
        speed={0.4}
      />
      
      {/* Light trail */}
      <LightTrails />
      
      {/* Background stars */}
      <Stars
        radius={50}
        depth={30}
        count={200}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5}
      />
    </>
  );
}

/**
 * Main 3D Background Component
 */
export function ThreeDElements() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,107,53,0.08), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(189,0,255,0.05), transparent 50%)',
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
        camera={{ position: [0, 0, 12], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}

export default ThreeDElements;
