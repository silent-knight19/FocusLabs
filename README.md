# 🎯 FocusLabs

> *Because "I'll start on Monday" is so last week.*

Welcome to **FocusLabs** – your personal productivity command center that's more addictive than doom-scrolling, but actually good for you. We've combined habit tracking, time management, and enough dopamine hits to make your brain think you're winning at life (and you are).

## 🚀 What's This About?

FocusLabs is a full-stack habit tracker that doesn't just track your habits – it becomes your accountability partner, your productivity coach, and that friend who actually remembers what you said you'd do. Built with React, Firebase, and an unhealthy obsession with beautiful UI, this app makes self-improvement feel less like homework and more like a game you actually want to play.

Think of it as a Duolingo for your entire life, minus the passive-aggressive owl.

## ✨ Features That'll Make You Go "Why Didn't I Build This?"

### 🎨 Core Habit Tracking
- **Monthly Grid View**: Track up to 30 habits across the entire month at a glance. Each day is a tiny battlefield, and green checkmarks are your victories.
- **Daily Planner Mode**: Focus on today without the overwhelm. Toggle between monthly and daily views faster than you can say "productivity hack."
- **Three-State Completion**: Not just done/not done. We've got ✅ Completed, ❌ Skipped, and 😶 Ignored (because honesty matters).
- **Drag-and-Drop Reordering**: Organize your habits like your life – with complete control and zero judgment.
- **Smart Categories**: Study, Productive, or Self-Growth. Because "watching YouTube tutorials" isn't the same as "actually coding."

### 🔥 Streak Tracking & Gamification
- **Current Streaks**: Watch your consistency grow like a Tamagotchi you actually care about.
- **Longest Streaks**: Hall of fame for your past achievements. Flex on your past self.
- **Confetti Celebrations**: Complete all habits for the day? Get showered in confetti. Hit a 10-day streak? More confetti. We're basically a party in your browser.
- **Visual Progress Indicators**: Color-coded rings, bars, and charts that make data look sexy.

### 🔍 Advanced Search & Calendar
- **Calendar View with Search**: "When did I last go to the gym?" Find out in seconds. Search by habit name or subtask across two years of history.
- **Day History Modal**: Double-click any date to see what you accomplished. It's like a time machine, but for your productivity.
- **Multi-Level Search**: Search habits, subtasks, and daily tasks. No stone left unturned.

### ⏱️ Stopwatch with Superpowers
- **Category-Tagged Laps**: Track study sessions, productive work, or self-growth time. Each lap knows what it's about.
- **Custom Labels**: "Deep work on that bug" or "Pretending to understand async/await" – name your sessions whatever you want.
- **Alarm System**: Set timers with presets (30/60/90/120 min) or custom durations. Your brain's new Pomodoro buddy.
- **Real-Time Analytics**: See exactly where your time goes. Spoiler: probably more on "productive procrastination" than you'd like.

### 📊 Heatmaps & Visualizations
- **Study Activity Heatmap**: GitHub-style contribution graph for your study hours. Make that calendar green.
- **Productivity & Growth Heatmap**: Separate tracking for productive work and self-growth. Because meditation and that startup idea deserve different colors.
- **Concentric Pie Charts**: 10-day averages for study, productive, and self-growth hours. It spins, it's pretty, and it tells you uncomfortable truths.
- **Weekly Progress Bars**: How's your week looking? The bars know.

### 📝 Subtasks & Daily Tasks
- **Habit Subtasks**: Big habit? Break it down. "Exercise" becomes "Warmup," "Cardio," "Strength." Check them off one by one.
- **Daily Task Lists**: Each habit gets a personal to-do list for the day. Add tasks on the fly, mark them done, feel awesome.
- **Completion Percentages**: Math that actually makes you feel good. "3/5 tasks done = 60% complete." Easy dopamine.


### 🎯 Active Habit Focus
- **Live Countdown Timer**: See exactly how much time until your next habit. Creates healthy urgency without the panic.
- **Quick Complete Button**: One-tap completion from the active habit card. Friction is the enemy of good habits.
- **Dynamic Progress Rings**: Animated SVG circles that fill up as you get closer. It's hypnotic.

### 🌓 Dark/Light Theme
- **Smooth Theme Toggle**: Dark mode for night owls, light mode for morning people, and instant switching for the indecisive.
- **System Responsive**: Respects your OS preference because we're civilized.
- **Neon Accents**: Gradients, glows, and color schemes that make productivity feel like cyberpunk.

### ⚙️ Settings & Data Management
- **Start-of-Week Preference**: Sunday or Monday? You decide. We don't judge.
- **Export All Data**: Download everything as JSON. Your data, your control.
- **Import Data**: Moving devices? Import your backup. Seamless.
- **Clear Data Options**: Nuclear option when you need a fresh start. With confirmations, because accidents happen.
- **Firestore Sync**: Real-time cloud sync across devices. Start on your laptop, finish on your phone.

