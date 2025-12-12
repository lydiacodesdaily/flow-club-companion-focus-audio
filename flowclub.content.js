// flowclub.content.js
// Runs on: https://*.flow.club/*
// Extracts: timer, title, duration
// Provides UI for manual session control

console.log('[Flowmate Sync] flowclub.content.js — start', location.href);

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;
const DURATION_RE = /\b(30|60|90|120|180)\s*min\b/i;

function parseTimeToSeconds(text) {
  if (!text) return null;
  const parts = text.trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function isVisible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function sanitizeTitle(raw) {
  if (!raw) return null;
  return raw.replace(/\b\d{1,2}:\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
}

function findSessionTitleElement() {
  const root = document.getElementById('root') || document.body;
  const els = Array.from(root.querySelectorAll('div, span')).filter((el) => {
    if (!isVisible(el)) return false;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t && t.includes('Flow Club') && DURATION_RE.test(t) && t.length < 200;
  });
  return els[0] || null;
}

function extractCleanTitleFromElement(el) {
  if (!el) return null;
  const textNodes = Array.from(el.childNodes || [])
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent.trim())
    .filter(Boolean);
  if (textNodes.length) {
    const candidate = textNodes[0].replace(/\s+/g, ' ').trim();
    if (candidate && !TIME_RE.test(candidate)) return candidate;
  }
  const full = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return full || null;
}

function readSessionTitleAndDuration() {
  const titleEl = findSessionTitleElement();
  const raw = titleEl ? extractCleanTitleFromElement(titleEl) : null;
  const titleText = sanitizeTitle(raw);
  let durationMinutes = null;
  if (raw) {
    const m = raw.match(DURATION_RE);
    if (m) durationMinutes = Number(m[1]);
  }
  return { titleText, durationMinutes, titleEl };
}

function readNearbyPhaseLabel(titleEl) {
  if (!titleEl) return null;
  const parent = titleEl.parentElement || document.body;
  const nearby = Array.from(parent.querySelectorAll('div, span, p, small')).filter(
    (el) => el !== titleEl && isVisible(el)
  );
  for (const el of nearby) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t || TIME_RE.test(t) || t.length > 30 || t.includes('Flow Club')) continue;
    return t;
  }
  return null;
}

function getTimerElement() {
  const { titleEl } = readSessionTitleAndDuration();
  if (titleEl) {
    let container = titleEl;
    for (let i = 0; i < 4; i++) container = container.parentElement || container;
    const localTimers = Array.from(container.querySelectorAll('div, span')).filter(
      (el) => isVisible(el) && TIME_RE.test((el.textContent || '').trim())
    );
    if (localTimers.length) return localTimers[0];
  }
  const root = document.getElementById('root') || document.body;
  const candidates = Array.from(root.querySelectorAll('div, span')).filter(
    (el) => isVisible(el) && TIME_RE.test((el.textContent || '').trim())
  );
  if (!candidates.length) return null;
  let best = candidates[0],
    bestSize = 0;
  for (const c of candidates) {
    const fs = parseFloat(getComputedStyle(c).fontSize || '0');
    if (fs > bestSize) {
      bestSize = fs;
      best = c;
    }
  }
  return best;
}

// ============================================================================
// Storage & State Management
// ============================================================================

let sessionState = {
  currentBlock: null, // 1-based block number (user-friendly)
  sessionType: 'focus', // focus or break
  sessionStyle: 'non-pomodoro', // pomodoro or non-pomodoro
};

// No longer needed - users manually set block type

function loadSessionState() {
  try {
    chrome.storage.local.get(
      ['flowclubCurrentBlock', 'flowclubCurrentSessionType', 'flowclubSessionStyle'],
      (data) => {
        if (data.flowclubCurrentBlock != null) sessionState.currentBlock = data.flowclubCurrentBlock;
        if (data.flowclubCurrentSessionType) sessionState.sessionType = data.flowclubCurrentSessionType;
        if (data.flowclubSessionStyle) sessionState.sessionStyle = data.flowclubSessionStyle;
        updateUI();
      }
    );
  } catch (e) {
    console.error('[Flowmate Sync] Failed to load state:', e);
  }
}

let lastWrite = {
  seconds: null,
  durationMinutes: null,
  titleText: null,
  sessionIndex: null,
  sessionType: null,
  completedCount: null,
  phaseLabel: null,
  sessionStyle: null,
  atMs: 0,
};
const WRITE_EVERY_MS = 5000;

function shouldWrite(fields) {
  const now = Date.now();
  if (lastWrite.seconds == null) return true;
  if (fields.durationMinutes !== lastWrite.durationMinutes) return true;
  if (fields.titleText !== lastWrite.titleText) return true;
  if (fields.sessionIndex !== lastWrite.sessionIndex) return true;
  if (fields.sessionType !== lastWrite.sessionType) return true;
  if (fields.completedCount !== lastWrite.completedCount) return true;
  if (fields.phaseLabel !== lastWrite.phaseLabel) return true;
  if (fields.sessionStyle !== lastWrite.sessionStyle) return true;
  if (now - lastWrite.atMs >= WRITE_EVERY_MS) return true;
  return false;
}

