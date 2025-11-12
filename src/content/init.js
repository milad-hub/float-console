// FloatConsole Content Script
// Main initialization file that will contain all the core classes

// Placeholder for Phase 3 implementation
// This file will contain: Logger, Renderer, ResizeHandler, ConsoleDock, Draggable, DockManager classes

class DockManager {
  constructor() {
    this.isVisible = false;
    this.position = 'bottom-right';

    this.init();
  }

  async init() {
    await this.loadState();

    if (this.isVisible) {
      this.createButton();
    }

    // Listen for messages from extension
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'toggleDock':
        this.toggle();
        break;
      case 'changePosition':
        this.updatePosition(message.position);
        break;
    }
    sendResponse({ status: 'ok' });
  }

  async loadState() {
    try {
      const { dockVisible = false, dockPosition = 'bottom-right' } = await chrome.storage.sync.get(['dockVisible', 'dockPosition']);
      this.isVisible = dockVisible;
      this.position = dockPosition;
    } catch (error) {
      console.warn('Failed to load dock state:', error);
    }
  }

  createButton() {
    // Create shadow DOM host
    const host = document.createElement('div');
    host.id = 'fc-dock-shadow-host';
    document.body.appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });

    // Create floating button
    const button = document.createElement('button');
    button.id = 'fc-dock-button';
    button.className = `fc-dock-button ${this.position}`;
    button.title = 'FloatConsole';

    // Create icon
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('icons/icon32.png');
    icon.alt = 'FloatConsole';

    button.appendChild(icon);
    shadowRoot.appendChild(button);

    // Add basic styling
    const style = document.createElement('style');
    style.textContent = `
      .fc-dock-button {
        position: fixed;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .fc-dock-button.bottom-left { bottom: 20px; left: 20px; }
      .fc-dock-button.bottom-right { bottom: 20px; right: 20px; }
      .fc-dock-button.top-left { top: 20px; left: 20px; }
      .fc-dock-button.top-right { top: 20px; right: 20px; }
      .fc-dock-button img { width: 24px; height: 24px; }
    `;
    shadowRoot.appendChild(style);

    // Add click handler
    button.addEventListener('click', () => {
      console.log('FloatConsole button clicked - full implementation in Phase 3');
    });

    console.log('FloatConsole button created');
  }

  toggle() {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.show();
    } else {
      this.hide();
    }
    this.saveState();
  }

  show() {
    console.log('Showing FloatConsole - full implementation in Phase 3');
  }

  hide() {
    console.log('Hiding FloatConsole - full implementation in Phase 3');
  }

  updatePosition(position) {
    this.position = position;
    console.log('Position updated to:', position);
  }

  async saveState() {
    try {
      await chrome.storage.sync.set({
        dockVisible: this.isVisible,
        dockPosition: this.position
      });
    } catch (error) {
      console.warn('Failed to save dock state:', error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DockManager());
} else {
  new DockManager();
}
