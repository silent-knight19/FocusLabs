import React from 'react';
import './styles/ConcentricPieChart.css';

/**
 * ConcentricPieChart
 * SVG concentric ring chart styled similar to the Analytics modal
 * "Category Distribution" visualization.
 *
 * Props:
 *   data: {
 *     study: number,      // average hours per day over last 10 days
 *     productive: number,
 *     selfGrowth: number
 *   }
 */
export function ConcentricPieChart({ data }) {
  const { study = 0, productive = 0, selfGrowth = 0 } = data || {};

  const total = study + productive + selfGrowth;
  const safeTotal = total || 1; // avoid division by zero

  const rings = [
    { id: 'study', label: 'Study', value: study, color: '#3b82f6', radius: 16 },
    { id: 'prod', label: 'Productive', value: productive, color: '#10b981', radius: 12 },
    { id: 'self', label: 'Self-Growth', value: selfGrowth, color: '#f59e0b', radius: 8 }
  ];

  return (
    <div className="concentric-pie-wrapper">
      <svg viewBox="0 0 36 36" className="circular-chart">
        {rings.map((ring) => {
          const percentage = Math.max(0, Math.min(100, (ring.value / safeTotal) * 100));

          return (
            <React.Fragment key={ring.id}>
              <path
                className="circle-bg"
                d={`M18 18 m 0 -${ring.radius} a ${ring.radius} ${ring.radius} 0 1 1 0 ${
                  ring.radius * 2
                } a ${ring.radius} ${ring.radius} 0 1 1 0 -${ring.radius * 2}`}
                style={{ strokeWidth: '2.5', stroke: 'rgba(255,255,255,0.05)' }}
              />
              <path
                className="circle"
                strokeDasharray={`${percentage}, 100`}
                d={`M18 18 m 0 -${ring.radius} a ${ring.radius} ${ring.radius} 0 1 1 0 ${
                  ring.radius * 2
                } a ${ring.radius} ${ring.radius} 0 1 1 0 -${ring.radius * 2}`}
                style={{ stroke: ring.color, strokeWidth: '2.5', strokeLinecap: 'round' }}
              />
            </React.Fragment>
          );
        })}

        {/* Center text: show total average hours per day across categories */}
        <text x="18" y="16" textAnchor="middle" className="concentric-center-text">
          <tspan x="18" dy="0" style={{ fontSize: '5px', fill: '#fff', fontWeight: 'bold' }}>
            {total.toFixed(1)}h
          </tspan>
          <tspan x="18" dy="5" style={{ fontSize: '3px', fill: '#9ca3af' }}>
            Avg / day
          </tspan>
        </text>
      </svg>
    </div>
  );
}
