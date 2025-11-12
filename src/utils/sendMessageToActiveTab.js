// Messaging utility for cross-tab communication

/**
 * Send a message to the active tab
 * @param {Object} message - The message to send
 * @returns {Promise} - Resolves with the response or rejects on error
 */
export async function sendMessageToActiveTab(message) {
  try {
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Send message to the content script in the active tab
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response;
  } catch (error) {
    console.error('Failed to send message to active tab:', error);
    throw error;
  }
}
