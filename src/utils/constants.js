export const EXTENSION_NAME = 'Float Console';
export const EXTENSION_VERSION = '1.0.0';

export const MESSAGE_TYPES = {
  CONSOLE_LOG: 'FC_CONSOLE_LOG',
  CONSOLE_CLEANUP: 'FC_CONSOLE_CLEANUP',
};

export const LOG_TYPES = {
  LOG: 'log',
  WARN: 'warn',
  ERROR: 'error',
  INFO: 'info',
  DEBUG: 'debug',
  GROUP: 'group',
  GROUP_END: 'groupEnd',
};

export const DEFAULT_SETTINGS = {
  dockVisible: false,
  dockPosition: 'bottom-right',
  hoverToShow: false,
  darkMode: false,
  logFontFamily: "Consolas, 'Monaco', 'Courier New', monospace",
  logFontSize: 12,
};

export const POSITIONS = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
};

export const LIMITS = {
  MAX_STRINGIFY_DEPTH: 10,
  MAX_OBJECT_KEYS: 50,
  MAX_TABLE_ROWS: 100,
  MAX_COLUMN_WIDTH: 50,
  MIN_FONT_SIZE: 8,
  MAX_FONT_SIZE: 24,
  DEFAULT_FONT_SIZE: 12,
  LOG_RETENTION_LIMIT: 10000,
};

export const TIMING = {
  RETRY_DELAY: 200,
  INJECT_DELAY: 200,
  MAX_RETRIES: 5,
  ANIMATION_DURATION: 250,
  FILTER_DEBOUNCE: 300,
  COPY_FEEDBACK_DURATION: 1000,
  ERROR_DISPLAY_DURATION: 3000,
};

export const CSS_CLASSES = {
  CONSOLE: 'fc-console',
  CONSOLE_CLOSING: 'fc-console-closing',
  CONSOLE_HEADER: 'fc-console-header',
  CONSOLE_BODY: 'fc-console-body',
  LOG: 'fc-log',
  LOG_PINNED: 'fc-log-pinned',
  LOG_MESSAGE: 'fc-log-message',
  FILTER_ROW: 'fc-filter-row',
  FILTER_HIDDEN: 'fc-filter-hidden',
};

export const SELECTORS = {
  CONSOLE: '.fc-console',
  LOG_PANEL: '[data-panel="console"]',
  FILTER_ROW: '.fc-filter-row',
  FILTER_INPUT: '.fc-filter-input',
  FILTER_CLEAR: '.fc-filter-clear',
};

export const SECURITY = {
  ALLOWED_ORIGINS: ['chrome-extension://'],
  CSP_NONCE_PREFIX: 'fc-nonce-',
};
