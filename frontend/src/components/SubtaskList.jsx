import React, { useState } from 'react';
import './styles/SubtaskList.css';

/**
 * Component for managing subtasks of a habit
 */
export function SubtaskList({ habitId, subtasks, onAddSubtask, onDeleteSubtask, onToggleSubtask, date, getSubtaskStatus }) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(habitId, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="subtask-list">
      {subtasks.map(subtask => {
        const isCompleted = getSubtaskStatus(habitId, subtask.id, date);
        
        return (
          <div key={subtask.id} className="subtask-item">
            <button
              type="button"
              className={`subtask-checkbox ${isCompleted ? 'checked' : ''}`}
              onClick={() => onToggleSubtask(habitId, subtask.id, date)}
              title="Toggle completion"
            >
              {isCompleted && <span className="check-mark">✓</span>}
            </button>
            <span className={`subtask-title ${isCompleted ? 'completed' : ''}`}>
              {subtask.title}
            </span>
            <button
              type="button"
              className="subtask-delete"
              onClick={() => onDeleteSubtask(subtask.id)}
              title="Delete subtask"
            >
              ✕
            </button>
          </div>
        );
      })}

      {isAdding ? (
        <div className="subtask-add-form">
          <input
            type="text"
            className="subtask-input"
            placeholder="Enter subtask..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            autoFocus
          />
          <button type="button" className="subtask-btn save" onClick={handleAdd}>
            ✓
          </button>
          <button 
            type="button" 
            className="subtask-btn cancel" 
            onClick={() => {
              setNewSubtaskTitle('');
              setIsAdding(false);
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="add-subtask-btn"
          onClick={() => setIsAdding(true)}
        >
          + Add Subtask
        </button>
      )}
    </div>
  );
}
