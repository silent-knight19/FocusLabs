import React, { useEffect, useState, useRef } from 'react';

/**
 * Royalty-free image URLs from Unsplash
 * All images are free to use under Unsplash License
 * Theme: Time, Clock, Hourglass, Focus, Productivity, Abstract Dark
 */
const BACKGROUND_IMAGES = [
  // Time & Clock themed
  'https://images.unsplash.com/photo-1509048199264-78f47f8dc277?w=1920&q=80', // Vintage clock
  'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=1920&q=80', // Clock face close-up
  'https://images.unsplash.com/photo-1524678714212-586ceefeca30?w=1920&q=80', // Hourglass dark
  'https://images.unsplash.com/photo-1518134346374-184f9d21c093?w=1920&q=80', // Watch mechanism
  'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=1920&q=80', // Clock gears
  
  // Abstract Time concepts
  'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1920&q=80', // Abstract time
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80', // Dark abstract
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1920&q=80', // Light trails (time passing)
  'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1920&q=80', // Dark gradient abstract
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=80', // Abstract waves
  
  // Focus & Productivity
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1920&q=80', // Working focus
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920&q=80', // Study focus
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1920&q=80', // Planning
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1920&q=80', // Checklist focus
  
  // Dark aesthetic backgrounds
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80', // Dark gradient
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80', // Smooth gradient
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80', // Purple gradient
  'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1920&q=80', // Dark wave
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80', // Abstract dark
  
  // Minimal & Clean
  'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1920&q=80', // Minimal dark
  'https://images.unsplash.com/photo-1550684848-86a5d5969111?w=1920&q=80', // Dark smooth
  'https://images.unsplash.com/photo-1604079628040-94301c5b26d7?w=1920&q=80', // Dark abstract
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=80', // Fluid abstract
  'https://images.unsplash.com/photo-1579546929660-609bb9af1276?w=1920&q=80', // Gradient mesh
];

/**
 * Shuffle array - Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Static Image Background with Glass Morphism
 * No animations - completely static for performance
 */
export function TimeBackgroundImages() {
  const [images, setImages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Shuffle images randomly on mount
    const shuffled = shuffleArray(BACKGROUND_IMAGES);
    setImages(shuffled);
    
    // Preload first few images
    const preloadCount = Math.min(5, shuffled.length);
    let loadedCount = 0;
    
    shuffled.slice(0, preloadCount).forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= preloadCount) {
          setLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
      };
      img.src = src;
    });
  }, []);

  // Split images into grid positions
  const gridImages = images.slice(0, 12); // Use 12 images for grid

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#0D0A0F',
      }}
    >
      {/* Scrambled Image Grid */}
      <div
        style={{
          position: 'absolute',
          inset: '-5%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, minmax(200px, 1fr))',
          gap: '8px',
          transform: 'rotate(-1deg) scale(1.05)',
          filter: 'brightness(0.7) saturate(0.9)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        {gridImages.map((src, index) => (
          <div
            key={index}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '12px',
              minHeight: '200px',
            }}
          >
            <img
              src={src}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(1.1) rotate(${Math.random() * 4 - 2}deg)`,
                display: 'block',
              }}
              loading={index < 4 ? 'eager' : 'lazy'}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {/* Overlay gradient for cohesion */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  linear-gradient(
                    ${135 + index * 15}deg,
                    rgba(255, 107, 53, 0.15) 0%,
                    transparent 50%,
                    rgba(139, 92, 246, 0.1) 100%
                  )
                `,
                mixBlendMode: 'overlay',
              }}
            />
          </div>
        ))}
      </div>

      {/* Glass morphism overlay - lighter to see images */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(13, 10, 15, 0.55)',
          backdropFilter: 'blur(12px) saturate(120%)',
          WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        }}
      />

      {/* Subtle gradient mesh overlay for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(255, 107, 53, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(0, 212, 255, 0.04) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Loading state */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(255,107,53,0.1), transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.08), transparent 50%)
            `,
          }}
        />
      )}
    </div>
  );
}

export default TimeBackgroundImages;
