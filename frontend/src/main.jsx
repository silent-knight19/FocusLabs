import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/animations.css';
import './styles/premium-animations.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { StopwatchHistoryProvider } from './contexts/StopwatchHistoryContext.jsx';
import { Login } from './components/Login.jsx';
import { HabitGridSkeleton } from './components/HabitGridSkeleton.jsx';
import { NetworkStatus } from './components/NetworkStatus.jsx';
import { initMonitoring } from './config/monitoring.js';
import './components/NetworkStatus.css';

initMonitoring();

const App = lazy(() => import('./App.jsx'));

import { HabitsProvider } from './contexts/HabitsContext.jsx';
import { GoalsProvider } from './contexts/GoalsContext.jsx';
import { DailyPlannerProvider } from './contexts/DailyPlannerContext.jsx';

function AppWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <StopwatchHistoryProvider>
      <HabitsProvider>
        <GoalsProvider>
          <DailyPlannerProvider>
            <NetworkStatus />
            <Suspense fallback={<HabitGridSkeleton />}>
              <App />
            </Suspense>
          </DailyPlannerProvider>
        </GoalsProvider>
      </HabitsProvider>
    </StopwatchHistoryProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppWrapper />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
