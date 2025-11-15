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
      if (event.source !== window) return;
      if (!event.data || event.data.type !== 'FC_CONSOLE_LOG') return;
      if (!event.data.data || typeof event.data.data !== 'object') return;

      const { type, message, timestamp, groupDepth, inGroup, isGroupStart, collapsed } =
        event.data.data;

      const validTypes = ['log', 'warn', 'error', 'info', 'debug', 'group', 'groupEnd'];
      if (!validTypes.includes(type)) return;

      if (typeof timestamp !== 'number' || timestamp < 0 || timestamp > Date.now() + 1000) {
        return;
      }

      this.addLog(type, message, new Date(timestamp), {
        groupDepth,
        inGroup,
        isGroupStart,
        collapsed,
      });
    };

    window.addEventListener('message', this.messageListener);
  }

  addLog(type, message, timestamp, metadata = {}) {
    const MAX_LOGS = 10000;
    if (this.logs.length >= MAX_LOGS) {
      const removeCount = Math.floor(MAX_LOGS * 0.1);
      this.logs.splice(0, removeCount);
    }

    let processedMessage = message;

    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.parts)) {
        processedMessage = parsed;
      }
    } catch (e) {
      console.error('Float Console: Failed to process log message:', e);
    }

    const logEntry = {
      type,
      message: processedMessage,
      timestamp,
      groupDepth: metadata.groupDepth || 0,
      inGroup: metadata.inGroup || false,
      isGroupStart: metadata.isGroupStart || false,
      collapsed: metadata.collapsed || false,
      pinned: false,
      id: Date.now() + Math.random(),
    };
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

  deleteLog(id) {
    this.logs = this.logs.filter((log) => {
      if (log.id === id) return false;
      if (String(log.id) === String(id)) return false;
      const logIdNum = typeof log.id === 'number' ? log.id : parseFloat(log.id);
      const idNum = typeof id === 'number' ? id : parseFloat(id);
      if (!isNaN(logIdNum) && !isNaN(idNum) && logIdNum === idNum) return false;
      return true;
    });
  }

  togglePin(id) {
    const log = this.logs.find((log) => {
      if (log.id === id) return true;
      if (String(log.id) === String(id)) return true;
      const logIdNum = typeof log.id === 'number' ? log.id : parseFloat(log.id);
      const idNum = typeof id === 'number' ? id : parseFloat(id);
      return !isNaN(logIdNum) && !isNaN(idNum) && logIdNum === idNum;
    });
    if (log) {
      log.pinned = !log.pinned;
    }
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
          <button class="fc-copy" aria-label="Copy all logs" title="Copy all logs to clipboard">Copy</button>
          <div class="fc-log-type-filter-wrapper">
            <button class="fc-log-type-filter-btn" aria-label="Filter log types" title="Filter log types">Types</button>
            <div class="fc-log-type-dropdown fc-dropdown-hidden">
              <label class="fc-log-type-item">
                <input type="checkbox" value="log" checked />
                <span>Log</span>
              </label>
              <label class="fc-log-type-item">
                <input type="checkbox" value="info" checked />
                <span>Info</span>
              </label>
              <label class="fc-log-type-item">
                <input type="checkbox" value="warn" checked />
                <span>Warning</span>
              </label>
              <label class="fc-log-type-item">
                <input type="checkbox" value="error" checked />
                <span>Error</span>
              </label>
              <label class="fc-log-type-item">
                <input type="checkbox" value="debug" checked />
                <span>Debug</span>
              </label>
              <label class="fc-log-type-item">
                <input type="checkbox" value="group" checked />
                <span>Group</span>
              </label>
            </div>
          </div>
          <button class="fc-filter" aria-label="Filter logs" title="Filter logs">Filter</button>
          <button class="fc-clear" aria-label="Clear logs" title="Clear logs">Clear</button>
          <button class="fc-close" aria-label="Close console" title="Close console">×</button>
        </div>
      </div>
      <div class="fc-filter-row fc-filter-hidden">
        <div class="fc-filter-container">
          <svg class="fc-filter-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3H14M4 8H12M6 13H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input type="text" class="fc-filter-input" placeholder="Filter logs..." />
          <button class="fc-filter-clear" style="display: none;" aria-label="Clear filter" title="Clear filter">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="fc-console-body">
        <div class="fc-panel" data-panel="console"></div>
      </div>
      <div class="fc-resize-handle-vertical"></div>
      <div class="fc-resize-handle-horizontal"></div>
    `;
  }

  getCopyIcon() {
    return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 0H2.5C1.675 0 1 0.675 1 1.5V10.5H2.5V1.5H10.5V0ZM13.5 2.5H5.5C4.675 2.5 4 3.175 4 4V13.5C4 14.325 4.675 15 5.5 15H13.5C14.325 15 15 14.325 15 13.5V4C15 3.175 14.325 2.5 13.5 2.5ZM13.5 13.5H5.5V4H13.5V13.5Z" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>
    </svg>`;
  }

  getPinIcon() {
    return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
      <path d="M8 0C5.8 0 4 1.8 4 4C4 7 8 12 8 12C8 12 12 7 12 4C12 1.8 10.2 0 8 0ZM8 5.5C7.1 5.5 6.5 4.9 6.5 4C6.5 3.1 7.1 2.5 8 2.5C8.9 2.5 9.5 3.1 9.5 4C9.5 4.9 8.9 5.5 8 5.5Z" fill="currentColor"/>
    </svg>`;
  }

  getDeleteIcon() {
    return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3H10.5L10 2H6L5.5 3H4V4H12V3ZM5 5V13C5 13.55 5.45 14 6 14H10C10.55 14 11 13.55 11 13V5H5ZM7 6.5V12H6.5V6.5H7ZM9.5 6.5V12H9V6.5H9.5Z" fill="currentColor"/>
    </svg>`;
  }

  getCheckIcon() {
    return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 4L6 11.5L2.5 8L3.5 7L6 9.5L12.5 3L13.5 4Z" fill="currentColor"/>
    </svg>`;
  }

  getChevronUpIcon() {
    return `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7L6 4L9 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  getChevronDownIcon() {
    return `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  updateActiveTab(container, activeTab) {
    container.querySelectorAll('.fc-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === activeTab);
    });

    container.querySelectorAll('.fc-panel').forEach((panel) => {
      panel.style.display = panel.dataset.panel === activeTab ? 'block' : 'none';
    });
  }

  renderLogs(panel, logs, consoleDock = null) {
    if (logs.length === 0) {
      panel.innerHTML = '<p class="fc-empty">No logs yet</p>';
      return;
    }

    const renderer = this;
    const processedLogs = [];
    let i = 0;

    while (i < logs.length) {
      const log = logs[i];

      if (log.isGroupStart) {
        const groupLogs = [];
        const groupDepth = log.groupDepth || 0;
        const groupTimestamp = log.timestamp;
        const collapsed = log.collapsed || false;

        let groupLabel = '';
        try {
          if (typeof log.message === 'string') {
            const parsed = JSON.parse(log.message);
            if (parsed && Array.isArray(parsed.parts)) {
              groupLabel = parsed.parts.map((p) => p.text || '').join('');
            } else {
              groupLabel = log.message;
            }
          } else if (typeof log.message === 'object' && Array.isArray(log.message.parts)) {
            groupLabel = log.message.parts.map((p) => p.text || '').join('');
          } else {
            groupLabel = String(log.message);
          }
        } catch (e) {
          groupLabel = String(log.message);
        }

        i++;

        while (i < logs.length) {
          const nextLog = logs[i];
          if (nextLog.type === 'groupEnd' && (nextLog.groupDepth || 0) <= groupDepth) {
            i++;
            break;
          }
          if ((nextLog.groupDepth || 0) > groupDepth) {
            groupLogs.push(nextLog);
          }
          i++;
        }

        const groupLogEntry = {
          type: 'group',
          message: { groupLabel, groupLogs },
          timestamp: groupTimestamp,
          groupDepth: groupDepth,
          collapsed: collapsed,
          isGroupStart: true,
          pinned: log.pinned || false,
          id: log.id || Date.now() + Math.random(),
        };
        processedLogs.push(groupLogEntry);
      } else if (log.type !== 'groupEnd') {
        if (!log.id) {
          log.id = Date.now() + Math.random();
        }
        if (log.pinned === undefined) {
          log.pinned = false;
        }
        processedLogs.push(log);
        i++;
      } else {
        i++;
      }
    }

    const sortedLogs = [...processedLogs].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.timestamp - b.timestamp;
    });
    panel.innerHTML = sortedLogs
      .map((log, index) => {
        const indent = (log.groupDepth || 0) * 20;
        const isGroupStart = log.isGroupStart || false;
        const collapsed = log.collapsed || false;
        const logId = log.id || `log-${index}`;
        const isPinned = log.pinned || false;

        if (isGroupStart && log.message.groupLabel !== undefined) {
          // Render group as single entry
          const groupLabel = log.message.groupLabel;
          const groupLogs = log.message.groupLogs || [];

          const groupContent = groupLogs
            .map((groupLog) => {
              const logMessage = this.formatMessageWithStyles(groupLog.message);
              return `<div style="padding-left: 20px; margin-top: 4px; color: inherit;">${logMessage}</div>`;
            })
            .join('');

          return `
        <div class="fc-log fc-log-group ${log.pinned ? 'fc-log-pinned' : ''}" 
             style="margin-left: ${indent}px;"
             data-group-index="${index}"
             data-group-depth="${log.groupDepth || 0}"
             data-log-id="${logId}"
             data-pinned="${isPinned ? 'true' : 'false'}">
          <div class="fc-log-header">
            <span class="fc-log-time">${this.formatTime(log.timestamp)}</span>
            <div class="fc-log-actions">
              <button class="fc-log-action fc-log-copy" title="Copy log" data-log-id="${logId}">${this.getCopyIcon()}</button>
              <button class="fc-log-action fc-log-pin ${log.pinned ? 'pinned' : ''}" title="${log.pinned ? 'Unpin log' : 'Pin log'}" data-log-id="${logId}">${this.getPinIcon()}</button>
              <button class="fc-log-action fc-log-delete" title="Delete log" data-log-id="${logId}">${this.getDeleteIcon()}</button>
            </div>
          </div>
          <div class="fc-log-content fc-group-content-clickable">
            <span class="fc-log-message" id="log-${index}">
              <span class="fc-group-toggle" style="display: inline-block; margin-right: 6px;">${collapsed ? this.getChevronUpIcon() : this.getChevronDownIcon()}</span>
              <span style="display: inline;">${this.formatMessageWithStyles(groupLabel)}</span>
              <div class="fc-group-content" style="display: ${collapsed ? 'none' : 'block'}; margin-top: 6px;">
                ${groupContent}
              </div>
            </span>
          </div>
          <button class="fc-read-more" style="display: none;">${this.getChevronDownIcon()}</button>
        </div>
      `;
        } else {
          return `
        <div class="fc-log fc-log-${log.type} ${log.pinned ? 'fc-log-pinned' : ''}" 
             style="margin-left: ${indent}px;"
             data-group-index="${index}"
             data-log-id="${logId}"
             data-pinned="${isPinned ? 'true' : 'false'}">
          <div class="fc-log-header">
            <span class="fc-log-time">${this.formatTime(log.timestamp)}</span>
            <div class="fc-log-actions">
              <button class="fc-log-action fc-log-copy" title="Copy log" data-log-id="${logId}">${this.getCopyIcon()}</button>
              <button class="fc-log-action fc-log-pin ${log.pinned ? 'pinned' : ''}" title="${log.pinned ? 'Unpin log' : 'Pin log'}" data-log-id="${logId}">${this.getPinIcon()}</button>
              <button class="fc-log-action fc-log-delete" title="Delete log" data-log-id="${logId}">${this.getDeleteIcon()}</button>
            </div>
          </div>
          <div class="fc-log-content fc-read-more-clickable">
            <span class="fc-log-message" id="log-${index}">${this.formatMessageWithStyles(log.message)}</span>
          </div>
          <button class="fc-read-more" style="display: none;">${this.getChevronDownIcon()}</button>
        </div>
      `;
        }
      })
      .join('');

    panel.querySelectorAll('.fc-group-content-clickable').forEach((contentArea) => {
      const toggle = contentArea.querySelector('.fc-group-toggle');
      const logRow = contentArea.closest('.fc-log');
      const groupContent = logRow?.querySelector('.fc-group-content');

      if (toggle && groupContent) {
        const toggleGroup = (e) => {
          e.stopPropagation();
          const isCollapsed = groupContent.style.display === 'none';
          groupContent.style.display = isCollapsed ? 'block' : 'none';
          toggle.innerHTML = isCollapsed
            ? renderer.getChevronDownIcon()
            : renderer.getChevronUpIcon();
          logRow.classList.toggle('fc-group-collapsed', !isCollapsed);
        };

        contentArea.style.cursor = 'pointer';
        contentArea.addEventListener('click', toggleGroup);
      }
    });

    panel.querySelectorAll('.fc-log-delete').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const logId = button.dataset.logId;
        if (logId && consoleDock) {
          const id = parseFloat(logId) || logId;
          consoleDock.logger.deleteLog(id);
          consoleDock.renderConsoleLogs();
          consoleDock.updateLogCountBadge();
        }
      });
    });

    panel.querySelectorAll('.fc-log-pin').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const logId = button.dataset.logId;
        if (logId && consoleDock) {
          const id = parseFloat(logId) || logId;
          consoleDock.logger.togglePin(id);
          consoleDock.renderConsoleLogs();
        }
      });
    });

    panel.querySelectorAll('.fc-log-copy').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const logId = button.dataset.logId;
        if (logId && consoleDock) {
          const id = parseFloat(logId) || logId;
          const log = consoleDock.logger.getLogs().find((l) => l.id === id);
          if (log) {
            const formatLogText = (log) => {
              let text = '';
              try {
                if (typeof log.message === 'object' && log.message !== null) {
                  if (log.message.groupLabel !== undefined) {
                    const groupLabel = log.message.groupLabel;
                    const groupLogs = log.message.groupLogs || [];
                    text = `${groupLabel}\n${groupLogs.map((gl) => formatLogText(gl)).join('\n')}`;
                  } else if (Array.isArray(log.message.parts)) {
                    text = log.message.parts.map((p) => p.text || '').join('');
                  } else {
                    text = String(log.message);
                  }
                } else {
                  text = String(log.message);
                }
              } catch (e) {
                text = String(log.message);
              }
              return text;
            };

            const timestamp = (date) => {
              return date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
            };

            const time = timestamp(log.timestamp);
            const type = log.type.toUpperCase();
            const message = formatLogText(log);
            const logText = `[${time}] ${type}: ${message}`;

            navigator.clipboard
              .writeText(logText)
              .then(() => {
                const originalIcon = button.querySelector('svg')?.outerHTML || '';
                button.innerHTML = renderer.getCheckIcon();
                setTimeout(() => {
                  if (originalIcon) {
                    button.innerHTML = originalIcon;
                  }
                }, 1000);
              })
              .catch((err) => {
                console.error('Failed to copy log:', err);
              });
          }
        }
      });
    });

    panel.querySelectorAll('.fc-read-more-clickable').forEach((contentArea) => {
      const logRow = contentArea.parentElement;
      const button = logRow.querySelector('.fc-read-more');
      const message = contentArea.querySelector('.fc-log-message');

      if (message && message.scrollHeight > message.clientHeight) {
        button.style.display = 'flex';
        button.innerHTML = renderer.getChevronDownIcon();
        logRow.style.paddingBottom = '2px';

        const toggleExpand = (e) => {
          e.stopPropagation();
          message.classList.toggle('expanded');
          button.innerHTML = message.classList.contains('expanded')
            ? renderer.getChevronUpIcon()
            : renderer.getChevronDownIcon();
        };

        contentArea.style.cursor = 'pointer';
        contentArea.addEventListener('click', toggleExpand);
        button.style.cursor = 'pointer';
        button.addEventListener('click', toggleExpand);
      }
    });

    const pinnedLogs = panel.querySelectorAll('.fc-log-pinned');
    let cumulativeTop = 0;
    pinnedLogs.forEach((pinnedLog) => {
      pinnedLog.style.top = `${cumulativeTop}px`;
      cumulativeTop += pinnedLog.offsetHeight + 4;
    });

    panel.scrollTop = panel.scrollHeight;
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  escapeHtml(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML
      .replace(/\\n/g, '\n')
      .split('\n')
      .map((line, index) => {
        if (index === 0) return line;
        return `<span style="padding-left: 20px; display: block;">${line}</span>`;
      })
      .join('');
  }

  formatMessageWithStyles(message) {
    if (
      message &&
      typeof message === 'object' &&
      message.hasStyles !== undefined &&
      Array.isArray(message.parts)
    ) {
      return message.parts
        .map((part) => {
          const escaped = this.formatTextWithLineBreaks(part.text || '');
          if (part.style) {
            const escapedStyle = part.style.replace(/"/g, '&quot;');
            return `<span style="${escapedStyle}">${escaped}</span>`;
          }
          return escaped;
        })
        .join('');
    }

    if (typeof message !== 'string') {
      return this.formatTextWithLineBreaks(String(message));
    }

    return this.formatTextWithLineBreaks(message);
  }

  formatTextWithLineBreaks(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    const escaped = div.innerHTML.replace(/\\n/g, '\n');

    // Check if this contains a table (starts with "Table:" and contains box-drawing characters)
    const hasTable =
      escaped.startsWith('Table:') &&
      (escaped.includes('┌') ||
        escaped.includes('┐') ||
        escaped.includes('├') ||
        escaped.includes('┤') ||
        escaped.includes('└') ||
        escaped.includes('┘') ||
        escaped.includes('│') ||
        escaped.includes('┬') ||
        escaped.includes('┼') ||
        escaped.includes('┴'));

    if (hasTable) {
      const originalObjectIndex = escaped.indexOf('\n\nOriginal object:\n');

      if (originalObjectIndex !== -1) {
        const tablePart = escaped.substring(0, originalObjectIndex);
        const originalObjectPart = escaped.substring(
          originalObjectIndex + '\n\nOriginal object:\n'.length
        );

        const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
        const tableWithLinks = tablePart.replace(
          urlPattern,
          '<a href="$1" target="_blank" class="fc-log-link">$1</a>'
        );

        const originalWithLinks = originalObjectPart.replace(
          urlPattern,
          '<a href="$1" target="_blank" class="fc-log-link">$1</a>'
        );
        const formattedOriginal = originalWithLinks
          .split('\n')
          .map((line, index) => {
            if (index === 0) return line;
            return `<span style="padding-left: 20px; display: block;">${line}</span>`;
          })
          .join('');

        return `<pre class="fc-table-pre">${tableWithLinks}</pre><div style="margin-top: 8px;"><strong>Original object:</strong><br>${formattedOriginal}</div>`;
      } else {
        const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
        const withLinks = escaped.replace(
          urlPattern,
          '<a href="$1" target="_blank" class="fc-log-link">$1</a>'
        );
        return `<pre class="fc-table-pre">${withLinks}</pre>`;
      }
    }

    const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    const withLinks = escaped.replace(
      urlPattern,
      '<a href="$1" target="_blank" class="fc-log-link">$1</a>'
    );

    return withLinks
      .split('\n')
      .map((line, index) => {
        if (index === 0) return line;
        return `<span style="padding-left: 20px; display: block;">${line}</span>`;
      })
      .join('');
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
      startHeight: rect.height,
    };

    document.addEventListener('mousemove', this.boundVerticalMove);
    document.addEventListener('mouseup', this.boundEnd);
    this.container.classList.add('resizing');
  }

  onVerticalMove(event) {
    if (!this.state) return;

    let delta;
    if (this.position.startsWith('top')) {
      // Resizing from bottom edge
      delta = event.clientY - this.state.startY;
    } else {
      // Resizing from top edge
      delta = this.state.startY - event.clientY;
    }

    const newHeight = Math.max(
      200,
      Math.min(window.innerHeight * 0.8, this.state.startHeight + delta)
    );
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
      startWidth: rect.width,
    };

    document.addEventListener('mousemove', this.boundHorizontalMove);
    document.addEventListener('mouseup', this.boundEnd);
    this.container.classList.add('resizing');
  }

  onHorizontalMove(event) {
    if (!this.state) return;

    let delta;
    if (this.position.endsWith('left')) {
      delta = event.clientX - this.state.startX;
    } else {
      delta = this.state.startX - event.clientX;
    }

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
    this.darkMode = false;
    this.filterText = '';
    this.logFontFamily = "Consolas, 'Monaco', 'Courier New', monospace";
    this.logFontSize = 12;
    this.enabledLogTypes = ['log', 'info', 'warn', 'error', 'debug', 'group'];

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

    this.darkModeLoaded = this.loadDarkMode();
    this.fontSettingsLoaded = this.loadFontSettings();
    this.logTypesLoaded = this.loadLogTypes();
  }

  async loadDarkMode() {
    try {
      const { darkMode = false } = await chrome.storage.sync.get(['darkMode']);
      this.darkMode = darkMode;
      if (this.container) {
        this.updateDarkMode();
      }
      return darkMode;
    } catch (error) {
      console.warn('Failed to load dark mode setting:', error);
      return false;
    }
  }

  async loadFontSettings() {
    try {
      const { logFontFamily, logFontSize } = await chrome.storage.sync.get([
        'logFontFamily',
        'logFontSize',
      ]);
      if (logFontFamily) {
        this.logFontFamily = logFontFamily;
      }
      if (logFontSize) {
        this.logFontSize = parseInt(logFontSize) || 12;
      }
      if (this.container) {
        this.updateFontSettings();
      }
      return { fontFamily: this.logFontFamily, fontSize: this.logFontSize };
    } catch (error) {
      console.warn('Failed to load font settings:', error);
      return { fontFamily: this.logFontFamily, fontSize: this.logFontSize };
    }
  }

  async loadLogTypes() {
    try {
      const { logTypes } = await chrome.storage.sync.get(['logTypes']);
      if (logTypes && Array.isArray(logTypes) && logTypes.length > 0) {
        this.enabledLogTypes = logTypes;
      }
      if (this.container) {
        this.initializeLogTypeCheckboxes();
      }
      return this.enabledLogTypes;
    } catch (error) {
      console.warn('Failed to load log types:', error);
      return this.enabledLogTypes;
    }
  }

  updateDarkMode() {
    if (this.container) {
      if (this.darkMode) {
        this.container.classList.add('dark-mode');
      } else {
        this.container.classList.remove('dark-mode');
      }
      const existingStyle = this.shadowRoot.querySelector('style[data-console-styles]');
      if (existingStyle) {
        existingStyle.textContent = this.getConsoleStyles();
      } else if (this.shadowRoot) {
        const style = document.createElement('style');
        style.setAttribute('data-console-styles', 'true');
        style.textContent = this.getConsoleStyles();
        this.shadowRoot.appendChild(style);
      }
      if (this.isVisible) {
        requestAnimationFrame(() => {
          this.renderConsoleLogs();
        });
      }
    } else if (this.shadowRoot) {
      const existingStyle = this.shadowRoot.querySelector('style[data-console-styles]');
      if (existingStyle) {
        existingStyle.textContent = this.getConsoleStyles();
      }
    }
  }

  updateFontSettings() {
    if (this.shadowRoot) {
      const existingStyle = this.shadowRoot.querySelector('style[data-console-styles]');
      if (existingStyle) {
        existingStyle.textContent = this.getConsoleStyles();
      } else {
        const style = document.createElement('style');
        style.setAttribute('data-console-styles', 'true');
        style.textContent = this.getConsoleStyles();
        this.shadowRoot.appendChild(style);
      }
      if (this.isVisible) {
        requestAnimationFrame(() => {
          this.renderConsoleLogs();
        });
      }
    }
  }

  toggle() {
    this.isVisible ? this.hide() : this.show();
  }

  async show() {
    await this.darkModeLoaded;
    await this.fontSettingsLoaded;
    await this.logTypesLoaded;
    if (this.container) {
      this.container.style.display = 'flex';
      this.updateDarkMode();
      this.updateFontSettings();
      this.initializeLogTypeCheckboxes();
    } else {
      await this.createConsole();
    }
    this.isVisible = true;
    this.updateResizeHandles();
    this.renderConsoleLogs();
  }

  updateResizeHandles() {
    if (!this.container) return;

    const verticalHandle = this.container.querySelector('.fc-resize-handle-vertical');
    const horizontalHandle = this.container.querySelector('.fc-resize-handle-horizontal');

    if (verticalHandle && horizontalHandle) {
      verticalHandle.classList.remove('handle-top', 'handle-bottom');
      horizontalHandle.classList.remove('handle-left', 'handle-right');

      if (this.position.startsWith('top')) {
        verticalHandle.classList.add('handle-bottom');
      } else {
        verticalHandle.classList.add('handle-top');
      }

      if (this.position.endsWith('left')) {
        horizontalHandle.classList.add('handle-right');
      } else {
        horizontalHandle.classList.add('handle-left');
      }
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.add('fc-console-closing');
      setTimeout(() => {
        if (this.container) {
          this.container.style.display = 'none';
          this.container.classList.remove('fc-console-closing');
        }
      }, 250);
    }
    this.isVisible = false;
  }

  async createConsole() {
    await this.logTypesLoaded;
    this.container = document.createElement('div');
    this.container.className = `fc-console ${this.getPositionClass()} ${this.getHorizontalClass()}`;
    if (this.darkMode) {
      this.container.classList.add('dark-mode');
    }
    this.container.innerHTML = this.renderer.getTemplate();

    this.attachEventListeners();
    this.shadowRoot.appendChild(this.container);

    this.initializeLogTypeCheckboxes();

    const existingStyle = this.shadowRoot.querySelector('style[data-console-styles]');
    if (existingStyle) {
      existingStyle.textContent = this.getConsoleStyles();
    } else {
      const style = document.createElement('style');
      style.setAttribute('data-console-styles', 'true');
      style.textContent = this.getConsoleStyles();
      this.shadowRoot.appendChild(style);
    }
  }

  attachEventListeners() {
    if (!this.container) return;

    this.container.querySelectorAll('.fc-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    this.container.querySelector('.fc-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.container.querySelector('.fc-copy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyAllLogs();
    });
    this.container.querySelector('.fc-filter')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFilter();
    });
    this.container.querySelector('.fc-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearConsole();
    });

    const logTypeFilterBtn = this.container.querySelector('.fc-log-type-filter-btn');
    const logTypeDropdown = this.container.querySelector('.fc-log-type-dropdown');
    const logTypeCheckboxes = this.container.querySelectorAll(
      '.fc-log-type-item input[type="checkbox"]'
    );

    if (logTypeFilterBtn && logTypeDropdown) {
      logTypeFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = logTypeDropdown.classList.contains('fc-dropdown-hidden');
        if (isHidden) {
          logTypeDropdown.classList.remove('fc-dropdown-hidden');
        } else {
          logTypeDropdown.classList.add('fc-dropdown-hidden');
        }
      });

      logTypeCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', async (e) => {
          e.stopPropagation();
          await this.updateEnabledLogTypes();
          this.renderConsoleLogs();
        });
      });

      logTypeDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.addEventListener('click', (e) => {
        const path = e.composedPath ? e.composedPath() : [e.target];
        const isInsideDropdown = path.some(
          (el) =>
            el === logTypeFilterBtn ||
            el === logTypeDropdown ||
            (el.classList && el.classList.contains('fc-log-type-filter-wrapper'))
        );
        if (!isInsideDropdown && !logTypeDropdown.classList.contains('fc-dropdown-hidden')) {
          logTypeDropdown.classList.add('fc-dropdown-hidden');
        }
      });

      this.initializeLogTypeCheckboxes();
    }

    const filterInput = this.container.querySelector('.fc-filter-input');
    const filterClear = this.container.querySelector('.fc-filter-clear');

    if (filterInput) {
      filterInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      const updateClearButton = () => {
        if (filterClear) {
          filterClear.style.display = filterInput.value.trim() ? 'flex' : 'none';
        }
      };

      let filterTimeout;
      filterInput.addEventListener('input', (e) => {
        e.stopPropagation();
        this.filterText = e.target.value.toLowerCase().trim();
        updateClearButton();

        if (filterTimeout) {
          clearTimeout(filterTimeout);
        }

        filterTimeout = setTimeout(() => {
          this.renderConsoleLogs();
        }, 300);
      });

      updateClearButton();
    }

    if (filterClear) {
      filterClear.addEventListener('click', (e) => {
        e.stopPropagation();
        if (filterInput) {
          filterInput.value = '';
          this.filterText = '';
          filterClear.style.display = 'none';
          this.renderConsoleLogs();
          filterInput.focus();
        }
      });
    }

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

  toggleFilter() {
    if (!this.container) return;
    const filterRow = this.container.querySelector('.fc-filter-row');
    if (filterRow) {
      const isHidden = filterRow.classList.contains('fc-filter-hidden');

      if (isHidden) {
        filterRow.classList.remove('fc-filter-hidden');
        setTimeout(() => {
          const filterInput = this.container.querySelector('.fc-filter-input');
          if (filterInput) {
            filterInput.focus();
          }
        }, 150);
      } else {
        filterRow.classList.add('fc-filter-hidden');
        const hadActiveFilter = this.filterText.trim().length > 0;
        this.filterText = '';
        const filterInput = this.container.querySelector('.fc-filter-input');
        const filterClear = this.container.querySelector('.fc-filter-clear');
        if (filterInput) {
          filterInput.value = '';
        }
        if (filterClear) {
          filterClear.style.display = 'none';
        }
        if (hadActiveFilter) {
          this.renderConsoleLogs();
        }
      }
    }
  }

  initializeLogTypeCheckboxes() {
    const checkboxes = this.container.querySelectorAll('.fc-log-type-item input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = this.enabledLogTypes.includes(checkbox.value);
    });
  }

  async updateEnabledLogTypes() {
    const checkboxes = this.container.querySelectorAll('.fc-log-type-item input[type="checkbox"]');
    this.enabledLogTypes = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    try {
      await chrome.storage.sync.set({ logTypes: this.enabledLogTypes });
    } catch (error) {
      console.error('Float Console: Failed to save log types:', error);
    }
  }

  renderConsoleLogs() {
    if (!this.container) return;

    const panel = this.container.querySelector('[data-panel="console"]');
    if (panel) {
      let logs = this.logger.getLogs();

      // Apply log type filter first
      logs = this.filterLogsByType(logs);

      // Apply text filter if filter text exists
      if (this.filterText) {
        logs = this.filterLogs(logs);
      }

      this.renderer.renderLogs(panel, logs, this);
    }
  }

  filterLogsByType(logs) {
    if (!this.enabledLogTypes || this.enabledLogTypes.length === 0) {
      return logs;
    }

    const groupTypeEnabled = this.enabledLogTypes.includes('group');

    return logs.filter((log) => {
      if (log.isGroupStart) {
        return groupTypeEnabled;
      }

      if (log.type === 'groupEnd') {
        return groupTypeEnabled;
      }

      if ((log.groupDepth || 0) > 0 || log.inGroup) {
        return groupTypeEnabled;
      }

      return this.enabledLogTypes.includes(log.type);
    });
  }

  filterLogs(logs) {
    const filterText = this.filterText;
    if (!filterText) return logs;

    return logs.filter((log) => {
      const formatLogText = (log) => {
        let text = '';
        try {
          if (typeof log.message === 'object' && log.message !== null) {
            if (log.message.groupLabel !== undefined) {
              const groupLabel = log.message.groupLabel;
              const groupLogs = log.message.groupLogs || [];
              text = `${groupLabel} ${groupLogs.map((gl) => formatLogText(gl)).join(' ')}`;
            } else if (Array.isArray(log.message.parts)) {
              text = log.message.parts.map((p) => p.text || '').join('');
            } else {
              text = String(log.message);
            }
          } else {
            text = String(log.message);
          }
        } catch (e) {
          text = String(log.message);
        }
        return text.toLowerCase();
      };

      const messageText = formatLogText(log);
      const typeText = log.type.toLowerCase();
      const timeText = log.timestamp
        .toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        .toLowerCase();

      return (
        messageText.includes(filterText) ||
        typeText.includes(filterText) ||
        timeText.includes(filterText)
      );
    });
  }

  clearConsole() {
    this.logger.clear();
    this.updateLogCountBadge();
    this.renderConsoleLogs();
  }

  copyAllLogs() {
    let logs = this.logger.getLogs();
    logs = this.filterLogsByType(logs);
    if (this.filterText) {
      logs = this.filterLogs(logs);
    }

    if (logs.length === 0) {
      return;
    }

    const formatLogText = (log) => {
      let text = '';
      try {
        if (typeof log.message === 'object' && log.message !== null) {
          if (log.message.groupLabel !== undefined) {
            const groupLabel = log.message.groupLabel;
            const groupLogs = log.message.groupLogs || [];
            text = `${groupLabel}\n${groupLogs
              .map((gl) => {
                return formatLogText(gl);
              })
              .join('\n')}`;
          } else if (Array.isArray(log.message.parts)) {
            text = log.message.parts.map((p) => p.text || '').join('');
          } else {
            text = String(log.message);
          }
        } else {
          text = String(log.message);
        }
      } catch (e) {
        text = String(log.message);
      }
      return text;
    };

    const timestamp = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    const logTexts = logs.map((log) => {
      const time = timestamp(log.timestamp);
      const type = log.type.toUpperCase();
      const message = formatLogText(log);
      return `[${time}] ${type}: ${message}`;
    });

    const allLogsText = logTexts.join('\n');

    navigator.clipboard
      .writeText(allLogsText)
      .then(() => {
        const copyButton = this.container.querySelector('.fc-copy');
        if (copyButton) {
          const originalText = copyButton.textContent;
          copyButton.textContent = 'Copied!';
          copyButton.style.color = '#10b981';
          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.color = '';
          }, 2000);
        }
      })
      .catch((err) => {
        console.error('Failed to copy logs:', err);
      });
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
      this.container.classList.remove(
        'position-top',
        'position-bottom',
        'position-left',
        'position-right'
      );
      this.container.classList.add(this.getPositionClass(), this.getHorizontalClass());
      this.updateResizeHandles();
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
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15),
                    0 0 0 1px rgba(0, 0, 0, 0.1) inset;
        display: flex;
        flex-direction: column;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #1a1a1a;
        overflow: hidden;
        animation: consoleSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity;
      }

      .fc-console.dark-mode {
        background: rgba(30, 30, 30, 0.95);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
                    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        color: #e0e0e0;
      }

      @keyframes consoleSlideIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      @keyframes consoleSlideOut {
        from {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        to {
          opacity: 0;
          transform: scale(0.95) translateY(-20px);
        }
      }

      .fc-console-closing {
        animation: consoleSlideOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
        pointer-events: none;
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
        background: rgba(245, 245, 245, 0.8);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px 12px 0 0;
      }

      .fc-console.dark-mode .fc-console-header {
        background: rgba(40, 40, 40, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .fc-tabs {
        display: flex;
        gap: 8px;
      }

      .fc-tab {
        padding: 8px 14px;
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }

      .fc-console.dark-mode .fc-tab {
        color: #999;
      }

      .fc-tab:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #1a1a1a;
        transform: translateY(-1px);
      }

      .fc-console.dark-mode .fc-tab:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }

      .fc-tab.active {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
      }

      .fc-console.dark-mode .fc-tab.active {
        background: rgba(59, 130, 246, 0.3);
        color: #60a5fa;
      }

      .fc-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60%;
        height: 2px;
        background: #3b82f6;
        border-radius: 2px;
      }

      .fc-console.dark-mode .fc-tab.active::after {
        background: #60a5fa;
      }

      .fc-header-actions {
        display: flex;
        gap: 8px;
      }

      .fc-log-type-filter-wrapper {
        position: relative;
      }

      .fc-log-type-filter-btn,
      .fc-copy,
      .fc-filter,
      .fc-clear,
      .fc-close {
        padding: 8px 14px;
        background: rgba(0, 0, 0, 0.05);
        border: none;
        color: #1a1a1a;
        cursor: pointer;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: visible;
      }

      .fc-console.dark-mode .fc-log-type-filter-btn,
      .fc-console.dark-mode .fc-copy,
      .fc-console.dark-mode .fc-filter,
      .fc-console.dark-mode .fc-clear,
      .fc-console.dark-mode .fc-close {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }


      .fc-log-type-filter-btn:hover,
      .fc-copy:hover,
      .fc-filter:hover,
      .fc-clear:hover,
      .fc-close:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .fc-console.dark-mode .fc-log-type-filter-btn:hover,
      .fc-console.dark-mode .fc-copy:hover,
      .fc-console.dark-mode .fc-filter:hover,
      .fc-console.dark-mode .fc-clear:hover,
      .fc-console.dark-mode .fc-close:hover {
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .fc-log-type-filter-btn:active,
      .fc-copy:active,
      .fc-filter:active,
      .fc-clear:active,
      .fc-close:active {
        transform: scale(0.95);
      }

      .fc-log-type-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        padding: 8px;
        min-width: 140px;
        z-index: 10002;
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: auto;
      }

      .fc-log-type-dropdown.fc-dropdown-hidden {
        opacity: 0;
        transform: translateY(-8px);
        pointer-events: none;
      }

      .fc-console.dark-mode .fc-log-type-dropdown {
        background: rgba(30, 30, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      }

      .fc-log-type-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s ease;
        user-select: none;
      }

      .fc-log-type-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .fc-console.dark-mode .fc-log-type-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .fc-log-type-item input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #3b82f6;
      }

      .fc-console.dark-mode .fc-log-type-item input[type="checkbox"] {
        accent-color: #60a5fa;
      }

      .fc-log-type-item span {
        font-size: 13px;
        color: #1a1a1a;
        flex: 1;
      }

      .fc-console.dark-mode .fc-log-type-item span {
        color: #e0e0e0;
      }

      .fc-filter-row {
        padding: 10px 12px;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.01));
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        border-top: 1px solid rgba(0, 0, 0, 0.05);
        overflow: hidden;
        max-height: 60px;
        opacity: 1;
        transform: translateY(0);
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .fc-filter-row.fc-filter-hidden {
        max-height: 0;
        opacity: 0;
        transform: translateY(-10px);
        padding-top: 0;
        padding-bottom: 0;
        border-bottom: none;
        border-top: none;
      }

      .fc-console.dark-mode .fc-filter-row {
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .fc-filter-container {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        padding: 8px 12px;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .fc-filter-container:focus-within {
        border-color: rgba(59, 130, 246, 0.6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 2px 6px rgba(0, 0, 0, 0.1);
        background: rgba(255, 255, 255, 1);
      }

      .fc-console.dark-mode .fc-filter-container {
        background: rgba(30, 30, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .fc-console.dark-mode .fc-filter-container:focus-within {
        border-color: rgba(59, 130, 246, 0.6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), 0 2px 6px rgba(0, 0, 0, 0.4);
        background: rgba(35, 35, 35, 1);
      }

      .fc-filter-icon {
        flex-shrink: 0;
        color: #666;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }

      .fc-filter-container:focus-within .fc-filter-icon {
        opacity: 1;
        color: rgba(59, 130, 246, 0.8);
      }

      .fc-console.dark-mode .fc-filter-icon {
        color: #999;
      }

      .fc-console.dark-mode .fc-filter-container:focus-within .fc-filter-icon {
        color: rgba(59, 130, 246, 0.9);
      }

      .fc-filter-input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 13px;
        font-family: inherit;
        color: #1a1a1a;
        outline: none;
        padding: 0;
        min-width: 0;
      }

      .fc-filter-input::placeholder {
        color: #999;
        opacity: 0.7;
      }

      .fc-console.dark-mode .fc-filter-input {
        color: #e0e0e0;
      }

      .fc-console.dark-mode .fc-filter-input::placeholder {
        color: #666;
        opacity: 0.8;
      }

      .fc-filter-clear {
        flex-shrink: 0;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        opacity: 0.6;
        transition: all 0.2s ease;
        border-radius: 4px;
        width: 22px;
        height: 22px;
      }

      .fc-filter-clear:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }

      .fc-filter-clear:active {
        transform: scale(0.9);
      }

      .fc-console.dark-mode .fc-filter-clear {
        color: #999;
      }

      .fc-console.dark-mode .fc-filter-clear:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }

      .fc-filter-clear svg {
        width: 14px;
        height: 14px;
        display: block;
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
        background: rgba(0, 0, 0, 0.05);
      }

      .fc-console.dark-mode .fc-panel::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      .fc-panel::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .fc-console.dark-mode .fc-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }

      .fc-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }

      .fc-console.dark-mode .fc-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .fc-empty {
        text-align: center;
        color: #999;
        padding: 40px 20px;
        font-style: italic;
      }

      .fc-console.dark-mode .fc-empty {
        color: #666;
      }

      .fc-log {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 12px;
        margin: 2px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        border-radius: 6px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        animation: logFadeIn 0.2s ease-out;
        will-change: background, transform;
        position: relative;
      }
      
      .fc-log-content {
        width: 100%;
      }

      .fc-console.dark-mode .fc-log {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      @keyframes logFadeIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .fc-log:hover {
        background: rgba(0, 0, 0, 0.03);
      }

      .fc-console.dark-mode .fc-log:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .fc-log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .fc-log-time {
        color: #999;
        font-size: 11px;
        white-space: nowrap;
        display: block;
      }

      .fc-console.dark-mode .fc-log-time {
        color: #666;
      }

      .fc-log-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .fc-log:hover .fc-log-actions {
        opacity: 1;
      }

      .fc-log-action {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        width: 22px;
        height: 22px;
        min-width: 22px;
        min-height: 22px;
        border-radius: 3px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
        color: #666;
        font-weight: normal;
        flex-shrink: 0;
      }

      .fc-log-action svg {
        width: 14px;
        height: 14px;
        display: block;
        flex-shrink: 0;
        margin: 0;
        vertical-align: middle;
      }

      .fc-log-action.fc-log-pin {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-top: 2px;
      }

      .fc-log-action.fc-log-pin svg {
        display: block;
        margin: 0 auto;
      }

      .fc-console.dark-mode .fc-log-action {
        color: #999;
      }

      .fc-log-action:hover {
        background: rgba(0, 0, 0, 0.1);
        color: #333;
      }

      .fc-console.dark-mode .fc-log-action:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
      }


      .fc-log-action.pinned {
        opacity: 1;
      }

      .fc-log-pinned {
        position: sticky;
        z-index: 10;
        background: rgba(255, 255, 255, 0.98);
        border-left: 2px solid rgba(59, 130, 246, 0.3);
        backdrop-filter: blur(8px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        margin-bottom: 4px;
      }

      .fc-console.dark-mode .fc-log-pinned {
        background: rgba(30, 30, 30, 0.98);
        border-left: 2px solid rgba(59, 130, 246, 0.5);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .fc-log-message {
        width: 100%;
        word-break: break-word;
        white-space: normal;
        max-height: 100px;
        overflow: hidden;
        transition: max-height 0.3s ease;
        font-family: ${this.logFontFamily};
        font-size: ${this.logFontSize}px;
        line-height: 1.5;
        display: block;
        min-width: 0;
      }

      .fc-log-message.expanded {
        max-height: none;
      }

      .fc-table-pre {
        margin: 0;
        padding: 0;
        font-family: ${this.logFontFamily};
        font-size: ${Math.max(8, this.logFontSize - 1)}px;
        line-height: 1.4;
        white-space: pre;
        overflow-x: auto;
        background: transparent;
        border: none;
        color: inherit;
        width: 100%;
        max-height: 300px;
        overflow-y: auto;
      }

      .fc-log-message.expanded .fc-table-pre {
        max-height: none;
      }


      .fc-group-content-clickable {
        user-select: none;
      }

      .fc-group-content-clickable:hover {
        opacity: 0.8;
      }

      .fc-group-toggle {
        user-select: none;
        color: #666;
        margin-right: 6px;
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        transition: opacity 0.2s ease;
      }

      .fc-group-toggle svg {
        width: 12px;
        height: 12px;
        display: block;
      }

      .fc-console.dark-mode .fc-group-toggle {
        color: #999;
      }

      .fc-group-collapsed {
        opacity: 0.7;
      }

      .fc-group-hidden {
        display: none !important;
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

      .fc-read-more-clickable {
        user-select: none;
      }

      .fc-read-more-clickable:hover {
        opacity: 0.8;
      }

      .fc-read-more {
        background: none;
        border: none;
        color: inherit;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        transition: opacity 0.2s ease;
        opacity: 0.7;
        height: 12px;
        line-height: 1;
      }

      .fc-read-more:hover {
        opacity: 1;
      }

      .fc-read-more svg {
        width: 10px;
        height: 10px;
        display: block;
      }

      .fc-console.dark-mode .fc-read-more {
        opacity: 0.8;
      }

      .fc-console.dark-mode .fc-read-more:hover {
        opacity: 1;
      }

      .fc-log-link {
        color: #2563eb;
        text-decoration: underline;
        cursor: pointer;
      }

      .fc-log-link:hover {
        color: #1d4ed8;
        text-decoration: none;
      }

      .fc-console.dark-mode .fc-log-link {
        color: #60a5fa;
      }

      .fc-console.dark-mode .fc-log-link:hover {
        color: #93c5fd;
      }

      .fc-resize-handle-vertical {
        position: absolute;
        left: 0;
        right: 0;
        height: 8px;
        cursor: ns-resize;
        background: transparent;
        z-index: 10;
      }

      .fc-resize-handle-vertical.handle-top {
        top: 0;
        bottom: auto;
      }

      .fc-resize-handle-vertical.handle-bottom {
        bottom: 0;
        top: auto;
      }

      .fc-resize-handle-horizontal {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: ew-resize;
        background: transparent;
        z-index: 10;
      }

      .fc-resize-handle-horizontal.handle-left {
        left: 0;
        right: auto;
      }

      .fc-resize-handle-horizontal.handle-right {
        right: 0;
        left: auto;
      }

      .fc-console.resizing {
        user-select: none;
      }

      .fc-resize-handle-vertical:hover,
      .fc-resize-handle-horizontal:hover {
        background: rgba(59, 130, 246, 0.2);
      }

      .fc-resize-handle-vertical:hover::after,
      .fc-resize-handle-horizontal:hover::after {
        content: '';
        position: absolute;
        background: rgba(59, 130, 246, 0.5);
      }

      .fc-resize-handle-vertical:hover::after {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 3px;
        border-radius: 2px;
      }

      .fc-resize-handle-horizontal:hover::after {
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        width: 3px;
        height: 40px;
        border-radius: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .fc-console,
        .fc-log,
        .fc-tab,
        .fc-copy,
        .fc-filter,
        .fc-clear,
        .fc-close,
        .fc-read-more {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
  }
}

class Draggable {
  constructor(element, onPositionChange) {
    this.element = element;
    this.onPositionChange = onPositionChange;
    this.isDragging = false;
    this.hasDragged = false;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
    this.animationFrameId = null;
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
  }

  onMouseDown(event) {
    if (event.target.closest('.fc-button-badge')) {
      return;
    }
    event.preventDefault();
    this.isDragging = true;
    this.hasDragged = false;

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
      bottom: 'auto',
      transition: 'none',
    });

    this.element.classList.add('dragging');

    document.addEventListener('mousemove', this.boundMouseMove, { passive: true });
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  onMouseMove(event) {
    if (!this.isDragging) return;

    const deltaX = Math.abs(event.clientX - this.startX);
    const deltaY = Math.abs(event.clientY - this.startY);

    if (deltaX > 5 || deltaY > 5) {
      this.hasDragged = true;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      const newLeft = this.initialLeft + (event.clientX - this.startX);
      const newTop = this.initialTop + (event.clientY - this.startY);

      this.element.style.left = `${newLeft}px`;
      this.element.style.top = `${newTop}px`;
    });
  }

  onMouseUp(event) {
    if (!this.isDragging) return;

    const wasDragging = this.hasDragged;
    this.isDragging = false;
    this.element.classList.remove('dragging');

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    if (wasDragging) {
      const newPosition = this.getNearestCorner(event.clientX, event.clientY);
      this.resetPositioning();
      this.onPositionChange(newPosition);
      event.preventDefault();
      event.stopPropagation();
      setTimeout(() => {
        this.hasDragged = false;
      }, 0);
    } else {
      this.hasDragged = false;
    }
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
    ['position', 'left', 'top', 'right', 'bottom'].forEach((prop) => {
      this.element.style[prop] = '';
    });
  }

  destroy() {
    this.element.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
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
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'toggleDock':
        this.handleToggleDock();
        break;
      case 'updateVisibility':
        this.updateVisibility(message.visible);
        break;
      case 'changePosition':
        this.updatePosition(message.position);
        break;
      case 'updateHoverSetting':
        this.hoverToShow = message.hoverToShow;
        this.updateHoverListeners();
        break;
      case 'updateDarkMode':
        if (this.console) {
          const wasDarkMode = this.console.darkMode;
          this.console.darkMode = message.darkMode;
          this.console.darkModeLoaded = Promise.resolve(message.darkMode);
          if (this.console.container) {
            if (
              wasDarkMode !== message.darkMode ||
              this.console.container.classList.contains('dark-mode') !== message.darkMode
            ) {
              requestAnimationFrame(() => {
                this.console.updateDarkMode();
              });
            }
          } else if (this.console.isVisible) {
            this.console.show();
          }
        }
        break;
      case 'updateFontSettings':
        if (this.console) {
          if (message.fontFamily) {
            this.console.logFontFamily = message.fontFamily;
          }
          if (message.fontSize) {
            this.console.logFontSize = parseInt(message.fontSize) || 12;
          }
          this.console.fontSettingsLoaded = Promise.resolve({
            fontFamily: this.console.logFontFamily,
            fontSize: this.console.logFontSize,
          });
          if (this.console.container || this.console.shadowRoot) {
            requestAnimationFrame(() => {
              this.console.updateFontSettings();
            });
          }
        }
        break;
      case 'updateLogTypes':
        if (this.console) {
          this.console.enabledLogTypes = message.logTypes || [
            'log',
            'info',
            'warn',
            'error',
            'debug',
            'group',
          ];
          if (this.console.isVisible) {
            this.console.renderConsoleLogs();
          }
        }
        break;
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  updateVisibility(visible) {
    this.isVisible = visible;
    if (visible) {
      if (!this.button) {
        this.createButton();
      }
      this.show();
    } else {
      this.hide();
    }
    this.saveState();
  }

  handleToggleDock() {
    if (!this.isVisible || !this.button) {
      this.isVisible = true;
      if (!this.button) {
        this.createButton();
      }
    }

    if (this.button) {
      this.handleButtonClick();
    } else {
      setTimeout(() => {
        if (!this.button) {
          this.createButton();
        }
        if (this.button) {
          this.handleButtonClick();
        }
      }, 100);
    }
  }

  async loadState() {
    try {
      const {
        dockVisible = false,
        dockPosition = 'bottom-right',
        hoverToShow = false,
      } = await chrome.storage.sync.get(['dockVisible', 'dockPosition', 'hoverToShow']);
      this.isVisible = dockVisible;
      this.position = dockPosition;
      this.hoverToShow = hoverToShow;
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
    this.button.title = 'Float Console';
    this.button.setAttribute('aria-label', 'Toggle Float Console');

    const icon = document.createElement('img');
    icon.className = 'fc-button-icon';
    icon.src = chrome.runtime.getURL('icons/icon32.png');
    icon.alt = 'Float Console';

    const badge = document.createElement('span');
    badge.className = 'fc-button-badge';

    this.button.appendChild(icon);
    this.button.appendChild(badge);

    this.button.addEventListener('click', (e) => {
      if (this.draggable && this.draggable.hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleButtonClick();
    });

    this.updateHoverListeners();

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
    if (this.draggable && this.draggable.hasDragged) {
      return;
    }
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
  }

  hide() {
    if (this.button) {
      this.button.style.display = 'none';
    }
    this.isVisible = false;
    this.console?.hide();
  }

  updateHoverListeners() {
    if (!this.button) return;

    const existingEnter = this.button._hoverEnterHandler;
    const existingLeave = this.button._hoverLeaveHandler;
    const existingClickOutside = document._fcClickOutsideHandler;

    if (existingEnter) {
      this.button.removeEventListener('mouseenter', existingEnter);
    }
    if (existingLeave) {
      this.button.removeEventListener('mouseleave', existingLeave);
    }
    if (existingClickOutside) {
      document.removeEventListener('click', existingClickOutside, true);
      document._fcClickOutsideHandler = null;
    }

    if (this.hoverToShow) {
      this.hoverTimeout = null;
      const enterHandler = () => {
        this.hoverTimeout = setTimeout(() => {
          if (this.console && !this.console.isVisible) {
            this.console.show();
          }
        }, 500);
      };
      const leaveHandler = () => {
        if (this.hoverTimeout) {
          clearTimeout(this.hoverTimeout);
          this.hoverTimeout = null;
        }
      };

      // Click outside handler - only when hover mode is active
      const clickOutsideHandler = (event) => {
        if (!this.hoverToShow || !this.console || !this.console.isVisible) {
          return;
        }

        const path = event.composedPath ? event.composedPath() : [event.target];
        const consoleContainer = this.console.container;
        const consoleShadowRoot = this.console.shadowRoot;

        if (consoleContainer || consoleShadowRoot) {
          for (const element of path) {
            if (element === consoleContainer) {
              return;
            }

            if (
              consoleContainer &&
              consoleContainer.contains &&
              consoleContainer.contains(element)
            ) {
              return;
            }

            if (
              consoleShadowRoot &&
              consoleShadowRoot.contains &&
              consoleShadowRoot.contains(element)
            ) {
              return;
            }

            if (element && element.classList) {
              const buttonClasses = [
                'fc-filter',
                'fc-copy',
                'fc-clear',
                'fc-close',
                'fc-filter-clear',
                'fc-log-type-filter-btn',
                'fc-log-type-dropdown',
                'fc-log-type-item',
              ];
              if (buttonClasses.some((cls) => element.classList.contains(cls))) {
                return;
              }
            }
          }
        }

        if (this.button) {
          for (const element of path) {
            if (element === this.button || (this.shadowRoot && this.shadowRoot.contains(element))) {
              return;
            }
          }
        }

        this.console.hide();
      };

      this.button._hoverEnterHandler = enterHandler;
      this.button._hoverLeaveHandler = leaveHandler;
      this.button.addEventListener('mouseenter', enterHandler);
      this.button.addEventListener('mouseleave', leaveHandler);

      document._fcClickOutsideHandler = clickOutsideHandler;
      document.addEventListener('click', clickOutsideHandler, true);
    }
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
        dockPosition: this.position,
      });
    } catch (error) {
      console.warn('Failed to save dock state:', error);
    }
  }

  destroy() {
    if (this.button) {
      this.button.removeEventListener('click', this.handleButtonClick.bind(this));
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
      }
      if (this.button._hoverEnterHandler) {
        this.button.removeEventListener('mouseenter', this.button._hoverEnterHandler);
      }
      if (this.button._hoverLeaveHandler) {
        this.button.removeEventListener('mouseleave', this.button._hoverLeaveHandler);
      }

      const existingClickOutside = document._fcClickOutsideHandler;
      if (existingClickOutside) {
        document.removeEventListener('click', existingClickOutside, true);
        document._fcClickOutsideHandler = null;
      }

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
        background: linear-gradient(135deg, rgba(5, 150, 105, 0.9) 0%, rgba(8, 145, 178, 0.9) 50%, rgba(37, 99, 235, 0.9) 100%);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .fc-dock-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(37, 99, 235, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2);
      }

      .fc-dock-button:active {
        transform: scale(0.95);
      }

      .fc-dock-button.dragging {
        cursor: grabbing;
        transform: scale(1.05);
        transition: none;
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
        width: 28px;
        height: 28px;
        pointer-events: none;
        user-select: none;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }

      .fc-button-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 20px;
        height: 20px;
        min-width: 20px;
        padding: 0;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        font-size: 10px;
        font-weight: 600;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(255, 68, 68, 0.4);
        animation: pulse 2s infinite;
        line-height: 1;
        overflow: hidden;
        text-overflow: ellipsis;
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
        outline: 2px solid rgba(37, 99, 235, 0.5);
        outline-offset: 2px;
      }
    `;
  }
}

let dockManagerInstance = null;

function getDockManager() {
  if (!dockManagerInstance) {
    dockManagerInstance = new DockManager();
  }
  return dockManagerInstance;
}

const SUPPORTED_ACTIONS = [
  'toggleDock',
  'updateVisibility',
  'changePosition',
  'updateHoverSetting',
  'updateDarkMode',
  'updateFontSettings',
  'updateLogTypes',
];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!SUPPORTED_ACTIONS.includes(message.action)) {
    return false;
  }

  try {
    const manager = getDockManager();
    if (manager?.handleMessage) {
      const result = manager.handleMessage(message, sender, sendResponse);
      if (result === true) {
        return true;
      }
      sendResponse({ status: 'ok' });
      return true;
    }
    sendResponse({ status: 'error', message: 'Manager not available' });
    return true;
  } catch (error) {
    console.error('Float Console: Error handling message:', error);
    sendResponse({ status: 'error', message: error.message });
    return true;
  }
});

getDockManager();
