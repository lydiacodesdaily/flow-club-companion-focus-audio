# Flow Club Companion: Focus Audio (Chrome Extension)

A Chrome extension that provides audio cues during **Flow Club** sessions to help you stay focused. Features ticking sounds every second and voice announcements for time remaining.

- **Tick sounds**: Alternates between two tick sounds every second (like a metronome)
- **Voice announcements**:
  - Minutes: Announces at 25, 24, 23... down to 1 minute remaining
  - Seconds: Announces at 50, 40, 30, 20, 10 seconds, then counts down 9-1
  - Ding: Every 5 minutes for sessions longer than 25 minutes
- **Customizable**: Control tick/voice separately, adjust volumes, mute during breaks

> Note: This is an unofficial tool. Not affiliated with Flow Club.

---

## How it works

**On Flow Club session pages (`https://in.flow.club/*`):**

- The extension automatically detects the countdown timer on the page
- Plays audio cues locally in your browser:
  - Tick sound every second (alternating tick1/tok1)
  - Voice announcements at key time markers
- All audio playback is local - no external dependencies required

**Settings (via extension popup):**

- Toggle tick sounds on/off
- Toggle voice announcements on/off
- Adjust tick volume (0-100%)
- Adjust voice volume (0-100%)
- Option to mute during breaks (if applicable)

---

## Installation (Unpacked Extension)

1. Clone this repo:

   ```bash
   git clone https://github.com/<your-username>/flowmate-flowclub-sync.git
   cd flowmate-flowclub-sync
   ```

2. Open Chrome and navigate to:

   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked**

5. Select this repository folder

6. The extension is now active!

---

## Usage

1. Navigate to a Flow Club session at [https://in.flow.club](https://in.flow.club)

2. Join or start a session

3. The extension will automatically detect the timer and begin playing audio cues

4. Click the extension icon in your toolbar to adjust settings:
   - Enable/disable tick sounds
   - Enable/disable voice announcements
   - Adjust volume levels

---

## Audio Files

All audio files are included in the `/audio/` directory:

- `/audio/effects/` - tick1.mp3, tok1.mp3, ding.mp3
- `/audio/minutes/` - m01.mp3 through m25.mp3
- `/audio/seconds/` - s01.mp3 through s09.mp3, s10.mp3, s20.mp3, s30.mp3, s40.mp3, s50.mp3
- `/audio/transitions/` - focus.mp3, break.mp3, done.mp3 (optional)

---

## Technical Details

**Files:**

- `manifest.json` - Extension configuration
- `flowclub.content.js` - Content script that runs on Flow Club pages
  - Detects timer element using DOM selectors
  - Parses time remaining (MM:SS or HH:MM:SS format)
  - Manages audio playback with caching
  - Prevents duplicate announcements
- `popup.html` / `popup.js` - Settings UI
- `audio/` - All audio files (mp3/m4a)

**Permissions:**

- `storage` - Save user preferences
- `host_permissions` for `https://in.flow.club/*` - Run content script on Flow Club

---

## Troubleshooting

**No audio playing:**
- Check that you've granted audio autoplay permissions to Flow Club
- Try clicking anywhere on the page first (browser autoplay restrictions)
- Check extension settings - ensure tick/voice are enabled
- Verify volume levels are not set to 0%

**Timer not detected:**
- Ensure you're on an active Flow Club session page (`in.flow.club`)
- Check browser console for `[Flow Club Audio]` logs
- Try refreshing the page

**Audio cutting out:**
- Check your system volume
- Try adjusting the extension's volume sliders
- Ensure other audio isn't conflicting

---

## Privacy

This extension:
- ✅ Runs entirely locally in your browser
- ✅ Only accesses Flow Club pages you visit
- ✅ Stores settings locally (chrome.storage.local)
- ❌ Does NOT send any data to external servers
- ❌ Does NOT track your activity

---

## Development

To modify the extension:

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any Flow Club tabs

---

## License

MIT License - Feel free to use and modify

---

## Credits

Built for Flow Club users who want audio feedback during focus sessions.
