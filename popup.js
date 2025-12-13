// popup.js - Settings UI for Flow Club Audio Companion

const DEFAULT_SETTINGS = {
  tickEnabled: true,
  voiceEnabled: true,
  muteDuringBreaks: false,
  tickVolume: 0.7,
  voiceVolume: 0.9
};

// Load settings and update UI
function loadSettings() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    document.getElementById('tickEnabled').checked = settings.tickEnabled;
    document.getElementById('voiceEnabled').checked = settings.voiceEnabled;
    document.getElementById('muteDuringBreaks').checked = settings.muteDuringBreaks;

    const tickVolume = Math.round(settings.tickVolume * 100);
    const voiceVolume = Math.round(settings.voiceVolume * 100);

    document.getElementById('tickVolume').value = tickVolume;
    document.getElementById('voiceVolume').value = voiceVolume;
    document.getElementById('tickVolumeValue').textContent = tickVolume + '%';
    document.getElementById('voiceVolumeValue').textContent = voiceVolume + '%';
  });
}

// Save settings
function saveSettings() {
  const settings = {
    tickEnabled: document.getElementById('tickEnabled').checked,
    voiceEnabled: document.getElementById('voiceEnabled').checked,
    muteDuringBreaks: document.getElementById('muteDuringBreaks').checked,
    tickVolume: parseInt(document.getElementById('tickVolume').value) / 100,
    voiceVolume: parseInt(document.getElementById('voiceVolume').value) / 100
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

  // Toggle listeners
  document.getElementById('tickEnabled').addEventListener('change', saveSettings);
  document.getElementById('voiceEnabled').addEventListener('change', saveSettings);
  document.getElementById('muteDuringBreaks').addEventListener('change', saveSettings);

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
