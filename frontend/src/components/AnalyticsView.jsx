import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { getToday, formatDateKey, getWeekStart, getMonthDates } from '../utils/dateHelpers';
import './styles/AnalyticsView.css';

export function AnalyticsView({ 
  habits, 
  completions,
  customHabits = [],
  customCompletions = {}
}) {
  const today = getToday();

  // --- Analytics Logic ---

  // 1. Daily Progress (Today) - Redesigned as Concentric Rings
  // Now includes custom habits that apply to today
  const dailyStats = useMemo(() => {
    const todayKey = formatDateKey(today);
    
    // Filter custom habits that apply to today
    const customHabitsForToday = customHabits.filter(habit => 
      todayKey >= habit.dateFrom && todayKey <= habit.dateTo
    );
    
    // Combine regular and custom habits
    const allHabits = [...habits, ...customHabitsForToday];
    const allCompletions = { ...completions };
    
    // Merge custom completions
    customHabitsForToday.forEach(habit => {
      if (customCompletions[habit.id]?.[todayKey]) {
        allCompletions[habit.id] = { [todayKey]: customCompletions[habit.id][todayKey] };
      }
    });
    
    // Calculate stats for different categories
    const categories = [
      { id: 'study', label: 'Study', color: '#4ade80', radius: 16 }, // Green
      { id: 'prod', label: 'Productive', color: '#fbbf24', radius: 12 }, // Yellow
      { id: 'self', label: 'Self Growth', color: '#60a5fa', radius: 8 }  // Blue
    ];

    const stats = categories.map(cat => {
      const catHabits = allHabits.filter(h => 
        h.category?.toLowerCase().includes(cat.id) || 
        (cat.id === 'prod' && ['work', 'fitness', 'health'].includes(h.category?.toLowerCase()))
      );
      
      const total = catHabits.length;
      const completed = catHabits.filter(h => allCompletions[h.id]?.[todayKey] === 'completed').length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      return { ...cat, completed, total, percentage };
    });

    // Total solved/completed for center text
    const totalCompleted = stats.reduce((acc, curr) => acc + curr.completed, 0);
    const totalHabits = stats.reduce((acc, curr) => acc + curr.total, 0);

    return { categories: stats, totalCompleted, totalHabits };
  }, [habits, completions, customHabits, customCompletions, today]);

  // ... (Weekly, Monthly, Yearly stats remain same) ...

  // 5. Productivity Hours (Filtered by > 60s) & Daily Average
  const { user } = useAuth();
  const userId = user?.uid;
  const [history] = useFirestore(userId, 'stopwatch_history', []);

  const productivityStats = useMemo(() => {
    if (!history) return { stats: [], max: 1, dailyAverage: '0.0' };
    // Filter laps > 60s
    const validLaps = history.filter(l => (l.time || 0) > 60000);
    
    const stats = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekStart = getWeekStart(today);
    
    let maxDuration = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Filter laps for this date AND (category is prod/self OR label contains "self")
      const dailyLaps = validLaps.filter(l => {
        const isProductive = l.category === 'prod' || l.category === 'self' || l.category === 'self growth';
        const isSelfLabel = l.label && l.label.toLowerCase().includes('self');
        return l.date.startsWith(dateStr) && (isProductive || isSelfLabel);
      });
      
      const ms = dailyLaps.reduce((acc, curr) => acc + curr.time, 0);
      const hours = ms / 3600000; // Convert to hours
      
      if (hours > maxDuration) maxDuration = hours;
      
      stats.push({ 
        day: days[d.getDay()], 
        hours: hours,
        display: hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`
      });
    }

    // Calculate Daily Average (Total Time / Total Days since start)
    // Find the earliest date in history or default to 1
    const dates = validLaps.map(l => new Date(l.date).getTime());
    const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
    const msSinceStart = today.getTime() - firstDate.getTime();
    const daysSinceStart = Math.max(1, Math.ceil(msSinceStart / (1000 * 60 * 60 * 24)));
    
    const totalAllTime = validLaps.reduce((acc, curr) => acc + curr.time, 0);
    const dailyAverageMs = totalAllTime / daysSinceStart;
    const dailyAverageHours = dailyAverageMs / 3600000;
    
    return { 
      stats, 
      max: maxDuration > 0 ? maxDuration : 1,
      dailyAverage: dailyAverageHours.toFixed(1)
    };
  }, [today]);

  return (
    <div className="analytics-view">
      <div className="analytics-grid">
        {/* Daily Card - Redesigned */}
        <div className="analytics-card daily">
          <h3>Daily Focus</h3>
          <div className="daily-chart concentric-chart">
            <svg viewBox="0 0 36 36" className="circular-chart">
              {dailyStats.categories.map((cat, index) => (
                <React.Fragment key={cat.id}>
                  <path 
                    className="circle-bg" 
                    d={`M18 2.0845 a ${cat.radius} ${cat.radius} 0 0 1 0 ${cat.radius * 2} a ${cat.radius} ${cat.radius} 0 0 1 0 -${cat.radius * 2}`} 
                    style={{ strokeWidth: '2.5' }}
                  />
                  <path 
                    className="circle" 
                    strokeDasharray={`${cat.percentage}, 100`} 
                    d={`M18 2.0845 a ${cat.radius} ${cat.radius} 0 0 1 0 ${cat.radius * 2} a ${cat.radius} ${cat.radius} 0 0 1 0 -${cat.radius * 2}`} 
                    style={{ stroke: cat.color, strokeWidth: '2.5' }}
                  />
                </React.Fragment>
              ))}
              <text x="18" y="16" className="percentage-label">
                <tspan x="18" dy="0" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }}>
                  {dailyStats.totalCompleted}
                </tspan>
                <tspan style={{ fontSize: '4px', fill: '#888' }}>/{dailyStats.totalHabits}</tspan>
              </text>
              <text x="18" y="24" style={{ fontSize: '4px', fill: '#888', textAnchor: 'middle' }}>Solved</text>
            </svg>
          </div>
          <div className="daily-stats-legend">
            {dailyStats.categories.map(cat => (
              <div key={cat.id} className="legend-item">
                <span className="legend-value">{cat.completed}/{cat.total}</span>
                <div className="legend-dot" style={{ backgroundColor: cat.color }}></div>
                <span className="legend-label">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Card */}
        <div className="analytics-card weekly">
          <h3>Weekly Consistency</h3>
          <div className="bar-chart">
            {weeklyStats.map((day, i) => (
              <div key={i} className="bar-column">
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${day.percentage}%` }}></div>
                </div>
                <span className="bar-label">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Card - Improved Graph */}
        <div className="analytics-card monthly">
          <h3>Monthly Trend</h3>
          <div className="line-chart-container">
             <svg className="line-chart" viewBox="0 0 300 100" preserveAspectRatio="none">
               <defs>
                 <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                   <stop offset="0%" stopColor="var(--neon-orange)" stopOpacity="0.5"/>
                   <stop offset="100%" stopColor="var(--neon-orange)" stopOpacity="0"/>
                 </linearGradient>
               </defs>
               {/* Smooth Curve */}
               <path
                 d={`M0,100 ${monthlyStats.map((d, i) => `L${i * 10},${100 - d.percentage}`).join(' ')} L300,100 Z`}
                 fill="url(#lineGradient)"
               />
               <path
                 d={`M0,${100 - monthlyStats[0].percentage} ${monthlyStats.map((d, i) => `L${i * 10},${100 - d.percentage}`).join(' ')}`}
                 fill="none"
                 stroke="var(--neon-orange)"
                 strokeWidth="3"
                 strokeLinecap="round"
                 strokeLinejoin="round"
               />
             </svg>
          </div>
          <div className="chart-labels">
            <span>30 Days Ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Productivity Hours Card */}
        <div className="analytics-card productivity">
          <h3>Productivity Hours</h3>
          <div className="bar-chart">
            {productivityStats.stats.map((day, i) => (
              <div key={i} className="bar-column">
                <div className="bar-track">
                  <div 
                    className="bar-fill productivity-fill" 
                    style={{ height: `${(day.hours / productivityStats.max) * 100}%` }}
                  ></div>
                </div>
                <span className="bar-label">{day.day}</span>
                <span className="bar-value-label">{day.display}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yearly Card */}
        <div className="analytics-card yearly">
          <h3>Yearly Overview</h3>
          <div className="bar-chart dense">
            {yearlyStats.map((month, i) => (
              <div key={i} className="bar-column">
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${month.percentage}%` }}></div>
                </div>
                <span className="bar-label">{month.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
