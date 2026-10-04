'use strict';

// Selected story moments and camera movements share one input gate. Presses
// during it are ignored, never queued; ordinary acting and marks do not pause dialogue.
const Playback = (() => {
  const GAP_MS = 160;
  let enabled = true, until = 0, timer = null, listener = () => {};
  const tasks = new Set();
  const busy = () => tasks.size > 0 || performance.now() < until;
  function refresh() {
    clearTimeout(timer);
    timer = null;
    const remaining = until - performance.now();
    if (remaining > 0) timer = setTimeout(refresh, Math.ceil(remaining) + 1);
    listener();
  }
  function hold(ms) {
    if (!enabled || ms <= 0) return;
    until = Math.max(until, performance.now() + ms + GAP_MS);
    refresh();
  }
  function reset() {
    tasks.clear();
    until = 0;
    refresh();
  }
  return {
    get busy() { return busy(); },
    hold,
    begin() {
      if (!enabled) return () => {};
      const token = {};
      tasks.add(token);
      refresh();
      return () => {
        if (!tasks.delete(token)) return;
        until = Math.max(until, performance.now() + GAP_MS);
        refresh();
      };
    },
    reset,
    setEnabled(v) { enabled = v; if (!v) reset(); },
    onChange(fn) { listener = fn; refresh(); },
    refresh,
  };
})();
