let dockToggle = null;
let positionButtons = null;

function waitForChromeAPI() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      resolve();
    } else {
      setTimeout(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          resolve();
        } else {
          resolve();
        }
      }, 100);
    }
  });
}

let hoverToggle = null;

document.addEventListener('DOMContentLoaded', async () => {
  await waitForChromeAPI();

  positionButtons = document.querySelectorAll('.position-btn');
  dockToggle = document.getElementById('dock-toggle');
  hoverToggle = document.getElementById('hover-toggle');

  if (!dockToggle || !hoverToggle) {
    console.error('Required elements not found');
    showError('Failed to initialize popup. Please reload the extension.');
    return;
  }

  if (positionButtons.length === 0) {
    console.warn('No position buttons found');
  }

  try {
    await loadSettings();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    const errorMessage = error.message || 'Unknown error';
    console.error('Error details:', errorMessage);
    showError(`Failed to load settings: ${errorMessage}`);
  }

  positionButtons.forEach(button => {
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
});

async function loadSettings() {
  if (!dockToggle || !hoverToggle) {
    throw new Error('Required elements not found');
  }

  try {
    if (!chrome.storage || !chrome.storage.sync) {
      throw new Error('Chrome storage API not available');
    }

    const result = await chrome.storage.sync.get(['dockVisible', 'dockPosition', 'hoverToShow']);
    const dockVisible = result.dockVisible ?? false;
    const dockPosition = result.dockPosition ?? 'bottom-right';
    const hoverToShow = result.hoverToShow ?? false;

    dockToggle.checked = dockVisible;
    hoverToggle.checked = hoverToShow;

    const buttons = document.querySelectorAll('.position-btn');
    if (buttons.length === 0) {
      console.warn('No position buttons found');
    }

    buttons.forEach(btn => {
      const isActive = btn.dataset.position === dockPosition;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    if (chrome.runtime?.lastError) {
      console.error('Chrome runtime error:', chrome.runtime.lastError.message);
      throw new Error(`Chrome API error: ${chrome.runtime.lastError.message}`);
    }
    throw error;
  }
}

async function handlePositionChange(event) {
  const button = event.currentTarget;
  const position = button.dataset.position;

  if (button.classList.contains('active')) {
    return;
  }

  try {
    document.querySelectorAll('.position-btn').forEach(btn => {
      const isActive = btn === button;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    await chrome.storage.sync.set({ dockPosition: position });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'changePosition',
          position: position
        });
      } catch (error) {
        if (chrome.runtime.lastError) {
          console.warn('Content script not ready:', chrome.runtime.lastError.message);
        }
      }
    }
  } catch (error) {
    console.error('Failed to change position:', error);
    showError('Failed to update position. Please try again.');
    await loadSettings();
  }
}

async function handleToggleChange(event) {
  const isVisible = event.target.checked;

  try {
    await chrome.storage.sync.set({ dockVisible: isVisible });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'updateVisibility',
          visible: isVisible
        });
      } catch (error) {
        if (chrome.runtime.lastError) {
          console.warn('Content script not ready:', chrome.runtime.lastError.message);
        }
      }
    }
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

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'updateHoverSetting',
          hoverToShow: hoverToShow
        });
      } catch (error) {
        if (chrome.runtime.lastError) {
          console.warn('Content script not ready:', chrome.runtime.lastError.message);
        }
      }
    }
  } catch (error) {
    console.error('Failed to update hover setting:', error);
    showError('Failed to update hover setting. Please try again.');
    event.target.checked = !hoverToShow;
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 68, 68, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 10000;
    animation: slideDown 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;

  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}
