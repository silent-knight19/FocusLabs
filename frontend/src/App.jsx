import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { TopNav } from './components/TopNav';
import { HabitModal } from './components/HabitModal';
import { SettingsPanel } from './components/SettingsPanel';
import { ProgressSection } from './components/ProgressSection';
import { DailyOverview } from './components/DailyOverview';
import { ActiveHabitTracker } from './components/ActiveHabitTracker';
import { Stopwatch } from './components/Stopwatch';
import { StudyHeatmap } from './components/StudyHeatmap';
import { ProductivityHeatmap } from './components/ProductivityHeatmap';
import { ConfirmationModal } from './components/ConfirmationModal';
import { CustomHabitModal } from './components/CustomHabitModal';
import { GoalsView } from './components/GoalsView';
import { GoalModal } from './components/GoalModal';
import { GoalDetailModal } from './components/GoalDetailModal';
import { HabitGridSkeleton } from './components/HabitGridSkeleton';
import { MonthViewPage } from './components/views/MonthViewPage';
import { PlannerPage } from './components/views/PlannerPage';
import { CustomDatePage } from './components/views/CustomDatePage';

import { useHabitsContext } from './contexts/HabitsContext';
import { useGoalsContext } from './contexts/GoalsContext';
import { useDailyPlannerContext } from './contexts/DailyPlannerContext';
import { useSettings } from './hooks/useSettings';
import { useLockBodyScroll } from './hooks/useLockBodyScroll';
import { calculateCurrentStreak } from './utils/streakHelpers';
import { formatDateKey, getToday, getCurrentMonthDates } from './utils/dateHelpers';
import { ScrollReveal } from './components/animations/ScrollReveal';

import './App.css';
import './components/styles/CalendarOverlay.css';

const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const AnalyticsModal = lazy(() => import('./components/AnalyticsModal').then(m => ({ default: m.AnalyticsModal })));
const DayHistoryModal = lazy(() => import('./components/DayHistoryModal').then(m => ({ default: m.DayHistoryModal })));
const StudyView = lazy(() => import('./components/StudyView').then(m => ({ default: m.StudyView })));

