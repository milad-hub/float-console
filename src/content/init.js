class Logger {
  constructor() {
    this.logs = [];
    this.onLogCallback = null;
    this.messageListener = null;
  }

  injectLogger() {
    if (window.__FC_LOGGER_INJECTED) return;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/logger.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
  }

  processLogs() {
    if (this.messageListener) return;

    this.messageListener = (event) => {
      if (event.source !== window || event.data.type !== 'FC_CONSOLE_LOG') return;

      const { type, message, timestamp } = event.data.data;
      this.addLog(type, message, new Date(timestamp));
    };

    window.addEventListener('message', this.messageListener);
  }

  addLog(type, message, timestamp) {
    const logEntry = { type, message, timestamp };
    this.logs.push(logEntry);
    this.onLogCallback?.(logEntry);
  }

  onLog(callback) {
    this.onLogCallback = callback;
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }

  cleanupLogger() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/cleanupLogger.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
  }

  destroy() {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.logs = [];
    this.onLogCallback = null;
    this.cleanupLogger();
  }
}

class Renderer {
  getTemplate() {
    return `
      <div class="fc-console-header">
        <div class="fc-tabs">
          <button class="fc-tab active" data-tab="console" aria-label="Console logs">Console</button>
        </div>
        <div class="fc-header-actions">
          <button class="fc-clear" aria-label="Clear logs" title="Clear logs">Clear</button>
          <button class="fc-close" aria-label="Close console" title="Close console">×</button>
        </div>
      </div>
      <div class="fc-console-body">
        <div class="fc-panel" data-panel="console"></div>
      </div>
      <div class="fc-resize-handle-vertical"></div>
      <div class="fc-resize-handle-horizontal"></div>
    `;
  }

  updateActiveTab(container, activeTab) {
    container.querySelectorAll('.fc-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === activeTab);
    });

    container.querySelectorAll('.fc-panel').forEach(panel => {
      panel.style.display = panel.dataset.panel === activeTab ? 'block' : 'none';
    });
  }

  renderLogs(panel, logs) {
    if (logs.length === 0) {
      panel.innerHTML = '<p class="fc-empty">No logs yet</p>';
      return;
    }

    panel.innerHTML = logs.map((log, index) => `
      <div class="fc-log fc-log-${log.type}">
        <span class="fc-log-time">${this.formatTime(log.timestamp)}</span>
        <span class="fc-log-message" id="log-${index}">${this.escapeHtml(log.message)}</span>
        <button class="fc-read-more" style="display: none;">Read more</button>
      </div>
    `).join('');

    panel.querySelectorAll('.fc-read-more').forEach((button, index) => {
      const message = button.previousElementSibling;
      if (message.scrollHeight > message.clientHeight) {
        button.style.display = 'inline-block';
        button.addEventListener('click', () => {
          message.classList.toggle('expanded');
          button.textContent = message.classList.contains('expanded') ? 'Read less' : 'Read more';
        });
      }
    });

    panel.scrollTop = panel.scrollHeight;
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

class ResizeHandler {
  constructor(position) {
    this.position = position;
    this.state = null;
    this.container = null;
    this.boundVerticalMove = this.onVerticalMove.bind(this);
    this.boundHorizontalMove = this.onHorizontalMove.bind(this);
    this.boundEnd = this.onEnd.bind(this);
  }

  attach(container) {
    this.container = container;
    const verticalHandle = container.querySelector('.fc-resize-handle-vertical');
    const horizontalHandle = container.querySelector('.fc-resize-handle-horizontal');

    verticalHandle?.addEventListener('mousedown', this.onVerticalStart.bind(this));
    horizontalHandle?.addEventListener('mousedown', this.onHorizontalStart.bind(this));
  }

  onVerticalStart(event) {
    if (!this.container) return;
    event.preventDefault();

    const rect = this.container.getBoundingClientRect();
    this.state = {
      element: this.container,
      startX: event.clientX,
      startY: event.clientY,
      startHeight: rect.height
    };

    document.addEventListener('mousemove', this.boundVerticalMove);
    document.addEventListener('mouseup', this.boundEnd);
    this.container.classList.add('resizing');
  }

  onVerticalMove(event) {
    if (!this.state) return;

    const delta = this.position.startsWith('top')
      ? event.clientY - this.state.startY
      : this.state.startY - event.clientY;

    const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, this.state.startHeight + delta));
    this.state.element.style.height = `${newHeight}px`;
  }

  onHorizontalStart(event) {
    if (!this.container) return;
    event.preventDefault();

    const rect = this.container.getBoundingClientRect();
    this.state = {
      element: this.container,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width
    };

    document.addEventListener('mousemove', this.boundHorizontalMove);
    document.addEventListener('mouseup', this.boundEnd);
    this.container.classList.add('resizing');
  }

  onHorizontalMove(event) {
    if (!this.state) return;

    const delta = this.position.endsWith('left')
      ? event.clientX - this.state.startX
      : this.state.startX - event.clientX;

    const newWidth = Math.max(400, Math.min(window.innerWidth - 40, this.state.startWidth + delta));
    this.state.element.style.width = `${newWidth}px`;
  }

  onEnd() {
    if (this.container) {
      this.container.classList.remove('resizing');
    }
    this.state = null;

    document.removeEventListener('mousemove', this.boundVerticalMove);
    document.removeEventListener('mousemove', this.boundHorizontalMove);
    document.removeEventListener('mouseup', this.boundEnd);
  }

  updatePosition(position) {
    this.position = position;
  }

  destroy() {
    this.onEnd();
    this.container = null;
  }
}

