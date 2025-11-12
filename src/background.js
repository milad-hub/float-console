// FloatConsole Background Script
// Service worker for handling keyboard shortcuts and extension lifecycle

import { sendMessageToActiveTab } from './utils/sendMessageToActiveTab.js';

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_dock') {
    // Toggle the FloatConsole dock
    sendMessageToActiveTab({ action: 'toggleDock' });
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FloatConsole extension installed');
    // Initialize default settings
    chrome.storage.sync.set({
      dockVisible: false,
      dockPosition: 'bottom-right'
    });
  }
});