function writeToStorage(payload) {
  if (!shouldWrite(payload)) return;
  const { seconds, titleText, durationMinutes, sessionIndex, sessionType, completedCount, phaseLabel, sessionStyle } =
    payload;
  try {
    chrome.storage.local.set({
      flowclubTimerSeconds: seconds,
      flowclubTimerUpdatedAt: Date.now(),
      flowclubSessionDurationMinutes: durationMinutes || null,
      flowclubSessionTitle: titleText || null,
      flowclubCurrentSessionIndex: sessionIndex,
      flowclubCurrentSessionType: sessionType,
      flowclubCompletedCount: completedCount,
      flowclubPhaseLabel: phaseLabel || null,
      flowclubSessionStyle: sessionStyle || null,
      flowclubCurrentBlock: sessionState.currentBlock,
    });
    lastWrite = {
      seconds,
      durationMinutes,
      titleText,
      sessionIndex,
      sessionType,
      completedCount,
      phaseLabel,
      sessionStyle,
      atMs: Date.now(),
    };
    console.log('[Flowmate Sync] write', {
      seconds,
      titleText,
      durationMinutes,
      sessionIndex,
      sessionType,
      completedCount,
      phaseLabel,
      sessionStyle,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('Extension context invalidated')) {
      stop();
      return;
    }
    console.error('[Flowmate Sync] storage write failed:', err);
  }
}

// ============================================================================
// UI Control Panel
// ============================================================================

function createUI() {
  const panel = document.createElement('div');
  panel.id = 'flowmate-control-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 2px solid #5D5FEF;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    min-width: 320px;
    max-width: 400px;
  `;

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <strong style="color: #5D5FEF; font-size: 16px;">Flowmate Sync</strong>
      <button id="flowmate-toggle" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 0;">−</button>
    </div>
    <div id="flowmate-controls">
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Session Style:</label>
        <div style="display: flex; gap: 8px;">
          <button class="flowmate-style-btn" data-style="non-pomodoro"
            style="flex: 1; padding: 8px; border: 2px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-weight: 500;">
            Non-Pomodoro
          </button>
          <button class="flowmate-style-btn" data-style="pomodoro"
            style="flex: 1; padding: 8px; border: 2px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-weight: 500;">
            Pomodoro
          </button>
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Which block are you on?</label>
        <div style="margin-bottom: 6px; font-size: 12px; color: #666; font-style: italic;">
          Breaks count as blocks too
        </div>
        <input type="number" id="flowmate-block-input" min="1" max="20"
          style="width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;"
          placeholder="Enter block number (e.g., 4)">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Block Type:</label>
        <div style="display: flex; gap: 8px;">
          <button class="flowmate-type-btn" data-type="focus"
            style="flex: 1; padding: 8px; border: 2px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-weight: 500;">
            Focus
          </button>
          <button class="flowmate-type-btn" data-type="break"
            style="flex: 1; padding: 8px; border: 2px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-weight: 500;">
            Break
          </button>
        </div>
      </div>
      <div style="margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 6px; font-size: 13px;">
        <div style="margin-bottom: 4px;"><strong>Current:</strong> Block <span id="flowmate-display-block">—</span> (<span id="flowmate-display-type">—</span>)</div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Toggle minimize/maximize
  const toggleBtn = document.getElementById('flowmate-toggle');
  const controls = document.getElementById('flowmate-controls');
  toggleBtn.addEventListener('click', () => {
    const isHidden = controls.style.display === 'none';
    controls.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? '−' : '+';
  });

  // Session style button handlers
  document.querySelectorAll('.flowmate-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.getAttribute('data-style');
      sessionState.sessionStyle = style;

      // Update button styles
      document.querySelectorAll('.flowmate-style-btn').forEach(b => {
        b.style.background = 'white';
        b.style.borderColor = '#ddd';
        b.style.color = 'black';
      });
      btn.style.background = '#5D5FEF';
      btn.style.borderColor = '#5D5FEF';
      btn.style.color = 'white';

      updateUI();

      chrome.storage.local.set({ flowclubSessionStyle: style });
      console.log('[Flowmate Sync] Style changed to:', style);
    });
  });

  // Type button handlers
  document.querySelectorAll('.flowmate-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      sessionState.sessionType = type;

      // Update button styles
      document.querySelectorAll('.flowmate-type-btn').forEach(b => {
        b.style.background = 'white';
        b.style.borderColor = '#ddd';
        b.style.color = 'black';
      });
      btn.style.background = '#5D5FEF';
      btn.style.borderColor = '#5D5FEF';
      btn.style.color = 'white';

      updateUI();

      chrome.storage.local.set({ flowclubCurrentSessionType: type });
      console.log('[Flowmate Sync] Type changed to:', type);
    });
  });

  // Block input handler
  const blockInput = document.getElementById('flowmate-block-input');
  if (blockInput) {
    blockInput.addEventListener('change', () => {
      const value = parseInt(blockInput.value);
      if (value && value > 0) {
        sessionState.currentBlock = value;
        updateUI();
        chrome.storage.local.set({ flowclubCurrentBlock: value });
        console.log('[Flowmate Sync] Block changed to:', value);
      }
    });
  }

  loadSessionState();
}

function updateUI() {
  // Update style buttons
  document.querySelectorAll('.flowmate-style-btn').forEach(btn => {
    const style = btn.getAttribute('data-style');
    if (style === sessionState.sessionStyle) {
      btn.style.background = '#5D5FEF';
      btn.style.borderColor = '#5D5FEF';
      btn.style.color = 'white';
    } else {
      btn.style.background = 'white';
      btn.style.borderColor = '#ddd';
      btn.style.color = 'black';
    }
  });

  // Update type buttons
  document.querySelectorAll('.flowmate-type-btn').forEach(btn => {
    const type = btn.getAttribute('data-type');
    if (type === sessionState.sessionType) {
      btn.style.background = '#5D5FEF';
      btn.style.borderColor = '#5D5FEF';
      btn.style.color = 'white';
    } else {
      btn.style.background = 'white';
      btn.style.borderColor = '#ddd';
      btn.style.color = 'black';
    }
  });

  // Update block input
  const blockInput = document.getElementById('flowmate-block-input');
  if (blockInput && sessionState.currentBlock) {
    blockInput.value = sessionState.currentBlock;
  }

  // Update display
  const displayBlock = document.getElementById('flowmate-display-block');
  const displayType = document.getElementById('flowmate-display-type');

  if (displayBlock) {
    displayBlock.textContent = sessionState.currentBlock || '—';
  }

  if (displayType) {
    displayType.textContent = sessionState.sessionType || '—';
  }
}

// ============================================================================
// Polling & Main Loop
// ============================================================================

let intervalId = null;
let lockedTimerEl = null;
let lastTimerTextSeen = null;
let changeCount = 0;
let lastSeenSeconds = null;

function poll() {
  const { titleText, durationMinutes } = readSessionTitleAndDuration();
  const candidateEl = lockedTimerEl?.isConnected ? lockedTimerEl : getTimerElement();
  if (!candidateEl) return;
  const rawText = (candidateEl.textContent || '').trim();
  if (!TIME_RE.test(rawText)) return;
  if (rawText !== lastTimerTextSeen) {
    changeCount += 1;
    lastTimerTextSeen = rawText;
  }
  if (!lockedTimerEl && changeCount >= 2) lockedTimerEl = candidateEl;
  const elToUse = lockedTimerEl?.isConnected ? lockedTimerEl : candidateEl;
  const seconds = parseTimeToSeconds((elToUse.textContent || '').trim());
  if (seconds == null) return;

  // Auto-advance to next block when timer resets to a high value
  // This detects when we transition from one block to the next
  if (lastSeenSeconds != null && lastSeenSeconds < 60 && seconds > 300) {
    // Timer jumped from low (<1min) to high (>5min) = new block started
    if (sessionState.currentBlock != null) {
      sessionState.currentBlock += 1;

      // Toggle session type: focus -> break -> focus -> break...
      sessionState.sessionType = sessionState.sessionType === 'focus' ? 'break' : 'focus';

      chrome.storage.local.set({
        flowclubCurrentBlock: sessionState.currentBlock,
        flowclubCurrentSessionType: sessionState.sessionType
      });
      console.log('[Flowmate Sync] Auto-advanced to block:', sessionState.currentBlock, 'type:', sessionState.sessionType);
      updateUI();
    }
  }
  lastSeenSeconds = seconds;

  const phaseLabel = (() => {
    try {
      const { titleEl } = readSessionTitleAndDuration();
      return readNearbyPhaseLabel(titleEl);
    } catch (e) {
      return null;
    }
  })();

  // Calculate derived values from currentBlock
  const sessionIndex = sessionState.currentBlock != null ? sessionState.currentBlock - 1 : null;
  const sessionType = sessionState.sessionType;
  const completedCount = sessionState.currentBlock != null ? sessionState.currentBlock - 1 : 0;

  writeToStorage({
    seconds,
    titleText,
    durationMinutes,
    sessionIndex,
    sessionType,
    completedCount,
    phaseLabel,
    sessionStyle: sessionState.sessionStyle,
  });
}

function start() {
  if (intervalId != null) return;
  intervalId = setInterval(poll, 1000);
  poll();
}

function stop() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

window.addEventListener('beforeunload', stop);
window.addEventListener('pagehide', stop);

// Wait for page to load, then create UI and start polling
setTimeout(() => {
  createUI();
  start();
}, 1000);
