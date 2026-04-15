import React from 'react';
import './styles/Tooltip.css';

/**
 * Tooltip component that displays after 1 second hover
 * @param {boolean} isVisible - Whether tooltip is visible
 * @param {Object} position - {x, y} position for tooltip
 * @param {string} text - Tooltip text content
 */
export function Tooltip({ isVisible, position, text }) {
  if (!isVisible) return null;

  return (
    <div
      className="tooltip"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)'
      }}
    >
      {text}
    </div>
  );
}

export default Tooltip;
