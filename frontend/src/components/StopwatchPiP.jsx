import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Pause, Square, Flag, Clock,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { useStopwatch } from '../hooks/useStopwatch';
import './styles/StopwatchPiP.css';

const PIP_POSITION_KEY = 'stopwatch_pip_position';
const PIP_WIDTH = 280;
const VIEWPORT_PADDING = 10;

function loadPosition() {
  try {
    const raw = localStorage.getItem(PIP_POSITION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { x: window.innerWidth - PIP_WIDTH - 20, y: window.innerHeight - 160 };
}

function clampToViewport(pos) {
  return {
    x: Math.max(VIEWPORT_PADDING, Math.min(pos.x, window.innerWidth - PIP_WIDTH - VIEWPORT_PADDING)),
    y: Math.max(VIEWPORT_PADDING, Math.min(pos.y, window.innerHeight - 130 - VIEWPORT_PADDING))
  };
}

function supportsDocPip() {
  return 'documentPictureInPicture' in window;
}



export function StopwatchPiP({ isOpen, onClose }) {
  const {
    time, isRunning, start, pause, reset, lap, formatTime
  } = useStopwatch();

  const [position, setPosition] = useState(loadPosition);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pipOpened, setPipOpened] = useState(false);
  const isDocPip = supportsDocPip();

  const dragState = useRef(null);

  const formatted = formatTime(time);
  const selectedCategory = localStorage.getItem('stopwatch_selected_category') || 'study';

  const timeRef = useRef(time);
  useEffect(() => { timeRef.current = time; }, [time]);
  const isRunningRef = useRef(isRunning);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  const isMinimizedRef = useRef(isMinimized);
  useEffect(() => { isMinimizedRef.current = isMinimized; }, [isMinimized]);

  const pipWindow = useRef(null);
  const pipNodes = useRef({});

  useEffect(() => {
    if (time === 0 && !isRunning && isOpen) {
      onClose();
    }
  }, [time, isRunning, isOpen, onClose]);

  const savePosition = useCallback((pos) => {
    try {
      localStorage.setItem(PIP_POSITION_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, []);

  const cleanupPip = useCallback(() => {
    const pip = pipWindow.current;
    if (pip && !pip.closed) {
      try { pip.close(); } catch { /* ignore */ }
    }
    pipWindow.current = null;
    pipNodes.current = {};
    setPipOpened(false);
  }, []);

  // --- Document PiP ---
  useEffect(() => {
    if (!isOpen || !isDocPip || pipOpened) return;

    let isActive = true;
    let animId = null;
    let pipWin = null;
    let pipData = null;

    function build(win) {
      const container = win.document.createElement('div');
      container.className = 'stopwatch-pip';

      const header = win.document.createElement('div');
      header.className = 'stopwatch-pip-header';
      const timerRow = win.document.createElement('div');
      timerRow.className = 'stopwatch-pip-timer';
      const ts = win.document.createElement('span'); ts.id = 'pip-timer-text'; ts.textContent = '00:00'; timerRow.appendChild(ts);
      const sep = win.document.createElement('span'); sep.className = 'pip-time-sep'; sep.textContent = '.'; timerRow.appendChild(sep);
      const cs = win.document.createElement('span'); cs.className = 'pip-time-cs'; cs.id = 'pip-timer-cs'; cs.textContent = '00'; timerRow.appendChild(cs);
      const dot = win.document.createElement('span'); dot.className = 'stopwatch-pip-running-dot'; dot.id = 'pip-dot-elm'; dot.style.display = 'none'; timerRow.appendChild(dot);
      header.appendChild(timerRow);

      const actions = win.document.createElement('div');
      actions.className = 'stopwatch-pip-header-actions';
      const tog = win.document.createElement('button'); tog.className = 'stopwatch-pip-btn'; tog.id = 'pip-toggle-btn';
      tog.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'; actions.appendChild(tog);
      const clo = win.document.createElement('button'); clo.className = 'stopwatch-pip-btn close'; clo.id = 'pip-close-btn';
      clo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'; actions.appendChild(clo);
      header.appendChild(actions);
      container.appendChild(header);

      const ctrl = win.document.createElement('div');
      ctrl.className = 'stopwatch-pip-controls'; ctrl.id = 'pip-controls-elm';
      const pb = win.document.createElement('button'); pb.className = 'stopwatch-pip-control-btn play'; pb.id = 'pip-play-btn';
      const playSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      playSvg.setAttribute('width', '14'); playSvg.setAttribute('height', '14'); playSvg.setAttribute('viewBox', '0 0 24 24');
      playSvg.setAttribute('fill', 'white'); playSvg.setAttribute('stroke', 'currentColor'); playSvg.setAttribute('stroke-width', '2');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon'); poly.setAttribute('points', '5 3 19 12 5 21 5 3'); playSvg.appendChild(poly);
      const pauseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      pauseSvg.setAttribute('width', '14'); pauseSvg.setAttribute('height', '14'); pauseSvg.setAttribute('viewBox', '0 0 24 24');
      pauseSvg.setAttribute('fill', 'white'); pauseSvg.setAttribute('stroke', 'currentColor'); pauseSvg.setAttribute('stroke-width', '2');
      pauseSvg.style.display = 'none';
      const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r1.setAttribute('x', '6'); r1.setAttribute('y', '4'); r1.setAttribute('width', '4'); r1.setAttribute('height', '16'); pauseSvg.appendChild(r1);
      const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r2.setAttribute('x', '14'); r2.setAttribute('y', '4'); r2.setAttribute('width', '4'); r2.setAttribute('height', '16'); pauseSvg.appendChild(r2);
      const pl = win.document.createElement('span'); pl.id = 'pip-play-label'; pl.textContent = 'Start';
      pb.append(playSvg, pauseSvg, pl); ctrl.appendChild(pb);

      const lb = win.document.createElement('button'); lb.className = 'stopwatch-pip-control-btn lap'; lb.id = 'pip-lap-btn';
      lb.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span>Lap</span>'; ctrl.appendChild(lb);
      const sb = win.document.createElement('button'); sb.className = 'stopwatch-pip-control-btn stop'; sb.id = 'pip-stop-btn';
      sb.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg><span>Stop</span>'; ctrl.appendChild(sb);
      container.appendChild(ctrl);
      win.document.body.appendChild(container);

      pipData = { container, timerText: ts, timerCs: cs, runningDot: dot, playSvg, pauseSvg, playLabel: pl, controls: ctrl };
      pipNodes.current = pipData;
    }

    function copyStyles(win) {
      const root = win.document.documentElement;
      const computed = getComputedStyle(document.documentElement);
      root.style.colorScheme = computed.getPropertyValue('color-scheme');
      ['--bg-primary','--bg-elevated','--bg-card','--bg-hover','--text-primary','--text-secondary','--text-tertiary','--border-color','--border-hover','--accent-primary','--accent-primary-light','--accent-danger','--accent-success','--gradient-primary','--shadow-md','--glow-primary','--font-family'].forEach(v => {
        const val = computed.getPropertyValue(v);
        if (val) root.style.setProperty(v, val);
      });
      win.document.title = 'FocusLabs Stopwatch';
      const b = win.document.body;
      b.style.margin = '0'; b.style.padding = '0'; b.style.overflow = 'hidden'; b.style.display = 'flex';
      b.style.fontFamily = computed.getPropertyValue('--font-family') || "'Inter', -apple-system, sans-serif";

      [...document.styleSheets].forEach(ss => {
        try {
          if (ss.href && ss.href.includes('StopwatchPiP.css')) return;
          if (ss.cssRules && ss.href) { const l = win.document.createElement('link'); l.rel='stylesheet'; l.type='text/css'; l.href=ss.href; win.document.head.appendChild(l); }
          else if (ss.cssRules) { const t=[...ss.cssRules].map(r=>r.cssText).join('\n'); const s=win.document.createElement('style'); s.textContent=t; win.document.head.appendChild(s); }
        } catch { if (ss.href && !ss.href.includes('StopwatchPiP.css')) { const l=win.document.createElement('link'); l.rel='stylesheet'; l.type='text/css'; l.href=ss.href; win.document.head.appendChild(l); } }
      });

      const pipCSS = win.document.createElement('style');
      pipCSS.textContent = `
        body{margin:0;padding:0;overflow:hidden;display:flex;width:100vw;height:100vh}
        .stopwatch-pip{width:100%!important;height:100%!important;display:flex;flex-direction:column;min-width:unset!important;background:rgba(18,18,28,0.95)!important;backdrop-filter:blur(24px)!important;border:1px solid var(--border-color)!important;border-radius:0!important;box-shadow:none!important}
        .stopwatch-pip-header{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;cursor:default;padding:clamp(4px,1.8vh,16px) clamp(10px,2.5vw,24px)!important;border-bottom:1px solid var(--border-color)!important;min-height:clamp(30px,6vh,48px)!important}
        .stopwatch-pip-timer{display:flex;align-items:center;gap:clamp(3px,0.8vw,10px)!important;font-weight:700!important;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;font-size:clamp(0.85rem,4vw,2.8rem)!important;color:var(--text-primary)!important}
        .pip-time-sep{color:var(--accent-primary);opacity:0.5}
        .pip-time-cs{font-size:clamp(0.55rem,2.2vw,1.6rem)!important;color:var(--text-tertiary)!important;font-weight:600}
        .stopwatch-pip-header-actions{display:flex;align-items:center;gap:clamp(3px,0.5vw,8px)!important;flex-shrink:0}
        .stopwatch-pip-btn{display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;padding:0;color:var(--text-secondary)!important;border-radius:clamp(4px,0.8vw,8px)!important;width:clamp(24px,3.5vw,38px)!important;height:clamp(24px,3.5vw,38px)!important}
        .stopwatch-pip-btn:hover{background:var(--bg-hover);color:var(--text-primary)}
        .stopwatch-pip-btn.close:hover{background:rgba(239,68,68,0.15);color:var(--accent-danger)}
        .stopwatch-pip-btn svg{width:clamp(12px,2vw,20px)!important;height:clamp(12px,2vw,20px)!important}
        .stopwatch-pip-controls{flex:1;display:flex!important;align-items:center;justify-content:center;gap:clamp(8px,2.5vw,32px)!important;padding:clamp(4px,1.5vh,16px) clamp(8px,2vw,24px)!important}
        .stopwatch-pip-control-btn{display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;font-weight:600;font-family:inherit;white-space:nowrap;gap:clamp(4px,0.6vw,10px)!important;padding:clamp(5px,1.2vh,16px) clamp(10px,2.2vw,24px)!important;font-size:clamp(0.65rem,1.8vw,1.2rem)!important;border-radius:clamp(6px,1.2vw,14px)!important}
        .stopwatch-pip-control-btn svg{width:clamp(10px,1.8vw,20px)!important;height:clamp(10px,1.8vw,20px)!important}
        .stopwatch-pip-control-btn.play{background:var(--gradient-primary);color:white}
        .stopwatch-pip-control-btn.stop{background:linear-gradient(135deg,#EF4444,#DC2626);color:white}
        .stopwatch-pip-control-btn.lap{background:var(--bg-elevated);color:var(--text-secondary);border:1px solid var(--border-color)}
        .stopwatch-pip-control-btn:hover{transform:translateY(-1px)}
        .stopwatch-pip.minimized .stopwatch-pip-header{border-bottom:none!important;padding:clamp(3px,1vh,10px) clamp(8px,2vw,16px)!important;min-height:unset!important}
        .stopwatch-pip.minimized .stopwatch-pip-timer{font-size:clamp(0.7rem,2.8vw,1.6rem)!important}
        .stopwatch-pip.minimized .stopwatch-pip-controls{display:none!important}
        .stopwatch-pip-running-dot{display:inline-block;border-radius:50%;width:clamp(4px,0.8vw,10px)!important;height:clamp(4px,0.8vw,10px)!important;background:#10b981;flex-shrink:0;animation:pipPulse 2s ease-in-out infinite}
        @keyframes pipPulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `;
      win.document.head.appendChild(pipCSS);
    }

    function sync() {
      if (!pipData) return;
      const t = formatTime(timeRef.current);
      pipData.timerText.textContent = t.hours !== '00' ? `${t.hours}:${t.minutes}:${t.seconds}` : `${t.minutes}:${t.seconds}`;
      pipData.timerCs.textContent = t.centiseconds;
      pipData.runningDot.style.display = isRunningRef.current ? 'inline-block' : 'none';
      const r = isRunningRef.current;
      if (r !== pipData._lastRun) {
        pipData._lastRun = r;
        pipData.playLabel.textContent = r ? 'Pause' : 'Start';
        pipData.playSvg.style.display = r ? 'none' : '';
        pipData.pauseSvg.style.display = r ? '' : 'none';
      }
      const m = isMinimizedRef.current;
      if (m !== pipData._lastMin) {
        pipData._lastMin = m;
        pipData.container.classList.toggle('minimized', m);
        pipData.controls.style.display = m ? 'none' : 'flex';
      }
    }

    setPipOpened(true);

    window.documentPictureInPicture.requestWindow({ width: 300, height: 140 }).then(win => {
      if (!isActive) { try { win.close(); } catch { /* ignore */ } return; }
      pipWin = win; pipWindow.current = win;
      copyStyles(win); build(win); sync();
      win.document.getElementById('pip-toggle-btn').onclick = () => setIsMinimized(p => !p);
      win.document.getElementById('pip-close-btn').onclick = () => { cleanupPip(); onClose(); };
      win.document.getElementById('pip-play-btn').onclick = () => { if (isRunningRef.current) pause(); else start(); };
      win.document.getElementById('pip-lap-btn').onclick = () => lap(selectedCategory);
      win.document.getElementById('pip-stop-btn').onclick = () => reset();
      win.addEventListener('pagehide', () => { cleanupPip(); onClose(); });
      function tick() { if (!pipWin || pipWin.closed) return; sync(); animId = requestAnimationFrame(tick); }
      animId = requestAnimationFrame(tick);
    }).catch(() => { if (isActive) setPipOpened(false); });

    return () => { isActive = false; if (animId) cancelAnimationFrame(animId); if (pipWin && !pipWin.closed) try { pipWin.close(); } catch { /* ignore */ } };
  }, [isOpen, isDocPip, pipOpened, pause, start, lap, selectedCategory, reset, onClose, formatTime, cleanupPip]);

  // --- Portal ---
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
    const onMove = (ev) => {
      if (!dragState.current) return;
      setPosition(clampToViewport({ x: dragState.current.origX + ev.clientX - dragState.current.startX, y: dragState.current.origY + ev.clientY - dragState.current.startY }));
    };
    const onUp = () => { if (dragState.current) savePosition(position); dragState.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  }, [position, savePosition]);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    dragState.current = { startX: t.clientX, startY: t.clientY, origX: position.x, origY: position.y };
    const onMove = (ev) => {
      if (!dragState.current) return;
      const touch = ev.touches[0];
      setPosition(clampToViewport({ x: dragState.current.origX + touch.clientX - dragState.current.startX, y: dragState.current.origY + touch.clientY - dragState.current.startY }));
    };
    const onEnd = () => { if (dragState.current) savePosition(position); dragState.current = null; document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
    document.addEventListener('touchmove', onMove, { passive: true }); document.addEventListener('touchend', onEnd);
  }, [position, savePosition]);

  // --- Render ---
  if (isDocPip && pipOpened) return null;

  // --- Portal ---
  if (!isOpen) return null;

  const timeString = formatted.hours !== '00' ? `${formatted.hours}:${formatted.minutes}:${formatted.seconds}` : `${formatted.minutes}:${formatted.seconds}`;

  const pipContent = (
    <div className={`stopwatch-pip ${isMinimized ? 'minimized' : ''}`} style={{ left: position.x, top: position.y, width: PIP_WIDTH }}>
      <div className="stopwatch-pip-header" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
        <div className="stopwatch-pip-timer">
          <Clock size={14} className="pip-clock-icon" />
          <span>{timeString}</span>
          <span className="pip-time-sep">.</span>
          <span className="pip-time-cs">{formatted.centiseconds}</span>
          {isRunning && <span className="stopwatch-pip-running-dot" />}
        </div>
        <div className="stopwatch-pip-header-actions">
          {isMinimized ? (
            <button className="stopwatch-pip-btn expand-btn" onClick={() => setIsMinimized(false)} title="Expand"><ChevronUp size={16} /></button>
          ) : (
            <button className="stopwatch-pip-btn" onClick={() => setIsMinimized(true)} title="Minimize"><ChevronDown size={16} /></button>
          )}
          <button className="stopwatch-pip-btn close" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close"><X size={14} /></button>
        </div>
      </div>
      {!isMinimized && (
        <div className="stopwatch-pip-controls">
          <button className="stopwatch-pip-control-btn play" onClick={() => (isRunning ? pause() : start())}>
            {isRunning ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
            <span>{isRunning ? 'Pause' : 'Start'}</span>
          </button>
          <button className="stopwatch-pip-control-btn lap" onClick={() => lap(selectedCategory)}>
            <Flag size={14} /><span>Lap</span>
          </button>
          <button className="stopwatch-pip-control-btn stop" onClick={reset}>
            <Square size={12} fill="currentColor" /><span>Stop</span>
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(<div className="stopwatch-pip-wrapper">{pipContent}</div>, document.body);
}
