import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { VideoBackground } from './components/VideoBackground';
import { TopNav } from './components/TopNav';
import { HabitGrid } from './components/HabitGrid';
import { AddHabitButton } from './components/AddHabitButton';
import { HabitModal } from './components/HabitModal';
import { SettingsPanel } from './components/SettingsPanel';
import { ProgressSection } from './components/ProgressSection';
import { SearchBar } from './components/SearchBar';
import { DailyOverview } from './components/DailyOverview';
import { HabitStats } from './components/HabitStats';
import { ActiveHabitTracker } from './components/ActiveHabitTracker';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { StudyView } from './components/StudyView';
import { Stopwatch } from './components/Stopwatch';
import { AnalyticsModal } from './components/AnalyticsModal';
import { StudyHeatmap } from './components/StudyHeatmap';
import { ProductivityHeatmap } from './components/ProductivityHeatmap';
import { DayHistoryModal } from './components/DayHistoryModal';
import { DailyPlanner } from './components/DailyPlanner';
import { ConfirmationModal } from './components/ConfirmationModal';
import { CustomHabitModal } from './components/CustomHabitModal';
import { CustomDateView } from './components/CustomDateView';

import { useHabits } from './hooks/useHabits.jsx';
import { useCustomHabits } from './hooks/useCustomHabits.js';
import { useDailyTasks } from './hooks/useDailyTasks.jsx';
import { useSettings } from './hooks/useSettings';
import { useActiveHabit } from './hooks/useActiveHabit';
import { 
  getWeekStart, 
  getWeekDates, 
  formatDateKey, 
  isSameDay, 
  getToday,
  getCurrentMonthDates 
} from './utils/dateHelpers';
import { useLockBodyScroll } from './hooks/useLockBodyScroll';

import './App.css';
import './styles/three-d-effects.css';
import './components/styles/CalendarOverlay.css';

const CATEGORIES = ['study', 'productive', 'self growth'];

