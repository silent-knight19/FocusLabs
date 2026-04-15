import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for 3D tilt effect based on mouse position
 * @param {Object} options - Configuration options
 * @param {number} options.maxTilt - Maximum tilt angle in degrees (default: 10)
 * @param {number} options.perspective - CSS perspective value (default: 1000)
 * @param {number} options.scale - Scale on hover (default: 1.02)
 * @param {number} options.speed - Transition speed in ms (default: 400)
 * @returns {Object} { ref, style, handlers }
 */
export function use3DTilt(options = {}) {
  const {
    maxTilt = 10,
    perspective = 1000,
    scale = 1.02,
    speed = 400,
  } = options;

  const ref = useRef(null);
  const frameRef = useRef(null);
  const bounds = useRef(null);

  const updateBounds = useCallback(() => {
    if (ref.current) {
      bounds.current = ref.current.getBoundingClientRect();
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!bounds.current) return;

    // Cancel any pending animation frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const { left, top, width, height } = bounds.current;
      const x = e.clientX - left;
      const y = e.clientY - top;

      // Calculate percentage from center
      const centerX = width / 2;
      const centerY = height / 2;
      const percentX = (x - centerX) / centerX;
      const percentY = (y - centerY) / centerY;

      // Calculate rotation (inverted for natural feel)
      const rotateX = percentY * -maxTilt;
      const rotateY = percentX * maxTilt;

      if (ref.current) {
        ref.current.style.transform = `
          perspective(${perspective}px)
          rotateX(${rotateX}deg)
          rotateY(${rotateY}deg)
          scale3d(${scale}, ${scale}, ${scale})
          translateZ(20px)
        `;
      }
    });
  }, [maxTilt, perspective, scale]);

  const handleMouseEnter = useCallback(() => {
    updateBounds();
    if (ref.current) {
      ref.current.style.transition = `transform ${speed}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    }
  }, [updateBounds, speed]);

  const handleMouseLeave = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    if (ref.current) {
      ref.current.style.transition = `transform ${speed}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      ref.current.style.transform = `
        perspective(${perspective}px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
        translateZ(0)
      `;
    }
  }, [perspective, speed]);

  // Update bounds on window resize
  useEffect(() => {
    window.addEventListener('resize', updateBounds);
    return () => {
      window.removeEventListener('resize', updateBounds);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [updateBounds]);

  const style = {
    transformStyle: 'preserve-3d',
    willChange: 'transform',
  };

  const handlers = {
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  return { ref, style, handlers };
}

/**
 * Hook for parallax scroll effect
 * @param {number} speed - Parallax speed multiplier (default: 0.5)
 * @returns {Object} { ref, style }
 */
export function useParallax(speed = 0.5) {
  const ref = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const scrolled = window.scrollY;
          const elementTop = rect.top + scrolled;
          const relativeScroll = scrolled - elementTop + window.innerHeight;
          const translateY = relativeScroll * speed * 0.1;

          ref.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [speed]);

  const style = {
    willChange: 'transform',
    transformStyle: 'preserve-3d',
  };

  return { ref, style };
}

/**
 * Hook for 3D scroll reveal animation
 * @param {Object} options - Configuration
 * @param {number} options.threshold - Intersection threshold (default: 0.1)
 * @param {string} options.animation - Animation type (default: 'slideUp')
 * @returns {Object} { ref, isVisible, className }
 */
export function use3DReveal(options = {}) {
  const { threshold = 0.1, animation = 'slideUp' } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const animationClasses = {
    slideUp: 'animate-slide-3d',
    scale: 'animate-scale-3d',
    flip: 'animate-flip-3d',
  };

  const className = isVisible ? animationClasses[animation] || animationClasses.slideUp : '';

  return { ref, isVisible, className };
}

export default use3DTilt;
