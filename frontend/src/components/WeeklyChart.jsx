import React from 'react';
import { getDayName } from '../utils/dateHelpers';
import './styles/WeeklyChart.css';

/**
 * Simple line chart showing weekly completion percentage
 */
export function WeeklyChart({ weekDates, completionData }) {
  const width = 400;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate points for the line
  const points = completionData.map((value, index) => {
    const x = padding + (index / (completionData.length - 1)) * chartWidth;
    const y = padding + chartHeight - (value / 100) * chartHeight;
    return { x, y, value };
  });

  // Create path for line
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Create area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="weekly-chart-container">
      <h3>Weekly Completion</h3>
      
      <svg 
        className="weekly-chart-svg" 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(value => {
          const y = padding + chartHeight - (value / 100) * chartHeight;
          return (
            <g key={value}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                fill="var(--text-tertiary)"
                fontSize="10"
                textAnchor="end"
              >
                {value}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
          opacity="0.2"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--bg-card)"
              stroke="var(--accent-primary)"
              strokeWidth="2"
            />
            <title>{`${getDayName(weekDates[index])}: ${point.value}%`}</title>
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - padding + 20}
            fill="var(--text-secondary)"
            fontSize="11"
            textAnchor="middle"
            fontWeight="500"
          >
            {getDayName(weekDates[index])}
          </text>
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
