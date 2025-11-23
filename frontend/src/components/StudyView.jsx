import React, { useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { formatTime12 } from '../utils/dateHelpers';
import './styles/AnalyticsView.css'; // Reuse analytics styles

export function StudyView() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [history] = useFirestore(userId, 'stopwatch_history', []);

  const studyStats = useMemo(() => {
    if (!history) return { totalHours: '0.0', count: 0, chartData: [] };
    
    // Filter laps labeled "study" (case insensitive)
    const studyLaps = history.filter(l => l.label.toLowerCase().includes('study'));
    
    const totalMs = studyLaps.reduce((acc, curr) => acc + curr.time, 0);
    const totalHours = (totalMs / 3600000).toFixed(1);
    
    // Group by date for a chart
    const byDate = {};
    studyLaps.forEach(l => {
      const date = l.date.split('T')[0];
      byDate[date] = (byDate[date] || 0) + l.time;
    });
    
    const chartData = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7) // Last 7 active days
      .map(([date, ms]) => ({
        date: date.slice(5), // MM-DD
        hours: (ms / 3600000).toFixed(1)
      }));

    return { totalHours, count: studyLaps.length, chartData };
  }, []);

  return (
    <div className="analytics-view">
      <div className="analytics-grid">
        <div className="analytics-card daily" style={{ gridColumn: 'span 2' }}>
          <h3>Study Focus</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', fontWeight: '200', color: 'white' }}>
                {studyStats.totalHours}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>Total Hours</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', fontWeight: '200', color: 'var(--neon-orange)' }}>
                {studyStats.count}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>Study Sessions</div>
            </div>
          </div>
        </div>

        <div className="analytics-card weekly" style={{ gridColumn: 'span 2' }}>
          <h3>Recent Study Sessions</h3>
          <div className="bar-chart">
            {studyStats.chartData.length > 0 ? (
              studyStats.chartData.map((d, i) => (
                <div key={i} className="bar-column">
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${Math.min((d.hours / 5) * 100, 100)}%` }}></div>
                  </div>
                  <span className="bar-label">{d.date}</span>
                  <span className="bar-value-label">{d.hours}h</span>
                </div>
              ))
            ) : (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                No study laps recorded yet. Label a stopwatch lap as "study" to see it here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
