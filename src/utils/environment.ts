export const getEnvironment = (): {
  isLocalhost: boolean;
  isDesktop: boolean;
} => {
  // Electron, Tauri, Wails, Neutralino, NW.js
  // typeof checks instead of `in`: elements with a matching id are exposed on window too
  const isDesktop =
    /Electron\//.test(navigator.userAgent) ||
    typeof (window as any).__TAURI_INTERNALS__?.invoke === "function" ||
    typeof (window as any).__TAURI_IPC__ === "function" ||
    /^(tauri|wails):$/.test(location.protocol) ||
    /^(tauri|wails)\.localhost$/.test(location.hostname) ||
    typeof (window as any).NL_VERSION === "string" ||
    typeof (window as any).nw?.App === "object";

  return {
    // Desktop apps are served from localhost/file:// in production too, so they are never "localhost"
    isLocalhost:
      !isDesktop &&
      ((/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) &&
        //TODO revisit
        (location.protocol === "http:" || location.protocol === "https:")) ||
        (location.protocol === "file:" && !navigator.userAgent.toLowerCase().includes("electron"))),
    isDesktop
  };
};
export const isClient = (): boolean => {
  try {
    // Basic checks for window and document
    if (typeof window === "undefined" || typeof document === "undefined") return false;

    // Check for navigator safely
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    // Node's UA starts with "Node.js/"; a bare "node" match would also hit desktop apps named e.g. "NodeNotes"
    if (/^Node\.js\/|jsdom/i.test(ua)) return false;
    return true;
  } catch {
    return false;
  }
};
