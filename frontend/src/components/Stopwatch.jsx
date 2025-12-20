import React, { useState, useRef, useEffect } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';
import { Bell, X, ChevronDown, Clock } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/Stopwatch.css';
import './styles/StopwatchAlarmRedesign.css';

export function Stopwatch({ isOpen, onClose, onDataUpdate }) {
  useLockBodyScroll(isOpen);
  const {
    time,
    isRunning,
    laps,
    start,
    pause,
    reset,
    lap,
    updateLapLabel,
    updateLapCategory,
    formatTime
  } = useStopwatch();

  const [editingLapId, setEditingLapId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [hasAlarmTriggered, setHasAlarmTriggered] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [alarmDuration, setAlarmDuration] = useState(0); // in minutes, 0 means disabled
  const [alarmTargetTime, setAlarmTargetTime] = useState(null); // absolute stopwatch time in ms when alarm should ring
  const [tempAlarmInput, setTempAlarmInput] = useState(''); // Temporary input value
  const [showAlarmSettings, setShowAlarmSettings] = useState(false);
  
  const editInputRef = useRef(null);
  const alarmAudioRef = useRef(null);

  const playAlarm = () => {
    // Play alarm.mp3 from public folder
    const audio = new Audio('/alarm.mp3');
    audio.loop = true;
    
    audio.play().catch(e => console.error("Error playing alarm:", e));
    
    alarmAudioRef.current = { audio };
  };

  const stopAlarm = () => {
    if (alarmAudioRef.current) {
      const { audio } = alarmAudioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      alarmAudioRef.current = null;
    }
    setIsAlarmRinging(false);
  };

  const setAlarmTime = (minutes) => {
    // When setting a new alarm, target should be current elapsed time + duration
    const targetMs = time + minutes * 60 * 1000;
    setAlarmDuration(minutes);
    setAlarmTargetTime(targetMs);
    setHasAlarmTriggered(false);
    setIsAlarmRinging(false);
    stopAlarm(); // Ensure any ringing alarm is stopped
    setShowAlarmSettings(false);
    setTempAlarmInput(''); // Clear temp input
  };

  const disableAlarm = () => {
    setAlarmDuration(0);
    setAlarmTargetTime(null);
    setHasAlarmTriggered(false);
    stopAlarm();
    setShowAlarmSettings(false);
  };

  // Check for alarm relative to when it was set
  useEffect(() => {
    if (alarmDuration === 0 || alarmTargetTime == null) return; // Skip if alarm is disabled or not configured

    // Trigger alarm if time reached and not yet triggered
    if (time >= alarmTargetTime && !hasAlarmTriggered) {
      setHasAlarmTriggered(true);
      setIsAlarmRinging(true);
      playAlarm();
    }

    // Reset trigger / stop alarm if time goes below target (e.g. stopwatch reset)
    if (time < alarmTargetTime) {
      if (hasAlarmTriggered) setHasAlarmTriggered(false);
      if (isAlarmRinging) stopAlarm();
    }
  }, [time, alarmDuration, alarmTargetTime, hasAlarmTriggered, isAlarmRinging]);

  // Stop alarm if duration/target changes to something greater than current time
  useEffect(() => {
    if (alarmTargetTime == null) return;
    if (time < alarmTargetTime && isAlarmRinging) {
      stopAlarm();
      setHasAlarmTriggered(false);
    }
  }, [alarmTargetTime, time, isAlarmRinging]);

  useEffect(() => {
    if (editingLapId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingLapId]);

  if (!isOpen) return null;

  const formatted = formatTime(time);
  
  const categories = [
    { value: 'study', label: 'Study', color: '#3b82f6' },
    { value: 'prod', label: 'Productive', color: '#10b981' },
    { value: 'self', label: 'Self-Growth', color: '#f59e0b' },
    { value: 'other', label: 'Other', color: '#6b7280' }
  ];

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

  const getCategoryColor = (cat) => {
    const category = categories.find(c => c.value === cat);
    return category ? category.color : '#6b7280';
  };

  return (
    <div className="stopwatch-overlay">
      <div className="stopwatch-container">
        <div className="stopwatch-header-actions">
          {/* Alarm Settings - Redesigned */}
          <div className="alarm-settings-redesigned">
            <button 
              className={`alarm-btn ${alarmDuration > 0 ? 'active' : ''}`}
              onClick={() => setShowAlarmSettings(!showAlarmSettings)}
              title={alarmDuration > 0 ? `Alarm set for ${alarmDuration} min` : 'Set alarm'}
            >
              <Bell size={20} />
              {alarmDuration > 0 && <span className="alarm-time-badge">{alarmDuration}m</span>}
            </button>
            
            {showAlarmSettings && (
              <div className="alarm-settings-panel">
                <div className="alarm-panel-header">
                  <h4>Set Alarm</h4>
                  <button className="panel-close" onClick={() => setShowAlarmSettings(false)}>
                    <X size={16} />
                  </button>
                </div>
                
                <div className="alarm-presets">
                  {[30, 60, 90, 120].map(min => (
                    <button 
                      key={min}
                      className={`preset-option ${alarmDuration === min ? 'selected' : ''}`}
                      onClick={() => setAlarmTime(min)}
                    >
                      <Clock size={16} />
                      <span>{min} min</span>
                    </button>
                  ))}
                </div>
                
                <div className="alarm-custom">
                  <label>Custom time (minutes)</label>
                  <div className="custom-input-group">
                    <input 
                      type="number" 
                      value={tempAlarmInput}
                      onChange={(e) => setTempAlarmInput(e.target.value)}
                      min="1"
                      placeholder="Enter minutes"
                    />
                    <button 
                      className="set-btn"
                      onClick={() => {
                        const minutes = Number(tempAlarmInput);
                        if (minutes > 0) {
                          setAlarmTime(minutes);
                        }
                      }}
                      disabled={!tempAlarmInput || Number(tempAlarmInput) === 0}
                    >
                      Set
                    </button>
                  </div>
                </div>
                
                {alarmDuration > 0 && (
                  <button className="disable-alarm-btn" onClick={disableAlarm}>
                    <X size={16} />
                    Disable Alarm
                  </button>
                )}
              </div>
            )}
          </div>
          
          <button className="collapse-btn" onClick={onClose} title="Collapse (Keep Running)">
            ↙
          </button>
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>
        
        <div className="stopwatch-display">
          {/* ... (display code) */}
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

        {/* Alarm notification */}
        {isAlarmRinging && (
          <div className="alarm-notification">
            <Bell className="alarm-icon" size={24} />
            <div className="alarm-content">
              <span className="alarm-title">Time's Up!</span>
              <span className="alarm-subtitle">{alarmDuration} minutes reached</span>
            </div>
            <button className="alarm-dismiss-btn" onClick={() => {
              // Stop the current alarm sound and mark this alarm occurrence as handled
              // so it doesn't immediately retrigger while time is still beyond the threshold.
              stopAlarm();
              setHasAlarmTriggered(true);
            }}>
              Dismiss
            </button>
          </div>
        )}

        {isRunning && (
          <div className="category-selector">
            <div className="category-label">Category:</div>
            <div className="category-buttons">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.value)}
                  style={{
                    borderColor: selectedCategory === cat.value ? cat.color : 'transparent',
                    backgroundColor: selectedCategory === cat.value ? `${cat.color}20` : 'transparent'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="stopwatch-controls">
          <button 
            className={`control-btn secondary ${isRunning ? 'lap' : 'reset'}`}
            onClick={isRunning ? () => {
              lap(selectedCategory);
              if (onDataUpdate) onDataUpdate();
            } : reset}
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
                    <>
                      <span 
                        className="category-badge" 
                        style={{ backgroundColor: getCategoryColor(lapItem.category || 'other') }}
                      >
                        {(lapItem.category || 'other').toUpperCase()}
                      </span>
                      <span className="lap-label">{lapItem.label}</span>
                    </>
                  )}
                </div>
                <div className="lap-time">
                  {lapFormatted.hours !== '00' && <>{lapFormatted.hours}:</>}
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
