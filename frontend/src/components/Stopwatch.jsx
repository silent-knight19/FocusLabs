import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStopwatch } from '../hooks/useStopwatch';
import { Bell, X, ChevronDown, Clock, Play, Pause, Square, Flag, RotateCcw } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/Stopwatch.css';
import './styles/StopwatchAlarmRedesign.css';

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

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

  /**
   * Plays an alarm sound using Web Audio API.
   * Creates a repeating 3-tone ascending beep pattern.
   */
  const playAlarm = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      let isPlaying = true;
      let timeoutId = null;

      const playBeep = (frequency, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // 'square' wave creates a harsh, loud, piercing sound like a real digital alarm clock
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(frequency, startTime);
        
        // Max volume (1.0) for a sharp, attention-grabbing attack
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.setValueAtTime(1, startTime + 0.01);
        gain.gain.setValueAtTime(1, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const schedulePattern = () => {
        if (!isPlaying || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        
        // Standard piercing digital alarm clock pattern: 3 quick high-pitched beeps
        const freq = 3136; // High treble pitch typical of piezo buzzers (approx G7)
        playBeep(freq, now, 0.1);
        playBeep(freq, now + 0.2, 0.1);
        playBeep(freq, now + 0.4, 0.1);
        
        // Repeat every 1 second
        timeoutId = setTimeout(schedulePattern, 1000);
      };

      schedulePattern();

      alarmAudioRef.current = {
        stop: () => {
          isPlaying = false;
          if (timeoutId) clearTimeout(timeoutId);
          if (ctx.state !== 'closed') ctx.close().catch(() => {});
        }
      };
    } catch (e) {
      logError('Failed to play alarm sound:', e);
    }
  };

  /**
   * Stops the alarm sound and resets the ringing state.
   */
  const stopAlarm = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.stop();
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

  // Clean up alarm audio on component unmount
  useEffect(() => {
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.stop();
        alarmAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editingLapId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingLapId]);

  // Warn user before closing page/browser if stopwatch is running
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRunning) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = 'You have an active stopwatch session with unsaved progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning]);

  // Alarm notification portal — renders to document.body so it appears on ANY page
  const alarmNotificationPortal = isAlarmRinging ? createPortal(
    <>
      <div className="alarm-notification-overlay" />
      <div className="alarm-notification">
        <Bell className="alarm-icon" size={48} />
        <div className="alarm-content">
          <span className="alarm-title">Time's Up!</span>
          <span className="alarm-subtitle">{alarmDuration} minutes reached</span>
        </div>
        <button className="alarm-dismiss-btn" onClick={() => {
          stopAlarm();
          setHasAlarmTriggered(true);
        }}>
          Dismiss
        </button>
      </div>
    </>,
    document.body
  ) : null;

  // When stopwatch overlay is closed, only render the alarm notification if ringing
  if (!isOpen) return alarmNotificationPortal;

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
              {alarmDuration > 0 && <span className="alarm-duration-label">{alarmDuration}m</span>}
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
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>
        
        <div className="stopwatch-display">
          {/* ... (display code) */}
          {/* Only show hours if the stopwatch has reached 1 hour or more.
              '00' is a truthy string, so we must check explicitly. */}
          {formatted.hours !== '00' && (
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

        {/* Global alarm notification — rendered via portal to document.body */}
        {alarmNotificationPortal}


        <div className="stopwatch-center-layout">
          {isRunning && (
            <div className="category-selector-centered">
              <span className="category-label-small">Session Category</span>
              <div className="category-pills">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    className={`category-pill ${selectedCategory === cat.value ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.value)}
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
            {isRunning ? <><Flag size={18} /><span>Lap</span></> : <><RotateCcw size={18} /><span>Reset</span></>}
          </button>
          
          <button 
            className={`control-btn primary ${isRunning ? 'stop' : 'start'}`}
            onClick={isRunning ? pause : start}
          >
            {isRunning ? <><Square size={18} fill="currentColor" /><span>Stop</span></> : <><Play size={18} fill="currentColor" /><span>Start</span></>}
          </button>
        </div>

        </div> {/* End stopwatch-center-layout */}
        
        <div className="laps-list">
          {laps.map((lapItem) => {
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
