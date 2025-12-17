// popup.js - Settings UI for Flow Club Audio Companion

const DEFAULT_SETTINGS = {
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

// Update UI states based on audio on/off
function updateControlStates(isAudioOn) {
  const controllableOptions = document.querySelectorAll('.controllable-option');

  controllableOptions.forEach(element => {
    if (isAudioOn) {
      element.classList.remove('disabled');
    } else {
      element.classList.add('disabled');
    }
  });
}

// Load settings and update UI
function loadSettings() {
  chrome.storage.local.get(null, (data) => {
    // Migrate old muteAll setting to audioOn
    let audioOn = DEFAULT_SETTINGS.audioOn;
    if (data.muteAll !== undefined) {
      // Convert old muteAll to new audioOn (inverted logic)
      audioOn = !data.muteAll;
      // Remove old setting and save new one
      chrome.storage.local.remove('muteAll');
      chrome.storage.local.set({ audioOn: audioOn });
    } else if (data.audioOn !== undefined) {
      audioOn = data.audioOn;
    }

    const settings = {
      audioOn: audioOn,
      tickEnabled: data.tickEnabled !== undefined ? data.tickEnabled : DEFAULT_SETTINGS.tickEnabled,
      voiceEnabled: data.voiceEnabled !== undefined ? data.voiceEnabled : DEFAULT_SETTINGS.voiceEnabled,
      secondsCountdownEnabled: data.secondsCountdownEnabled !== undefined ? data.secondsCountdownEnabled : DEFAULT_SETTINGS.secondsCountdownEnabled,
      muteDuringBreaks: data.muteDuringBreaks !== undefined ? data.muteDuringBreaks : DEFAULT_SETTINGS.muteDuringBreaks,
      tickVolume: data.tickVolume !== undefined ? data.tickVolume : DEFAULT_SETTINGS.tickVolume,
      voiceVolume: data.voiceVolume !== undefined ? data.voiceVolume : DEFAULT_SETTINGS.voiceVolume,
      announcementInterval: data.announcementInterval !== undefined ? data.announcementInterval : DEFAULT_SETTINGS.announcementInterval,
      tickSound: data.tickSound !== undefined ? data.tickSound : DEFAULT_SETTINGS.tickSound
    };

    document.getElementById('audioOn').checked = settings.audioOn;
    document.getElementById('tickEnabled').checked = settings.tickEnabled;
    document.getElementById('voiceEnabled').checked = settings.voiceEnabled;
    document.getElementById('secondsCountdownEnabled').checked = settings.secondsCountdownEnabled;
    document.getElementById('muteDuringBreaks').checked = settings.muteDuringBreaks;
    document.getElementById('announcementInterval').value = settings.announcementInterval;
    document.getElementById('tickSound').value = settings.tickSound;

    const tickVolume = Math.round(settings.tickVolume * 100);
    const voiceVolume = Math.round(settings.voiceVolume * 100);

    document.getElementById('tickVolume').value = tickVolume;
    document.getElementById('voiceVolume').value = voiceVolume;
    document.getElementById('tickVolumeValue').textContent = tickVolume + '%';
    document.getElementById('voiceVolumeValue').textContent = voiceVolume + '%';

    updateControlStates(settings.audioOn);
  });
}

// Save settings
function saveSettings() {
  const settings = {
    audioOn: document.getElementById('audioOn').checked,
    tickEnabled: document.getElementById('tickEnabled').checked,
    voiceEnabled: document.getElementById('voiceEnabled').checked,
    secondsCountdownEnabled: document.getElementById('secondsCountdownEnabled').checked,
    muteDuringBreaks: document.getElementById('muteDuringBreaks').checked,
    tickVolume: parseInt(document.getElementById('tickVolume').value) / 100,
    voiceVolume: parseInt(document.getElementById('voiceVolume').value) / 100,
    announcementInterval: parseInt(document.getElementById('announcementInterval').value),
    tickSound: document.getElementById('tickSound').value
  };

  chrome.storage.local.set(settings, () => {
    // Show saved status
    const status = document.getElementById('status');
    status.classList.add('show');
    setTimeout(() => {
      status.classList.remove('show');
    }, 1500);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Audio On toggle
  document.getElementById('audioOn').addEventListener('change', (e) => {
    updateControlStates(e.target.checked);
    saveSettings();
  });

  // Toggle listeners
  document.getElementById('tickEnabled').addEventListener('change', saveSettings);
  document.getElementById('voiceEnabled').addEventListener('change', saveSettings);
  document.getElementById('secondsCountdownEnabled').addEventListener('change', saveSettings);
  document.getElementById('muteDuringBreaks').addEventListener('change', saveSettings);

  // Dropdown listeners
  document.getElementById('announcementInterval').addEventListener('change', saveSettings);
  document.getElementById('tickSound').addEventListener('change', saveSettings);

  // Volume slider listeners
  const tickVolumeSlider = document.getElementById('tickVolume');
  const voiceVolumeSlider = document.getElementById('voiceVolume');

  tickVolumeSlider.addEventListener('input', (e) => {
    document.getElementById('tickVolumeValue').textContent = e.target.value + '%';
  });

  tickVolumeSlider.addEventListener('change', saveSettings);

  voiceVolumeSlider.addEventListener('input', (e) => {
    document.getElementById('voiceVolumeValue').textContent = e.target.value + '%';
  });

  voiceVolumeSlider.addEventListener('change', saveSettings);
});
