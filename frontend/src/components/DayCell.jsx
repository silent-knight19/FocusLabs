import React from 'react';
import './styles/DayCell.css';

/**
 * Interactive cell component for habit completion tracking
 * Cycles through three states: empty -> completed -> failed -> empty
 */
export function DayCell({ status, onClick, date }) {
  const getIcon = () => {
    if (status === 'completed') return '✓';
    if (status === 'failed') return '✕';
    return '';
  };

  const getCellClass = () => {
    let classes = 'day-cell';
    if (status === 'completed') classes += ' completed';
    if (status === 'failed') classes += ' failed';
    return classes;
  };

  return (
    <button
      type="button"
      className={getCellClass()}
      onClick={onClick}
      aria-label={`Mark habit as ${!status ? 'completed' : status === 'completed' ? 'failed' : 'incomplete'}`}
      title={date ? date.toLocaleDateString() : ''}
    >
      <span className="cell-icon">{getIcon()}</span>
    </button>
  );
}
