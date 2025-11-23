import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/AnalyticsModal.css';

export function AnalyticsModal({ isOpen, onClose }) {
  useLockBodyScroll(isOpen);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month', 'year'
  
  const {
    getTotalTime,
    getSessionCount,
    getChartData,
    getCategorySummary,
    formatTime
  } = useAnalytics();

  if (!isOpen) return null;

  const categories = [
    { value: 'all', label: 'All Categories', color: '#8b5cf6' }, // Purple for all
    { value: 'study', label: 'Study', color: '#3b82f6' },
    { value: 'prod', label: 'Productive', color: '#10b981' },
    { value: 'self', label: 'Self-Growth', color: '#f59e0b' }
  ];

  const getCurrentCategory = () => {
    return categories.find(c => c.value === selectedCategory);
  };

  const currentCat = getCurrentCategory();
  const totalTime = getTotalTime(selectedCategory === 'all' ? null : selectedCategory, timeRange);
  const sessionCount = getSessionCount(selectedCategory === 'all' ? null : selectedCategory, timeRange);

  // Get chart data based on time range
  const chartData = getChartData(selectedCategory === 'all' ? null : selectedCategory, timeRange);

  // Get summary for all categories (based on selected time range)
  const categorySummary = getCategorySummary(timeRange);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ 
          backgroundColor: 'rgba(17, 24, 39, 0.9)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <p className="label" style={{ color: '#fff', margin: '0 0 5px 0', fontWeight: '600' }}>{label}</p>
          <p className="intro" style={{ color: currentCat.color, margin: 0 }}>
            {payload[0].value} hours
          </p>
          <p className="desc" style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '5px 0 0 0' }}>
            {payload[0].payload.sessions} sessions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>Time Tracking Analytics</h2>
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat.value}
              className={`category-tab ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.value)}
              style={{
                color: selectedCategory === cat.value ? cat.color : undefined,
                borderColor: selectedCategory === cat.value ? cat.color : 'transparent',
                backgroundColor: selectedCategory === cat.value ? `${cat.color}1a` : undefined
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="time-range-selector">
          <div className="time-range-selector-inner">
            {['day', 'week', 'month', 'year'].map(range => (
              <button
                key={range}
                className={`range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-label">Total Time</div>
            <div className="stat-value" style={{ color: currentCat.color }}>
              {formatTime(totalTime)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sessions</div>
            <div className="stat-value" style={{ color: currentCat.color }}>
              {sessionCount}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="chart-container">
          <h3>{selectedCategory === 'all' ? 'Category Distribution' : 'Time Trend'}</h3>
          <div style={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {selectedCategory === 'all' ? (
              // Concentric Ring Chart for All Categories
              <div className="concentric-chart-container" style={{ position: 'relative', width: 260, height: 260 }}>
                <svg viewBox="0 0 36 36" className="circular-chart">
                  {categories.filter(c => c.value !== 'all').map((cat, index) => {
                    // Calculate percentage for this category based on total time
                    // We need to get total time for this specific category within the selected time range
                    const catTime = getTotalTime(cat.value, timeRange);
                    const total = getTotalTime(null, timeRange); // Total time for all categories
                    const percentage = total === 0 ? 0 : Math.round((catTime / total) * 100);
                    
                    // Radius decreases for each ring (5% smaller than previous 10% increase)
                    const radius = Math.round(16.72 - (index * 4.18)); // 17.6 * 0.95 = 16.72, 4.4 * 0.95 = 4.18
                    
                    return (
                      <React.Fragment key={cat.value}>
                        <path 
                          className="circle-bg" 
                          d={`M18 18 m 0 -${radius} a ${radius} ${radius} 0 1 1 0 ${radius * 2} a ${radius} ${radius} 0 1 1 0 -${radius * 2}`} 
                          style={{ strokeWidth: '1.67', stroke: 'rgba(255,255,255,0.05)' }}
                        />
                        <path 
                          className="circle" 
                          strokeDasharray={`${percentage}, 100`} 
                          d={`M18 18 m 0 -${radius} a ${radius} ${radius} 0 1 1 0 ${radius * 2} a ${radius} ${radius} 0 1 1 0 -${radius * 2}`} 
                          style={{ stroke: cat.color, strokeWidth: '1.67', strokeLinecap: 'round' }}
                        />
                      </React.Fragment>
                    );
                  })}
                  <text x="18" y="17" textAnchor="middle" style={{ fill: '#fff', fontSize: '2.9px', fontWeight: 'bold', dominantBaseline: 'middle' }}>
                    {formatTime(totalTime)}
                  </text>
                  <text x="18" y="20" textAnchor="middle" style={{ fill: '#9ca3af', fontSize: '1.94px', dominantBaseline: 'middle' }}>
                    Total Time
                  </text>
                </svg>
                
                {/* Legend for Concentric Chart */}
                <div className="chart-legend" style={{ 
                  position: 'absolute', 
                  bottom: '-40px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '15px',
                  width: 'max-content'
                }}>
                  {categories.filter(c => c.value !== 'all').map(cat => (
                    <div key={cat.value} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '11.2px', height: '11.2px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                      <span style={{ fontSize: '16.8px', color: '#9ca3af' }}>{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ResponsiveContainer>
                {timeRange === 'day' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#9ca3af" 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar 
                      dataKey="hours" 
                      fill={currentCat.color} 
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={currentCat.color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={currentCat.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#9ca3af" 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke={currentCat.color} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorHours)" 
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="category-breakdown">
          <h3>{timeRange === 'day' ? "Today's" : timeRange.charAt(0).toUpperCase() + timeRange.slice(1) + "'s"} Breakdown</h3>
            <div className="breakdown-grid">
              {categorySummary.map(cat => {
                const catInfo = categories.find(c => c.value === cat.category);
                return (
                  <div key={cat.category} className="breakdown-item">
                    <div className="breakdown-header">
                      <span 
                        className="breakdown-badge" 
                        style={{ backgroundColor: catInfo?.color }}
                      >
                        {catInfo?.label}
                      </span>
                      <span className="breakdown-sessions">{cat.sessions} sessions</span>
                    </div>
                    <div className="breakdown-time" style={{ color: catInfo?.color }}>
                      {formatTime(cat.totalTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </div>
  );
}
