import { createDebugModal } from "./utils/create-modal";

(() => {
  const config = window.__stonksDebugConfig;
  if (!config) return;

  const log = createDebugModal(config.hostname, config.collectorUrl);
  window.__stonksModalLog = log;

  // Drain any events that were queued while this script was loading
  const queue = window.__stonksModalQueue;
  if (queue) {
    for (const [message, success] of queue) {
      log(message, success);
    }
    queue.length = 0;
  }

  window.__stonksModalReady = true;
})();
