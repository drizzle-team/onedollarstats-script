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
  }
}

export type BaseProps = Record<string, string>;

export type ViewArguments = {
  path?: string;
  props?: BaseProps;
};

export type Event = {
  type: string;
  path?: string;
  props?: BaseProps;
  utm?: Record<string, string>;
  referrer?: string;
};

// Short notations
// u: url
// t: type
// h: hash routing
// r: referrer
// p: properties
// e: events
// qs: utm params
type MinimizedEvent = {
  t: string;
  h?: boolean;
  r?: string;
  p?: BaseProps;
};

export type BodyToSend = {
  u: string;
  e: [MinimizedEvent];
  qs?: Record<string, string>;
  debug?: boolean;
};

type BaseAnalyticsConfig = {
  collectorUrl?: string;

  /**
   * @deprecated Use `devmode` and `hostname` instead.
   */
  trackLocalhostAs?: string | null;

  hashRouting?: boolean;
  autocollect?: boolean;
  excludePages?: string[];
  includePages?: string[];
};

// devmode = true -> hostname REQUIRED
type DevModeConfig = BaseAnalyticsConfig & {
  devmode: true;
  hostname: string;
};

// devmode = false or undefined -> hostname optional
type ProdModeConfig = BaseAnalyticsConfig & {
  devmode?: false;
  hostname?: string | null;
};

export type AnalyticsConfig = DevModeConfig | ProdModeConfig;

export type InternalAnalyticsConfig = Required<Omit<BaseAnalyticsConfig, "trackLocalhostAs">> & {
  devmode: boolean;
  hostname: string | null;
};
