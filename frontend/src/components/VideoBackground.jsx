import React, { useRef, useEffect, useState } from 'react';

/**
 * Video Background Component
 * Loops an 8-second video with 40% blur effect
 */
export function VideoBackground() {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video loops seamlessly
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });

    // Auto-play when loaded
    video.addEventListener('loadeddata', () => {
      setLoaded(true);
      video.play().catch(() => {});
    });

    // Handle visibility change - pause when tab hidden to save resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: '-10%',
          width: '120%',
          height: '120%',
          objectFit: 'cover',
          filter: 'blur(0.5px) brightness(0.7)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        onError={(e) => {
          console.error('Video failed to load:', e);
          // Fallback to gradient if video fails
          e.target.style.display = 'none';
        }}
      >
        <source src="/BG_animation.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Glass morphism overlay for readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(13, 10, 15, 0.5)',
          backdropFilter: 'blur(20px) saturate(120%)',
          WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        }}
      />

      {/* Gradient vignette for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255, 107, 53, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.2) 0%, transparent 70%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Loading fallback */}
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

export default VideoBackground;
