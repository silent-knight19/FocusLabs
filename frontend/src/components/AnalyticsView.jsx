import React, { useMemo } from 'react';
import { getToday, formatDateKey, getWeekStart, getMonthDates } from '../utils/dateHelpers';
import './styles/AnalyticsView.css';

export function AnalyticsView({ habits, completions }) {
  const today = getToday();

  // --- Analytics Logic ---

  // 1. Daily Progress (Today)
  const dailyStats = useMemo(() => {
    const todayKey = formatDateKey(today);
    const todayHabits = habits.filter(h => {
      // Simple check: assume all habits are daily for now, or check frequency if implemented
      return true; 
    });
    const completedCount = todayHabits.filter(h => completions[todayKey]?.[h.id]).length;
    const total = todayHabits.length;
    const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    return { completed: completedCount, total, percentage };
  }, [habits, completions, today]);

  // 2. Weekly Progress (Last 7 days)
  const weeklyStats = useMemo(() => {
    const stats = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekStart = getWeekStart(today);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = formatDateKey(d);
      const dayHabits = habits; // Assuming daily habits
      const completed = dayHabits.filter(h => completions[key]?.[h.id]).length;
      const total = dayHabits.length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      stats.push({ day: days[d.getDay()], percentage, date: d.getDate() });
    }
    return stats;
  }, [habits, completions, today]);

  // 3. Monthly Progress (Last 30 days trend)
  const monthlyStats = useMemo(() => {
    const stats = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDateKey(d);
      const completed = habits.filter(h => completions[key]?.[h.id]).length;
      const total = habits.length; // Simplified
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      stats.push({ date: d.getDate(), percentage });
    }
    return stats;
  }, [habits, completions, today]);

  // 4. Yearly Progress (Monthly averages)
  const yearlyStats = useMemo(() => {
    const stats = [];
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const currentYear = today.getFullYear();
    
    for (let m = 0; m < 12; m++) {
      const monthDates = getMonthDates(currentYear, m);
      // Filter only dates in this month
      const daysInMonth = monthDates.filter(d => d.getMonth() === m);
      
      let totalPercentage = 0;
      let daysCount = 0;
      
      daysInMonth.forEach(d => {
        const key = formatDateKey(d);
        // Don't count future days
        if (d > today) return;
        
        const completed = habits.filter(h => completions[key]?.[h.id]).length;
        const total = habits.length;
        if (total > 0) {
          totalPercentage += (completed / total) * 100;
          daysCount++;
        }
      });
      
      const avg = daysCount === 0 ? 0 : Math.round(totalPercentage / daysCount);
      stats.push({ month: months[m], percentage: avg });
    }
    return stats;
  }, [habits, completions, today]);

  // 5. Productivity Hours (Filtered by 'self' label)
  const productivityStats = useMemo(() => {
    const history = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
    const stats = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekStart = getWeekStart(today);
    
    let maxDuration = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Filter laps for this date AND label contains "self"
      const dailyLaps = history.filter(l => {
        return l.date.startsWith(dateStr) && l.label.toLowerCase().includes('self');
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
    
    return { stats, max: maxDuration > 0 ? maxDuration : 1 };
  }, [today]);

  return (
    <div className="analytics-view">
      <div className="analytics-grid">
        {/* Daily Card */}
        <div className="analytics-card daily">
          <h3>Daily Focus</h3>
          <div className="daily-chart">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="circle" strokeDasharray={`${dailyStats.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <text x="18" y="20.35" className="percentage">{dailyStats.percentage}%</text>
            </svg>
          </div>
          <div className="daily-stats">
            <span>{dailyStats.completed}/{dailyStats.total} Habits</span>
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
