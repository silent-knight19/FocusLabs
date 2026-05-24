import React from 'react';
import './styles/DayCell.css';

/**
 * Interactive cell component for habit completion tracking
 * Cycles through three states: empty -> completed -> failed -> empty
 * @param {boolean} isCustomDate - If true, applies custom date styling
 * @param {boolean} blockedByCustom - If true, this date has custom habits so regular habits are blocked
 * @param {boolean} disabled - If true, cell is non-interactive
 * @param {boolean} beforeCreation - If true, date is before habit was created
 * @param {boolean} isFuture - If true, date is in the future
 */
export function DayCell({ status, onClick, date, showNumber, isCustomDate, blockedByCustom, disabled, beforeCreation, isFuture }) {
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
    if (beforeCreation) classes += ' before-creation';
    if (isFuture) classes += ' is-future';
    return classes;
  };

  const getTitle = () => {
    if (!date) return '';
    if (blockedByCustom) {
      return `${date.toLocaleDateString()} — custom habits set for this day`;
    }
    return date.toLocaleDateString();
  };

  return (
    <button
      type="button"
      className={getCellClass()}
      onClick={disabled ? undefined : onClick}
      aria-label={
        blockedByCustom
          ? 'Custom habits set for this day — regular habit blocked'
          : disabled
            ? 'Not applicable'
            : `Mark habit as ${!status ? 'completed' : status === 'completed' ? 'failed' : 'incomplete'}`
      }
      title={getTitle()}
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