class ConsoleDock {
  constructor(position, shadowRoot, logCountBadge) {
    this.position = position;
    this.shadowRoot = shadowRoot;
    this.logCountBadge = logCountBadge;
    this.activeTab = 'console';
    this.isVisible = false;

    this.logger = new Logger();
    this.renderer = new Renderer();
    this.resizeHandler = new ResizeHandler(position);

    this.logger.injectLogger();
    this.logger.processLogs();

    this.logger.onLog(() => {
      if (this.isVisible && this.activeTab === 'console') {
        this.renderConsoleLogs();
      }
      this.updateLogCountBadge();
    });
  }

  toggle() {
    this.isVisible ? this.hide() : this.show();
  }

  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    } else {
      this.createConsole();
    }
    this.isVisible = true;
    this.renderConsoleLogs();
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.isVisible = false;
  }

  createConsole() {
    this.container = document.createElement('div');
    this.container.className = `fc-console ${this.getPositionClass()} ${this.getHorizontalClass()}`;
    this.container.innerHTML = this.renderer.getTemplate();

    this.attachEventListeners();
    this.shadowRoot.appendChild(this.container);

    const style = document.createElement('style');
    style.textContent = this.getConsoleStyles();
    this.shadowRoot.appendChild(style);
  }

  attachEventListeners() {
    if (!this.container) return;

    this.container.querySelectorAll('.fc-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    this.container.querySelector('.fc-close')?.addEventListener('click', () => this.hide());
    this.container.querySelector('.fc-clear')?.addEventListener('click', () => this.clearConsole());

    this.resizeHandler.attach(this.container);
  }

  switchTab(tabName) {
    if (!this.container) return;

    this.activeTab = tabName;
    this.renderer.updateActiveTab(this.container, tabName);

    if (tabName === 'console') {
      this.renderConsoleLogs();
    }
  }

  renderConsoleLogs() {
    if (!this.container) return;

    const panel = this.container.querySelector('[data-panel="console"]');
    if (panel) {
      this.renderer.renderLogs(panel, this.logger.getLogs());
    }
  }

  clearConsole() {
    this.logger.clear();
    this.updateLogCountBadge();
    this.renderConsoleLogs();
  }

  updateLogCountBadge() {
    const logs = this.logger.getLogs();
    if (this.logCountBadge) {
      this.logCountBadge.textContent = logs.length ? String(logs.length) : '';
      this.logCountBadge.style.display = logs.length ? 'flex' : 'none';
    }
  }

  getPositionClass() {
    return this.position.startsWith('top') ? 'position-top' : 'position-bottom';
  }

  getHorizontalClass() {
    return this.position.endsWith('left') ? 'position-left' : 'position-right';
  }

  updatePosition(position) {
    this.position = position;
    this.resizeHandler.updatePosition(position);

    if (this.container) {
      this.container.classList.remove('position-top', 'position-bottom', 'position-left', 'position-right');
      this.container.classList.add(this.getPositionClass(), this.getHorizontalClass());
    }
  }

  destroy() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.logger?.destroy();
    this.resizeHandler?.destroy();
  }

  getConsoleStyles() {
    return `
      .fc-console {
        position: fixed;
        width: 600px;
        height: 400px;
        background: rgba(30, 30, 30, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e0e0e0;
        overflow: hidden;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .fc-console.position-top {
        top: 20px;
      }

      .fc-console.position-bottom {
        bottom: 20px;
      }

      .fc-console.position-left {
        left: 20px;
      }

      .fc-console.position-right {
        right: 20px;
      }

      .fc-console-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(40, 40, 40, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px 12px 0 0;
      }

      .fc-tabs {
        display: flex;
        gap: 8px;
      }

      .fc-tab {
        padding: 6px 12px;
        background: transparent;
        border: none;
        color: #999;
        cursor: pointer;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .fc-tab:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }

      .fc-tab.active {
        background: rgba(102, 126, 234, 0.3);
        color: #667eea;
      }

      .fc-header-actions {
        display: flex;
        gap: 8px;
      }

      .fc-clear,
      .fc-close {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #e0e0e0;
        cursor: pointer;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .fc-clear:hover,
      .fc-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .fc-close {
        font-size: 20px;
        line-height: 1;
        padding: 0 8px;
      }

      .fc-console-body {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .fc-panel {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .fc-panel::-webkit-scrollbar {
        width: 8px;
      }

      .fc-panel::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      .fc-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .fc-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .fc-empty {
        text-align: center;
        color: #666;
        padding: 40px 20px;
        font-style: italic;
      }

      .fc-log {
        display: flex;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.2s ease;
      }

      .fc-log:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .fc-log-time {
        color: #666;
        font-size: 11px;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: 70px;
      }

      .fc-log-message {
        flex: 1;
        word-break: break-word;
        white-space: pre-wrap;
        max-height: 100px;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .fc-log-message.expanded {
        max-height: none;
      }

      .fc-log-error .fc-log-message {
        color: #ff6b6b;
      }

      .fc-log-warn .fc-log-message {
        color: #ffa726;
      }

      .fc-log-log .fc-log-message {
        color: #64b5f6;
      }

      .fc-log-info .fc-log-message {
        color: #4fc3f7;
      }

      .fc-log-debug .fc-log-message {
        color: #90a4ae;
      }

      .fc-read-more {
        background: rgba(102, 126, 234, 0.2);
        border: 1px solid rgba(102, 126, 234, 0.4);
        color: #667eea;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        margin-left: auto;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }

      .fc-read-more:hover {
        background: rgba(102, 126, 234, 0.3);
      }

      .fc-resize-handle-vertical {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        cursor: ns-resize;
        background: transparent;
      }

      .fc-resize-handle-horizontal {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        width: 4px;
        cursor: ew-resize;
        background: transparent;
      }

      .fc-console.position-left .fc-resize-handle-horizontal {
        left: 0;
        right: auto;
      }

      .fc-console.resizing {
        user-select: none;
      }
    `;
  }
}

