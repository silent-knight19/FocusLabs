import React, { useState, useEffect } from 'react';
import { validateHabit } from '../utils/validationHelpers';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/HabitModal.css';

const CATEGORIES = ['study', 'productive', 'self growth'];

// Category to default color mapping
const CATEGORY_COLORS = {
  'study': '#FF6B35',        // Orange
  'productive': '#00FF9F',   // Light green
  'self growth': '#FF0055'   // Red
};

const DEFAULT_COLORS = [
  '#FF6B35', '#00FF9F', '#FF0055', '#FFD700', 
  '#BD00FF', '#FF00FF', '#FF0080', '#0080FF'
];

/**
 * Modal for creating or editing habits
 */
export function HabitModal({ isOpen, onClose, onSave, habit = null }) {
  useLockBodyScroll(isOpen);
  const [formData, setFormData] = useState({
    name: '',
    category: 'study',
    startTime: '',
    endTime: '',
    color: '#FF6B35',
    weeklyTarget: 7
  });
  
  const [errors, setErrors] = useState({});
  const [manualColorSelected, setManualColorSelected] = useState(false);

  // Populate form when editing existing habit
  useEffect(() => {
    if (habit) {
      setFormData({
        name: habit.name || '',
        category: habit.category || 'study',
        startTime: habit.startTime || habit.time || '',
        endTime: habit.endTime || '',
        color: habit.color || CATEGORY_COLORS[habit.category || 'study'],
        weeklyTarget: habit.weeklyTarget || 7
      });
      setManualColorSelected(false); // Reset when editing
    } else {
      setFormData({
        name: '',
        category: 'study',
        startTime: '',
        endTime: '',
        color: CATEGORY_COLORS['study'], // Default to study color
        weeklyTarget: 7
      });
      setManualColorSelected(false); // Reset for new habit
    }
    setErrors({});
  }, [habit, isOpen]);

  const handleChange = (field, value) => {
    // Auto-update color when category changes (unless user manually selected a color)
    if (field === 'category' && !manualColorSelected) {
      setFormData(prev => ({ 
        ...prev, 
        category: value,
        color: CATEGORY_COLORS[value] 
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Track if user manually selects a color
    if (field === 'color') {
      setManualColorSelected(true);
    }
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validation = validateHabit(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="habit-name">
              Habit Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="habit-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Morning Run"
              autoFocus
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Category</label>
            <div className="category-buttons">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`category-btn ${formData.category === cat ? 'selected' : ''}`}
                  onClick={() => handleChange('category', cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">

            <div className="form-group">
              <label htmlFor="habit-start-time">Start Time</label>
              <input
                type="time"
                id="habit-start-time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="habit-end-time">End Time</label>
              <input
                type="time"
                id="habit-end-time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>


          <div className="form-row">
            <div className="form-group">
              <label>Color Tag</label>
              <div className="color-picker">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleChange('color', color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="habit-target">Weekly Target (days)</label>
              <input
                type="number"
                id="habit-target"
                min="1"
                max="7"
                value={formData.weeklyTarget}
                onChange={(e) => handleChange('weeklyTarget', parseInt(e.target.value))}
              />
              {errors.weeklyTarget && <span className="error-message">{errors.weeklyTarget}</span>}
            </div>
          </div>



          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              {habit ? 'Update' : 'Create'} Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
