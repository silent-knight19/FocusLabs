import React from 'react';
import { GridHeader } from './GridHeader';
import { HabitRow } from './HabitRow';
import './styles/HabitGrid.css';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

/**
 * Main grid container displaying all regular habits and their weekly completion status
 * Custom date habits are shown in a separate CustomDateView
 */
export function HabitGrid({ 
  habits, 
  weekDates, 
  onToggle, 
  onEditHabit, 
  onDeleteHabit,
  getCompletionStatus,
  reorderHabits,
  isDateBlockedByCustom
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  if (habits.length === 0) {
    return (
      <div className="habit-grid-empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No habits yet</h3>
          <p className="text-secondary">Click "Add Habit" to create your first habit</p>
        </div>
      </div>
    );
  }

  // Sort habits by their order field
  const sortedHabits = [...habits].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = sortedHabits.findIndex(h => h.id === active.id);
      const newIndex = sortedHabits.findIndex(h => h.id === over.id);
      const newOrder = arrayMove(sortedHabits.map(h => h.id), oldIndex, newIndex);
      if (reorderHabits) reorderHabits(newOrder);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedHabits.map(h => h.id)}>
        <div className="habit-grid-container">
          <div 
            className="habit-grid-body"
            style={{ '--days-count': weekDates.length }}
          >
            <GridHeader weekDates={weekDates} />
            {sortedHabits.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                weekDates={weekDates}
                onToggle={onToggle}
                onEdit={onEditHabit}
                onDelete={onDeleteHabit}
                getStatus={getCompletionStatus}
                isDateBlockedByCustom={isDateBlockedByCustom}
              />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}