class Draggable {
  constructor(element, onPositionChange) {
    this.element = element;
    this.onPositionChange = onPositionChange;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
  }

  onMouseDown(event) {
    event.preventDefault();
    this.isDragging = true;

    const rect = this.element.getBoundingClientRect();
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    Object.assign(this.element.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      right: 'auto',
      bottom: 'auto'
    });

    this.element.classList.add('dragging');

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  onMouseMove(event) {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    const newLeft = this.initialLeft + deltaX;
    const newTop = this.initialTop + deltaY;

    Object.assign(this.element.style, {
      left: `${newLeft}px`,
      top: `${newTop}px`
    });
  }

  onMouseUp(event) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('dragging');

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    const newPosition = this.getNearestCorner(event.clientX, event.clientY);
    this.resetPositioning();
    this.onPositionChange(newPosition);
  }

  getNearestCorner(mouseX, mouseY) {
    const { innerWidth, innerHeight } = window;
    const isLeft = mouseX < innerWidth / 2;
    const isTop = mouseY < innerHeight / 2;

    if (isTop && isLeft) return 'top-left';
    if (isTop) return 'top-right';
    if (isLeft) return 'bottom-left';
    return 'bottom-right';
  }

  resetPositioning() {
    ['position', 'left', 'top', 'right', 'bottom'].forEach(prop => {
      this.element.style[prop] = '';
    });
  }

  destroy() {
    this.element.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.isDragging = false;
    this.element.classList.remove('dragging');
    this.resetPositioning();
  }
}

