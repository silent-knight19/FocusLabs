import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable wrapper that automatically animates its children
 * when they scroll into the viewport.
 */
export function ScrollReveal({ 
  children, 
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 30,
  className = ''
}) {
  const directions = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 }
  };

  const initialOffset = directions[direction];

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...initialOffset 
      }}
      whileInView={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration, 
        delay,
        ease: [0.16, 1, 0.3, 1] // Custom snappy spring-like cubic bezier
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
