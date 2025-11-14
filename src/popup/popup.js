const SELECTORS = {
  dockToggle: '#dock-toggle',
  hoverToggle: '#hover-toggle',
  darkModeToggle: '#dark-mode-toggle',
  positionButtons: '.position-btn',
  shortcutLink: '#shortcut-link',
  logFontFamily: '#log-font-family',
  logFontSize: '#log-font-size',
};

const SETTINGS_KEYS = {
  dockVisible: 'dockVisible',
  dockPosition: 'dockPosition',
  hoverToShow: 'hoverToShow',
  darkMode: 'darkMode',
  logFontFamily: 'logFontFamily',
  logFontSize: 'logFontSize',
};

const DEFAULT_POSITION = 'bottom-right';
const DEFAULT_FONT_FAMILY = "Consolas, 'Monaco', 'Courier New', monospace";
const DEFAULT_FONT_SIZE = 12;

let dockToggle,
  hoverToggle,
  darkModeToggle,
  positionButtons,
  shortcutLink,
  logFontFamily,
  logFontSize;

function isSystemPage(url) {
  if (!url) return true;
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://');
}

async function sendMessageToTab(action, data = {}) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || isSystemPage(tab.url)) {
      return;
    }
    await chrome.tabs.sendMessage(tab.id, { action, ...data });
  } catch (error) {
    console.error('Float Console: Failed to send message to tab:', error);
  }
}

function initElements() {
  dockToggle = document.querySelector(SELECTORS.dockToggle);
  hoverToggle = document.querySelector(SELECTORS.hoverToggle);
  darkModeToggle = document.querySelector(SELECTORS.darkModeToggle);
  positionButtons = document.querySelectorAll(SELECTORS.positionButtons);
  shortcutLink = document.querySelector(SELECTORS.shortcutLink);
  logFontFamily = document.querySelector(SELECTORS.logFontFamily);
  logFontSize = document.querySelector(SELECTORS.logFontSize);

  if (!dockToggle || !hoverToggle || !darkModeToggle || !logFontFamily || !logFontSize) {
    throw new Error('Required elements not found');
  }
}

function waitForChromeAPI() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      resolve();
    } else {
      setTimeout(resolve, 100);
    }
  });
}

async function loadSettings() {
  const result = await chrome.storage.sync.get(Object.values(SETTINGS_KEYS));

  dockToggle.checked = result.dockVisible ?? false;
  hoverToggle.checked = result.hoverToShow ?? false;
  darkModeToggle.checked = result.darkMode ?? false;

  applyDarkMode(result.darkMode ?? false);

  const position = result.dockPosition ?? DEFAULT_POSITION;
  positionButtons.forEach((btn) => {
    const isActive = btn.dataset.position === position;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });

  logFontFamily.value = result.logFontFamily ?? DEFAULT_FONT_FAMILY;
  logFontSize.value = result.logFontSize ?? DEFAULT_FONT_SIZE;
}

async function handlePositionChange(event) {
  const position = event.currentTarget.dataset.position;

  try {
    await chrome.storage.sync.set({ dockPosition: position });

    positionButtons.forEach((btn) => {
      const isActive = btn.dataset.position === position;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    await sendMessageToTab('changePosition', { position });
  } catch (error) {
    console.error('Failed to change position:', error);
    showError('Failed to change position. Please try again.');
  }
}

async function handleToggleChange(event) {
  const isVisible = event.target.checked;

  try {
    await chrome.storage.sync.set({ dockVisible: isVisible });
    await sendMessageToTab('updateVisibility', { visible: isVisible });
  } catch (error) {
    console.error('Failed to toggle dock:', error);
    showError('Failed to toggle console. Please try again.');
    event.target.checked = !isVisible;
  }
}

async function handleHoverToggleChange(event) {
  const hoverToShow = event.target.checked;

  try {
    await chrome.storage.sync.set({ hoverToShow });
    await sendMessageToTab('updateHoverSetting', { hoverToShow });
  } catch (error) {
    console.error('Failed to update hover setting:', error);
    showError('Failed to update hover setting. Please try again.');
    event.target.checked = !hoverToShow;
  }
}

async function handleDarkModeToggleChange(event) {
  const darkMode = event.target.checked;

  try {
    applyDarkMode(darkMode);
    await chrome.storage.sync.set({ darkMode });
    await sendMessageToTab('updateDarkMode', { darkMode });
  } catch (error) {
    console.error('Failed to update dark mode:', error);
    showError('Failed to update dark mode. Please try again.');
    event.target.checked = !darkMode;
    applyDarkMode(!darkMode);
  }
}

function applyDarkMode(enabled) {
  document.body.classList.toggle('dark-mode', enabled);
}

async function handleFontFamilyChange(event) {
  const fontFamily = event.target.value;

  try {
    await chrome.storage.sync.set({ logFontFamily: fontFamily });
    await sendMessageToTab('updateFontSettings', {
      fontFamily,
      fontSize: parseInt(logFontSize.value) || DEFAULT_FONT_SIZE,
    });
  } catch (error) {
    console.error('Failed to update font family:', error);
    showError('Failed to update font family. Please try again.');
  }
}

async function handleFontSizeChange(event) {
  const fontSize = parseInt(event.target.value) || DEFAULT_FONT_SIZE;

  const clampedSize = Math.max(8, Math.min(24, fontSize));
  if (clampedSize !== fontSize) {
    event.target.value = clampedSize;
  }

  try {
    await chrome.storage.sync.set({ logFontSize: clampedSize });
    await sendMessageToTab('updateFontSettings', {
      fontFamily: logFontFamily.value,
      fontSize: clampedSize,
    });
  } catch (error) {
    console.error('Failed to update font size:', error);
    showError('Failed to update font size. Please try again.');
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

function setupEventListeners() {
  positionButtons.forEach((button) => {
    button.addEventListener('click', handlePositionChange);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
  });

  dockToggle.addEventListener('change', handleToggleChange);
  dockToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dockToggle.checked = !dockToggle.checked;
      dockToggle.dispatchEvent(new Event('change'));
    }
  });

  hoverToggle.addEventListener('change', handleHoverToggleChange);
  hoverToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      hoverToggle.checked = !hoverToggle.checked;
      hoverToggle.dispatchEvent(new Event('change'));
    }
  });

  darkModeToggle.addEventListener('change', handleDarkModeToggleChange);
  darkModeToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      darkModeToggle.checked = !darkModeToggle.checked;
      darkModeToggle.dispatchEvent(new Event('change'));
    }
  });

  if (shortcutLink) {
    shortcutLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  logFontFamily.addEventListener('change', handleFontFamilyChange);
  logFontSize.addEventListener('input', handleFontSizeChange);
  logFontSize.addEventListener('blur', handleFontSizeChange);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await waitForChromeAPI();
    initElements();
    await loadSettings();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('Failed to initialize popup. Please reload the extension.');
  }
});
