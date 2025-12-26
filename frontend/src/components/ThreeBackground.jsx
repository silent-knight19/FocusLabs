import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Animated floating particles that respond to mouse movement
 */
function Particles({ count = 200, mouse }) {
  const mesh = useRef();
  const light = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const time = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;

      temp.push({ time, factor, speed, x, y, z });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    particles.forEach((particle, i) => {
      let { time, factor, speed, x, y, z } = particle;
      time = particle.time += speed;

      const a = Math.cos(time) + Math.sin(time * 1) / 10;
      const b = Math.sin(time) + Math.cos(time * 2) / 10;
      const s = Math.cos(time) * 0.3 + 0.7;

      dummy.position.set(
        x + mouse.current.x * 2 + Math.cos((time / 10) * factor) * 2,
        y + mouse.current.y * 2 + Math.sin((time / 10) * factor) * 2,
        z + Math.sin((time / 10) * factor)
      );
      dummy.scale.setScalar(s * 0.15);
      dummy.rotation.set(a, b, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <pointLight ref={light} distance={40} intensity={8} color="#ff6b35" />
      <instancedMesh ref={mesh} args={[null, null, count]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshPhongMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.5} />
      </instancedMesh>
    </>
  );
}

/**
 * Glowing orbs that float and respond to mouse
 */
function GlowingOrb({ position, color, size = 1, speed = 1 }) {
  const mesh = useRef();
  const startPosition = useRef(position);

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * speed;
    mesh.current.position.x = startPosition.current[0] + Math.sin(time * 0.5) * 2;
    mesh.current.position.y = startPosition.current[1] + Math.sin(time * 0.7) * 1.5;
    mesh.current.position.z = startPosition.current[2] + Math.cos(time * 0.3) * 1;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={mesh} position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
    </Float>
  );
}

/**
 * Rotating geometric shapes with glass-like material
 */
function GeometricShape({ position, geometry = 'icosahedron', color, rotationSpeed = 0.5 }) {
  const mesh = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    mesh.current.rotation.x = time * rotationSpeed * 0.3;
    mesh.current.rotation.y = time * rotationSpeed * 0.5;
  });

  const Geometry = () => {
    switch (geometry) {
      case 'octahedron':
        return <octahedronGeometry args={[1, 0]} />;
      case 'tetrahedron':
        return <tetrahedronGeometry args={[1, 0]} />;
      case 'torus':
        return <torusGeometry args={[1, 0.4, 16, 32]} />;
      default:
        return <icosahedronGeometry args={[1, 0]} />;
    }
  };

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={mesh} position={position} scale={0.8}>
        <Geometry />
        <meshPhysicalMaterial
          color={color}
          metalness={0.1}
          roughness={0.1}
          transparent
          opacity={0.3}
          transmission={0.6}
          thickness={0.5}
        />
      </mesh>
    </Float>
  );
}

/**
 * Scene component that contains all 3D elements
 */
function Scene({ mouse, variant = 'default' }) {
  const { viewport } = useThree();

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff6b35" />
      <pointLight position={[10, 10, 10]} intensity={0.2} color="#bd00ff" />

      {/* Particle system */}
      <Particles count={150} mouse={mouse} />

      {/* Sparkles for extra magic */}
      <Sparkles
        count={100}
        scale={[viewport.width, viewport.height, 10]}
        size={1.5}
        speed={0.3}
        color="#ff6b35"
      />

      {/* Glowing orbs */}
      <GlowingOrb position={[-8, 5, -10]} color="#ff6b35" size={2} speed={0.5} />
      <GlowingOrb position={[10, -5, -15]} color="#bd00ff" size={2.5} speed={0.3} />
      <GlowingOrb position={[0, 8, -12]} color="#0080ff" size={1.8} speed={0.4} />

      {/* Geometric shapes - only for login variant */}
      {variant === 'login' && (
        <>
          <GeometricShape position={[-6, 3, -8]} geometry="icosahedron" color="#ff6b35" rotationSpeed={0.3} />
          <GeometricShape position={[7, -2, -10]} geometry="octahedron" color="#bd00ff" rotationSpeed={0.4} />
          <GeometricShape position={[3, 5, -6]} geometry="torus" color="#0080ff" rotationSpeed={0.2} />
        </>
      )}
    </>
  );
}

/**
 * Main ThreeBackground component
 * @param {string} variant - 'default' | 'login' - determines what elements to show
 * @param {string} className - additional CSS classes
 */
export function ThreeBackground({ variant = 'default', className = '' }) {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return (
      <div 
        className={`three-background-fallback ${className}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255, 107, 53, 0.15), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(189, 0, 255, 0.1), transparent 50%)',
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <div 
      className={`three-background ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene mouse={mouse} variant={variant} />
      </Canvas>
    </div>
  );
}

export default ThreeBackground;
