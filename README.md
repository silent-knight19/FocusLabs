# FocusLabs

A full-stack habit tracking application with time analytics, built for developers who value data-driven self-improvement.

## Overview

FocusLabs is a productivity tool that combines habit tracking with time management analytics. It provides a visual interface for tracking daily habits, analyzing time allocation across categories (Study, Productive Work, Self-Growth), and maintaining streaks through a gamified completion system.

The application differentiates itself through:
- **Three-state completion tracking** (completed, skipped, unmarked) rather than binary checkboxes
- **Stopwatch integration** with category-tagged sessions for granular time analytics
- **GitHub-style heatmaps** for visualizing activity patterns
- **Custom date-range habits** for temporary projects or sprints
- **Real-time sync** across devices via Firebase

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 19.2 (Vite 7.2) |
| State Management | React Hooks + Context API |
| Backend Services | Firebase (Auth, Firestore, Cloud Functions) |
| Styling | Vanilla CSS with CSS Custom Properties |
| Visualization | Recharts, Canvas Confetti |
| Drag & Drop | @dnd-kit |
| 3D Graphics | Three.js + React Three Fiber |

### Data Model

The Firestore schema uses a user-scoped subcollection pattern:

```
users/{uid}/
├── habits/                    # Habit definitions (name, category, time)
├── completions/{monthKey}/     # Sharded monthly completion data
├── subtasks/                  # Habit subtask definitions
├── subtask_completions/       # Subtask completion records
├── custom_habits/             # Date-range specific habits
├── daily_tasks/               # Date-specific task lists
├── data/stopwatch_history     # Stopwatch lap records
└── devices/                   # FCM tokens for notifications
```

Completion data is sharded by month (format: `YYYY-MM`) to prevent document size limits for active users with long histories.

### Key Hooks

- `useHabits()` – CRUD operations for habits, subtasks, and completions with streak calculation
- `useCustomHabits()` – Date-range habits with full subtask support
- `useDailyTasks()` – Per-habit, per-date task management
- `useStopwatch()` – Timer state with category-tagged lap recording
- `useFirestore()` – Generic Firestore listener with optimistic updates and circuit breaker logic
- `useMonthlyCompletions()` – Month-sharded completion data management

## Features

### Habit Management

**Regular Habits**
- Create habits with category (Study/Productive/Self-Growth), time allocation, and color coding
- Drag-and-drop reordering via `@dnd-kit`
- Subtasks for breaking habits into actionable components
- Three-state completion: `completed`, `failed`, or `null` (unmarked)

**Custom Date Habits**
- Habits active only within specific date ranges (e.g., "Conference prep Jan 1-15")
- Full subtask and completion support identical to regular habits
- Override regular habits during their active period

**Completion States**
| State | Visual | Meaning |
|-------|--------|---------|
| `completed` | Green checkmark | Done as planned |
| `failed` | Red X | Skipped/missed |
| `null` | Empty | Not yet marked |

### Time Tracking

**Stopwatch**
- Runs continuously across sessions; persists state to `localStorage`
- Lap recording with duration calculation (time since last lap)
- Categories: Study, Productive, Self-Growth, Other
- Editable labels for session descriptions
- Alarm system with preset durations (30/60/90/120 min)

**Analytics**
- Concentric pie charts showing 10-day rolling averages by category
- Weekly progress bars for completion rates
- Streak tracking (current and longest) per habit

### Visualization

**Heatmaps**
- GitHub-style contribution graphs for Study, Productive, and Self-Growth hours
- Two-year scrollable history
- Color intensity based on daily duration

**Calendar View**
- Month grid with completion status indicators
- Search across habit names and subtasks (spanning 24 months)
- Double-click any date to open Day History modal

**Day History Modal**
- Shows all habits, subtasks, and daily tasks for a specific date
- Task status with inline toggle capability
- Historical search results integration

### Views

| View | Purpose | Key Features |
|------|---------|--------------|
| **Month Grid** | Overview of monthly progress | 30 habits x 30 days grid, drag-to-reorder |
| **Daily Planner** | Focus on single day | Per-habit task lists, inline task creation |
| **Custom Date** | Temporary/sprint habits | Date-range specific habit rows |
| **Calendar** | Historical search | Cross-month search, day detail modals |

