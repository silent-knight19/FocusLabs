import React from 'react';
import './styles/QuickActions.css';

/**
 * Quick action buttons for batch operations
 */
export function QuickActions({ onCompleteAll, onClearAll, habitCount }) {
  return (
    <div className="quick-actions-container">
      <h4 className="quick-actions-title">Quick Actions</h4>
      <div className="quick-actions-buttons">
        <button 
          type="button"
          className="quick-action-btn complete-all"
          onClick={onCompleteAll}
          disabled={habitCount === 0}
        >
          <span className="btn-icon">✓</span>
          <span className="btn-text">Complete All Today</span>
        </button>
        
        <button 
          type="button"
          className="quick-action-btn clear-all"
          onClick={onClearAll}
          disabled={habitCount === 0}
        >
          <span className="btn-icon">✕</span>
          <span className="btn-text">Clear Today</span>
        </button>
      </div>
    </div>
  );
}