class DockManager {
  constructor() {
    this.isVisible = false;
    this.position = 'bottom-right';
    this.shadowRoot = null;
    this.button = null;
    this.draggable = null;
    this.console = null;

    this.init();
  }

  async init() {
    await this.loadState();
    if (this.isVisible) {
      this.createButton();
    }

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
    return true;
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

  ensureShadowRoot() {
    if (this.shadowRoot) return;

    const host = document.createElement('div');
    host.id = 'fc-dock-shadow-host';
    document.body.appendChild(host);
    this.shadowRoot = host.attachShadow({ mode: 'open' });
  }

  createButton() {
    if (this.button) return;

    this.ensureShadowRoot();

    this.button = document.createElement('button');
    this.button.id = 'fc-dock-button';
    this.button.className = `fc-dock-button ${this.position}`;
    this.button.title = 'FloatConsole';
    this.button.setAttribute('aria-label', 'Toggle FloatConsole');

    const icon = document.createElement('div');
    icon.className = 'fc-button-icon';
    icon.innerHTML = 'C';

    const badge = document.createElement('span');
    badge.className = 'fc-button-badge';

    this.button.appendChild(icon);
    this.button.appendChild(badge);
    this.button.addEventListener('click', this.handleButtonClick.bind(this));

    this.shadowRoot.appendChild(this.button);

    const style = document.createElement('style');
    style.textContent = this.getButtonStyles();
    this.shadowRoot.appendChild(style);

    this.draggable = new Draggable(this.button, (newPosition) => {
      this.position = newPosition;
      this.updatePosition(newPosition);
      this.saveState();
    });

    this.console = new ConsoleDock(this.position, this.shadowRoot, badge);
  }

  handleButtonClick() {
    if (this.console) {
      this.console.toggle();
    }
  }

  toggle() {
    this.isVisible ? this.hide() : this.show();
  }

  show() {
    if (this.button) {
      this.button.style.display = 'flex';
    } else {
      this.createButton();
    }
    this.isVisible = true;
    this.saveState();
  }

  hide() {
    if (this.button) {
      this.button.style.display = 'none';
    }
    this.isVisible = false;
    this.console?.hide();
    this.saveState();
  }

  updatePosition(position) {
    this.position = position;

    if (this.button) {
      this.button.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
      this.button.classList.add(position);
    }

    if (this.console) {
      this.console.updatePosition(position);
    }
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

  destroy() {
    if (this.button) {
      this.button.removeEventListener('click', this.handleButtonClick.bind(this));
      this.button.remove();
      this.button = null;
    }

    this.draggable?.destroy();
    this.draggable = null;

    this.console?.destroy();
    this.console = null;

    if (this.shadowRoot) {
      const host = this.shadowRoot.host;
      host?.remove();
      this.shadowRoot = null;
    }
  }

  getButtonStyles() {
    return `
      .fc-dock-button {
        position: fixed;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .fc-dock-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2);
      }

      .fc-dock-button:active {
        transform: scale(0.95);
      }

      .fc-dock-button.dragging {
        cursor: grabbing;
        transform: scale(1.05);
      }

      .fc-dock-button.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .fc-dock-button.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .fc-dock-button.top-left {
        top: 20px;
        left: 20px;
      }

      .fc-dock-button.top-right {
        top: 20px;
        right: 20px;
      }

      .fc-button-icon {
        font-size: 24px;
        font-weight: 600;
        line-height: 1;
        pointer-events: none;
      }

      .fc-button-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        background: #ff4444;
        color: white;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(255, 68, 68, 0.4);
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      .fc-dock-button:focus {
        outline: 2px solid rgba(102, 126, 234, 0.5);
        outline-offset: 2px;
      }
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DockManager());
} else {
  new DockManager();
}