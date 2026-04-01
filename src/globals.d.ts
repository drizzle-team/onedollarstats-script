/**
 * Internal Window augmentation for the tracker.
 * NOT shipped to npm consumers — only used at build time for type-checking.
 */
declare global {
  interface Window {
    Cypress?: unknown;
    __nightmare?: unknown;
    _phantom?: unknown;
    unexpected?: {
      q?: Event[];
    };
    stonks: {
      event: (name: string, arg2?: Record<string, string> | string, props?: Record<string, string>) => Promise<void>;
      view: (arg1?: string | Record<string, string>, arg2?: Record<string, string>) => Promise<void>;
    };
    __stonksModalLog?: (message: string, success: boolean) => void;
    __stonksDebugConfig?: { hostname: string; collectorUrl: string };
    __stonksModalQueue?: Array<[string, boolean]>;
    __stonksModalReady?: boolean;
  }
}

export {};
