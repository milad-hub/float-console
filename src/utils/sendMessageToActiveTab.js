export async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      throw new Error('Cannot send message to system pages');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, message);
      return response;
    } catch (error) {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
          throw new Error('Content script not loaded. Please refresh the page.');
        }
        throw new Error(chrome.runtime.lastError.message);
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to send message to active tab:', error.message);
    throw error;
  }
}
