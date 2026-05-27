import { useState, useEffect } from 'react';
import { formatDateKey } from '../utils/dateHelpers';

/**
 * Hook to determine which habit is currently active based on time ranges
 * Re-evaluates every minute to avoid global 1-second render spam.
 * @param {Array} habits - List of all regular habits
 * @param {Array} customHabits - List of custom date habits
 * @returns {Object} Active habit data
 */
export function useActiveHabit(habits, customHabits = []) {
  const [activeData, setActiveData] = useState({
    activeHabit: null,
    isCustomHabit: false
  });

  useEffect(() => {
    const calculateActiveHabit = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const todayKey = formatDateKey(now);

      const customHabitsForToday = customHabits.filter(habit => 
        todayKey >= habit.dateFrom && todayKey <= habit.dateTo
      );
      
      const allHabits = [
        ...habits.map(h => ({ ...h, isCustomHabit: false })),
        ...customHabitsForToday.map(h => ({ ...h, isCustomHabit: true }))
      ];

      for (const habit of allHabits) {
        if (!habit.startTime || !habit.endTime) continue;

        const [startHours, startMinutes] = habit.startTime.split(':').map(Number);
        const [endHours, endMinutes] = habit.endTime.split(':').map(Number);

        const startTimeMinutes = startHours * 60 + startMinutes;
        const endTimeMinutes = endHours * 60 + endMinutes;

        let isActive = false;

        if (endTimeMinutes > startTimeMinutes) {
          if (currentTime >= startTimeMinutes && currentTime < endTimeMinutes) {
            isActive = true;
          }
        } else {
          if (currentTime >= startTimeMinutes || currentTime < endTimeMinutes) {
            isActive = true;
          }
        }

        if (isActive) {
          setActiveData(prev => {
            if (prev.activeHabit?.id === habit.id) return prev;
            return {
              activeHabit: habit,
              isCustomHabit: habit.isCustomHabit || false
            };
          });
          return;
        }
      }

      setActiveData(prev => {
        if (!prev.activeHabit) return prev;
        return {
          activeHabit: null,
          isCustomHabit: false
        };
      });
    };

    calculateActiveHabit();

    // Check every minute if the active habit has changed
    const interval = setInterval(calculateActiveHabit, 60000);
    return () => clearInterval(interval);
  }, [habits, customHabits]);

  return activeData;
}
