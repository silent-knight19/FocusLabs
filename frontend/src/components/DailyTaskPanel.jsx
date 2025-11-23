import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { DailyTaskItem } from './DailyTaskItem';
import { HabitNoteModal } from './HabitNoteModal';
import { useHabitNotes } from '../hooks/useHabitNotes';
import { formatDateKey } from '../utils/dateHelpers';
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
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  const { getNote, saveNote, hasNote } = useHabitNotes();
  const dateKey = formatDateKey(date);
  const currentNote = getNote(habit.id, dateKey);
  const noteExists = hasNote(habit.id, dateKey);

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

  const handleSaveNote = (noteText) => {
    saveNote(habit.id, dateKey, noteText);
  };

  return (
    <div className="daily-task-panel">
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <div
            className="habit-color-dot"
            style={{ backgroundColor: habit.color }}
          />
          <h2 className="habit-name">{habit.name}</h2>
          {habit.startTime && (
            <span className="habit-time">
              {habit.startTime}
              {habit.endTime && ` - ${habit.endTime}`}
            </span>
          )}
        </div>
        <div className="header-right">
          <button
            type="button"
            className={`note-icon-btn ${noteExists ? 'has-note' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsNoteModalOpen(true);
            }}
            title={noteExists ? 'View/Edit Note' : 'Add Note'}
          >
            <FileText size={18} />
          </button>
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

      <HabitNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        habitName={habit.name}
        date={dateKey}
        initialNote={currentNote}
        onSave={handleSaveNote}
      />
    </div>
  );
}
