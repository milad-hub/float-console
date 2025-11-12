(function() {
  'use strict';

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

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
        return JSON.stringify({
          name: obj.name,
          message: obj.message,
          stack: obj.stack
        });
      }
      if (Array.isArray(obj)) {
        return '[' + obj.map(item => safeStringify(item, depth + 1)).join(', ') + ']';
      }
      if (typeof obj === 'object') {
        const keys = Object.keys(obj).slice(0, 50);
        const pairs = keys.map(key => {
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
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return safeStringify(arg);
      }
      return String(arg);
    }).join(' ');
  }

  function postLog(type, message) {
    try {
      window.postMessage({
        type: 'FC_CONSOLE_LOG',
        data: {
          type: type,
          message: message,
          timestamp: Date.now()
        }
      }, '*');
    } catch (e) {
      originalConsole.error('Float Console: Failed to post log message', e);
    }
  }

  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    console[method] = function(...args) {
      originalConsole[method].apply(console, args);
      const message = formatMessage(args);
      postLog(method, message);
    };
  });

  window.onerror = function(message, source, lineno, colno, error) {
    if (window.__FC_ORIGINAL_ONERROR) {
      window.__FC_ORIGINAL_ONERROR.apply(window, arguments);
    }

    const errorMessage = error && error.stack 
      ? `${error.name}: ${error.message}\n${error.stack}`
      : `${message} at ${source}:${lineno}:${colno}`;

    postLog('error', errorMessage);
    return false;
  };

  window.onunhandledrejection = function(event) {
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
    if (event.target && event.target !== window) {
      const target = event.target;
      const tagName = target.tagName || 'Unknown';
      const src = target.src || target.href || 'unknown source';
      
      postLog('error', `Resource Error: ${tagName} failed to load\nSource: ${src}`);
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
