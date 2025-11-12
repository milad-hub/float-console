(function() {
  'use strict';

  if (!window.__FC_ORIGINAL_CONSOLE) {
    return;
  }

  const originalConsole = window.__FC_ORIGINAL_CONSOLE;

  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    if (originalConsole[method]) {
      console[method] = originalConsole[method];
    }
  });

  if (window.__FC_ORIGINAL_ONERROR) {
    window.onerror = window.__FC_ORIGINAL_ONERROR;
  }

  if (window.__FC_ORIGINAL_ONUNHANDLEDREJECTION) {
    window.onunhandledrejection = window.__FC_ORIGINAL_ONUNHANDLEDREJECTION;
  }

  const errorListeners = window.__FC_ERROR_LISTENERS || [];
  errorListeners.forEach(({ element, handler }) => {
    if (element && element.removeEventListener) {
      element.removeEventListener('error', handler, true);
    }
  });

  delete window.__FC_ORIGINAL_CONSOLE;
  delete window.__FC_ORIGINAL_ONERROR;
  delete window.__FC_ORIGINAL_ONUNHANDLEDREJECTION;
  delete window.__FC_ERROR_LISTENERS;
  delete window.__FC_LOGGER_INJECTED;
})();
