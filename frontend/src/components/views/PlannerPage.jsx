import React, { useState } from 'react';
import { useHabitsContext } from '../../contexts/HabitsContext';
import { useDailyPlannerContext } from '../../contexts/DailyPlannerContext';
import { DailyPlanner } from '../DailyPlanner';
import { getToday } from '../../utils/dateHelpers';

/**
 * PlannerPage provides the day planning dashboard using standard/custom habit tracking
 * and the daily todo checklist context.
 */
export function PlannerPage({ onAddHabit, onAddCustomHabit }) {
  const [selectedPlannerDate, setSelectedPlannerDate] = useState(getToday());

  const {
    habits,
    customHabits,
    customCompletions,
    toggleCustomCompletion,
    getCustomCompletionStatus,
    getCustomSubtasks,
    addCustomSubtask,
    deleteCustomSubtask,
    toggleCustomSubtaskCompletion,
    getCustomSubtaskStatus,
    getCustomSubtaskCompletionPercentage
  } = useHabitsContext();

  const {
    getDailyTasks,
    addDailyTask,
    toggleDailyTask,
    updateDailyTask,
    deleteDailyTask,
    getDailyCompletion,
    getDateCompletion
  } = useDailyPlannerContext();

  return (
    <DailyPlanner
      habits={habits}
      selectedDate={selectedPlannerDate}
      onDateChange={setSelectedPlannerDate}
      getDailyTasks={getDailyTasks}
      onAddTask={addDailyTask}
      onToggleTask={toggleDailyTask}
      onUpdateTask={updateDailyTask}
      onDeleteTask={deleteDailyTask}
      getDailyCompletion={getDailyCompletion}
      getDateCompletion={getDateCompletion}
      onAddHabit={onAddHabit}
      // Custom habits
      customHabits={customHabits}
      customCompletions={customCompletions}
      toggleCustomCompletion={toggleCustomCompletion}
      getCustomCompletionStatus={getCustomCompletionStatus}
      onAddCustomHabit={onAddCustomHabit}
      // Custom subtasks
      getCustomSubtasks={getCustomSubtasks}
      addCustomSubtask={addCustomSubtask}
      deleteCustomSubtask={deleteCustomSubtask}
      toggleCustomSubtaskCompletion={toggleCustomSubtaskCompletion}
      getCustomSubtaskStatus={getCustomSubtaskStatus}
      getCustomSubtaskCompletionPercentage={getCustomSubtaskCompletionPercentage}
    />
  );
}
