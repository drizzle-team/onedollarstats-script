import type { AnalyticsConfig, InternalAnalyticsConfig } from "../types";
import { getEnvironment } from "./environment";

export const defaultConfig: InternalAnalyticsConfig = {
  hostname: null,
  devmode: false,
  collectorUrl: "https://collector.onedollarstats.com/events",
  hashRouting: false,
  autocollect: true,
  excludePages: [],
  includePages: [],
};

export const mergeConfig = (userConfig: AnalyticsConfig = {}): InternalAnalyticsConfig => {
  const { isLocalhost, isDesktop } = getEnvironment();

  // Desktop can't tell dev from production by URL, so devmode is used as passed
  // TODO: auto-detect desktop dev: process.env.NODE_ENV === "development" (replaced by the app's bundler),
  // Tauri/Electron served from http://localhost, Electron file:// without app.asar; then block unless devmode like web localhost
  const devmode =
    !isLocalhost && !isDesktop ? false : (userConfig.devmode ?? !!userConfig.trackLocalhostAs);

  let hostname: string | null;
  if (userConfig.hostname) {
    const trimmed = userConfig.hostname.trim();
    hostname = trimmed || null;
  } else if (devmode && userConfig.trackLocalhostAs) {
    hostname = userConfig.trackLocalhostAs;
  } else {
    hostname = null;
  }

  // Merge default config, user config, and computed values
  return { ...defaultConfig, ...userConfig, hostname, devmode };
};
