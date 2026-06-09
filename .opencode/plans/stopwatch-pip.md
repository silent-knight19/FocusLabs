# Stopwatch PiP (Picture-in-Picture) Feature

## Goal
Add a YouTube-style floating mini player for the stopwatch that persists when the full modal is closed while the timer is running.

## Files to Create (2)

### 1. `src/components/styles/StopwatchPiP.css`
Glassmorphism styling with:
- Fixed position, z-index 3000
- `backdrop-filter: blur(24px)`, rounded 16px corners
- Drag cursor on header, resize cursor on corner handle
- Two visual states: `.minimized` and default (expanded)
- Green pulsing dot when timer is running
- Dark/light theme via CSS variables (`--bg-elevated`, `--border-color`, etc.)
- Compact mobile breakpoint at 480px

### 2. `src/components/StopwatchPiP.jsx`
Floating widget component (~180 lines):

**Props:**
- `isOpen: boolean` — visibility
- `onClose: () => void` — dismiss PiP (timer keeps running)
- `onOpenFull: () => void` — reopen the full stopwatch modal

**Internal state:**
- `position: { x, y }` — current position (loaded from/saved to localStorage key `stopwatch_pip_position`)
- `pipSize: { width }` — current width (loaded from/saved to localStorage key `stopwatch_pip_size`, default 300)
- `isMinimized: boolean` — collapsed/expanded toggle
- `isDragging: boolean` — suppresses click events during drag
- `isResizing: boolean` — suppresses click events during resize

**Stopwatch integration (via `useStopwatch()` hook):**
- `time`, `isRunning`, `start`, `pause`, `reset`, `lap`, `formatTime`

**Layout (Expanded):**
```
┌──────────────────────────────────┐
│ ⌚ 12:34.56  ●  [_] [⤢] [✕]   │ ← drag header
├──────────────────────────────────┤
│ [▶/⏸]  [■ Stop]  [🚩 Lap]     │ ← controls
│                        ╱        │ ← resize handle
└──────────────────────────────────┘
```

**Layout (Minimized):**
```
┌────────────────────────────┐
│ 12:34.56 [▶]  [+] [✕]    │ ← drag header (no border-bottom)
└────────────────────────────┘
```

**Drag logic:**
- `onMouseDown` on header → track start position → `onMouseMove` updates `position` (clamped to viewport padding: 10px) → `onMouseUp` saves to localStorage
- Touch events parallel (touchstart/touchmove/touchend)

**Resize logic:**
- `onMouseDown` on `.stopwatch-pip-resize-handle` → track start → `onMouseMove` updates `pipSize.width` (clamped 220-500) → `onMouseUp` saves to localStorage

**Animation:**
- Wrapped in `AnimatePresence` (from `App.jsx`) with scale + opacity transition (0.2s)

## Files to Modify (2)

### 3. `src/App.jsx`
- Import `StopwatchPiP`
- Add state: `const [isPiPOpen, setIsPiPOpen] = useState(false);`
- Add handler: `const handleMinimizeToPiP = () => { setIsStopwatchOpen(false); setIsPiPOpen(true); };`
- Add handler: `const handleOpenFullFromPiP = () => { setIsPiPOpen(false); setIsStopwatchOpen(true); };`
- Pass `onMinimizeToPiP` prop to `<Stopwatch>`
- Render `<StopwatchPiP>` alongside `<Stopwatch>` with:
  ```jsx
  <StopwatchPiP
    isOpen={isPiPOpen}
    onClose={() => setIsPiPOpen(false)}
    onOpenFull={handleOpenFullFromPiP}
  />
  ```

### 4. `src/components/Stopwatch.jsx`
- Accept new prop: `onMinimizeToPiP`
- Add minimize button in `stopwatch-header-actions` (before close button):
  ```jsx
  <button className="close-btn" onClick={onMinimizeToPiP} title="Minimize to PiP">
    <ChevronDown size={24} />
  </button>
  ```
- Import `ChevronDown` from lucide-react
- Modify close handler: when `isRunning` is true, call `onMinimizeToPiP` instead of `onClose` (auto-PiP behavior)

## Data Flow

```
App.jsx
 ├─ isStopwatchOpen → <Stopwatch isOpen={isStopwatchOpen} onClose={...} onMinimizeToPiP={...} />
 └─ isPiPOpen → <StopwatchPiP isOpen={isPiPOpen} onClose={...} onOpenFull={...} />
                  └─ uses useStopwatch() hook internally

Scenario: user clicks ✕ while timer running
  Stopwatch.jsx detects isRunning → calls onMinimizeToPiP()
  App.jsx: setIsStopwatchOpen(false); setIsPiPOpen(true);
  → PiP appears, full modal closes

Scenario: user clicks minimize button
  Stopwatch.jsx calls onMinimizeToPiP()
  → Same as above

Scenario: user resets stopwatch (PiP still visible)
  Stopwatch.jsx reset() sets time=0, isRunning=false
  PiP auto-detects time === 0 && !isRunning → calls onClose()

Scenario: user clicks ✕ on PiP
  StopwatchPiP.jsx calls onClose()
  App.jsx: setIsPiPOpen(false)
  Timer continues in background

Scenario: user clicks ⤢ (expand) on PiP
  StopwatchPiP.jsx calls onOpenFull()
  App.jsx: setIsPiPOpen(false); setIsStopwatchOpen(true);
  → Full modal reopens with timer state preserved
```

## Edge Cases Handled
1. **Reset while PiP is open** → PiP auto-dismisses
2. **Page refresh while running** → stopwatch state persists via localStorage, PiP does NOT reappear (only the modal reopens if user clicks the stopwatch button again)
3. **Multiple rapid minimize/expand** → handled by React state batching
4. **Resize below min width** → clamped at 220px
5. **Drag off-screen** → clamped to viewport with 10px padding
6. **Mobile touch** → separate touch event handlers for drag
