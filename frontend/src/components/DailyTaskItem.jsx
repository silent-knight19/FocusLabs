import React, { useState } from 'react';
import './styles/DailyTaskItem.css';

/**
 * Single daily task item component
 * Features: checkbox, title (editable), delete button
 */
export function DailyTaskItem({ task, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleSave = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div className={`daily-task-item ${task.completed ? 'completed' : ''}`}>
      <button
        type="button"
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.completed && <span className="check-mark">✓</span>}
      </button>

      {isEditing ? (
        <input
          type="text"
          className="task-edit-input"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          autoFocus
        />
      ) : (
        <span
          className={`task-title ${task.completed ? 'completed' : ''}`}
          onClick={() => setIsEditing(true)}
          title="Click to edit"
        >
          {task.title}
        </span>
      )}

      <button
        type="button"
        className="task-delete"
        onClick={() => onDelete(task.id)}
        title="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
