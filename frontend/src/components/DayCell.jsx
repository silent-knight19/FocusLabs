import React from 'react';
import './styles/DayCell.css';

/**
 * Interactive cell component for habit completion tracking
 * Cycles through three states: empty -> completed -> failed -> empty
 * @param {boolean} isCustomDate - If true, applies custom date styling
 * @param {boolean} blockedByCustom - If true, this date has custom habits so regular habits are blocked
 * @param {boolean} disabled - If true, cell is non-interactive
 */
export function DayCell({ status, onClick, date, showNumber, isCustomDate, blockedByCustom, disabled }) {
  const getIcon = () => {
    if (status === 'completed') return '✓';
    if (status === 'failed') return '✕';
    return '';
  };

  const getCellClass = () => {
    let classes = 'day-cell';
    if (status === 'completed') classes += ' completed';
    if (status === 'failed') classes += ' failed';
    if (showNumber) classes += ' numbered';
    if (isCustomDate) classes += ' custom';
    if (blockedByCustom) classes += ' blocked-by-custom';
    if (disabled) classes += ' disabled';
    return classes;
  };

  return (
    <button
      type="button"
      className={getCellClass()}
      onClick={disabled ? undefined : onClick}
      aria-label={disabled ? 'Not applicable' : `Mark habit as ${!status ? 'completed' : status === 'completed' ? 'failed' : 'incomplete'}`}
      title={date ? date.toLocaleDateString() : ''}
      disabled={disabled}
    >
      {showNumber && !status ? (
        <span className="day-number">{date ? date.getDate() : ''}</span>
      ) : (
        <span className="cell-icon">{getIcon()}</span>
      )}
    </button>
  );
}
