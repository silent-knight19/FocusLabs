import React from 'react';
import { useHabitsContext } from '../../contexts/HabitsContext';
import { CustomDateView } from '../CustomDateView';
import { getCurrentMonthDates } from '../../utils/dateHelpers';

/**
 * CustomDatePage provides a dashboard for habits tracked across custom, multi-day ranges.
 */
export function CustomDatePage({ currentDate, onEditCustomHabit, onDeleteCustomHabit, onAddCustomHabit }) {
  const {
    customHabits,
    toggleCustomCompletion,
    getCustomCompletionStatus,
    formatDateRange
  } = useHabitsContext();

  const monthDates = getCurrentMonthDates(currentDate);

  return (
    <CustomDateView
      customHabits={customHabits}
      weekDates={monthDates}
      onToggleCustom={toggleCustomCompletion}
      onEditCustomHabit={onEditCustomHabit}
      onDeleteCustomHabit={onDeleteCustomHabit}
      getCustomCompletionStatus={getCustomCompletionStatus}
      onAddCustomHabit={onAddCustomHabit}
      formatDateRange={formatDateRange}
    />
  );
}
