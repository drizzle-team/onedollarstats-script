export const extractHostName = (script: HTMLScriptElement, isLocalhost: boolean): { hostname: string | null; devmode: boolean } => {
  // Depricated attr
  const debugAttr = script.getAttribute("data-debug");

  // New attr
  const hostnameAttr = script.getAttribute("data-hostname");
  const devmodeAttr = script.getAttribute("data-devmode");

  let devmode: boolean;

  if (!isLocalhost) {
    devmode = false;
  } else if (devmodeAttr !== null) {
    const normalized = devmodeAttr.toLowerCase().trim();
    devmode = normalized === "" || normalized === "true" || normalized === "1";
  } else if (debugAttr !== null) {
    devmode = true;
  } else {
    devmode = false;
  }

  let hostname: string | null;

  if (hostnameAttr !== null) {
    const trimmed = hostnameAttr.trim();
    hostname = trimmed || null;
  } else if (devmode && debugAttr !== null) {
    hostname = debugAttr;
  } else {
    hostname = null;
  }

  return { hostname, devmode };
};
