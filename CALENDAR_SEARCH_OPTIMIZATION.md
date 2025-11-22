# 🔧 Calendar Search Optimization

## 🎯 Logic Updates

### 1. **Habit Search Logic**
- **Old Behavior**: Lit up *all* dates where the habit was active (including future).
- **New Behavior**: 
  - **History**: Only lights up dates where the habit was actually **completed**.
  - **Today**: Lights up if the habit is scheduled for today (even if not done yet).
- **Benefit**: Accurate historical view + visibility for today's tasks.

### 2. **Subtask Search Logic**
- **Context**: Subtasks change daily, so searching for "Chapter 1" shouldn't light up yesterday if yesterday's task was "Intro".
- **New Behavior**: 
  - Searches subtasks **only for Today**.
  - Does **not** search history for subtasks (since historical text isn't preserved).
- **Benefit**: Prevents misleading historical matches and focuses on current actionable tasks.

### 3. **Future Dates**
- **Fixed**: No longer lights up future dates for any search.
- **Exception**: None. Future dates are never matched.

## 🔍 How It Works Now

| Search Type | Matches In History? | Matches Today? | Matches Future? |
| :--- | :---: | :---: | :---: |
| **Habit Name** | ✅ Yes (If Completed) | ✅ Yes (If Scheduled) | ❌ No |
| **Subtask** | ❌ No | ✅ Yes (If Present) | ❌ No |

## 📝 Example Scenarios

1. **Search "Exercise" (Habit)**
   - Shows: All past days you exercised + Today (if scheduled).
   - Hides: Days you skipped exercise.

2. **Search "Read Chapter 5" (Subtask)**
   - Shows: **Today only** (if that's your task for today).
   - Hides: Yesterday (even if you read Ch 4) and Tomorrow.

3. **Search "Project X" (Habit)**
   - Shows: Days you worked on Project X (completed).
   - Hides: Future scheduled days.

This optimization ensures the calendar reflects **what you actually did** (history) and **what you need to do** (today), without cluttering the view with future schedules or inaccurate past subtasks.
