# Flowmate + Flow Club Sync (Chrome Extension)

A lightweight Chrome extension that syncs your **Flow Club** session timer with your custom **Flowmate** timer on [https://flowmate.club](https://flowmate.club).

- Reads the timer from **Flow Club** (e.g. `23:41` remaining).
- Stores it using `chrome.storage.local`.
- Injects the current timer into the **Flowmate** tab via `window.postMessage`.
- Your Flowmate React app listens for `FLOWCLUB_TIMER_SYNC` and aligns its timer.

> ⚠️ Note: This is an unofficial tool. Not affiliated with Flow Club.

---

## How it works

**On Flow Club (`https://flow.club/*`):**

- `flowclub.content.js` runs as a content script.
- It finds the DOM element that displays the countdown timer.
- Every 2 seconds, it:
  - Parses the text (`MM:SS`) → total seconds
  - Saves `{ flowclubTimerSeconds, flowclubTimerUpdatedAt }` to `chrome.storage.local`.

**On Flowmate (`https://flowmate.club/*`):**

- `flowmate.content.js` runs as a content script.
- It:
  - Reads the stored timer from `chrome.storage.local`.
  - Listens for changes to that timer.
  - Pushes updates into the page using `window.postMessage` with:
    - `type: "FLOWCLUB_TIMER_SYNC"`
    - `payload: { seconds, updatedAt }`

**Inside Flowmate React app** (separate repo):

- A small `useEffect` listens for `message` events.
- When `FLOWCLUB_TIMER_SYNC` arrives:
  - Computes remaining time = stored seconds − elapsed time.
  - Updates internal timer state.

---

## Development Setup (Unpacked Extension)

1. Clone this repo:

   ```bash
   git clone https://github.com/<your-username>/flowmate-flowclub-sync.git
   cd flowmate-flowclub-sync