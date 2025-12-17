// flowclub.content.js
// Flow Club Audio Companion - Content Script
// Runs on: https://in.flow.club/*
// Provides: Tick sounds + voice announcements during Flow Club sessions

// Content script loaded

// ============================================================================
// Timer Detection (kept from original)
// ============================================================================

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

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

function isInLounge() {
  // Check if we're in the lounge waiting area (before session starts)
  // The lounge has an "Enter Session" button that disappears once the session starts
  const root = document.getElementById('root') || document.body;
  const buttons = root.querySelectorAll('button');

  for (const btn of buttons) {
    const text = (btn.textContent || '').trim();
    // Check for "Enter Session" or similar text that only appears in lounge
    if (isVisible(btn) && text === 'Enter Session') {
      return true;
    }
  }

  return false;
}

function getTimerElement() {
  const root = document.getElementById('root') || document.body;
  const candidates = Array.from(root.querySelectorAll('div, span')).filter(
    (el) => isVisible(el) && TIME_RE.test((el.textContent || '').trim())
  );
  if (!candidates.length) return null;

  // Find the largest timer (by font size)
  let best = candidates[0];
  let bestSize = 0;
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
// Audio System
// ============================================================================

class AudioPlayer {
  constructor() {
    this.audioCache = new Map();
    this.settings = {
      audioOn: true,
      tickEnabled: true,
      voiceEnabled: true,
      secondsCountdownEnabled: true,
      muteDuringBreaks: false,
      tickVolume: 0.3,
      voiceVolume: 0.85,
      announcementInterval: 1, // minutes
      tickSound: 'tick-tock' // tick-tock, tick, beep1, beep2, ding, none
    };
    this.currentTick = 0; // Alternates between 0 and 1 for tick1/tok1 (used for tick-tock mode)
    this.lastPlayedCues = new Set(); // Prevent duplicate plays
    this.sessionStartSeconds = null; // Track initial session length
    this.isCurrentSessionBreak = false; // Cache break status

    // Load settings from storage
    this.loadSettings();

    // Listen for settings changes
    chrome.storage.onChanged.addListener((_changes, area) => {
      if (area === 'local') {
        this.loadSettings();
      }
    });
  }

  loadSettings() {
    chrome.storage.local.get(null, (data) => {
      // Migrate old muteAll setting to audioOn (inverted logic)
      if (data.muteAll !== undefined) {
        this.settings.audioOn = !data.muteAll;
      } else if (data.audioOn !== undefined) {
        this.settings.audioOn = data.audioOn;
      }

      if (data.tickEnabled !== undefined) this.settings.tickEnabled = data.tickEnabled;
      if (data.voiceEnabled !== undefined) this.settings.voiceEnabled = data.voiceEnabled;
      if (data.secondsCountdownEnabled !== undefined) this.settings.secondsCountdownEnabled = data.secondsCountdownEnabled;
      if (data.muteDuringBreaks !== undefined) this.settings.muteDuringBreaks = data.muteDuringBreaks;
      if (data.tickVolume !== undefined) this.settings.tickVolume = data.tickVolume;
      if (data.voiceVolume !== undefined) this.settings.voiceVolume = data.voiceVolume;
      if (data.announcementInterval !== undefined) this.settings.announcementInterval = data.announcementInterval;
      if (data.tickSound !== undefined) this.settings.tickSound = data.tickSound;
    });
  }

  getAudio(path, volume = 1.0) {
    if (!this.audioCache.has(path)) {
      const audio = new Audio(chrome.runtime.getURL(path));
      audio.volume = volume;
      this.audioCache.set(path, audio);
    }
    const audio = this.audioCache.get(path);
    audio.volume = volume;
    return audio;
  }

  async playTick(isBreak = false) {
    if (!this.settings.audioOn || !this.settings.tickEnabled) return;
    if (this.settings.muteDuringBreaks && isBreak) return;
    if (this.settings.tickSound === 'none') return; // Silent mode

    try {
      let tickFile;

      switch (this.settings.tickSound) {
        case 'tick-tock':
          // Alternate between tick1 and tok1
          tickFile = this.currentTick === 0 ? 'audio/effects/tick1.mp3' : 'audio/effects/tok1.mp3';
          this.currentTick = 1 - this.currentTick;
          break;
        case 'tick':
          tickFile = 'audio/effects/tick.m4a';
          break;
        case 'beep1':
          tickFile = 'audio/effects/beep1.mp3';
          break;
        case 'beep2':
          tickFile = 'audio/effects/beep2.mp3';
          break;
        case 'ding':
          tickFile = 'audio/effects/ding.mp3';
          break;
        default:
          // Default to tick-tock
          tickFile = this.currentTick === 0 ? 'audio/effects/tick1.mp3' : 'audio/effects/tok1.mp3';
          this.currentTick = 1 - this.currentTick;
      }

      const audio = this.getAudio(tickFile, this.settings.tickVolume);
      audio.currentTime = 0; // Reset to start
      await audio.play();
    } catch (err) {
      // Silently fail - might be autoplay restriction
      console.debug('[Flow Club Audio] Tick play failed:', err.message);
    }
  }

  async playVoice(path, isBreak = false) {
    if (!this.settings.audioOn || !this.settings.voiceEnabled) return;
    if (this.settings.muteDuringBreaks && isBreak) return;

    try {
      const audio = this.getAudio(path, this.settings.voiceVolume);
      audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      console.debug('[Flow Club Audio] Voice play failed:', err.message);
    }
  }

  async playDing(isBreak = false) {
    if (!this.settings.audioOn || !this.settings.voiceEnabled) return;
    if (this.settings.muteDuringBreaks && isBreak) return;

    try {
      const audio = this.getAudio('audio/effects/ding.mp3', this.settings.voiceVolume);
      audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      console.debug('[Flow Club Audio] Ding play failed:', err.message);
    }
  }

  // Detect if we're in a break based on initial session length
  detectSessionType(currentSeconds) {
    // If this is a new session (timer jumped up or first time), record the initial length
    if (this.sessionStartSeconds === null || currentSeconds > this.sessionStartSeconds) {
      this.sessionStartSeconds = currentSeconds;
      const initialMinutes = Math.ceil(currentSeconds / 60);
      // Breaks are typically 2, 3, or 5 minutes at Flow Club
      this.isCurrentSessionBreak = initialMinutes <= 5 &&
        (initialMinutes === 2 || initialMinutes === 3 || initialMinutes === 5);

      // Log for debugging
      console.debug(`[Flow Club Audio] New session detected: ${initialMinutes} minutes, isBreak: ${this.isCurrentSessionBreak}`);
    }
    return this.isCurrentSessionBreak;
  }

  // Reset session tracking
  resetSession() {
    this.sessionStartSeconds = null;
    this.isCurrentSessionBreak = false;
    this.lastPlayedCues.clear();
  }

  // Process timer updates and play appropriate cues
  async processTimerUpdate(remainingSeconds) {
    if (remainingSeconds === null || remainingSeconds < 0) return;

    const cueKey = `${remainingSeconds}`;

    // Avoid replaying the same cue (only trigger on boundary crossing)
    if (this.lastPlayedCues.has(cueKey)) return;

    // Clear old cues (keep only recent ones to prevent memory bloat)
    if (this.lastPlayedCues.size > 100) {
      this.lastPlayedCues.clear();
    }

    this.lastPlayedCues.add(cueKey);

    // Detect session type (updates isCurrentSessionBreak on new sessions)
    const isBreak = this.detectSessionType(remainingSeconds);

    // Minute announcements: Based on configured interval (e.g., every 1, 2, 3, 5, or 10 minutes)
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const interval = this.settings.announcementInterval;

    // Play announcement if we're on an exact minute boundary and it's a multiple of the interval
    if (seconds === 0 && minutes >= 1 && minutes <= 25 && minutes % interval === 0) {
      const minuteFile = `audio/minutes/m${String(minutes).padStart(2, '0')}.mp3`;
      await this.playVoice(minuteFile, isBreak);
      return; // Don't play tick on exact minute announcements
    }

    // Ding every 5 minutes for sessions > 25 minutes
    if (seconds === 0 && minutes > 25 && minutes % 5 === 0) {
      await this.playDing(isBreak);
      return;
    }

    // Second announcements: 50, 40, 30, 20, 10 seconds (only if enabled)
    if (this.settings.secondsCountdownEnabled) {
      if (remainingSeconds === 50 || remainingSeconds === 40 ||
          remainingSeconds === 30 || remainingSeconds === 20 ||
          remainingSeconds === 10) {
        const secondFile = `audio/seconds/s${remainingSeconds}.mp3`;
        await this.playVoice(secondFile, isBreak);
        return;
      }

      // Final countdown: 9, 8, 7, ..., 1 (only if enabled)
      if (remainingSeconds >= 1 && remainingSeconds <= 9) {
        const secondFile = `audio/seconds/s${String(remainingSeconds).padStart(2, '0')}.mp3`;
        await this.playVoice(secondFile, isBreak);
        return;
      }
    }
  }
}

// ============================================================================
// Main Polling Loop
// ============================================================================

class FlowClubAudioCompanion {
  constructor() {
    this.audioPlayer = new AudioPlayer();
    this.intervalId = null;
    this.lockedTimerEl = null;
    this.lastTimerTextSeen = null;
    this.changeCount = 0;
    this.lastSeenSeconds = null;
    this.tickIntervalId = null;
  }

  poll() {
    // Skip audio if we're in the lounge (waiting for session to start)
    if (isInLounge()) {
      // Reset session tracking when in lounge
      if (this.lastSeenSeconds !== null) {
        this.lastSeenSeconds = null;
        this.audioPlayer.resetSession();
      }
      return;
    }

    const candidateEl = this.lockedTimerEl?.isConnected ? this.lockedTimerEl : getTimerElement();
    if (!candidateEl) return;

    const rawText = (candidateEl.textContent || '').trim();
    if (!TIME_RE.test(rawText)) return;

    // Lock onto timer element once we see it change a couple times
    if (rawText !== this.lastTimerTextSeen) {
      this.changeCount += 1;
      this.lastTimerTextSeen = rawText;
    }
    if (!this.lockedTimerEl && this.changeCount >= 2) {
      this.lockedTimerEl = candidateEl;
    }

    const elToUse = this.lockedTimerEl?.isConnected ? this.lockedTimerEl : candidateEl;
    const seconds = parseTimeToSeconds((elToUse.textContent || '').trim());
    if (seconds == null) return;

    // Check if timer value changed significantly (boundary crossing)
    const hasChanged = this.lastSeenSeconds === null || this.lastSeenSeconds !== seconds;

    if (hasChanged) {
      // Clear old cues when timer jumps (new session started)
      if (this.lastSeenSeconds != null && seconds > this.lastSeenSeconds + 10) {
        this.audioPlayer.resetSession();
      }

      // Process voice announcements and special cues
      this.audioPlayer.processTimerUpdate(seconds);
      this.lastSeenSeconds = seconds;
    }
  }

  // Separate interval for tick sounds (every second)
  startTickInterval() {
    if (this.tickIntervalId) return;

    this.tickIntervalId = setInterval(() => {
      // Only tick if we have an active timer
      if (this.lastSeenSeconds !== null && this.lastSeenSeconds > 0) {
        // Use cached break status (updated by detectSessionType)
        this.audioPlayer.playTick(this.audioPlayer.isCurrentSessionBreak);
      }
    }, 1000);
  }

  start() {
    if (this.intervalId != null) return;

    this.intervalId = setInterval(() => this.poll(), 1000);
    this.startTickInterval();
    this.poll(); // Initial poll
  }

  stop() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.tickIntervalId != null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }
}

// ============================================================================
// Initialization
// ============================================================================

const companion = new FlowClubAudioCompanion();

window.addEventListener('beforeunload', () => companion.stop());
window.addEventListener('pagehide', () => companion.stop());

// Wait for page to load, then start
setTimeout(() => companion.start(), 1000);
