// flowclub.content.js
// Runs on: https://app.flow.club/*
//
// Stores into chrome.storage.local:
// - flowclubTimerSeconds
// - flowclubTimerUpdatedAt
// - flowclubSessionDurationMinutes
// - flowclubSessionTitle

console.log("[Flowmate Sync] flowclub.content.js injected ✅", location.href);

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/; // MM:SS or HH:MM:SS
const DURATION_RE = /\b(30|60|90|120|180)\s*min\b/i;

function parseTimeToSeconds(text) {
  if (!text) return null;
  const parts = text.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findSessionTitleElement() {
  const root = document.getElementById("root") || document.body;

  // Title tends to contain: "<duration> min Flow Club ..."
  const candidates = Array.from(root.querySelectorAll("div, span")).filter((el) => {
    if (!isVisible(el)) return false;
    const t = (el.textContent || "").trim();
    if (!t) return false;
    return t.includes("Flow Club") && DURATION_RE.test(t);
  });

  // Prefer the longest text (often includes host name/emojis)
  candidates.sort((a, b) => (b.textContent || "").length - (a.textContent || "").length);
  return candidates[0] || null;
}

function readSessionTitleAndDuration() {
  const titleEl = findSessionTitleElement();
  const titleText = titleEl ? (titleEl.textContent || "").trim() : null;

  let durationMinutes = null;
  if (titleText) {
    const m = titleText.match(DURATION_RE);
    if (m) durationMinutes = Number(m[1]);
  }

  return { titleText, durationMinutes, titleEl };
}

function findTimerNearTitle(titleEl) {
  if (!titleEl) return null;

  // Walk up a few parents to get a stable "header area"
  let container = titleEl;
  for (let i = 0; i < 4; i++) container = container.parentElement || container;

  // Find visible timer-like elements inside that container
  const localTimers = Array.from(container.querySelectorAll("div, span"))
    .filter((el) => isVisible(el))
    .filter((el) => TIME_RE.test((el.textContent || "").trim()));

  return localTimers[0] || null;
}

function findBestTimerFallback() {
  const root = document.getElementById("root") || document.body;

  const candidates = Array.from(root.querySelectorAll("div, span"))
    .filter((el) => isVisible(el))
    .filter((el) => TIME_RE.test((el.textContent || "").trim()));

  if (candidates.length === 0) return null;

  // Heuristic: largest font-size is often the main countdown
  let best = candidates[0];
  let bestSize = 0;

  for (const el of candidates) {
    const fs = parseFloat(getComputedStyle(el).fontSize || "0");
    if (fs > bestSize) {
      bestSize = fs;
      best = el;
    }
  }
  return best;
}

function getTimerElement() {
  const { titleEl } = readSessionTitleAndDuration();
  return findTimerNearTitle(titleEl) || findBestTimerFallback();
}

function writeToStorage({ seconds, titleText, durationMinutes }) {
  chrome.storage.local.set({
    flowclubTimerSeconds: seconds,
    flowclubTimerUpdatedAt: Date.now(),
    flowclubSessionDurationMinutes: durationMinutes,
    flowclubSessionTitle: titleText
  });
  console.log("[Flowmate Sync] write", {
    seconds,
    titleText,
    durationMinutes,
    at: new Date().toISOString()
});
}

/**
 * Key reliability trick:
 * - Ignore anything that *looks* like time until we observe it changing a few times.
 *   This eliminates chat timestamps like "19:01" that don't tick every second.
 */
let lockedTimerEl = null;
let lastTimerText = null;
let changeCount = 0;

function poll() {
  const { titleText, durationMinutes } = readSessionTitleAndDuration();

  const candidateEl = lockedTimerEl?.isConnected ? lockedTimerEl : getTimerElement();
  if (!candidateEl) return;

  const text = (candidateEl.textContent || "").trim();
  if (!TIME_RE.test(text)) return;

  // Track changes to "lock" onto real countdown
  if (text !== lastTimerText) {
    changeCount += 1;
    lastTimerText = text;
  }

  // After a couple changes, we can trust this is the real countdown
  if (!lockedTimerEl && changeCount >= 2) {
    lockedTimerEl = candidateEl;
  }

  // Use locked element if available
  const elToUse = lockedTimerEl?.isConnected ? lockedTimerEl : candidateEl;
  const seconds = parseTimeToSeconds((elToUse.textContent || "").trim());
  if (seconds == null) return;

  writeToStorage({ seconds, titleText, durationMinutes });
}

// Poll once per second
setInterval(poll, 1000);
poll();