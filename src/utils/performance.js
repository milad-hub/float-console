export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

export function throttle(func, limit) {
  let inThrottle;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function requestAnimationFrame(callback) {
  return window.requestAnimationFrame
    ? window.requestAnimationFrame(callback)
    : setTimeout(callback, 16);
}

export function cancelAnimationFrame(id) {
  if (window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

export function batchUpdates(updateFn) {
  let scheduled = false;
  let pendingUpdates = [];

  return function (...args) {
    pendingUpdates.push(args);

    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const updates = pendingUpdates.slice();
        pendingUpdates = [];
        updates.forEach((updateArgs) => updateFn(...updateArgs));
      });
    }
  };
}

export function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function (...args) {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
