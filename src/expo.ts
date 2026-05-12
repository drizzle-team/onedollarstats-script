import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { usePathname } from 'expo-router';

export type ExpoAnalyticsConfig = {
  hostname: string;
  collectorUrl?: string;
  excludePages?: string[];
  includePages?: string[];
  autocollect?: boolean;
  devmode?: boolean;
};

type InternalConfig = {
  hostname: string;
  collectorUrl: string;
  autocollect: boolean;
  devmode: boolean;
  excludePages?: string[];
  includePages?: string[];
};

type ContextValue = {
  config: InternalConfig;
  lastPathRef: MutableRefObject<string | null>;
};

const Context = createContext<ContextValue | null>(null);

function mergeConfig(config: ExpoAnalyticsConfig): InternalConfig {
  return {
    hostname: config.hostname,
    collectorUrl: config.collectorUrl ?? 'https://collector.onedollarstats.com/events',
    autocollect: config.autocollect ?? true,
    devmode: config.devmode ?? false,
    excludePages: config.excludePages,
    includePages: config.includePages
  };
}

function isWebLocalhost(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !window.location) return false;
  const { hostname, protocol } = window.location;
  return (
    /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(hostname) &&
    (protocol === 'http:' || protocol === 'https:')
  );
}

function useRequiredContext(caller: string): ContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      `[onedollarstats] ${caller} must be used inside <OneDollarStatsProvider>. ` +
        `Wrap your root layout with the provider.`
    );
  }
  return ctx;
}

export type OneDollarStatsProviderProps = {
  config: ExpoAnalyticsConfig;
  children: ReactNode;
};

export function OneDollarStatsProvider({ config, children }: OneDollarStatsProviderProps) {
  const merged = useMemo(
    () => mergeConfig(config),
    [
      config.hostname,
      config.collectorUrl,
      config.autocollect,
      config.devmode,
      config.excludePages,
      config.includePages
    ]
  );

  const lastPathRef = useRef<string | null>(null);
  const announcedRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (announcedRef.current) return;
    if (merged.devmode && isWebLocalhost()) {
      console.log(
        `[onedollarstats]\nOneDollarStats connected! Tracking localhost as ${merged.hostname}`
      );
    }
    announcedRef.current = true;
  }, [merged.devmode, merged.hostname]);

  useEffect(() => {
    if (!merged.autocollect) return;
    if (isExcluded(pathname, merged)) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    send('PageView', pathname, merged);
  }, [pathname, merged]);

  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!merged.autocollect) return;
      const current = lastPathRef.current;
      if (!current || isExcluded(current, merged)) return;
      send('PageView', current, merged);
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [merged]);

  const value = useMemo<ContextValue>(() => ({ config: merged, lastPathRef }), [merged]);

  return createElement(Context.Provider, { value }, children);
}

export type AnalyticsAPI = {
  event(eventName: string, props?: Record<string, string>): void;
  view(path?: string, props?: Record<string, string>): void;
};

export function useAnalytics(): AnalyticsAPI {
  const ctx = useRequiredContext('useAnalytics');
  const pathname = usePathname();

  const event = useCallback(
    (eventName: string, props?: Record<string, string>) => {
      const { config } = ctx;
      send(eventName, pathname, config, props);
    },
    [ctx, pathname]
  );

  const view = useCallback(
    (path?: string, props?: Record<string, string>) => {
      const { config } = ctx;
      const targetPath = path ?? pathname;
      send('PageView', targetPath, config, props);
    },
    [ctx, pathname]
  );

  return { event, view };
}

function shouldSkipSend(config: InternalConfig): boolean {
  if (Platform.OS !== 'web') return false;
  if (isWebLocalhost() && !config.devmode) return true;
  return false;
}

function devLog(label: string, url: string, props?: Record<string, string>): void {
  let msg = `[onedollarstats]\nEvent name: ${label}\nEvent collected from: ${url}`;
  if (props && Object.keys(props).length > 0) {
    msg += `\nProps: ${JSON.stringify(props, null, 2)}`;
  }
  console.log(msg);
}

function send(
  eventName: string,
  path: string,
  config: InternalConfig,
  props?: Record<string, string>
): void {
  if (shouldSkipSend(config)) return;
  const url = `https://${config.hostname}${path}`;
  if (config.devmode) devLog(eventName, url, props);
  fetch(config.collectorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      u: url,
      e: [{ t: eventName, ...(props && { p: props }) }]
    })
  }).catch(() => {});
}

function pathMatches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : prefix + '/');
}

function isExcluded(path: string, config: InternalConfig): boolean {
  if (config.includePages?.length) {
    return !config.includePages.some(p => pathMatches(path, p));
  }
  if (config.excludePages?.length) {
    return config.excludePages.some(p => pathMatches(path, p));
  }
  return false;
}
