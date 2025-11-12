// FloatConsole Logger Injection Script
// IIFE that intercepts browser console methods and posts messages to parent window

(function() {
  'use strict';

  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  // Error handling
  const originalOnError = window.onerror;
  const originalOnUnhandledRejection = window.onunhandledrejection;

  // Helper function to safely serialize objects
  function safeStringify(obj) {
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'function') {
          return '[Function]';
        }
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        return value;
      });
    } catch (e) {
      return '[Circular or Non-Serializable Object]';
    }
  }

  // Override console methods
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    console[method] = function(...args) {
      // Call original method
      originalConsole[method].apply(console, args);

      // Send message to content script
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          return safeStringify(arg);
        }
        return String(arg);
      }).join(' ');

      window.postMessage({
        type: 'FC_CONSOLE_LOG',
        data: {
          type: method,
          message: message,
          timestamp: Date.now()
        }
      }, '*');
    };
  });

  // Handle JavaScript errors
  window.onerror = function(message, source, lineno, colno, error) {
    // Call original error handler if it exists
    if (originalOnError) {
      originalOnError.apply(window, arguments);
    }

    // Send error message
    window.postMessage({
      type: 'FC_CONSOLE_LOG',
      data: {
        type: 'error',
        message: `${message} at ${source}:${lineno}:${colno}`,
        timestamp: Date.now()
      }
    }, '*');

    // Return false to prevent default error handling
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = function(event) {
    // Call original handler if it exists
    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection.apply(window, arguments);
    }

    // Send rejection message
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);

    window.postMessage({
      type: 'FC_CONSOLE_LOG',
      data: {
        type: 'error',
        message: `Unhandled Promise Rejection: ${message}`,
        timestamp: Date.now()
      }
    }, '*');
  };

  console.log('FloatConsole logger injected successfully');
})();