function App() {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingCustomHabit, setEditingCustomHabit] = useState(null);
  const [isCustomHabitModalOpen, setIsCustomHabitModalOpen] = useState(false);
  const [currentDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    confirmText: 'Delete'
  });

  useLockBodyScroll(isCalendarOpen);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentView, setCurrentView] = useState('week'); // 'week' or 'daily'
  const [selectedPlannerDate, setSelectedPlannerDate] = useState(getToday());

  const {
    habits,
    completions,
    subtasks,
    subtaskCompletions,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    clearCompletion,
    getCompletionStatus,
    getCurrentStreak,
    getLongestStreak,
    getWeekCompletionData,
    // Subtask methods
    getSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskCompletion,
    getSubtaskStatus,
    getSubtaskCompletionPercentage,
    reorderHabits
  } = useHabits();

  // Daily tasks hook
  const {
    dailyTasks,
    getDailyTasks,
    getAllDailyTasks,
    addDailyTask,
    toggleDailyTask,
    updateDailyTask,
    deleteDailyTask,
    getDailyCompletion,
    getDateCompletion,
    deleteTasksForHabit
  } = useDailyTasks();

  // Custom habits hook
  const {
    customHabits,
    customCompletions,
    addCustomHabit,
    updateCustomHabit,
    deleteCustomHabit,
    toggleCustomCompletion,
    getCustomCompletionStatus,
    formatDateRange,
    // Subtask methods
    getCustomSubtasks,
    addCustomSubtask,
    deleteCustomSubtask,
    toggleCustomSubtaskCompletion,
    getCustomSubtaskStatus,
    getCustomSubtaskCompletionPercentage
  } = useCustomHabits();

  // Helper to check if a date has custom habits (blocking regular habits)
  const isDateBlockedByCustom = (date) => {
    return customHabits.some(habit => {
      const dateKey = formatDateKey(date);
      return dateKey >= habit.dateFrom && dateKey <= habit.dateTo;
    });
  };

  const { settings, updateSettings } = useSettings();

  // Get active habit with countdown timer
  const activeData = useActiveHabit(habits, customHabits);

  // Get week dates based on start-of-week preference
  const weekDates = getWeekDates(currentDate, settings.startOfWeek);
  const weekCompletionData = getWeekCompletionData(weekDates);

  // Filter habits based on search and category
  const filteredHabits = useMemo(() => {
    return habits.filter(habit => {
      const matchesSearch = habit.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || habit.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [habits, searchTerm, selectedCategory]);

  // Apply theme to root element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark' || settings.theme === 'light') {
      root.classList.remove('dark', 'light');
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  // Celebrate when all habits are completed for today and when a habit reaches a 10+ day streak
  useEffect(() => {
    const today = getToday();
    const todayKey = formatDateKey(today);

    // Full day celebration
    const allCompleted = habits.length > 0 && habits.every(habit =>
      completions[habit.id]?.[todayKey] === 'completed'
    );

    if (allCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B35', '#00FF9F', '#0080FF']
      });
    }

    // Streak celebration for each habit with 10+ day streak
    // Only celebrate once per day per habit to avoid spam
    const celebratedToday = JSON.parse(sessionStorage.getItem('streak_celebrated') || '{}');
    const todayStr = todayKey;

    // Clean up entries for deleted habits to prevent unbounded growth
    const validHabitIds = new Set(habits.map(h => h.id));
    let needsCleanup = false;
    for (const habitId of Object.keys(celebratedToday)) {
      if (!validHabitIds.has(habitId)) {
        delete celebratedToday[habitId];
        needsCleanup = true;
      }
    }

    habits.forEach(habit => {
      // Calculate streak inline (don't use getCurrentStreak callback to avoid hook issues)
      const habitCompletions = completions[habit.id] || {};
      let streak = 0;

      if (habitCompletions[todayKey] === 'completed') {
        streak = 1;
        for (let i = 1; i < 365; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateKey = formatDateKey(date);
          if (!dateKey) break;
          if (habitCompletions[dateKey] === 'completed') {
            streak++;
          } else {
            break;
          }
        }
      }

      // Only celebrate if streak >= 10 and not celebrated today
      if (streak >= 10 && celebratedToday[habit.id] !== todayStr) {
        celebratedToday[habit.id] = todayStr;
        needsCleanup = true;
        confetti({
          particleCount: 30,
          spread: 30,
          origin: { x: Math.random(), y: Math.random() },
          colors: ['#FF6B35', '#00FF9F', '#0080FF']
        });
      }
    });

    if (needsCleanup) {
      sessionStorage.setItem('streak_celebrated', JSON.stringify(celebratedToday));
    }
  }, [completions, habits]);

  const handleAddHabit = () => {
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  };

  const handleToggle = (habitId, date) => {
    toggleCompletion(habitId, date);
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleSaveHabit = (habitData) => {
    let habitId;
    if (editingHabit) {
      updateHabit(editingHabit.id, habitData);
      habitId = editingHabit.id;
    } else {
      const newHabit = addHabit(habitData);
      habitId = newHabit.id;
    }

    // Add any new subtasks
    if (habitData.subtasks && habitData.subtasks.length > 0) {
      habitData.subtasks.forEach(title => {
        addSubtask(habitId, title);
      });
    }
  };

  const handleDeleteHabit = (habitId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Habit',
      message: 'Are you sure you want to delete this habit? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        deleteHabit(habitId);
        deleteTasksForHabit(habitId);
      }
    });
  };

  // Custom habit handlers
  const handleAddCustomHabit = () => {
    setEditingCustomHabit(null);
    setIsCustomHabitModalOpen(true);
  };

  const handleEditCustomHabit = (habit) => {
    setEditingCustomHabit(habit);
    setIsCustomHabitModalOpen(true);
  };

  const handleSaveCustomHabit = (habitData) => {
    if (editingCustomHabit) {
      updateCustomHabit(editingCustomHabit.id, habitData);
    } else {
      addCustomHabit(habitData);
    }
  };

  const handleDeleteCustomHabit = (habitId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Custom Habit',
      message: 'Are you sure you want to delete this custom date habit? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        deleteCustomHabit(habitId);
      }
    });
  };

  const handleCompleteAllToday = () => {
    const today = getToday();
    const todayKey = formatDateKey(today);

    habits.forEach(habit => {
      const currentStatus = completions[habit.id]?.[todayKey];
      if (currentStatus !== 'completed') {
        // Clear existing status first (e.g. 'failed' -> null), then toggle to 'completed'
        if (currentStatus) {
          clearCompletion(habit.id, today);
        }
        toggleCompletion(habit.id, today);
      }
    });
  };

  const handleClearAllToday = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Clear Today',
      message: 'Are you sure you want to clear all entries for today?',
      confirmText: 'Clear All',
      type: 'warning',
      onConfirm: () => {
        const today = getToday();
        const todayKey = formatDateKey(today);

        habits.forEach(habit => {
          const currentStatus = completions[habit.id]?.[todayKey];
          // Clear any existing status by setting to null
          if (currentStatus === 'completed' || currentStatus === 'failed') {
            clearCompletion(habit.id, today);
          }
        });
      }
    });
  };

  // Force re-render of heatmaps when data changes
  const [dataVersion, setDataVersion] = useState(0);
  const handleDataUpdate = () => setDataVersion(v => v + 1);
  // Keep listener for external events if any other parts dispatch
  useEffect(() => {
    window.addEventListener('habit-data-updated', handleDataUpdate);
    return () => window.removeEventListener('habit-data-updated', handleDataUpdate);
  }, []);

  return (
    <>
      {/* Video Background with 40% blur - 8 sec loop */}
      <VideoBackground />

      {/* TopNav - outside perspective-root for fixed positioning */}
      <TopNav
        onSettingsClick={() => setIsSettingsPanelOpen(true)}
        onStopwatchClick={() => setIsStopwatchOpen(true)}
        onCalendarClick={() => setIsCalendarOpen(!isCalendarOpen)}
        onAddHabitClick={handleAddHabit}
        currentDate={currentDate}
      />

      <div className="app perspective-root">
        <main className="app-main" style={{ transformStyle: 'preserve-3d' }}>
        <div className="app-container" style={{ transformStyle: 'preserve-3d' }}>

          {/* Active Habit Tracker */}
          <ActiveHabitTracker
            activeData={activeData}
            dailyTasks={dailyTasks}
            onToggleDailyTask={toggleDailyTask}
            onAddDailyTask={addDailyTask}
            onDeleteDailyTask={deleteDailyTask}
            onToggleCompletion={toggleCompletion}
            getCompletionStatus={getCompletionStatus}
          />

          <DailyOverview 
            habits={habits}
            getCompletionStatus={getCompletionStatus}
            getToday={getToday}
          />

          <div className="view-toggle-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)', marginTop: 'var(--spacing-xl)', gap: 'var(--spacing-sm)' }}>
            <button
              className={`view-toggle-btn btn-3d ${currentView === 'week' ? 'active' : ''}`}
              onClick={() => setCurrentView('week')}
              style={{ 
                fontSize: '0.9rem', 
                padding: '0.75rem 1.5rem', 
                fontWeight: '600',
                background: currentView === 'week' ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                color: currentView === 'week' ? '#fff' : 'var(--text-secondary)',
                border: currentView === 'week' ? 'none' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: currentView === 'week' ? 'var(--glow-primary)' : 'none',
                cursor: 'pointer'
              }}
            >
              Month View
            </button>
            <button
              className={`view-toggle-btn btn-3d ${currentView === 'daily' ? 'active' : ''}`}
              onClick={() => setCurrentView('daily')}
              style={{ 
                fontSize: '0.9rem', 
                padding: '0.75rem 1.5rem', 
                fontWeight: '600',
                background: currentView === 'daily' ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                color: currentView === 'daily' ? '#fff' : 'var(--text-secondary)',
                border: currentView === 'daily' ? 'none' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: currentView === 'daily' ? 'var(--glow-primary)' : 'none',
                cursor: 'pointer'
              }}
            >
              Daily Planner
            </button>
            <button
              className={`view-toggle-btn btn-3d ${currentView === 'custom' ? 'active' : ''}`}
              onClick={() => setCurrentView('custom')}
              style={{ 
                fontSize: '0.9rem', 
                padding: '0.75rem 1.5rem', 
                fontWeight: '600',
                background: currentView === 'custom' ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                color: currentView === 'custom' ? '#fff' : 'var(--text-secondary)',
                border: currentView === 'custom' ? 'none' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: currentView === 'custom' ? 'var(--glow-primary)' : 'none',
                cursor: 'pointer'
              }}
            >
              Custom Date
            </button>
          </div>

          {/* Main content area with 70/30 split */}
          <div className="main-content-split" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            {/* Left column - 70% */}
            <div className="main-column" style={{ flex: '0 0 70%', maxWidth: '70%' }}>
              {currentView === 'week' && (
                <HabitGrid
                  habits={filteredHabits}
                  weekDates={getCurrentMonthDates(currentDate)}
                  onToggle={handleToggle}
                  onEditHabit={handleEditHabit}
                  onDeleteHabit={handleDeleteHabit}
                  getCompletionStatus={getCompletionStatus}
                  reorderHabits={reorderHabits}
                  isDateBlockedByCustom={isDateBlockedByCustom}
                />
              )}

              {currentView === 'daily' && (
                <DailyPlanner
                  habits={filteredHabits}
                  selectedDate={selectedPlannerDate}
                  onDateChange={setSelectedPlannerDate}
                  getDailyTasks={getDailyTasks}
                  onAddTask={addDailyTask}
                  onToggleTask={toggleDailyTask}
                  onUpdateTask={updateDailyTask}
                  onDeleteTask={deleteDailyTask}
                  getDailyCompletion={getDailyCompletion}
                  getDateCompletion={getDateCompletion}
                  onAddHabit={handleAddHabit}
                  // Custom habits props
                  customHabits={customHabits}
                  customCompletions={customCompletions}
                  toggleCustomCompletion={toggleCustomCompletion}
                  getCustomCompletionStatus={getCustomCompletionStatus}
                  onAddCustomHabit={handleAddCustomHabit}
                  // Custom subtask props
                  getCustomSubtasks={getCustomSubtasks}
                  addCustomSubtask={addCustomSubtask}
                  deleteCustomSubtask={deleteCustomSubtask}
                  toggleCustomSubtaskCompletion={toggleCustomSubtaskCompletion}
                  getCustomSubtaskStatus={getCustomSubtaskStatus}
                  getCustomSubtaskCompletionPercentage={getCustomSubtaskCompletionPercentage}
                />
              )}

              {currentView === 'study' && (
                <StudyView />
              )}

              {currentView === 'custom' && (
                <CustomDateView
                  customHabits={customHabits}
                  weekDates={getCurrentMonthDates(currentDate)}
                  onToggleCustom={toggleCustomCompletion}
                  onEditCustomHabit={handleEditCustomHabit}
                  onDeleteCustomHabit={handleDeleteCustomHabit}
                  getCustomCompletionStatus={getCustomCompletionStatus}
                  onAddCustomHabit={handleAddCustomHabit}
                  formatDateRange={formatDateRange}
                />
              )}

              {/* Heatmaps - positioned right below habits */}
              <div className="heatmaps-container-compact">
                <StudyHeatmap dataVersion={dataVersion} />
                <ProductivityHeatmap
                  habits={habits}
                  completions={completions}
                  dataVersion={dataVersion}
                />
              </div>
            </div>

            {/* Right column - 30% with ProgressSection */}
            <div className="sidebar-column parallax-layer-2" style={{ flex: '0 0 30%', maxWidth: '30%' }}>
              <ProgressSection
                habits={habits}
                getCurrentStreak={getCurrentStreak}
                getLongestStreak={getLongestStreak}
                completions={completions}
                customHabits={customHabits}
                customCompletions={customCompletions}
                onOpenAnalytics={() => setIsAnalyticsOpen(true)}
                onToggleCompletion={toggleCompletion}
              />
            </div>
          </div>

        </div>
      </main>

      </div>{/* End perspective-root */}

      {/* All Modals - outside perspective-root for proper fixed positioning */}
      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={handleSaveHabit}
        habit={editingHabit}
      />

      <CustomHabitModal
        isOpen={isCustomHabitModalOpen}
        onClose={() => setIsCustomHabitModalOpen(false)}
        onSave={handleSaveCustomHabit}
        habit={editingCustomHabit}
      />

      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      <Stopwatch
        isOpen={isStopwatchOpen}
        onClose={() => setIsStopwatchOpen(false)}
        onDataUpdate={handleDataUpdate}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <button className="close-btn" onClick={() => setIsCalendarOpen(false)}>×</button>
            <CalendarView
              habits={filteredHabits}
              completions={completions}
              subtasks={subtasks}
              subtaskCompletions={subtaskCompletions}
              dailyTasks={dailyTasks}
              onDateDoubleClick={(date) => {
                setSelectedDate(date);
              }}
              onToggleTask={toggleDailyTask}
              onUpdateTask={updateDailyTask}
              onDeleteTask={deleteDailyTask}
            />
          </div>
        </div>
      )}

      {selectedDate && (
        <DayHistoryModal
          date={selectedDate}
          habits={habits}
          completions={completions}
          subtasks={subtasks}
          subtaskCompletions={subtaskCompletions}
          dailyTasks={dailyTasks}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        type={confirmationModal.type}
      />
    </>
  );
}

export default App;


