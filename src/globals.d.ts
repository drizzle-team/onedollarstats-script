/**
 * Internal Window augmentation for the tracker.
 * NOT shipped to npm consumers — only used at build time for type-checking.
 */
declare global {
  interface Window {
    unexpected?: {
      q?: Event[];
    };
    stonks: {
      event: (name: string, arg2?: Record<string, string> | string, props?: Record<string, string>) => Promise<void>;
      view: (arg1?: string | Record<string, string>, arg2?: Record<string, string>) => Promise<void>;
    };
    /** Legacy tracker.js API, set only by the tracker.js build (src/tracker.ts). */
    trackCustomEvent?: (name: string, props?: Record<string, string>) => Promise<void> | undefined;
    __stonksModalLog?: (message: string, success: boolean) => void;
    __stonksDebugConfig?: { hostname: string; collectorUrl: string };
    __stonksModalQueue?: Array<[string, boolean]>;
    __stonksModalReady?: boolean;
  }
}

export {};
