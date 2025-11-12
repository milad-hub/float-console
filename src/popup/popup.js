// FloatConsole Popup Script
// Handles popup UI interactions and communicates with background/content scripts

document.addEventListener('DOMContentLoaded', async () => {
  const positionButtons = document.querySelectorAll('.position-btn');
  const dockToggle = document.getElementById('dock-toggle');

  // Load current settings
  await loadSettings();

  // Set up event listeners
  positionButtons.forEach(button => {
    button.addEventListener('click', handlePositionChange);
  });

  dockToggle.addEventListener('change', handleToggleChange);
});

/**
 * Load current settings from storage and update UI
 */
async function loadSettings() {
  try {
    const { dockVisible = false, dockPosition = 'bottom-right' } = await chrome.storage.sync.get(['dockVisible', 'dockPosition']);

    // Update toggle
    document.getElementById('dock-toggle').checked = dockVisible;

    // Update position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.position === dockPosition);
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Handle position button clicks
 */
async function handlePositionChange(event) {
  const position = event.currentTarget.dataset.position;

  try {
    // Update UI immediately
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.classList.toggle('active', btn === event.currentTarget);
    });

    // Save to storage
    await chrome.storage.sync.set({ dockPosition: position });

    // Send message to active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'changePosition',
        position: position
      });
    }
  } catch (error) {
    console.error('Failed to change position:', error);
  }
}

/**
 * Handle dock toggle changes
 */
async function handleToggleChange(event) {
  const isVisible = event.target.checked;

  try {
    // Save to storage
    await chrome.storage.sync.set({ dockVisible: isVisible });

    // Send message to active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleDock'
      });
    }
  } catch (error) {
    console.error('Failed to toggle dock:', error);
  }
}
