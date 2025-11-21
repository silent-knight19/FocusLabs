import React, { useState, useEffect, useMemo } from 'react';
import { TopNav } from './components/TopNav';
import { HabitGrid } from './components/HabitGrid';
import { AddHabitButton } from './components/AddHabitButton';
import { HabitModal } from './components/HabitModal';
import { SettingsPanel } from './components/SettingsPanel';
import { ProgressSection } from './components/ProgressSection';
import { SearchBar } from './components/SearchBar';
import { QuickActions } from './components/QuickActions';
import { HabitStats } from './components/HabitStats';
import { ActiveHabitTracker } from './components/ActiveHabitTracker';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { StudyView } from './components/StudyView';
import { Stopwatch } from './components/Stopwatch';
import { useHabits } from './hooks/useHabits';
import { useSettings } from './hooks/useSettings';
import { useActiveHabit } from './hooks/useActiveHabit';
import { getWeekDates, getToday } from './utils/dateHelpers';

import './App.css';
import './components/styles/CalendarOverlay.css';

const CATEGORIES = ['fitness', 'work', 'study', 'personal', 'health', 'social', 'self growth', 'other'];

function App() {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [currentDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentView, setCurrentView] = useState('week'); // 'week', 'month', 'study'

  const {
    habits,
    completions,
    subtasks,
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
    getSubtaskCompletionPercentage
  } = useHabits();

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

  const handleAddHabit = () => {
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleSaveHabit = (habitData) => {
    if (editingHabit) {
      updateHabit(editingHabit.id, habitData);
    } else {
      addHabit(habitData);
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
        currentDate={currentDate}
      />

      <main className="app-main">
        <div className="app-container">
          {/* Active Habit Tracker */}
          <ActiveHabitTracker
            activeData={activeData}
            subtasksData={{ getSubtasks }}
            onToggleSubtask={toggleSubtaskCompletion}
            onAddSubtask={addSubtask}
            onDeleteSubtask={deleteSubtask}
            getSubtaskStatus={getSubtaskStatus}
            onToggleCompletion={toggleCompletion}
            getCompletionStatus={getCompletionStatus}
          />

          <div className="app-header">
            <AddHabitButton onClick={handleAddHabit} />
            <QuickActions
              onCompleteAll={handleCompleteAllToday}
              onClearAll={handleClearAllToday}
              habitCount={habits.length}
            />
          </div>

          <div className="view-toggle-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)', gap: 'var(--spacing-md)' }}>
            <button 
              className={`view-toggle-btn ${currentView === 'week' ? 'active' : ''}`}
              onClick={() => setCurrentView('week')}
            >
              Week View
            </button>
            <button 
              className={`view-toggle ${currentView === 'study' ? 'active' : ''}`}
              onClick={() => setCurrentView('study')}
            >
              Study View
            </button>
          </div>

          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={CATEGORIES}
          />

          {currentView === 'week' && (
            <>
              <HabitGrid
                habits={filteredHabits}
                weekDates={weekDates}
                completions={completions}
                onToggleCompletion={toggleCompletion}
                onEditHabit={handleEditHabit}
                onDeleteHabit={handleDeleteHabit}
                getCompletionStatus={getCompletionStatus}
              />
              
              <div className="section-divider" style={{ margin: '40px 0', borderTop: '1px solid var(--border-color)' }}></div>
              
              <h2 style={{ padding: '0 20px', marginBottom: '20px', color: 'var(--text-primary)' }}>Analytics & Progress</h2>
              <AnalyticsView
                habits={habits}
                completions={completions}
              />
            </>
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

          <HabitStats
            habits={habits}
            completions={completions}
          />
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

      <Stopwatch
        isOpen={isStopwatchOpen}
        onClose={() => setIsStopwatchOpen(false)}
      />

      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <button className="close-btn" onClick={() => setIsCalendarOpen(false)}>×</button>
            <CalendarView
              habits={filteredHabits}
              completions={completions}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


