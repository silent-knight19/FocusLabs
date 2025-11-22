import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
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
import { useHabits } from './hooks/useHabits.jsx';
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

import './App.css';
import './components/styles/CalendarOverlay.css';

const CATEGORIES = ['fitness', 'work', 'study', 'personal', 'health', 'social', 'self growth', 'other'];

function App() {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [currentDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');

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
    getDateCompletion
  } = useDailyTasks();

  const { settings, updateSettings } = useSettings();

  // Get active habit with countdown timer
  const activeData = useActiveHabit(habits);

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
    // Full day celebration
    const allCompleted = habits.length > 0 && habits.every(habit => getCompletionStatus(habit.id, today) === 'completed');
    if (allCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B35', '#00FF9F', '#0080FF']
      });
    }
    // Streak celebration for each habit with 10+ day streak
    habits.forEach(habit => {
      if (getCurrentStreak && getCurrentStreak(habit.id) >= 10) {
        confetti({
          particleCount: 30,
          spread: 30,
          origin: { x: Math.random(), y: Math.random() },
          colors: ['#FF6B35', '#00FF9F', '#0080FF']
        });
      }
    });
  }, [completions]);

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
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteHabit(habitId);
    }
  };

  const handleCompleteAllToday = () => {
    const today = getToday();
    habits.forEach(habit => {
      const currentStatus = getCompletionStatus(habit.id, today);
      if (currentStatus !== 'completed') {
        toggleCompletion(habit.id, today);
        if (getCompletionStatus(habit.id, today) !== 'completed') {
          toggleCompletion(habit.id, today);
        }
      }
    });
  };

  const handleClearAllToday = () => {
    if (window.confirm('Clear all entries for today?')) {
      const today = getToday();
      habits.forEach(habit => {
        const currentStatus = getCompletionStatus(habit.id, today);
        if (currentStatus) {
          while (getCompletionStatus(habit.id, today)) {
            toggleCompletion(habit.id, today);
          }
        }
      });
    }
  };

  return (
    <div className="app">
      <TopNav
        onSettingsClick={() => setIsSettingsPanelOpen(true)}
        onStopwatchClick={() => setIsStopwatchOpen(true)}
        onCalendarClick={() => setIsCalendarOpen(!isCalendarOpen)}
        onAnalyticsClick={() => setIsAnalyticsOpen(true)}
        currentDate={currentDate}
      />

      <main className="app-main">
        <div className="app-container">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <AddHabitButton onClick={handleAddHabit} />
          </div>

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

          <div className="view-toggle-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)', marginTop: 'var(--spacing-xl)', gap: 'var(--spacing-md)' }}>
            <button 
              className={`view-toggle-btn ${currentView === 'week' ? 'active' : ''}`}
              onClick={() => setCurrentView('week')}
              style={{ 
                fontSize: '1.2rem', 
                padding: '1rem 3rem', 
                fontWeight: '700',
                background: currentView === 'week' ? 'linear-gradient(135deg, var(--neon-orange), var(--neon-orange-dark))' : 'var(--bg-secondary)',
                color: currentView === 'week' ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--neon-orange)',
                borderRadius: 'var(--radius-md)',
                boxShadow: currentView === 'week' ? 'var(--glow-orange)' : 'none',
                cursor: 'pointer'
              }}
            >
              Month View
            </button>
            <button 
              className={`view-toggle-btn ${currentView === 'daily' ? 'active' : ''}`}
              onClick={() => setCurrentView('daily')}
              style={{ 
                fontSize: '1.2rem', 
                padding: '1rem 3rem', 
                fontWeight: '700',
                background: currentView === 'daily' ? 'linear-gradient(135deg, var(--neon-orange), var(--neon-orange-dark))' : 'var(--bg-secondary)',
                color: currentView === 'daily' ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--neon-orange)',
                borderRadius: 'var(--radius-md)',
                boxShadow: currentView === 'daily' ? 'var(--glow-orange)' : 'none',
                cursor: 'pointer'
              }}
            >
              Daily Planner
            </button>
          </div>



          {currentView === 'week' && (
            <>
              <HabitGrid
                habits={filteredHabits}
                weekDates={getCurrentMonthDates(currentDate)}
                onToggle={handleToggle}
                onEditHabit={handleEditHabit}
                onDeleteHabit={handleDeleteHabit}
                getCompletionStatus={getCompletionStatus}
                reorderHabits={reorderHabits}
              />
            </>
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
            />
          )}

          {currentView === 'study' && (
            <StudyView />
          )}

          <ProgressSection
            habits={habits}
            weekDates={weekDates}
            completionData={weekCompletionData}
            getCurrentStreak={getCurrentStreak}
            getLongestStreak={getLongestStreak}
            completions={completions}
          />

          <div className="heatmaps-container">
            {/* Study Activity Heatmap */}
            <StudyHeatmap />

            {/* Productivity & Growth Heatmap */}
            <ProductivityHeatmap />
          </div>
        </div>
      </main>

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={handleSaveHabit}
        habit={editingHabit}
      />

      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* Stopwatch */}
      <Stopwatch 
        isOpen={isStopwatchOpen}
        onClose={() => setIsStopwatchOpen(false)}
      />

      {/* Analytics Modal */}
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
              onDateClick={(date) => {
                setSelectedDate(date);
                // Don't close calendar - let day history modal overlay on top
              }}
            />
          </div>
        </div>
      )}

      {/* Day History Modal */}
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
    </div>
  );
}

export default App;


