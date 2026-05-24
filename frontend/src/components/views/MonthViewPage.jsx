import React from 'react';
import { useHabitsContext } from '../../contexts/HabitsContext';
import { HabitGrid } from '../HabitGrid';
import { getCurrentMonthDates } from '../../utils/dateHelpers';

/**
 * MonthViewPage renders the primary habit tracking calendar grid for the current month.
 */
export function MonthViewPage({ currentDate, onEditHabit, onDeleteHabit }) {
  const {
    habits,
    toggleCompletion,
    getCompletionStatus,
    reorderHabits,
    isDateBlockedByCustomHabits
  } = useHabitsContext();

  const monthDates = getCurrentMonthDates(currentDate);

  return (
    <HabitGrid
      habits={habits}
      weekDates={monthDates}
      onToggle={toggleCompletion}
      onEditHabit={onEditHabit}
      onDeleteHabit={onDeleteHabit}
      getCompletionStatus={getCompletionStatus}
      reorderHabits={reorderHabits}
      isDateBlockedByCustom={isDateBlockedByCustomHabits}
    />
  );
}
