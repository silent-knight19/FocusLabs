import React, { useState } from 'react';
import { DailyTaskItem } from './DailyTaskItem';
import './styles/DailyTaskPanel.css';

/**
 * Individual habit panel within the daily planner
 * Shows tasks for a specific habit on a specific date
 */
export function DailyTaskPanel({
  habit,
  date,
  tasks,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  completionPercentage
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAdd = () => {
    if (newTaskTitle.trim()) {
      onAddTask(habit.id, date, newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewTaskTitle('');
    }
  };

  return (
    <div className="daily-task-panel">
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <div
            className="habit-color-dot"
            style={{ backgroundColor: habit.color }}
          />
          <h3 className="habit-name">{habit.name}</h3>
          {habit.startTime && (
            <span className="habit-time">
              {habit.startTime}
              {habit.endTime && ` - ${habit.endTime}`}
            </span>
          )}
        </div>
        <div className="header-right">
          <span className="task-count">
            {tasks.filter(t => t.completed).length}/{tasks.length} tasks
          </span>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="panel-content">
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="task-progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${completionPercentage}%`,
                  backgroundColor: habit.color
                }}
              />
            </div>
          )}

          {/* Task list */}
          <div className="task-list">
            {tasks.map(task => (
              <DailyTaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>

          {/* Add new task */}
          <div className="add-task-section">
            <input
              type="text"
              className="task-input"
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button
              type="button"
              className="add-task-btn"
              onClick={handleAdd}
              disabled={!newTaskTitle.trim()}
            >
              + Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
