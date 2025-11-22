import { useMemo } from 'react';

/**
 * Hook for analyzing stopwatch lap data
 * Aggregates laps by category and time period
 */
export function useAnalytics() {
  // Get lap history from localStorage
  const getLapHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
      return history;
    } catch {
      return [];
    }
  };

  /**
   * Get laps filtered by category and date range
   */
  const getLapsByCategory = (category, dateRange = 'day') => {
    const allLaps = getLapHistory();
    const now = new Date();
    
    let startDate;
    switch (dateRange) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    return allLaps.filter(lap => {
      const lapDate = new Date(lap.date);
      const matchesCategory = !category || lap.category === category;
      const matchesRange = lapDate >= startDate;
      return matchesCategory && matchesRange;
    });
  };

  /**
   * Calculate total time for a category in a date range
   */
  const getTotalTime = (category, dateRange = 'day') => {
    const laps = getLapsByCategory(category, dateRange);
    return laps.reduce((total, lap) => total + (lap.time || 0), 0);
  };

  /**
   * Get session count (number of laps) for a category
   */
  const getSessionCount = (category, dateRange = 'day') => {
    const laps = getLapsByCategory(category, dateRange);
    return laps.length;
  };

  /**
   * Get data formatted for charts
   * Returns daily totals for the last N days
   */
  const getChartData = (category, range = 'week') => {
    const allLaps = getLapHistory();
    const result = [];
    const now = new Date();

    if (range === 'year') {
      // Monthly grouping for year view
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        
        const monthLaps = allLaps.filter(lap => {
          const lapDate = new Date(lap.date);
          const lapMonthKey = `${lapDate.getFullYear()}-${lapDate.getMonth()}`;
          const matchesMonth = lapMonthKey === monthKey;
          const matchesCategory = !category || lap.category === category;
          return matchesMonth && matchesCategory;
        });

        const totalMs = monthLaps.reduce((sum, lap) => sum + (lap.time || 0), 0);
        const totalHours = totalMs / (1000 * 60 * 60);

        result.push({
          date: monthKey,
          label: monthLabel,
          hours: parseFloat(totalHours.toFixed(2)),
          sessions: monthLaps.length
        });
      }
    } else {
      // Daily grouping for day/week/month
      const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        const dayLaps = allLaps.filter(lap => {
          const lapDate = new Date(lap.date).toISOString().split('T')[0];
          const matchesDate = lapDate === dateKey;
          const matchesCategory = !category || lap.category === category;
          return matchesDate && matchesCategory;
        });

        const totalMs = dayLaps.reduce((sum, lap) => sum + (lap.time || 0), 0);
        const totalHours = totalMs / (1000 * 60 * 60);

        result.push({
          date: dateKey,
          label: range === 'day' ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          hours: parseFloat(totalHours.toFixed(2)),
          sessions: dayLaps.length
        });
      }
    }

    return result;
  };

  /**
   * Get all categories with their totals for today
   */
  const getCategorySummary = () => {
    const categories = ['study', 'prod', 'self', 'other'];
    return categories.map(cat => ({
      category: cat,
      totalTime: getTotalTime(cat, 'day'),
      sessions: getSessionCount(cat, 'day')
    }));
  };

  /**
   * Format milliseconds to readable time
   */
  const formatTime = (ms) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return {
    getLapsByCategory,
    getTotalTime,
    getSessionCount,
    getChartData,
    getCategorySummary,
    formatTime
  };
}
