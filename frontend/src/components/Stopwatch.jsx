import React, { useState, useRef, useEffect } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';
import './styles/Stopwatch.css';

export function Stopwatch({ isOpen, onClose }) {
  const {
    time,
    isRunning,
    laps,
    start,
    pause,
    reset,
    lap,
    updateLapLabel,
    formatTime
  } = useStopwatch();

  const [editingLapId, setEditingLapId] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingLapId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingLapId]);

  if (!isOpen) return null;

  const formatted = formatTime(time);

  const handleLapClick = (lapId) => {
    setEditingLapId(lapId);
  };

  const handleLapLabelChange = (e, lapId) => {
    updateLapLabel(lapId, e.target.value);
  };

  const handleLapLabelBlur = () => {
    setEditingLapId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingLapId(null);
    }
  };

  return (
    <div className="stopwatch-overlay">
      <div className="stopwatch-container">
        <div className="stopwatch-header-actions">
          <button className="collapse-btn" onClick={onClose} title="Collapse (Keep Running)">
            ↙
          </button>
          <button className="close-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>
        
        <div className="stopwatch-display">
          {formatted.hours && (
            <>
              <span className="time-part">{formatted.hours}</span>
              <span className="time-separator">:</span>
            </>
          )}
          <span className="time-part">{formatted.minutes}</span>
          <span className="time-separator">:</span>
          <span className="time-part">{formatted.seconds}</span>
          <span className="time-separator small">.</span>
          <span className="time-part small">{formatted.centiseconds}</span>
        </div>

        <div className="stopwatch-controls">
          <button 
            className={`control-btn secondary ${isRunning ? 'lap' : 'reset'}`}
            onClick={isRunning ? lap : reset}
          >
            {isRunning ? 'Lap' : 'Reset'}
          </button>
          
          <button 
            className={`control-btn primary ${isRunning ? 'stop' : 'start'}`}
            onClick={isRunning ? pause : start}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>

        <div className="laps-list">
          {laps.map((lapItem, index) => {
            const lapFormatted = formatTime(lapItem.time);
            const isEditing = editingLapId === lapItem.id;
            
            return (
              <div key={lapItem.id} className="lap-item">
                <div className="lap-label-container" onClick={() => handleLapClick(lapItem.id)}>
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      className="lap-input"
                      value={lapItem.label}
                      onChange={(e) => handleLapLabelChange(e, lapItem.id)}
                      onBlur={handleLapLabelBlur}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <span className="lap-label">{lapItem.label}</span>
                  )}
                </div>
                <div className="lap-time">
                  {lapFormatted.minutes}:{lapFormatted.seconds}.{lapFormatted.centiseconds}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
