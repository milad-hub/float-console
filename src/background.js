const COMMAND_NAME = 'toggle_dock';
const MAX_RETRIES = 5;
const RETRY_DELAY = 200;
const INJECT_DELAY = 200;

const DEFAULT_SETTINGS = {
  dockVisible: false,
  dockPosition: 'bottom-right',
  hoverToShow: false,
};

function isSystemPage(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://')
  );
}

async function sendMessageToTab(tabId, action, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action });
      if (response && response.status !== 'error') {
        return response;
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Failed to send message after retries');
}

async function handleToggleDock() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || isSystemPage(tab.url)) {
      return;
    }

    try {
      const response = await sendMessageToTab(tab.id, 'toggleDock');
      if (response && response.status !== 'error') {
        return;
      }
    } catch (error) {
      console.log('Float Console: Content script not ready, injecting...');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/init.js'],
      });
      await new Promise((resolve) => setTimeout(resolve, INJECT_DELAY));
      await sendMessageToTab(tab.id, 'toggleDock');
    } catch (error) {
      console.error('Float Console: Failed to inject script:', error);
    }
  } catch (error) {
    console.error('Float Console: Failed to toggle dock:', error);
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === COMMAND_NAME) {
    handleToggleDock();
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Float Console: Failed to initialize settings:', error);
    }
  }
});
