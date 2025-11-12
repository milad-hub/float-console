import { sendMessageToActiveTab } from './utils/sendMessageToActiveTab.js';

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_dock') {
    try {
      await sendMessageToActiveTab({ action: 'toggleDock' });
    } catch (error) {
      console.warn('Failed to toggle dock:', error);
    }
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await chrome.storage.sync.set({
        dockVisible: false,
        dockPosition: 'bottom-right'
      });
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
    }
  }
});
