import React from 'react';
import './HabitGridSkeleton.css';

export function HabitGridSkeleton() {
  return (
    <div className="habit-grid-skeleton" aria-busy="true" aria-label="Loading habits">
      <div className="skeleton-header">
        <div className="skeleton-loader skeleton-title" />
        <div className="skeleton-loader skeleton-nav" />
      </div>
      <div className="skeleton-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-loader skeleton-habit-name" />
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="skeleton-loader skeleton-cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
