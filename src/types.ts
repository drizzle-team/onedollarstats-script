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
// sw / sh: screen width / height in CSS pixels
// n: network info (Chromium only)
//   et: effective type (slow-2g | 2g | 3g | 4g)
//   t: connection type (wifi | cellular | ethernet | ...)
//   dl: downlink estimate in Mbps
//   rtt: round-trip time estimate in ms
//   sd: data saver enabled
type MinimizedEvent = {
  t: string;
  h?: boolean;
  r?: string;
  p?: BaseProps;
};

export type NetworkInfo = {
  et?: string;
  t?: string;
  dl?: number;
  rtt?: number;
  sd?: boolean;
};

export type BodyToSend = {
  u: string;
  e: [MinimizedEvent];
  qs?: Record<string, string>;
  sw?: number;
  sh?: number;
  n?: NetworkInfo;
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
