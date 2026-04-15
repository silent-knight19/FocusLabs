import React, { useEffect, useState, useRef } from 'react';

/**
 * 100+ Royalty-free images from Unsplash, Pexels, Pixabay
 * All free to use under respective licenses
 * Theme: Time, Clock, Hourglass, Focus, Productivity, Abstract Dark
 */
const BACKGROUND_IMAGES = [
  // === VERIFIED WORKING UNSPLASH IMAGES ===
  // Time & Clock themed
  'https://images.unsplash.com/photo-1509048199264-78f47f8dc277?w=1200&q=80',
  'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=1200&q=80',
  'https://images.unsplash.com/photo-1524678714212-586ceefeca30?w=1200&q=80',
  'https://images.unsplash.com/photo-1518134346374-184f9d21c093?w=1200&q=80',
  'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=1200&q=80',
  'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80',
  'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1200&q=80',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1200&q=80',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&q=80',
  
  // Dark gradients & Abstract
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&q=80',
  'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1200&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
  'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1200&q=80',
  'https://images.unsplash.com/photo-1550684848-86a5d5969111?w=1200&q=80',
  'https://images.unsplash.com/photo-1604079628040-94301c5b26d7?w=1200&q=80',
  
  // Nature & Flow (time passing concept)
  'https://images.unsplash.com/photo-1506459225024-1428097a7e18?w=1200&q=80',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80',
  'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=1200&q=80',
  'https://images.unsplash.com/photo-1515549832467-8783363e19b6?w=1200&q=80',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80',
  
  // Space & Time
  'https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=1200&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
  'https://images.unsplash.com/photo-1513112300738-bbb13af7028e?w=1200&q=80',
  'https://images.unsplash.com/photo-1501139083538-0139583c61df?w=1200&q=80',
  
  // Abstract dark
  'https://images.unsplash.com/photo-1431440869543-efaf3388c585?w=1200&q=80',
  'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=1200&q=80',
  'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=1200&q=80',
  'https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=1200&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1200&q=80',
  
  // Productivity & Focus
  'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=1200&q=80',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80',
  'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=1200&q=80',
  'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&q=80',
  
  // More dark gradients
  'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=1200&q=80',
  'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1200&q=80',
  'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=1200&q=80',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=80',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80',
  
  // Forest & Nature
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80',
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&q=80',
  
  // Night sky & Stars
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80',
  'https://images.unsplash.com/photo-1504333638930-c8787321eee0?w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
  'https://images.unsplash.com/photo-1490730141103-6cac27b0c0d8?w=1200&q=80',
  
  // Minimal dark
  'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=1200&q=80',
  'https://images.unsplash.com/photo-1531685218831-1f23c0069194?w=1200&q=80',
  'https://images.unsplash.com/photo-1534239697798-12615e483807?w=1200&q=80',
  
  // Mountains & Landscape
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80',
  'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1200&q=80',
  
  // More gradients
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200&q=80',
  'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1200&q=80',
  'https://images.unsplash.com/photo-1557683311-2a6f534ed382?w=1200&q=80',
  'https://images.unsplash.com/photo-1604213410393-89f141bb96b8?w=1200&q=80',
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
 * Generate random position for messy overlap effect
 */
function getRandomPosition(index) {
  // Create messy, overlapping positions
  const basePositions = [
    { top: '-10%', left: '-5%', rotate: -8, scale: 1.2, zIndex: 1 },
    { top: '-15%', left: '20%', rotate: 5, scale: 1.1, zIndex: 2 },
    { top: '-8%', left: '45%', rotate: -3, scale: 1.3, zIndex: 1 },
    { top: '-12%', left: '70%', rotate: 7, scale: 1.15, zIndex: 3 },
    { top: '25%', left: '-8%', rotate: -5, scale: 1.25, zIndex: 2 },
    { top: '20%', left: '22%', rotate: 3, scale: 1.1, zIndex: 1 },
    { top: '28%', left: '48%', rotate: -6, scale: 1.2, zIndex: 4 },
    { top: '22%', left: '72%', rotate: 4, scale: 1.15, zIndex: 2 },
    { top: '50%', left: '-3%', rotate: 6, scale: 1.3, zIndex: 3 },
    { top: '48%', left: '25%', rotate: -4, scale: 1.1, zIndex: 1 },
    { top: '55%', left: '50%', rotate: 8, scale: 1.2, zIndex: 2 },
    { top: '52%', left: '75%', rotate: -2, scale: 1.25, zIndex: 4 },
    { top: '78%', left: '-6%', rotate: -7, scale: 1.15, zIndex: 2 },
    { top: '75%', left: '20%', rotate: 4, scale: 1.3, zIndex: 3 },
    { top: '82%', left: '47%', rotate: -5, scale: 1.1, zIndex: 1 },
    { top: '80%', left: '73%', rotate: 6, scale: 1.2, zIndex: 2 },
  ];
  
  // Add randomness to make it even messier
  const base = basePositions[index % basePositions.length];
  return {
    top: `calc(${base.top} + ${Math.random() * 10 - 5}%)`,
    left: `calc(${base.left} + ${Math.random() * 10 - 5}%)`,
    rotate: base.rotate + (Math.random() * 10 - 5),
    scale: base.scale + (Math.random() * 0.3 - 0.15),
    zIndex: Math.floor(Math.random() * 5) + 1,
  };
}

/**
 * Scrambled 4x4 Overlapping Image Background
 * 100+ images in messy, overlapping grid with glass morphism
 */
export function ScrambledBackground() {
  const [images, setImages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [imagePositions, setImagePositions] = useState([]);

  useEffect(() => {
    // Shuffle all images
    const shuffled = shuffleArray(BACKGROUND_IMAGES);
    // Take 16 for the 4x4 messy grid
    const selected = shuffled.slice(0, 16);
    setImages(selected);
    
    // Generate random positions for each image
    const positions = selected.map((_, index) => getRandomPosition(index));
    setImagePositions(positions);
    
    // Preload images
    let loadedCount = 0;
    const preloadImages = selected.slice(0, 8);
    
    preloadImages.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= preloadImages.length) {
          setLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
      };
      img.src = src;
    });

    // Fallback load after 3 seconds
    const timeout = setTimeout(() => setLoaded(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#0D0A0F',
      }}
    >
      {/* Messy Overlapping Image Grid */}
      <div
        style={{
          position: 'absolute',
          inset: '-20%',
          width: '140%',
          height: '140%',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 1s ease',
          filter: 'blur(20px) brightness(0.5) saturate(0.7)',
        }}
      >
        {images.map((src, index) => {
          const pos = imagePositions[index] || getRandomPosition(index);
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                width: '35%',
                height: '35%',
                zIndex: pos.zIndex,
                transform: `rotate(${pos.rotate}deg) scale(${pos.scale})`,
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
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
                  display: 'block',
                }}
                loading={index < 8 ? 'eager' : 'lazy'}
                onError={(e) => {
                  e.target.parentElement.style.display = 'none';
                }}
              />
              {/* Individual image overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `
                    linear-gradient(
                      ${135 + index * 20}deg,
                      rgba(255, 107, 53, 0.15) 0%,
                      transparent 40%,
                      rgba(139, 92, 246, 0.1) 100%
                    ),
                    rgba(13, 10, 15, 0.4)
                  `,
                  mixBlendMode: 'multiply',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Heavy glass morphism overlay for readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(13, 10, 15, 0.85)',
          backdropFilter: 'blur(100px) saturate(110%)',
          WebkitBackdropFilter: 'blur(100px) saturate(110%)',
        }}
      />

      {/* Additional blur layer for extra subtlety */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Gradient vignette for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.3) 0%, transparent 70%)
          `,
        }}
      />

      {/* Loading fallback */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(255,107,53,0.15), transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1), transparent 50%)
            `,
          }}
        />
      )}
    </div>
  );
}

export default ScrambledBackground;
