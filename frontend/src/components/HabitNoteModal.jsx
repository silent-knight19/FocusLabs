import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import './styles/HabitNoteModal.css';

export function HabitNoteModal({ isOpen, onClose, habitName, date, initialNote, onSave }) {
  const [noteText, setNoteText] = useState(initialNote || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(noteText);
    onClose();
  };

  const handleCancel = () => {
    setNoteText(initialNote || '');
    onClose();
  };

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="note-modal-overlay" onClick={handleCancel}>
      <div className="note-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="note-modal-header">
          <div className="note-modal-title">
            <FileText size={20} />
            <h3>Note for {habitName}</h3>
          </div>
          <button className="note-close-btn" onClick={handleCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="note-modal-date">
          {formattedDate}
        </div>

        <div className="note-modal-body">
          <textarea
            className="note-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add your notes here..."
            autoFocus
          />
        </div>

        <div className="note-modal-footer">
          <button className="note-btn note-btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="note-btn note-btn-save" onClick={handleSave}>
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