### 🎨 UI/UX That Doesn't Suck
- **Glassmorphism Effects**: Frosted glass cards because we're fancy.
- **Smooth Animations**: Micro-interactions that feel like butter.
- **Responsive Design**: Looks gorgeous on desktop, tablet, and phone. We didn't forget mobile exists.
- **Loading States**: No awkward blank screens. Spinners with personality.
- **Error Boundaries**: When things break (they won't, but if they do), you'll know gracefully.

### 🔐 Authentication & Security
- **Google Sign-In**: One click, you're in. No passwords to remember or forget.
- **User-Scoped Data**: Your habits are yours. Firestore rules ensure privacy.
- **Session Persistence**: Stay logged in until you want to log out.

### 🧠 Under-the-Hood Magic
- **Circuit Breakers**: Prevents infinite Firebase write loops. We learned this the hard way.
- **Memory-Only Cache**: No localStorage quota errors. Your browser thanks us.
- **Optimistic Updates**: UI updates instantly, syncs in the background. Feels fast because it is.
- **Error Recovery**: Failed writes? We retry. Connection drops? We queue.

## 🛠️ Tech Stack

**Frontend:**
- **React 19.2** – The new hotness with concurrent features
- **Vite 7.2** – Build tool that's faster than your coffee break
- **Lucide React** – Icons that don't look like clipart from 2005
- **Recharts** – Charts that actually respect your time
- **Canvas Confetti** – Because celebrations matter
- **@dnd-kit** – Drag-and-drop that doesn't fight you

**Backend & Cloud:**
- **Firebase Authentication** – Google sign-in without the OAuth headache
- **Firestore** – NoSQL database that scales (and syncs in real-time)
- **Firebase Cloud Messaging** – Push notifications that arrive
- **Firebase Functions** – Serverless scheduled reminders

**Styling:**
- **Vanilla CSS** – Full control, zero compromises
- **CSS Custom Properties** – Theme switching without the complexity
- **Flexbox & Grid** – Layout systems from this decade

## 📦 Installation

### Prerequisites
- **Node.js** (v18+) – Check with `node -v`
- **npm** or **yarn** – Your package manager of choice
- **Firebase Account** – Free tier works perfectly

### Step 1: Clone the Repo
```bash
git clone https://github.com/yourusername/FocusLabs.git
cd FocusLabs
```

### Step 2: Install Dependencies
```bash
cd frontend
npm install
```

### Step 3: Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → Google Sign-In
4. Enable **Firestore Database** → Start in production mode
5. (Optional) Enable **Cloud Messaging** for notifications
6. Copy your Firebase config

### Step 4: Environment Variables
Create `frontend/.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 5: Deploy Firestore Rules
```bash
# From project root
firebase deploy --only firestore:rules
```

### Step 6: Run Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and watch the magic happen.

## 🎮 How to Use

### Getting Started
1. **Sign in with Google** – Click the button, pick your account, done.
2. **Add your first habit** – Click the `+` button in the top nav.
3. **Fill in the details:**
   - Name (e.g., "Morning workout")
   - Category (Study / Productive / Self-Growth)
   - Time allocation (e.g., 30 minutes)
   - Optional: Add subtasks ("Warmup", "Run", "Cooldown")
   - Optional: Set notification reminders

### Daily Workflow
1. **Check Active Habit** – See what's next and when it's scheduled
2. **Complete Habits** – Click once for ✅, twice for ❌, third time to clear
3. **Add Daily Tasks** – Click the `+` in the active habit card
4. **Track Focus Time** – Open stopwatch (⏱️ icon), start tracking
5. **Label Your Sessions** – Add categories and custom labels to stopwatch laps
6. **Review Progress** – Scroll down to see heatmaps and stats

### Views & Navigation
- **Month View** – See all habits across the entire month (default)
- **Daily Planner** – Focus on today's habits and tasks
- **Calendar** – Search history, double-click dates for details
- **Analytics** – Dive deep into trends and patterns

### Stopwatch Power User Tips
- **Set alarms** before starting long sessions (click 🔔 icon)
- **Use categories** to auto-tag laps (Study/Productive/Self-Growth)
- **Edit lap labels** by clicking on them
- **Lap doesn't reset timer** – it records duration and starts next lap

### Data Management
1. **Export backup:** Settings → Export Data → Save JSON file
2. **Import backup:** Settings → Import Data → Choose file
3. **Clear data:** Settings → Clear All Data (requires confirmation)

### Customization
- **Theme:** Toggle dark/light in settings (⚙️ icon)
- **Week Start:** Choose Sunday or Monday in settings
- **Habit Order:** Drag habits to reorder in month view

## 🔥 Pro Tips

- **Double-click dates** in calendar to see full history
- **Search works on deleted habits too** – perfect for remembering "when did I stop doing yoga?"
- **Set habit time to 0** if you just want to track completion (no time commitment)
- **Use subtasks** for complex habits – feels better to check off multiple items
- **Export data monthly** – backups are free insurance
- **Streak reset?** Life happens. The confetti will return.

## 🤝 Contributing

This is a personal project, but if you found a bug or have a killer feature idea:
1. Open an issue
2. Fork the repo
3. Submit a PR
4. Explain why your idea is genius

## 📄 License

None. Zero. Zilch. This project has **no license**, which means standard copyright laws apply. You can look, learn, and get inspired, but technically you can't redistribute or modify without permission. 

(Translation: It's here for you to study and enjoy, but if you want to use chunks of it, shoot me a message!)

## 💬 FAQ

**Q: Will this make me productive?**  
A: Only if you actually use it. We're good, but we're not magic.

**Q: Can I use this without Firebase?**  
A: Technically, yes (localStorage only), but you'll lose cloud sync and notifications.

**Q: Why no email/password login?**  
A: Because we value our sanity and your security. Google OAuth is battle-tested.

**Q: The heatmap isn't updating!**  
A: Refresh the page or wait a few seconds. Real-time sync has a tiny delay sometimes.

**Q: Can I add more than 30 habits?**  
A: You *can*, but should you? Focus beats quantity every time.

## 🙏 Acknowledgments

- **You**, for reading this far
- **Coffee**, for existing
- **The React team**, for making UI fun again
- **Firebase**, for serverless simplicity
- **Every productivity YouTuber**, for the inspiration (and procrastination)

---

Built with ☕, 🎵, and an unhealthy amount of ⏰ by someone who really, really wanted to build good habits.

**Now stop reading and go complete a habit.** ✨
