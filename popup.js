// popup.js - Settings UI for Flow Club Audio Companion

const DEFAULT_SETTINGS = {
  audioOn: true,
  tickEnabled: false,
  voiceEnabled: true,
  secondsCountdownEnabled: true,
  muteDuringBreaks: true,
  tickVolume: 0.3,
  voiceVolume: 0.85,
  announcementInterval: 1, // minutes
  tickSound: 'tick-tock' // tick-tock, tick, beep1, beep2, ding, none
};

// Task List Management
class TaskListManager {
  constructor() {
    this.lists = {};
    this.currentListId = null;
    this.loadData();
  }

  loadData() {
    chrome.storage.local.get(['taskLists', 'currentTaskListId'], (data) => {
      this.lists = data.taskLists || {};
      this.currentListId = data.currentTaskListId || null;

      // If no lists exist, don't create a default one yet
      this.render();
    });
  }

  saveData() {
    chrome.storage.local.set({
      taskLists: this.lists,
      currentTaskListId: this.currentListId
    });
  }

  createList(name) {
    const id = Date.now().toString();
    this.lists[id] = {
      name: name,
      tasks: []
    };
    this.currentListId = id;
    this.saveData();
    this.render();
    return id;
  }

  renameList(id, newName) {
    if (this.lists[id]) {
      this.lists[id].name = newName;
      this.saveData();
      this.render();
    }
  }

  duplicateList(id) {
    if (this.lists[id]) {
      const newId = Date.now().toString();
      const originalName = this.lists[id].name;
      this.lists[newId] = {
        name: originalName + ' (copy)',
        tasks: JSON.parse(JSON.stringify(this.lists[id].tasks))
      };
      this.currentListId = newId;
      this.saveData();
      this.render();
    }
  }

  deleteList(id) {
    if (this.lists[id]) {
      delete this.lists[id];

      // Select another list or null
      const listIds = Object.keys(this.lists);
      this.currentListId = listIds.length > 0 ? listIds[0] : null;

      this.saveData();
      this.render();
    }
  }

  addTask(listId, text) {
    if (this.lists[listId]) {
      this.lists[listId].tasks.push({
        id: Date.now().toString(),
        text: text,
        completed: false
      });
      this.saveData();
      this.render();
    }
  }

  toggleTask(listId, taskId) {
    if (this.lists[listId]) {
      const task = this.lists[listId].tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveData();
        this.render();
      }
    }
  }

  deleteTask(listId, taskId) {
    if (this.lists[listId]) {
      this.lists[listId].tasks = this.lists[listId].tasks.filter(t => t.id !== taskId);
      this.saveData();
      this.render();
    }
  }

  getCurrentList() {
    return this.currentListId ? this.lists[this.currentListId] : null;
  }

  copyToClipboard() {
    const list = this.getCurrentList();
    if (!list || list.tasks.length === 0) return false;

    const text = list.tasks
      .map(task => `- [ ] ${task.text}`)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      // Show copied feedback
      const btn = document.getElementById('copyBtn');
      const originalText = btn.textContent;

      btn.classList.add('copied');
      btn.textContent = '✓ Copied';

      setTimeout(() => {
        btn.classList.remove('copied');
        btn.textContent = originalText;
      }, 2000);
    });

    return true;
  }

  render() {
    this.renderDropdown();
    this.renderTaskList();
    this.renderHeader();
  }

  renderDropdown() {
    const dropdown = document.getElementById('taskListDropdown');
    const listSwitcher = document.getElementById('listSwitcher');

    dropdown.innerHTML = '<option value="">Select a list...</option>';

    const listCount = Object.keys(this.lists).length;

    // Show list switcher only if there are multiple lists
    if (listCount > 1) {
      listSwitcher.style.display = 'block';
    } else {
      listSwitcher.style.display = 'none';
    }

    Object.entries(this.lists).forEach(([id, list]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = list.name;
      if (id === this.currentListId) {
        option.selected = true;
      }
      dropdown.appendChild(option);
    });
  }

  renderHeader() {
    const header = document.getElementById('tasksHeader');
    const listTitle = document.getElementById('listTitle');
    const copyBtnContainer = document.getElementById('copyBtnContainer');

    if (this.currentListId && this.lists[this.currentListId]) {
      header.style.display = 'block';
      listTitle.textContent = this.lists[this.currentListId].name;
      copyBtnContainer.style.display = 'block';
    } else {
      header.style.display = 'none';
      copyBtnContainer.style.display = 'none';
    }
  }

  renderTaskList() {
    const container = document.getElementById('taskListContainer');
    const addTaskInput = document.getElementById('addTaskInput');
    const list = this.getCurrentList();

    if (!list) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No list selected.</p>
          <p>Create a list to get started.</p>
        </div>
      `;
      addTaskInput.style.display = 'none';
      return;
    }

    addTaskInput.style.display = 'block';

    if (list.tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No tasks yet.</p>
          <p>Add your first task below.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.tasks.map(task => `
      <div class="task-item">
        <input
          type="checkbox"
          class="task-checkbox"
          ${task.completed ? 'checked' : ''}
          data-task-id="${task.id}"
        />
        <div class="task-text ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.text)}</div>
        <button class="task-delete" data-task-id="${task.id}">×</button>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleTask(this.currentListId, e.target.dataset.taskId);
      });
    });

    container.querySelectorAll('.task-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteTask(this.currentListId, e.target.dataset.taskId);
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

let taskManager;

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

    // Set all form values synchronously before removing loading class
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

    // Remove loading class after DOM has rendered the changes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('loading');
      });
    });
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

