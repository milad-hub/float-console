/**
 * Security utilities for XSS prevention and safe DOM manipulation
 * @fileoverview Security helpers for Float Console extension
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    text = String(text);
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createTextNode(text) {
  return document.createTextNode(String(text));
}

export function setTextContent(element, text) {
  if (element) {
    element.textContent = String(text);
  }
}

export function setSafeHtml(element, html) {
  if (element) {
    element.innerHTML = escapeHtml(String(html));
  }
}

export function isValidMessageOrigin(event) {
  if (event.source === window) {
    return true;
  }

  if (event.origin) {
    return event.origin.startsWith('chrome-extension://');
  }

  return false;
}

export function sanitizeInput(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function createFragment() {
  return document.createDocumentFragment();
}
