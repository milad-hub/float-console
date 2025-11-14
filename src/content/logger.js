(function () {
  'use strict';

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
    group: console.group,
    groupCollapsed: console.groupCollapsed,
    groupEnd: console.groupEnd,
  };

  let groupDepth = 0;
  const groupStack = [];

  window.__FC_ORIGINAL_CONSOLE = originalConsole;
  window.__FC_ORIGINAL_ONERROR = window.onerror;
  window.__FC_ORIGINAL_ONUNHANDLEDREJECTION = window.onunhandledrejection;

  function safeStringify(obj, depth = 0) {
    if (depth > 10) {
      return '[Max Depth Reached]';
    }

    try {
      if (obj === null) return 'null';
      if (obj === undefined) return 'undefined';
      if (typeof obj === 'function') return `[Function: ${obj.name || 'anonymous'}]`;
      if (typeof obj === 'symbol') return obj.toString();
      if (obj instanceof Date) return obj.toISOString();
      if (obj instanceof RegExp) return obj.toString();
      if (obj instanceof Error) {
        const errorObj = {
          name: obj.name,
          message: obj.message,
          stack: obj.stack,
        };
        return JSON.stringify(errorObj).replace(/\\n/g, '\n');
      }
      if (Array.isArray(obj)) {
        const items = obj.map((item) => safeStringify(item, depth + 1)).join(', ');
        return `(${obj.length}) [${items}]`;
      }
      if (typeof obj === 'object') {
        const keys = Object.keys(obj).slice(0, 50);
        const pairs = keys.map((key) => {
          try {
            return `"${key}": ${safeStringify(obj[key], depth + 1)}`;
          } catch (e) {
            return `"${key}": [Error serializing]`;
          }
        });
        return '{' + pairs.join(', ') + (Object.keys(obj).length > 50 ? '...' : '') + '}';
      }
      return JSON.stringify(obj);
    } catch (e) {
      return '[Circular or Non-Serializable Object]';
    }
  }

  function formatMessage(args) {
    if (args.length === 0) return JSON.stringify({ parts: [], hasStyles: false });

    const parts = [];
    let formatString = null;
    let styleArgIndex = 1;
    let consumedStyleArgs = new Set();

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'string' && arg.includes('%c')) {
        formatString = arg;
        break;
      }
    }

    if (formatString) {
      let currentIndex = 0;
      while (currentIndex < formatString.length) {
        const nextC = formatString.indexOf('%c', currentIndex);

        if (nextC === -1) {
          const remaining = formatString.substring(currentIndex);
          if (remaining) {
            parts.push({ text: remaining, style: null });
          }
          break;
        }

        if (nextC > currentIndex) {
          parts.push({ text: formatString.substring(currentIndex, nextC), style: null });
        }

        const textStart = nextC + 2;
        let textEnd = formatString.indexOf('%c', textStart);
        if (textEnd === -1) {
          textEnd = formatString.length;
        }

        const styledText = formatString.substring(textStart, textEnd);
        const styleArg = styleArgIndex < args.length ? args[styleArgIndex] : null;

        if (styledText) {
          if (styleArg && typeof styleArg === 'string') {
            const isStyleString =
              styleArg.includes('color:') ||
              styleArg.includes('font-') ||
              styleArg.includes('background') ||
              styleArg.includes('padding') ||
              styleArg.includes('margin') ||
              styleArg.includes('border') ||
              styleArg.includes('text-') ||
              styleArg.includes('display') ||
              styleArg.includes('width') ||
              styleArg.includes('height');
            if (isStyleString) {
              parts.push({ text: styledText, style: styleArg });
              consumedStyleArgs.add(styleArgIndex);
              styleArgIndex++;
            } else {
              parts.push({ text: styledText, style: null });
            }
          } else {
            parts.push({ text: styledText, style: null });
          }
        }

        currentIndex = textEnd;
      }

      for (let i = 0; i < args.length; i++) {
        if (consumedStyleArgs.has(i)) continue;
        if (i === 0 && formatString === args[i]) continue;

        const arg = args[i];
        let textToAdd = '';

        if (typeof arg === 'object' && arg !== null) {
          textToAdd = safeStringify(arg);
        } else if (typeof arg === 'string') {
          const isStyleString =
            arg.includes('color:') ||
            arg.includes('font-') ||
            arg.includes('background') ||
            arg.includes('padding') ||
            arg.includes('margin') ||
            arg.includes('border') ||
            arg.includes('text-') ||
            arg.includes('display') ||
            arg.includes('width') ||
            arg.includes('height');
          if (!isStyleString) {
            textToAdd = String(arg);
          } else {
            continue;
          }
        } else {
          textToAdd = String(arg);
        }

        if (parts.length > 0 && textToAdd) {
          const lastPart = parts[parts.length - 1];
          const lastText = lastPart.text || '';
          const startsWithBraceOrBracket =
            textToAdd.trim().startsWith('{') || textToAdd.trim().startsWith('[');
          const startsWithArrayCount = textToAdd.trim().match(/^\(\d+\)/);
          if (lastText.trim().endsWith(':') && (startsWithBraceOrBracket || startsWithArrayCount)) {
            parts.push({ text: ' ' + textToAdd, style: null });
          } else {
            parts.push({ text: textToAdd, style: null });
          }
        } else if (textToAdd) {
          parts.push({ text: textToAdd, style: null });
        }
      }

      if (parts.length > 0) {
        return JSON.stringify({ parts, hasStyles: parts.some((p) => p.style !== null) });
      }
    } else {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        let textToAdd = '';

        if (typeof arg === 'object' && arg !== null) {
          textToAdd = safeStringify(arg);
        } else {
          textToAdd = String(arg);
        }

        if (parts.length > 0 && textToAdd) {
          const lastPart = parts[parts.length - 1];
          const lastText = lastPart.text || '';
          const startsWithBraceOrBracket =
            textToAdd.trim().startsWith('{') || textToAdd.trim().startsWith('[');
          const startsWithArrayCount = textToAdd.trim().match(/^\(\d+\)/);
          if (lastText.trim().endsWith(':') && (startsWithBraceOrBracket || startsWithArrayCount)) {
            parts.push({ text: ' ' + textToAdd, style: null });
          } else {
            parts.push({ text: textToAdd, style: null });
          }
        } else if (textToAdd) {
          parts.push({ text: textToAdd, style: null });
        }
      }
    }

    return JSON.stringify({ parts, hasStyles: false });
  }

  function postLog(type, message, metadata = {}) {
    try {
      const messageData = {
        type: 'FC_CONSOLE_LOG',
        data: {
          type: type,
          message: message,
          timestamp: Date.now(),
          groupDepth: metadata.groupDepth || 0,
          inGroup: metadata.inGroup || false,
          isGroupStart: metadata.isGroupStart || false,
          collapsed: metadata.collapsed || false,
        },
      };

      window.postMessage(messageData, '*');
    } catch (e) {
      originalConsole.error('Float Console: Failed to post log message', e);
    }
  }

  ['log', 'warn', 'error', 'info', 'debug'].forEach((method) => {
    console[method] = function (...args) {
      originalConsole[method].apply(console, args);
      const message = formatMessage(args);
      postLog(method, message, { groupDepth, inGroup: groupDepth > 0 });
    };
  });

  console.group = function (...args) {
    originalConsole.group.apply(console, args);
    const label = args.length > 0 ? formatMessage(args) : 'Group';
    groupDepth++;
    groupStack.push({ label, collapsed: false });
    postLog('group', label, { groupDepth: groupDepth - 1, isGroupStart: true, collapsed: false });
  };

  console.groupCollapsed = function (...args) {
    originalConsole.groupCollapsed.apply(console, args);
    const label = args.length > 0 ? formatMessage(args) : 'Group';
    groupDepth++;
    groupStack.push({ label, collapsed: true });
    postLog('group', label, { groupDepth: groupDepth - 1, isGroupStart: true, collapsed: true });
  };

  console.groupEnd = function () {
    originalConsole.groupEnd.apply(console, arguments);
    if (groupDepth > 0) {
      groupDepth--;
      groupStack.pop();
      postLog('groupEnd', '', { groupDepth });
    }
  };

  console.table = function (...args) {
    originalConsole.table.apply(console, args);

    if (args.length === 0) {
      return;
    }

    try {
      const data = args[0];
      let tableMessage = '';

      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          const headers = Object.keys(firstItem);
          tableMessage = formatTableAsText(data, headers);
        } else {
          const headers = ['(index)', 'value'];
          const rows = data.map((item, idx) => ({ index: idx, value: item }));
          tableMessage = formatTableAsText(rows, headers);
        }
      } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const keys = Object.keys(data);
        const isArrayLike = keys.length > 0 && keys.every((key) => !isNaN(parseInt(key)));

        if (isArrayLike) {
          const headers = ['(index)', 'value'];
          const rows = keys.map((key) => ({ index: key, value: data[key] }));
          tableMessage = formatTableAsText(rows, headers);
        } else {
          const headers = ['(index)', 'key', 'value'];
          const rows = keys.map((key, idx) => ({ index: idx, key: key, value: data[key] }));
          tableMessage = formatTableAsText(rows, headers);
        }
      } else {
        tableMessage = formatMessage(args);
      }

      const originalObject = safeStringify(data);
      const fullMessage = tableMessage + '\n\nOriginal object:\n' + originalObject;

      postLog('log', fullMessage);
    } catch (e) {
      postLog('log', `Table: ${formatMessage(args)}`);
    }
  };

  function formatTableAsText(rows, headers) {
    if (!rows || rows.length === 0 || !headers || headers.length === 0) {
      return 'Table: Empty';
    }

    const maxRows = Math.min(rows.length, 100);

    const columnWidths = headers.map((header) => {
      let maxWidth = header.length;
      for (let i = 0; i < maxRows; i++) {
        const row = rows[i];
        const value = row && row[header] !== undefined ? String(row[header]) : '';
        maxWidth = Math.max(maxWidth, value.length);
      }
      return Math.min(Math.max(maxWidth, 8), 50);
    });

    let tableText = 'Table:\n';
    tableText += '┌' + columnWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐\n';

    const headerRow =
      '│ ' +
      headers
        .map((header, i) => {
          return header.padEnd(columnWidths[i]);
        })
        .join(' │ ') +
      ' │\n';
    tableText += headerRow;

    tableText += '├' + columnWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤\n';

    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];

      const rowText =
        '│ ' +
        headers
          .map((header, j) => {
            const value = row && row[header] !== undefined ? String(row[header]) : '';
            const truncated =
              value.length > columnWidths[j]
                ? value.substring(0, columnWidths[j] - 3) + '...'
                : value;
            return truncated.padEnd(columnWidths[j]);
          })
          .join(' │ ') +
        ' │';

      tableText += rowText + '\n';
    }

    tableText += '└' + columnWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘\n';

    if (rows.length > maxRows) {
      tableText += `... (${rows.length - maxRows} more rows)`;
    }

    return tableText;
  }

  window.onerror = function (message, source, lineno, colno, error) {
    if (window.__FC_ORIGINAL_ONERROR) {
      window.__FC_ORIGINAL_ONERROR.apply(window, arguments);
    }

    if (error && error.stack) {
      const errorMessage = `${error.name}: ${error.message}\n${error.stack}`;
      postLog('error', errorMessage);
    } else if (message && source) {
      const errorMessage = `${message} at ${source}:${lineno}:${colno}`;
      postLog('error', errorMessage);
    }

    return false;
  };

  window.onunhandledrejection = function (event) {
    if (window.__FC_ORIGINAL_ONUNHANDLEDREJECTION) {
      window.__FC_ORIGINAL_ONUNHANDLEDREJECTION.apply(window, arguments);
    }

    const reason = event.reason;
    let message = 'Unhandled Promise Rejection: ';

    if (reason instanceof Error) {
      message += `${reason.name}: ${reason.message}`;
      if (reason.stack) {
        message += `\n${reason.stack}`;
      }
    } else {
      message += String(reason);
    }

    postLog('error', message);
  };

  function handleResourceError(event) {
    if (event.error) {
      return;
    }

    if (event.target && event.target !== window && event.target !== document) {
      const target = event.target;
      const tagName = target.tagName || 'Unknown';
      const src = target.src || target.href || target.currentSrc || target.href || 'unknown source';

      if (tagName && tagName !== 'Unknown' && src && src !== 'unknown source') {
        postLog('error', `Resource Error: ${tagName} failed to load\nSource: ${src}`);
      }
    } else if (event.filename && !event.error) {
      const src = event.filename;
      const lineno = event.lineno || '?';
      const colno = event.colno || '?';
      postLog(
        'error',
        `Resource Error: Failed to load resource\nSource: ${src}:${lineno}:${colno}`
      );
    }
  }

  window.addEventListener('error', handleResourceError, true);

  if (!window.__FC_ERROR_LISTENERS) {
    window.__FC_ERROR_LISTENERS = [];
  }
  window.__FC_ERROR_LISTENERS.push({ element: window, handler: handleResourceError });

  if (window.console && !window.__FC_LOGGER_INJECTED) {
    window.__FC_LOGGER_INJECTED = true;
  }
})();
