import { useCallback } from 'react';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing date-specific habit notes
 * Notes are stored with key format: {date}_{habitId}
 */
export function useHabitNotes() {
  const { user } = useAuth();
  const userId = user?.uid;

  // Sync notes with Firestore
  const [notes, setNotes, loading] = useFirestore(userId, 'notes', {});

  // Create a unique key for date + habit combination
  const createKey = useCallback((habitId, date) => {
    return `${date}_${habitId}`;
  }, []);

  // Get note for a specific habit on a specific date
  const getNote = useCallback((habitId, date) => {
    const key = createKey(habitId, date);
    return notes[key] || '';
  }, [notes, createKey]);

  // Save note for a specific habit on a specific date
  const saveNote = useCallback((habitId, date, noteText) => {
    const key = createKey(habitId, date);
    setNotes(prev => {
      const updated = { ...prev };
      if (noteText.trim()) {
        updated[key] = noteText;
      } else {
        delete updated[key];
      }
      return updated;
    });
  }, [createKey, setNotes]);

  // Delete note for a specific habit on a specific date
  const deleteNote = useCallback((habitId, date) => {
    const key = createKey(habitId, date);
    setNotes(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, [createKey, setNotes]);

  // Check if a note exists for a specific habit on a specific date
  const hasNote = useCallback((habitId, date) => {
    const key = createKey(habitId, date);
    return key in notes && notes[key]?.trim().length > 0;
  }, [notes, createKey]);

  return {
    getNote,
    saveNote,
    deleteNote,
    hasNote,
    loading
  };
}
