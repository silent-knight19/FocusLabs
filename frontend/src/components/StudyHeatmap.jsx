import React, { useMemo } from 'react';
import './styles/StudyHeatmap.css';

/**
 * GitHub-style contribution heatmap showing daily study hours
 * Minimum 2 hours to show color intensity effect
 */
export function StudyHeatmap() {
  // Get stopwatch history from localStorage
  const getStopwatchHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('habitgrid_stopwatch_history') || '{}');
      return history;
    } catch {
      return {};
    }
  };

  // Generate heatmap data for the current year (Jan - Dec)
  const heatmapData = useMemo(() => {
    const history = getStopwatchHistory();
    const weeks = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Start from Jan 1st of current year
    const startDate = new Date(currentYear, 0, 1); // Jan 1
    
    // Adjust to start on the Monday of that week
    // getDay(): 0=Sun, 1=Mon... 
    // We want 1=Mon to be index 0. 
    // If Jan 1 is Mon (1), offset is 0.
    // If Jan 1 is Tue (2), offset is 1.
    // If Jan 1 is Sun (0), offset is 6.
    const dayOfWeek = startDate.getDay(); // 0-6 (Sun-Sat)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToMonday);
    
    // Calculate total weeks for the year (52 or 53)
    // We'll just generate 53 weeks to be safe and cover the whole year
    const totalWeeks = 53;
    
    // Generate weeks
    for (let week = 0; week < totalWeeks; week++) {
      const weekData = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week * 7) + day);
        
        // Only show days within the current year
        if (currentDate.getFullYear() !== currentYear) {
           // If it's before Jan 1 or after Dec 31, show empty
           // But we want to keep the grid structure, so we push a placeholder or null
           // GitHub shows empty squares for days outside the year in the grid
           // We'll push null but handle it in rendering to show an empty cell if desired, 
           // or just show it as 0 hours if we want the grid to look complete.
           // User said "name of months should start from january".
           // Let's just show 0 hours for padding days to keep the grid shape nice.
           // Actually, GitHub hides days from previous/next year in the first/last columns usually?
           // Let's just render them as empty/invisible if they are not in the year.
           // But for "Jan 1 starts on Wed", Mon/Tue should be invisible.
           if (currentDate.getFullYear() < currentYear) {
             weekData.push(null); // Before year start
             continue;
           }
           if (currentDate.getFullYear() > currentYear) {
             weekData.push(null); // After year end
             continue;
           }
        }
        
        // Don't show future dates (optional, but user wants "current year", so maybe show empty cells for future?)
        // User didn't specify, but usually "heatmap" implies past data. 
        // If I show full year, future dates should be empty cells.
        // I'll allow future dates to be rendered as empty cells (0 hours).
        
        const dateKey = currentDate.toISOString().split('T')[0];
        const milliseconds = history[dateKey] || 0;
        const hours = milliseconds / (1000 * 60 * 60);
        
        weekData.push({
          date: currentDate,
          dateKey,
          hours: parseFloat(hours.toFixed(2)),
          dayOfWeek: currentDate.getDay()
        });
      }
      
      weeks.push(weekData);
    }
    
    return weeks;
  }, []);

  // Calculate intensity level based on hours (minimum 2 hours for effect)
  const getIntensityLevel = (hours) => {
    if (hours === 0) return 0;
    if (hours < 1.5) return 1; // Very light
    if (hours < 3) return 2;   // Light
    if (hours < 4.5) return 3; // Medium
    if (hours < 6) return 4;   // Bright
    return 5; // Maximum intensity for 6+ hours (Full Neon)
  };

  // Get color based on intensity level using the neon orange theme
  const getColor = (hours) => {
    const level = getIntensityLevel(hours);
    const colors = {
      0: 'var(--heatmap-empty)',      // #1A1A26 (empty)
      1: 'var(--heatmap-level-1)',    // Very light orange
      2: 'var(--heatmap-level-2)',    // Light orange
      3: 'var(--heatmap-level-3)',    // Medium orange
      4: 'var(--heatmap-level-4)',    // Bright orange
      5: 'var(--heatmap-level-5)'     // Max neon orange
    };
    return colors[level];
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const history = getStopwatchHistory();
    const allHours = Object.values(history).map(ms => ms / (1000 * 60 * 60));
    const totalHours = allHours.reduce((sum, h) => sum + h, 0);
    const daysWithActivity = allHours.filter(h => h > 0).length;
    const maxHours = Math.max(...allHours, 0);
    
    return {
      total: totalHours.toFixed(1),
      days: daysWithActivity,
      max: maxHours.toFixed(1),
      average: daysWithActivity > 0 ? (totalHours / daysWithActivity).toFixed(1) : 0
    };
  }, []);

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get month labels for the timeline
  const getMonthLabels = () => {
    const labels = [];
    let currentMonth = null;
    
    heatmapData.forEach((week, weekIndex) => {
      // Find the first day in the week that is actually in the current year (not null)
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
    <div className="study-heatmap-container">
      <div className="heatmap-header">
        <h3 className="heatmap-title">Study Activity</h3>
        {/* Stats removed or simplified for compact view? User said "adjust size accordingly". 
            I'll keep them but they might wrap. */}
        <div className="heatmap-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total}h</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.days}</span>
            <span className="stat-label">Days</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.max}h</span>
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
                      className={`heatmap-cell level-${level}`}
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
            <div className="legend-cell level-0" style={{ backgroundColor: 'var(--heatmap-empty)' }} />
            <div className="legend-cell level-1" style={{ backgroundColor: 'var(--heatmap-level-1)' }} />
            <div className="legend-cell level-2" style={{ backgroundColor: 'var(--heatmap-level-2)' }} />
            <div className="legend-cell level-3" style={{ backgroundColor: 'var(--heatmap-level-3)' }} />
            <div className="legend-cell level-4" style={{ backgroundColor: 'var(--heatmap-level-4)' }} />
            <div className="legend-cell level-5" style={{ backgroundColor: 'var(--heatmap-level-5)' }} />
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  );
}
