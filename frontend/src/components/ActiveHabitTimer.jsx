import React, { useState, useEffect } from 'react';

export function ActiveHabitTimer({ activeHabit }) {
  const [timeState, setTimeState] = useState({
    formattedTimeRemaining: '00:00',
    progress: 0
  });

  useEffect(() => {
    if (!activeHabit || !activeHabit.startTime || !activeHabit.endTime) return;

    const [startHours, startMinutes] = activeHabit.startTime.split(':').map(Number);
    const [endHours, endMinutes] = activeHabit.endTime.split(':').map(Number);

    const startTimeMinutes = startHours * 60 + startMinutes;
    const endTimeMinutes = endHours * 60 + endMinutes;

    const updateTimer = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();

      let totalDuration = 0;
      let elapsed = 0;
      let timeRemaining = 0;

      if (endTimeMinutes > startTimeMinutes) {
        totalDuration = endTimeMinutes - startTimeMinutes;
        elapsed = currentTime - startTimeMinutes;
        timeRemaining = endTimeMinutes - currentTime;
      } else {
        totalDuration = (1440 - startTimeMinutes) + endTimeMinutes;
        if (currentTime >= startTimeMinutes) {
          elapsed = currentTime - startTimeMinutes;
          timeRemaining = (1440 - currentTime) + endTimeMinutes;
        } else {
          elapsed = (1440 - startTimeMinutes) + currentTime;
          timeRemaining = endTimeMinutes - currentTime;
        }
      }

      const progress = (elapsed / totalDuration) * 100;
      const secondsLeft = 60 - currentSeconds;
      
      const mins = Math.floor(timeRemaining);
      const secs = Math.floor(secondsLeft);
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      setTimeState({
        formattedTimeRemaining: formatted,
        progress
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeHabit]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (timeState.progress / 100);

  return (
    <div className="circular-timer">
      <svg width="184" height="184" viewBox="0 0 184 184">
        <circle
          cx="92"
          cy="92"
          r={radius}
          fill="none"
          className="timer-bg"
          strokeWidth="6"
        />
        <circle
          cx="92"
          cy="92"
          r={radius}
          fill="none"
          className="timer-progress"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform="rotate(-90 92 92)"
        />
      </svg>
      <div className="timer-value">
        {timeState.formattedTimeRemaining}
      </div>
    </div>
  );
}