// Collapsible section toggle
function toggleAdvancedSettings() {
  const content = document.getElementById('advancedContent');
  const arrow = document.querySelector('.collapsible-arrow');

  content.classList.toggle('expanded');
  arrow.classList.toggle('expanded');

  // Save expanded state preference
  const isExpanded = content.classList.contains('expanded');
  chrome.storage.local.set({ advancedExpanded: isExpanded });
}

// Load collapsible state preference
function loadAdvancedState() {
  chrome.storage.local.get('advancedExpanded', (data) => {
    if (data.advancedExpanded) {
      document.getElementById('advancedContent').classList.add('expanded');
      document.querySelector('.collapsible-arrow').classList.add('expanded');
    }
  });
}

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // Save last active tab
  chrome.storage.local.set({ lastActiveTab: tabName });
}

// Load last active tab
function loadLastActiveTab() {
  chrome.storage.local.get('lastActiveTab', (data) => {
    if (data.lastActiveTab) {
      switchTab(data.lastActiveTab);
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadAdvancedState();
  loadLastActiveTab();

  // Initialize task manager
  taskManager = new TaskListManager();

  // Tab listeners
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });

  // Collapsible section listener
  document.getElementById('advancedToggle').addEventListener('click', toggleAdvancedSettings);

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

  // Task management listeners
  document.getElementById('newListBtn').addEventListener('click', () => {
    const name = prompt('Enter a name for your new task list:', 'My Tasks');
    if (name && name.trim()) {
      taskManager.createList(name.trim());
    }
  });

  document.getElementById('taskListDropdown').addEventListener('change', (e) => {
    taskManager.currentListId = e.target.value || null;
    taskManager.saveData();
    taskManager.render();
  });

  const addTaskInput = document.getElementById('addTaskInput');

  // Auto-resize textarea
  addTaskInput.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.max(36, e.target.scrollHeight) + 'px';
  });

  addTaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line on Enter

      const input = e.target.value.trim();
      if (!input) return;

      // Check if input contains markdown checklist format (newlines with "- [ ]" or "- [x]")
      if (input.includes('\n') && /^-\s*\[[\sx]\]/m.test(input)) {
        // Parse markdown checklist format
        const lines = input.split('\n');
        lines.forEach(line => {
          // Match patterns like "- [ ] task" or "- [x] task" or "- task"
          const match = line.trim().match(/^-\s*(?:\[[\sx]\]\s*)?(.+)$/);
          if (match && match[1].trim()) {
            taskManager.addTask(taskManager.currentListId, match[1].trim());
          }
        });
      } else {
        // Single task
        taskManager.addTask(taskManager.currentListId, input);
      }

      e.target.value = '';
      e.target.style.height = 'auto';
    }
  });

  document.getElementById('copyBtn').addEventListener('click', () => {
    taskManager.copyToClipboard();
  });

  // List menu toggle
  document.getElementById('listMenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('listActions');
    menu.classList.toggle('show');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('listActions');
    const menuBtn = document.getElementById('listMenuBtn');
    if (!menu.contains(e.target) && e.target !== menuBtn) {
      menu.classList.remove('show');
    }
  });

  document.getElementById('renameListBtn').addEventListener('click', () => {
    if (taskManager.currentListId) {
      const currentName = taskManager.lists[taskManager.currentListId].name;
      const newName = prompt('Enter a new name for this list:', currentName);
      if (newName && newName.trim()) {
        taskManager.renameList(taskManager.currentListId, newName.trim());
      }
      document.getElementById('listActions').classList.remove('show');
    }
  });

  document.getElementById('duplicateListBtn').addEventListener('click', () => {
    if (taskManager.currentListId) {
      taskManager.duplicateList(taskManager.currentListId);
      document.getElementById('listActions').classList.remove('show');
    }
  });

  document.getElementById('deleteListBtn').addEventListener('click', () => {
    if (taskManager.currentListId) {
      const listName = taskManager.lists[taskManager.currentListId].name;
      if (confirm(`Are you sure you want to delete "${listName}"?`)) {
        taskManager.deleteList(taskManager.currentListId);
      }
      document.getElementById('listActions').classList.remove('show');
    }
  });
});
