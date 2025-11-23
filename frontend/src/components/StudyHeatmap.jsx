import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import './styles/StudyHeatmap.css';
import './styles/StudyHeatmap.css';

/**
 * GitHub-style contribution heatmap showing daily study hours
 * Minimum 2 hours to show color intensity effect
 */
export function StudyHeatmap({ dataVersion = 0 }) {
  // Get lap history from localStorage
  // Get lap history from Firestore
  const { user } = useAuth();
  const userId = user?.uid;
  const [history, , loading] = useFirestore(userId, 'stopwatch_history', []);

  const getLapHistory = () => {
    if (loading || !history) return [];
    // Filter out laps less than 60 seconds
    return history.filter(lap => (lap.time || 0) > 60000);
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
        
        // Calculate Study Hours
        const dayLaps = history.filter(lap => {
          const lapDate = new Date(lap.date).toISOString().split('T')[0];
          return lapDate === dateKey && lap.category === 'study';
        });
        
        const totalMs = dayLaps.reduce((sum, lap) => sum + (lap.time || 0), 0);
        const hours = totalMs / (1000 * 60 * 60);
        
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
  }, [dataVersion]);

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
    const history = getLapHistory();
    // Filter relevant laps first
    const relevantLaps = history.filter(lap => lap.category === 'study');

    // Group by date to calculate daily totals
    const dailyTotals = {};
    
    relevantLaps.forEach(lap => {
      const dateKey = new Date(lap.date).toISOString().split('T')[0];
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + (lap.time || 0);
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
  }, [dataVersion]);

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
