import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getDayName } from '../utils/dateHelpers';
import './styles/WeeklyChart.css';

/**
 * Smooth area chart showing weekly completion percentage
 */
export function WeeklyChart({ weekDates, completionData }) {
  const data = weekDates.map((date, index) => ({
    day: getDayName(date),
    value: completionData[index],
    fullDate: date.toLocaleDateString()
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">{payload[0].value}% Completed</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="weekly-chart-container">
      <h3>Weekly Completion</h3>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="var(--text-tertiary)" 
              tick={{ fontSize: 10 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="var(--text-tertiary)" 
              tick={{ fontSize: 10 }} 
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="var(--accent-primary)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
