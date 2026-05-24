import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/HabitModal.css';
import './styles/GoalModal.css';

const CATEGORIES = ['learning', 'career', 'health', 'personal', 'finance'];

const DEFAULT_COLORS = [
  '#FF6B35', '#00FF9F', '#FF0055', '#FFD700',
  '#BD00FF', '#FF00FF', '#FF0080', '#0080FF'
];

/**
 * Modal for creating or editing a goal
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {function} props.onClose - Close handler
 * @param {function} props.onSave - Save handler receiving goal data
 * @param {object|null} props.goal - Existing goal for editing, null for create
 */
export function GoalModal({ isOpen, onClose, onSave, goal = null }) {
  useLockBodyScroll(isOpen);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal',
    color: '#FF6B35',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: ''
  });

  const [initialSubGoals, setInitialSubGoals] = useState([]);
  const [newSubGoalTitle, setNewSubGoalTitle] = useState('');
  const [errors, setErrors] = useState({});

  /**
   * Populate form when editing an existing goal or reset for new
   */
  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        category: goal.category || 'personal',
        color: goal.color || '#FF6B35',
        priority: goal.priority || 'medium',
        startDate: goal.startDate || new Date().toISOString().split('T')[0],
        targetDate: goal.targetDate || ''
      });
      setInitialSubGoals([]);
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'personal',
        color: '#FF6B35',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: ''
      });
      setInitialSubGoals([]);
    }
    setNewSubGoalTitle('');
    setErrors({});
  }, [goal, isOpen]);

  /**
   * Update a single form field and clear its error
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  /**
   * Add a sub-goal to the initial list
   */
  const handleAddSubGoal = () => {
    const title = newSubGoalTitle.trim();
    if (!title) return;

    setInitialSubGoals(prev => [...prev, { title, id: `temp_${Date.now()}` }]);
    setNewSubGoalTitle('');
  };

  /**
   * Remove a sub-goal from the initial list
   */
  const handleRemoveSubGoal = (id) => {
    setInitialSubGoals(prev => prev.filter(sg => sg.id !== id));
  };

  /**
   * Validate and submit the form
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    }
    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    }
    if (formData.targetDate && formData.startDate && formData.targetDate < formData.startDate) {
      newErrors.targetDate = 'Target date must be after start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const goalData = {
      ...formData,
      subGoals: initialSubGoals.map((sg, index) => ({
        id: `subgoal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: sg.title,
        isCompleted: false,
        dueDate: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        order: index
      }))
    };

    onSave(goalData);
    onClose();
  };

  /**
   * Handle Enter key in sub-goal input
   */
  const handleSubGoalKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubGoal();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay" 
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="goal-modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
          <h2>{goal ? 'Edit Goal' : 'New Goal'}</h2>
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
          {/* Title */}
          <div className="form-group">
            <label htmlFor="goal-title">
              Goal Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="goal-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Master React Three Fiber"
              autoFocus
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="goal-description">Description</label>
            <textarea
              id="goal-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="What do you want to achieve?"
              rows={3}
            />
          </div>

          {/* Category */}
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

          {/* Priority */}
          <div className="form-group">
            <label>Priority</label>
            <div className="priority-buttons">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  className={`priority-btn ${formData.priority === p ? `selected ${p}` : ''}`}
                  onClick={() => handleChange('priority', p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="goal-start-date">Start Date</label>
              <input
                type="date"
                id="goal-start-date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="goal-target-date">
                Target Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="goal-target-date"
                value={formData.targetDate}
                onChange={(e) => handleChange('targetDate', e.target.value)}
              />
              {errors.targetDate && <span className="error-message">{errors.targetDate}</span>}
            </div>
          </div>

          {/* Color */}
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

          {/* Initial Sub-goals (only on create) */}
          {!goal && (
            <div className="form-group">
              <label>Sub-goals (optional)</label>
              <div className="initial-subgoals">
                {initialSubGoals.map(sg => (
                  <div key={sg.id} className="initial-subgoal-item">
                    <span>{sg.title}</span>
                    <button
                      type="button"
                      className="remove-subgoal-btn"
                      onClick={() => handleRemoveSubGoal(sg.id)}
                      aria-label="Remove sub-goal"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="add-subgoal-row">
                  <input
                    type="text"
                    value={newSubGoalTitle}
                    onChange={(e) => setNewSubGoalTitle(e.target.value)}
                    onKeyDown={handleSubGoalKeyDown}
                    placeholder="Add a sub-goal..."
                  />
                  <button
                    type="button"
                    className="add-subgoal-btn"
                    onClick={handleAddSubGoal}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={onClose}>Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="primary">
              {goal ? 'Update' : 'Create'} Goal
            </motion.button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
