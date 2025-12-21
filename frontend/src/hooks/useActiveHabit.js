import { useState, useEffect } from 'react';
import { formatDateKey } from '../utils/dateHelpers';

/**
 * Hook to determine which habit is currently active based on time ranges
 * Now includes custom habits that apply to today's date
 * @param {Array} habits - List of all regular habits
 * @param {Array} customHabits - List of custom date habits
 * @returns {Object} Active habit data with countdown timer
 */
export function useActiveHabit(habits, customHabits = []) {
  const [activeData, setActiveData] = useState({
    activeHabit: null,
    timeRemaining: 0,
    totalDuration: 0,
    progress: 0,
    seconds: 0,
    isCustomHabit: false
  });

  useEffect(() => {
    const calculateActiveHabit = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();
      const todayKey = formatDateKey(now);

      // Combine regular habits with custom habits that apply to today
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
        let totalDuration = 0;
        let elapsed = 0;
        let timeRemaining = 0;

        // Handle normal time range (e.g., 09:00 to 17:00)
        if (endTimeMinutes > startTimeMinutes) {
          if (currentTime >= startTimeMinutes && currentTime < endTimeMinutes) {
            isActive = true;
            totalDuration = endTimeMinutes - startTimeMinutes;
            elapsed = currentTime - startTimeMinutes;
            timeRemaining = endTimeMinutes - currentTime;
          }
        } 
        // Handle midnight crossing (e.g., 22:00 to 06:00)
        else {
          // Active if current time is after start time OR before end time
          if (currentTime >= startTimeMinutes || currentTime < endTimeMinutes) {
            isActive = true;
            // Calculate duration across midnight (24 hours = 1440 minutes)
            totalDuration = (1440 - startTimeMinutes) + endTimeMinutes;
            
            if (currentTime >= startTimeMinutes) {
              elapsed = currentTime - startTimeMinutes;
              timeRemaining = (1440 - currentTime) + endTimeMinutes;
            } else {
              // Current time is past midnight
              elapsed = (1440 - startTimeMinutes) + currentTime;
              timeRemaining = endTimeMinutes - currentTime;
            }
          }
        }

        if (isActive) {
          const progress = (elapsed / totalDuration) * 100;

          setActiveData({
            activeHabit: habit,
            timeRemaining,
            totalDuration,
            progress,
            seconds: 60 - currentSeconds, // Seconds until next minute
            isCustomHabit: habit.isCustomHabit || false
          });
          return;
        }
      }

      // No active habit
      setActiveData({
        activeHabit: null,
        timeRemaining: 0,
        totalDuration: 0,
        progress: 0,
        seconds: 0,
        isCustomHabit: false
      });
    };

    // Calculate immediately
    calculateActiveHabit();

    // Update every second
    const interval = setInterval(calculateActiveHabit, 1000);

    return () => clearInterval(interval);
  }, [habits, customHabits]);

  const formatTimeRemaining = (minutes, seconds) => {
    // Format as MM:SS
    const mins = Math.floor(minutes);
    const secs = Math.floor(seconds);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    ...activeData,
    formattedTimeRemaining: formatTimeRemaining(activeData.timeRemaining, activeData.seconds)
  };
}

