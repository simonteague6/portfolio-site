const listeners = new Map();
const pending = new Map();

export function emit(action, detail) {
  if (!listeners.has(action)) {
    const queue = pending.get(action) ?? [];
    queue.push(detail);
    pending.set(action, queue);
    return;
  }
  document.dispatchEvent(new CustomEvent(`portfolio:${action}`, { detail }));
}

export function listen(action, callback) {
  const handler = (event) => callback(event.detail);
  document.addEventListener(`portfolio:${action}`, handler);
  listeners.set(action, (listeners.get(action) ?? 0) + 1);
  const queue = pending.get(action) ?? [];
  pending.delete(action);
  for (const detail of queue) emit(action, detail);
  return () => {
    document.removeEventListener(`portfolio:${action}`, handler);
    const remaining = listeners.get(action) - 1;
    if (remaining) listeners.set(action, remaining);
    else listeners.delete(action);
  };
}
