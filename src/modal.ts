import { createDebugModal } from "./utils/create-modal";
import { defaultCollectorUrl } from "./utils/default-collector-url";

// This script is loaded dynamically when debug modal is needed
// It receives initialization data from the parent script
(() => {
  // Get initialization data from global variable set by parent script
  const initData = window.__stonksModalInit;
  if (!initData) {
    console.error('[onedollarstats] Modal initialization data not found');
    return;
  }

  const { debugUrl, analyticsUrl } = initData;
  
  // Create the debug modal
  createDebugModal(debugUrl, analyticsUrl || defaultCollectorUrl);
  
  // Clean up initialization data
  delete window.__stonksModalInit;
})();