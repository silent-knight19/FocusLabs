import React from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/ConfirmationModal.css';

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // 'danger' | 'warning' | 'info'
}) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <h3>{title}</h3>
        </div>
        
        <div className="confirmation-body">
          <p>{message}</p>
        </div>

        <div className="confirmation-actions">
          <button 
            className="cancel-btn" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-btn ${type}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