const VIEW_ROUTES = { week: '/', daily: '/planner', custom: '/custom', study: '/study' };
const ROUTE_VIEWS = { '/': 'week', '/planner': 'daily', '/custom': 'custom', '/study': 'study' };

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = ROUTE_VIEWS[location.pathname] || 'week';

  // UI Modal / View states
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

  // Goals dashboard states
  const [isGoalsDashboardOpen, setIsGoalsDashboardOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  
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

  const setView = (view) => {
    const path = VIEW_ROUTES[view] || '/';
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  // Consume core contexts
  const {
    habits, completions, subtasks, subtaskCompletions,
    addHabit, updateHabit, deleteHabit, toggleCompletion,
    clearCompletion, clearCompletionsForDateKeys, getCompletionStatus,
    getCurrentStreak, getLongestStreak, getWeekCompletionData,
    addSubtask, customHabits, customCompletions, addCustomHabit,
    updateCustomHabit, deleteCustomHabit, toggleCustomCompletion,
    getCustomCompletionStatus, getDateKeysInRange, activeData, loading: habitsLoading
  } = useHabitsContext();

  const {
    goals, addGoal, updateGoal, deleteGoal: removeGoal,
    completeGoal, archiveGoal, toggleSubGoal, addSubGoal,
    deleteSubGoal, getGoalProgress, getGoalStats
  } = useGoalsContext();

  const {
    dailyTasks, addDailyTask, toggleDailyTask, updateDailyTask,
    deleteDailyTask, deleteTasksForHabit
  } = useDailyPlannerContext();

  const { settings, updateSettings } = useSettings();

  // Version counter to trigger heatmaps update
  const [dataVersion, setDataVersion] = useState(0);
  const handleDataUpdate = () => setDataVersion(v => v + 1);

  useEffect(() => {
    window.addEventListener('habit-data-updated', handleDataUpdate);
    return () => window.removeEventListener('habit-data-updated', handleDataUpdate);
  }, []);

  // Theme support
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark' || settings.theme === 'light') {
      root.classList.remove('dark', 'light');
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  // Completions celebrations
  useEffect(() => {
    const today = getToday();
    const todayKey = formatDateKey(today);

    const allCompleted = habits.length > 0 && habits.every(habit =>
      completions[habit.id]?.[todayKey] === 'completed'
    );

    if (allCompleted) {
      confetti({
        particleCount: 100, spread: 70, origin: { y: 0.6 },
        colors: ['#FF6B35', '#00FF9F', '#0080FF']
      });
    }

    const celebratedToday = JSON.parse(sessionStorage.getItem('streak_celebrated') || '{}');
    let needsCleanup = false;

    habits.forEach(habit => {
      const habitCompletions = completions[habit.id] || {};
      const streak = calculateCurrentStreak(habitCompletions, today);

      if (streak >= 10 && celebratedToday[habit.id] !== todayKey) {
        celebratedToday[habit.id] = todayKey;
        needsCleanup = true;
        confetti({
          particleCount: 30, spread: 30,
          origin: { x: Math.random(), y: Math.random() },
          colors: ['#FF6B35', '#00FF9F', '#0080FF']
        });
      }
    });

    if (needsCleanup) {
      sessionStorage.setItem('streak_celebrated', JSON.stringify(celebratedToday));
    }
  }, [completions, habits]);

  // Habit operations
  const handleSaveHabit = (habitData) => {
    let habitId = editingHabit ? editingHabit.id : addHabit(habitData).id;
    if (editingHabit) updateHabit(editingHabit.id, habitData);

    if (habitData.subtasks && habitData.subtasks.length > 0) {
      habitData.subtasks.forEach(title => addSubtask(habitId, title));
    }
    handleDataUpdate();
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
        handleDataUpdate();
      }
    });
  };

  // Custom habit operations
  const handleSaveCustomHabit = (habitData) => {
    const blockedDateKeys = getDateKeysInRange(habitData.dateFrom, habitData.dateTo);
    clearCompletionsForDateKeys(blockedDateKeys);

    if (editingCustomHabit) {
      updateCustomHabit(editingCustomHabit.id, habitData);
    } else {
      addCustomHabit(habitData);
    }
    handleDataUpdate();
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
        handleDataUpdate();
      }
    });
  };

  // Goals operations
  const handleSaveGoal = (goalData) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
    } else {
      addGoal(goalData);
    }
  };

  const handleDeleteGoal = (goalId) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Goal',
      message: 'Are you sure you want to delete this goal? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        removeGoal(goalId);
        setSelectedGoal(null);
      }
    });
  };

  const handleCompleteGoal = (goalId) => {
    completeGoal(goalId);
    setSelectedGoal(null);
    confetti({
      particleCount: 120, spread: 80, origin: { y: 0.5 },
      colors: ['#FF6B35', '#00FF9F', '#0080FF', '#FFD700', '#BD00FF']
    });
  };

  if (habitsLoading) {
    return <HabitGridSkeleton />;
  }

  return (
    <>
      <TopNav
        onSettingsClick={() => setIsSettingsPanelOpen(true)}
        onStopwatchClick={() => setIsStopwatchOpen(true)}
        onCalendarClick={() => setIsCalendarOpen(!isCalendarOpen)}
        onAddHabitClick={() => { setEditingHabit(null); setIsHabitModalOpen(true); }}
        onGoalsClick={() => setIsGoalsDashboardOpen(true)}
        currentDate={currentDate}
      />

      <div className="app perspective-root">
        <main className="app-main" style={{ transformStyle: 'preserve-3d' }}>
          <div className="app-container" style={{ transformStyle: 'preserve-3d' }}>
            <ActiveHabitTracker
              activeData={activeData}
              dailyTasks={dailyTasks}
              onToggleDailyTask={toggleDailyTask}
              onAddDailyTask={addDailyTask}
              onDeleteDailyTask={deleteDailyTask}
              onToggleCompletion={toggleCompletion}
              getCompletionStatus={getCompletionStatus}
              goals={goals}
              getGoalProgress={getGoalProgress}
              onViewAllGoals={() => setIsGoalsDashboardOpen(true)}
            />

            <ScrollReveal delay={0.1}>
              <DailyOverview
                habits={habits}
                getCompletionStatus={getCompletionStatus}
                getToday={getToday}
              />
            </ScrollReveal>

            <div className="view-toggle-container">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`view-toggle-btn btn-3d ${currentView === 'week' ? 'active' : ''}`}
                onClick={() => setView('week')}
              >
                Month View
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`view-toggle-btn btn-3d ${currentView === 'daily' ? 'active' : ''}`}
                onClick={() => setView('daily')}
              >
                Day Planner
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`view-toggle-btn btn-3d ${currentView === 'custom' ? 'active' : ''}`}
                onClick={() => setView('custom')}
              >
                Custom Date
              </motion.button>
            </div>

            <div className="main-content-split">
              <div className="main-column">
                <AnimatePresence mode="wait">
                  {currentView === 'week' && (
                    <motion.div 
                      key="week"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <MonthViewPage
                        currentDate={currentDate}
                        onEditHabit={(h) => { setEditingHabit(h); setIsHabitModalOpen(true); }}
                        onDeleteHabit={handleDeleteHabit}
                      />
                    </motion.div>
                  )}

                  {currentView === 'daily' && (
                    <motion.div
                      key="daily"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PlannerPage
                        onAddHabit={() => { setEditingHabit(null); setIsHabitModalOpen(true); }}
                        onAddCustomHabit={() => { setEditingCustomHabit(null); setIsCustomHabitModalOpen(true); }}
                      />
                    </motion.div>
                  )}

                  {currentView === 'study' && (
                    <motion.div
                      key="study"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Suspense fallback={<HabitGridSkeleton />}>
                        <StudyView />
                      </Suspense>
                    </motion.div>
                  )}

                  {currentView === 'custom' && (
                    <motion.div
                      key="custom"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CustomDatePage
                        currentDate={currentDate}
                        onEditCustomHabit={(ch) => { setEditingCustomHabit(ch); setIsCustomHabitModalOpen(true); }}
                        onDeleteCustomHabit={handleDeleteCustomHabit}
                        onAddCustomHabit={() => { setEditingCustomHabit(null); setIsCustomHabitModalOpen(true); }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <ScrollReveal delay={0.2} className="heatmaps-container-compact">
                  <StudyHeatmap dataVersion={dataVersion} />
                  <ProductivityHeatmap
                    habits={habits}
                    completions={completions}
                    dataVersion={dataVersion}
                  />
                </ScrollReveal>
              </div>

              <div className="sidebar-column parallax-layer-2">
                <ScrollReveal delay={0.3} direction="left">
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
                </ScrollReveal>
              </div>
            </div>
          </div>
        </main>
      </div>

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={handleSaveHabit}
        habit={editingHabit}
      />

      <GoalsView
        isOpen={isGoalsDashboardOpen}
        onClose={() => setIsGoalsDashboardOpen(false)}
        goals={goals}
        getGoalProgress={getGoalProgress}
        getGoalStats={getGoalStats}
        onAddGoal={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}
        onOpenGoal={setSelectedGoal}
        onToggleSubGoal={toggleSubGoal}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        goal={editingGoal}
      />

      {selectedGoal && (
        <GoalDetailModal
          goal={goals.find(g => g.id === selectedGoal.id) || selectedGoal}
          progress={getGoalProgress(selectedGoal.id)}
          onClose={() => setSelectedGoal(null)}
          onEdit={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); setSelectedGoal(null); }}
          onComplete={handleCompleteGoal}
          onArchive={archiveGoal}
          onDelete={handleDeleteGoal}
          onToggleSubGoal={toggleSubGoal}
          onAddSubGoal={addSubGoal}
          onDeleteSubGoal={deleteSubGoal}
        />
      )}

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

      <Suspense fallback={null}>
        <AnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      </Suspense>

      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <button className="close-btn" onClick={() => setIsCalendarOpen(false)}>×</button>
            <Suspense fallback={<HabitGridSkeleton />}>
              <CalendarView
                habits={habits}
                completions={completions}
                subtasks={subtasks}
                subtaskCompletions={subtaskCompletions}
                dailyTasks={dailyTasks}
                onDateDoubleClick={setSelectedDate}
                onToggleTask={toggleDailyTask}
                onUpdateTask={updateDailyTask}
                onDeleteTask={deleteDailyTask}
              />
            </Suspense>
          </div>
        </div>
      )}

      {selectedDate && (
        <Suspense fallback={null}>
          <DayHistoryModal
            date={selectedDate}
            habits={habits}
            completions={completions}
            subtasks={subtasks}
            subtaskCompletions={subtaskCompletions}
            dailyTasks={dailyTasks}
            onClose={() => setSelectedDate(null)}
          />
        </Suspense>
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
