import React, { useState, useMemo } from 'react';
import { Plus, Target, CheckCircle2, AlertTriangle, TrendingUp, X } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { formatDateKey } from '../utils/dateHelpers';
import { GoalCard } from './GoalCard';
import './styles/GoalsView.css';

/**
 * Main goals dashboard view
 * Shows all goals with filter tabs, stats, and a grid of GoalCards
 */
export function GoalsView({
  goals,
  getGoalProgress,
  getGoalStats,
  onAddGoal,
  onOpenGoal,
  onToggleSubGoal,
  isOpen,
  onClose
}) {
  useLockBodyScroll(isOpen);
  
  const [activeFilter, setActiveFilter] = useState('active');
  const [sortBy, setSortBy] = useState('deadline');

  const stats = getGoalStats();
  const today = formatDateKey(new Date());

  /**
   * Filter goals based on selected tab
   */
  const filteredGoals = useMemo(() => {
    let filtered = [];

    switch (activeFilter) {
      case 'active':
        filtered = goals.filter(g => g.status === 'active');
        break;
      case 'completed':
        filtered = goals.filter(g => g.status === 'completed');
        break;
      case 'overdue':
        filtered = goals.filter(g => g.status === 'active' && g.targetDate < today);
        break;
      case 'all':
      default:
        filtered = goals.filter(g => g.status !== 'archived');
        break;
    }

    return filtered;
  }, [goals, activeFilter, today]);

  /**
   * Sort the filtered goals based on selected criteria
   */
  const sortedGoals = useMemo(() => {
    const sorted = [...filteredGoals];

    switch (sortBy) {
      case 'deadline':
        sorted.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
        break;
      case 'progress':
        sorted.sort((a, b) => getGoalProgress(b.id) - getGoalProgress(a.id));
        break;
      case 'priority': {
        const order = { high: 0, medium: 1, low: 2 };
        sorted.sort((a, b) => (order[a.priority] || 1) - (order[b.priority] || 1));
        break;
      }
      case 'created':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      default:
        break;
    }

    return sorted;
  }, [filteredGoals, sortBy, getGoalProgress]);

  const filterTabs = [
    { key: 'active', label: 'Active', count: stats.active, icon: <Target size={14} /> },
    { key: 'completed', label: 'Done', count: stats.completed, icon: <CheckCircle2 size={14} /> },
    { key: 'overdue', label: 'Overdue', count: stats.overdue, icon: <AlertTriangle size={14} /> },
    { key: 'all', label: 'All', count: stats.total - stats.archived, icon: <TrendingUp size={14} /> }
  ];

  if (!isOpen) return null;

  return (
    <div className="goals-dashboard-overlay" onClick={onClose}>
      <div className="goals-dashboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="goals-dashboard-body goals-view">
          {/* Header */}
          <div className="goals-header">
            <h2>Goals</h2>
            <div className="goals-header-actions">
              <button className="add-goal-btn" onClick={onAddGoal}>
                <Plus size={16} />
                Add Goal
              </button>
              <button className="goals-close-btn" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>

      {/* Filter Tabs */}
      <div className="goals-filter-tabs">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className="filter-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      {stats.total > 0 && (
        <div className="goals-stats-bar">
          <div className="stat-card">
            <span className="stat-card-value active">{stats.active}</span>
            <span className="stat-card-label">Active</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value completed">{stats.completed}</span>
            <span className="stat-card-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value overdue">{stats.overdue}</span>
            <span className="stat-card-label">Overdue</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value on-track">{stats.onTrack}</span>
            <span className="stat-card-label">On Track</span>
          </div>
        </div>
      )}

      {/* Sort + Count */}
      {sortedGoals.length > 0 && (
        <div className="goals-controls">
          <span className="goals-result-count">
            {sortedGoals.length} goal{sortedGoals.length !== 1 ? 's' : ''}
          </span>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="deadline">Sort by Deadline</option>
            <option value="progress">Sort by Progress</option>
            <option value="priority">Sort by Priority</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
      )}

      {/* Goals Grid */}
      {sortedGoals.length > 0 ? (
        <div className="goals-grid">
          {sortedGoals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={getGoalProgress(goal.id)}
              onClick={() => onOpenGoal(goal)}
              onToggleSubGoal={onToggleSubGoal}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="goals-empty-state">
          <div className="goals-empty-icon">🎯</div>
          <h3>
            {activeFilter === 'active' && 'No active goals'}
            {activeFilter === 'completed' && 'No completed goals yet'}
            {activeFilter === 'overdue' && 'No overdue goals — great job!'}
            {activeFilter === 'all' && 'No goals yet'}
          </h3>
          <p>
            {activeFilter === 'all' || activeFilter === 'active'
              ? 'Set your first goal and start tracking your progress toward achieving it.'
              : 'Goals will appear here as you make progress.'}
          </p>
          {(activeFilter === 'all' || activeFilter === 'active') && (
            <button className="add-goal-btn" onClick={onAddGoal}>
              <Plus size={16} />
              Create Your First Goal
            </button>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