### Gamification

- Confetti celebration when all habits completed for the day
- Additional confetti at 10-day streak milestones (per habit)
- Current and longest streak display in sidebar
- Animated progress rings for upcoming habits

### Settings & Data

- **Theme**: Dark/light/system preference
- **Week Start**: Sunday or Monday
- **Data Export**: Full JSON backup (habits, completions, subtasks, tasks, stopwatch history)
- **Data Import**: Restore from backup file
- **Clear Data**: Selective or complete data removal with confirmation

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project (free tier sufficient)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/FocusLabs.git
   cd FocusLabs/frontend
   npm install
   ```

2. **Configure Firebase**
   
   Create `frontend/.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

3. **Deploy Firestore security rules**
   ```bash
   firebase deploy --only firestore:rules
   ```
   Rules enforce user-scoped access: users can only read/write their own `users/{uid}/` subcollections.

4. **Run development server**
   ```bash
   npm run dev
   ```

### Firebase Configuration

Required services:
- **Authentication**: Enable Google sign-in provider
- **Firestore**: Create database in production mode
- **Security Rules**: Deploy the included `firestore.rules` to enforce user isolation

## Usage Guide

### Creating Your First Habit

1. Sign in with Google (top-right)
2. Click the plus icon in the navigation bar
3. Enter habit name, select category, set time allocation
4. Optional: Add subtasks for granular tracking
5. Save; habit appears in Month Grid view

### Daily Workflow

1. **Review Active Habit**: Top card shows next scheduled habit with countdown timer
2. **Complete Habits**: Click grid cells to cycle: empty → completed (green) → failed (red) → empty
3. **Add Daily Tasks**: In Daily Planner view, click `+` on any habit card to add date-specific tasks
4. **Track Time**: Open stopwatch, start timer, record categorized laps
5. **Check Progress**: Scroll to heatmaps and analytics section

### Keyboard Shortcuts

None implemented; all interactions are pointer-based for mobile compatibility.

### Data Portability

All user data can be exported as JSON via Settings → Export. The schema is stable and backward-compatible for imports.

## Development Notes

### Performance Optimizations

- **Memory-only Firestore cache**: Avoids `localStorage` quota errors; data persists to Firestore server-side
- **Monthly sharding**: Completion documents split by month to prevent unbounded document growth
- **Circuit breakers**: Prevents runaway Firestore write loops from hook re-renders
- **Optimistic UI**: State updates immediately, Firestore syncs in background

### State Persistence Strategy

| Data Type | Storage | Sync |
|-----------|---------|------|
| Habits, subtasks, completions | Firestore | Real-time |
| Stopwatch active state | localStorage | Device-local only |
| Stopwatch history | Firestore | Real-time |
| Settings | Firestore | Real-time |
| Theme preference | CSS class + Firestore | Real-time |

### Known Limitations

- Maximum recommended: 30 habits (UI constraints, not technical)
- Stopwatch active state does not sync across devices (intentional to avoid conflicts)
- Search history limited to 24 months (performance)
- No offline support (requires active Firestore connection)

## Project Structure

```
frontend/src/
├── components/          # React components (modals, views, UI)
├── hooks/              # Custom React hooks for data and state
├── contexts/           # Auth and stopwatch history providers
├── config/             # Firebase initialization
├── utils/              # Date helpers, storage, validation
└── styles/             # CSS with theme variables

functions/
└── index.js            # Cloud Functions placeholder

firestore.rules          # Security rules (user-scoped access)
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## Roadmap

- [ ] PWA support with offline completion queueing
- [ ] Recurring custom habits (weekdays only, etc.)
- [ ] Weekly habit templates
- [ ] Notification reminders via FCM
- [ ] Data visualization: trend lines, correlation analysis

## Troubleshooting

**Heatmap not updating**
- Refresh page; real-time listeners may have temporary lag
- Check browser console for Firestore permission errors

**Data not syncing**
- Verify `firestore.rules` deployed correctly
- Check network connection
- Look for circuit breaker logs in console

**Stopwatch reset on refresh**
- Expected behavior: only `localStorage` persists; Firestore syncs completed laps only

## Credits

Built with React, Firebase, and Three.js. Charting via Recharts. Icons via Lucide.
