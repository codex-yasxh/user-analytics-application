import { installTracker } from './runtime.js';

(() => {
  try {
    installTracker(window, document);
  } catch {
    // The tracker must never break its host page.
  }
})();
