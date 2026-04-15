import { useState, useRef, useCallback } from 'react';

/**
 * Hook to handle delayed tooltip display
 * Shows tooltip after hovering for 1 second
 * @param {string} text - The tooltip text to display
 * @returns {Object} Tooltip state and event handlers
 */
export function useTooltip(text) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef(null);

  const handleMouseEnter = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    });

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    position,
    text,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
}

export default useTooltip;
