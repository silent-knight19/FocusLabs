import React, { useState, useEffect } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Calendar } from 'lucide-react';
import './styles/CustomHabitModal.css';

const CATEGORIES = ['study', 'productive', 'self growth'];

const CATEGORY_COLORS = {
  'study': '#FF6B35',
  'productive': '#00FF9F',
  'self growth': '#FF0055'
};

const DEFAULT_COLORS = [
  '#FF6B35', '#00FF9F', '#FF0055', '#FFD700', 
  '#BD00FF', '#FF00FF', '#FF0080', '#0080FF'
];

/**
 * Modal for creating or editing custom date habits
 */
export function CustomHabitModal({ isOpen, onClose, onSave, habit = null }) {
  useLockBodyScroll(isOpen);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    category: 'study',
    startTime: '',
    endTime: '',
    color: '#FF6B35',
    dateFrom: getTodayString(),
    dateTo: getTodayString()
  });
  
  const [errors, setErrors] = useState({});
  const [manualColorSelected, setManualColorSelected] = useState(false);

  useEffect(() => {
    if (habit) {
      setFormData({
        name: habit.name || '',
        category: habit.category || 'study',
        startTime: habit.startTime || '',
        endTime: habit.endTime || '',
        color: habit.color || CATEGORY_COLORS[habit.category || 'study'],
        dateFrom: habit.dateFrom || getTodayString(),
        dateTo: habit.dateTo || getTodayString()
      });
      setManualColorSelected(false);
    } else {
      setFormData({
        name: '',
        category: 'study',
        startTime: '',
        endTime: '',
        color: CATEGORY_COLORS['study'],
        dateFrom: getTodayString(),
        dateTo: getTodayString()
      });
      setManualColorSelected(false);
    }
    setErrors({});
  }, [habit, isOpen]);

  const handleChange = (field, value) => {
    if (field === 'category' && !manualColorSelected) {
      setFormData(prev => ({ 
        ...prev, 
        category: value,
        color: CATEGORY_COLORS[value] 
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Habit name is required';
    }
    
    if (!formData.dateFrom) {
      newErrors.dateFrom = 'Start date is required';
    }
    
    if (!formData.dateTo) {
      newErrors.dateTo = 'End date is required';
    }
    
    if (formData.dateFrom && formData.dateTo && formData.dateTo < formData.dateFrom) {
      newErrors.dateTo = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content custom-habit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Calendar size={24} className="modal-icon" />
            <h2>{habit ? 'Edit Custom Habit' : 'New Custom Date Habit'}</h2>
          </div>
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
            <label htmlFor="custom-habit-name">
              Habit Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="custom-habit-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Exam Preparation"
              autoFocus
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* Date Range Section */}
          <div className="date-range-section">
            <div className="section-label">
              <Calendar size={16} />
              <span>Date Range</span>
            </div>
            <div className="date-range-inputs">
              <div className="form-group">
                <label htmlFor="date-from">From <span className="required">*</span></label>
                <input
                  type="date"
                  id="date-from"
                  value={formData.dateFrom}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                />
                {errors.dateFrom && <span className="error-message">{errors.dateFrom}</span>}
              </div>
              <div className="date-separator">→</div>
              <div className="form-group">
                <label htmlFor="date-to">To <span className="required">*</span></label>
                <input
                  type="date"
                  id="date-to"
                  value={formData.dateTo}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                  min={formData.dateFrom}
                />
                {errors.dateTo && <span className="error-message">{errors.dateTo}</span>}
              </div>
            </div>
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
              <label htmlFor="custom-habit-start-time">Start Time</label>
              <input
                type="time"
                id="custom-habit-start-time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="custom-habit-end-time">End Time</label>
              <input
                type="time"
                id="custom-habit-end-time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </div>
          </div>

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

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              {habit ? 'Update' : 'Create'} Custom Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
