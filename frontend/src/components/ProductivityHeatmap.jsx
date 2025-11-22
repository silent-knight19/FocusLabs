import React, { useMemo } from 'react';
import './styles/ProductivityHeatmap.css';

/**
 * GitHub-style contribution heatmap showing Productive & Self Growth hours
 * Combines 'prod' and 'self' categories
 */
export function ProductivityHeatmap({ habits = [], completions = {}, dataVersion = 0 }) {
  // Get lap history from localStorage (where categories are stored)
  const getLapHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
      return history;
    } catch {
      return [];
    }
  };

  // Generate heatmap data for the current year (Jan - Dec)
  const heatmapData = useMemo(() => {
    const history = getLapHistory();
    const weeks = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Start from Jan 1st of current year
    const startDate = new Date(currentYear, 0, 1); // Jan 1
    
    // Adjust to start on the Monday of that week
    const dayOfWeek = startDate.getDay(); // 0-6 (Sun-Sat)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToMonday);
    
    const totalWeeks = 53;
    
    // Generate weeks
    for (let week = 0; week < totalWeeks; week++) {
      const weekData = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week * 7) + day);
        
        // Only show days within the current year
        if (currentDate.getFullYear() !== currentYear) {
           if (currentDate.getFullYear() < currentYear) {
             weekData.push(null);
             continue;
           }
           if (currentDate.getFullYear() > currentYear) {
             weekData.push(null);
             continue;
           }
        }
        
        const dateKey = currentDate.toISOString().split('T')[0];
        
        // 1. Calculate Stopwatch Hours
        const dayLaps = history.filter(lap => {
          const lapDate = new Date(lap.date).toISOString().split('T')[0];
          return lapDate === dateKey && (lap.category === 'prod' || lap.category === 'self' || lap.category === 'self growth');
        });
        const stopwatchMs = dayLaps.reduce((sum, lap) => sum + (lap.time || 0), 0);
        let totalHours = stopwatchMs / (1000 * 60 * 60);

        // 2. Calculate Habit Completion Hours (1 completion = 1 hour equivalent for visualization)
        // Filter for productive categories
        const productiveHabits = habits.filter(h => 
          ['work', 'study', 'self growth', 'fitness', 'health'].includes(h.category?.toLowerCase())
        );

        productiveHabits.forEach(habit => {
          if (completions[habit.id]?.[dateKey] === 'completed') {
            totalHours += 1; // Add 1 hour equivalent per completed habit
          }
        });
        
        weekData.push({
          date: currentDate,
          dateKey,
          hours: parseFloat(totalHours.toFixed(2)),
          dayOfWeek: currentDate.getDay()
        });
      }
      
      weeks.push(weekData);
    }
    
    return weeks;
  }, [dataVersion, habits, completions]);

  // Calculate intensity level based on hours (same logic as StudyHeatmap)
  const getIntensityLevel = (hours) => {
    if (hours === 0) return 0;
    if (hours < 1.5) return 1;
    if (hours < 3) return 2;
    if (hours < 4.5) return 3;
    if (hours < 6) return 4;
    return 5; // Maximum intensity for 6+ hours
  };

  // Get color based on intensity level using GitHub green theme
  const getColor = (hours) => {
    const level = getIntensityLevel(hours);
    const colors = {
      0: 'var(--heatmap-empty)',
      1: 'var(--github-level-1)',
      2: 'var(--github-level-2)',
      3: 'var(--github-level-3)',
      4: 'var(--github-level-4)',
      5: 'var(--github-level-5)'
    };
    return colors[level];
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const history = getLapHistory();
    // Filter relevant laps first
    const relevantLaps = history.filter(lap => 
      lap.category === 'prod' || lap.category === 'self' || lap.category === 'self growth'
    );

    // Group by date to calculate daily totals
    const dailyTotals = {};
    
    // 1. Add Stopwatch times
    relevantLaps.forEach(lap => {
      const dateKey = new Date(lap.date).toISOString().split('T')[0];
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + (lap.time || 0);
    });

    // 2. Add Habit Completions (1 hour per completion)
    const productiveHabits = habits.filter(h => 
      ['work', 'study', 'self growth', 'fitness', 'health'].includes(h.category?.toLowerCase())
    );

    productiveHabits.forEach(habit => {
      const habitCompletions = completions[habit.id] || {};
      Object.entries(habitCompletions).forEach(([dateKey, status]) => {
        if (status === 'completed') {
          // Add 1 hour (3600000 ms)
          dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + 3600000;
        }
      });
    });

    const allHours = Object.values(dailyTotals).map(ms => ms / (1000 * 60 * 60));
    const totalHours = allHours.reduce((sum, h) => sum + h, 0);
    const daysWithActivity = allHours.filter(h => h > 0).length;
    const maxHours = Math.max(...allHours, 0);
    
    return {
      total: totalHours.toFixed(1),
      days: daysWithActivity,
      max: maxHours.toFixed(1),
      average: daysWithActivity > 0 ? (totalHours / daysWithActivity).toFixed(1) : 0
    };
  }, [dataVersion, habits, completions]);

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get month labels for the timeline
  const getMonthLabels = () => {
    const labels = [];
    let currentMonth = null;
    
    heatmapData.forEach((week, weekIndex) => {
      const firstDayInYear = week.find(day => day !== null);
      if (firstDayInYear) {
        const month = firstDayInYear.date.getMonth();
        if (month !== currentMonth) {
          labels.push({
            month: monthLabels[month],
            position: weekIndex
          });
          currentMonth = month;
        }
      }
    });
    
    return labels;
  };

  return (
    <div className="productivity-heatmap-container">
      <div className="heatmap-header">
        <h3 className="heatmap-title-green">Productivity & Growth</h3>
        <div className="heatmap-stats">
          <div className="stat-item">
            <span className="stat-value-green">{stats.total}h</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-value-green">{stats.days}</span>
            <span className="stat-label">Days</span>
          </div>
          <div className="stat-item">
            <span className="stat-value-green">{stats.max}h</span>
            <span className="stat-label">Max</span>
          </div>
        </div>
      </div>

      <div className="heatmap-wrapper">
        {/* Month labels */}
        <div className="heatmap-months">
          {getMonthLabels().map((label, index) => (
            <div
              key={index}
              className="month-label"
              style={{ gridColumn: label.position + 1 }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Main heatmap grid */}
        <div className="heatmap-content">
          {/* Day labels */}
          <div className="heatmap-days">
            {dayLabels.map((day, index) => (
              <div key={day} className="day-label" style={{ gridRow: index + 1 }}>
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="heatmap-grid">
            {heatmapData.map((week, weekIndex) => (
              <div key={weekIndex} className="heatmap-column">
                {week.map((dayData, dayIndex) => {
                  if (dayData === null) {
                    return <div key={dayIndex} className="heatmap-cell empty" />;
                  }

                  const { date, hours, dateKey } = dayData;
                  const level = getIntensityLevel(hours);
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`heatmap-cell green-level-${level}`}
                      style={{ backgroundColor: getColor(hours) }}
                      data-date={dateKey}
                      data-hours={hours}
                      title={`${date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}: ${hours.toFixed(1)} hours`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-cells">
            <div className="legend-cell green-level-0" style={{ backgroundColor: 'var(--heatmap-empty)' }} />
            <div className="legend-cell green-level-1" style={{ backgroundColor: 'var(--github-level-1)' }} />
            <div className="legend-cell green-level-2" style={{ backgroundColor: 'var(--github-level-2)' }} />
            <div className="legend-cell green-level-3" style={{ backgroundColor: 'var(--github-level-3)' }} />
            <div className="legend-cell green-level-4" style={{ backgroundColor: 'var(--github-level-4)' }} />
            <div className="legend-cell green-level-5" style={{ backgroundColor: 'var(--github-level-5)' }} />
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  );
}
