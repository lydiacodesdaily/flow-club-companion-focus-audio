# Flow Club Companion (Browser Extension)

A gentle browser extension that adds **focus-supporting tools** to **Flow Club** sessions — including customizable audio cues and lightweight task lists to help you stay oriented and focused during sessions.

> Note: This is an unofficial, community-built tool and is not affiliated with Flow Club.

---

## Features

### 🎧 Focus Audio
Customizable audio cues that sync with Flow Club session timers.

- **Tick sounds**: Choose from multiple styles (tick-tock, tick, beep, ding, or silent)
- **Voice announcements**:
  - Minutes: Configurable intervals (every 1, 2, 3, 5, or 10 minutes)
  - Seconds: Optional countdown at 50, 40, 30, 20, 10 seconds, then 9–1
  - Ding: Every 5 minutes for sessions longer than 25 minutes
- **Fully customizable**:
  - Enable/disable tick and voice independently
  - Adjust tick and voice volume
  - Mute audio during breaks
  - Collapsible advanced settings to reduce clutter

This is designed primarily to help with **time blindness**, especially for Pomodoro-style sessions — but all cues are optional and adjustable.

---

### ✅ Tasks (Session Companion)
A calm, reusable task list designed specifically for Flow Club sessions.

- Create **multiple task lists** (e.g. Morning Routine, Study, Admin)
- Reuse lists across sessions
- Add, check off, or remove tasks
- **Two-way copy support**:
  - Copy tasks into Flow Club’s *My Goals* section
  - Copy tasks from *My Goals* back into the extension
  - Completed / checkmarked items are preserved
- Tasks are stored **locally in the extension** — nothing is shared unless you copy it
- Task items are editable and can be rearranged via drag-and-drop

This is intentionally lightweight and flexible — not a full task manager.

---

## How it works

### On Flow Club pages (`https://in.flow.club/*`)
- The extension detects the active session timer
- Audio cues play locally in your browser, synced to the countdown
- The Tasks tab is available anytime during a session

### Extension popup
The popup acts as a **session companion**, with tabs for:
- **Session** – timer-aware audio controls
- **Tasks** – reusable task lists for focus sessions
- **Settings** – audio preferences and advanced options

All functionality runs locally in your browser.

---

## Getting Started

A step-by-step setup guide (with screenshots) is available here:  
https://www.notion.so/Flow-Club-Companion-Getting-Started-Guide-2e1663a03246802981dae232646d88eb

> Audio cues are **off by default**.  
> After adjusting settings, refresh the Flow Club page once so the extension can read the session timer.

---

## Installation

### Firefox (Recommended)
The extension is actively supported on Firefox and can be installed via Mozilla Add-ons.

*(Link coming soon)*

---

### Chrome / Chromium (Unpacked)

> The Chrome Web Store version may be unavailable at times due to account or review issues.  
> You can still use the extension by loading it unpacked.

1. Clone this repository:

   ```bash
   git clone https://github.com/<your-username>/flow-club-companion.git
   cd flow-club-companion

   2. Open Chrome and navigate to:  
   `chrome://extensions/`

3. Enable **Developer mode** (top-right)

4. Click **Load unpacked**

5. Select this repository folder

The extension is now active.

---

## Usage

1. Navigate to a Flow Club session at  
   https://in.flow.club

2. Join or start a session

3. Click the extension icon (pin it via the puzzle icon if needed)

4. Turn on audio cues you want (tick, voice, or both)

5. Refresh the Flow Club page once after changing settings

6. Use the Tasks tab if helpful, or ignore it entirely

There is no “correct” setup — try what helps, skip what doesn’t.

---

## Audio Files

All audio assets are bundled with the extension:

- `/audio/effects/` — tick1.mp3, tok1.mp3, ding.mp3  
- `/audio/minutes/` — m01.mp3 through m25.mp3  
- `/audio/seconds/` — s01–s09, s10, s20, s30, s40, s50  

No external audio dependencies are used.

---

## Technical Details

### Key files

- `manifest.json` / `manifest.firefox.json` — Extension configuration  
- `flowclub.content.js`  
  - Detects the Flow Club timer via DOM selectors  
  - Parses remaining time (MM:SS or HH:MM:SS)  
  - Manages audio playback and prevents duplicate announcements  
- `popup.html` / `popup.js`  
  - Session Companion UI (Session / Tasks / Settings tabs)  
- `audio/` — Bundled audio assets  

### Storage

- Uses browser local storage (`chrome.storage.local` / `browser.storage.local`)  
- Stores:
  - Audio preferences  
  - Task lists  
- Data persists across refreshes and browser restarts  
- Cleared only if the extension is removed or reset  

---

## Permissions

- `storage` — Save user preferences and task lists  
- `host_permissions`: `https://in.flow.club/*`  
  Required to detect session timers and integrate with Flow Club pages

---

## Privacy

This extension:
- ✅ Runs entirely locally in your browser  
- ✅ Only operates on Flow Club pages you visit  
- ✅ Stores data locally in the extension  
- ❌ Does NOT send data to external servers  
- ❌ Does NOT track activity or analytics  

---

## Troubleshooting

### No audio playing
- Click anywhere on the page (browser autoplay restrictions)  
- Check extension settings (tick/voice enabled, volume > 0)  
- Refresh the Flow Club page after changing settings  

### Timer not detected
- Ensure you’re on an active Flow Club session page  
- Refresh the page  
- Check the console for `[Flow Club Companion]` logs  

### Tasks missing
- Tasks are stored locally in the extension  
- Removing or resetting the extension will clear them  

---

## Community

This extension received a community shoutout from **Ricky Yean (co-founder of Flow Club)** in Flow Club’s email  
**“A quick 2025 Wrapped from Flow Club + invite to vibecode.”**

It was shared as an example of how Flow Club members build small, personal tools to support their own working styles.

---

## Development

To test changes:

1. Update the code  
2. Go to your browser’s extensions page  
3. Click the refresh icon on the extension  
4. Reload any Flow Club tabs  

---

## License

MIT License — feel free to use and modify.

---

## Credits

Built by **Liddy 🦥✨ · Lydia Studio**  
for Flow Club users who want calm, supportive focus tools.

Also check out:  
**FlowMate** — a more customizable standalone focus timer