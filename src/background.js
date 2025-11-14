import { sendMessageToActiveTab } from './utils/sendMessageToActiveTab.js';

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_dock') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.warn('No active tab found');
        return;
      }

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
        console.warn('Cannot toggle dock on system pages');
        return;
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleDock' });
        if (!response) {
          console.warn('No response from content script, retrying...');
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: 'toggleDock' });
            } catch (retryError) {
              console.error('Retry failed:', retryError);
            }
          }, 200);
        }
      } catch (error) {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          if (errorMsg.includes('Could not establish connection')) {
            console.warn('Content script not loaded. The page may need to be refreshed.');
          } else {
            console.error('Error sending message:', errorMsg);
          }
        } else {
          console.error('Failed to send message:', error);
        }
      }
    } catch (error) {
      console.error('Failed to toggle dock:', error);
    }
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await chrome.storage.sync.set({
        dockVisible: false,
        dockPosition: 'bottom-right',
        hoverToShow: false
      });
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
    }
  }
});
