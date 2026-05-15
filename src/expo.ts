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
import { usePathname, useSegments } from 'expo-router';

export type ExpoAnalyticsConfig = {
  hostname: string;
  collectorUrl?: string;
  excludePages?: string[];
  includePages?: string[];
  autocollect?: boolean;
  devmode?: boolean;
  collapseDynamicRoutes?: boolean;
};

type InternalConfig = {
  hostname: string;
  collectorUrl: string;
  autocollect: boolean;
  devmode: boolean;
  collapseDynamicRoutes: boolean;
  excludePages?: string[];
  includePages?: string[];
};

// TODO(page-scope): restore when page-scope detection is designed.
/*
type OverrideSource = 'hook' | 'component';
type Override = { realPath: string; customPath: string; source: OverrideSource } | null;
type PropsOverride =
  | { realPath: string; props: Record<string, string>; source: OverrideSource }
  | null;
*/

type ContextValue = {
  config: InternalConfig;
  lastPathRef: MutableRefObject<string | null>;
  // TODO(page-scope): restore when page-scope detection is designed.
  // overrideRef: MutableRefObject<Override>;
  // propsOverrideRef: MutableRefObject<PropsOverride>;
};

const Context = createContext<ContextValue | null>(null);

// TODO(page-scope): restore when page-scope detection is designed.
/*
function resolvePath(pathname: string, overrideRef: MutableRefObject<Override>): string {
  const o = overrideRef.current;
  return o && o.realPath === pathname ? o.customPath : pathname;
}

function resolveProps(
  pathname: string,
  propsOverrideRef: MutableRefObject<PropsOverride>
): Record<string, string> | undefined {
  const o = propsOverrideRef.current;
  return o && o.realPath === pathname ? o.props : undefined;
}

function mergeProps(
  screenProps: Record<string, string> | undefined,
  explicitProps: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!screenProps && !explicitProps) return undefined;
  if (!screenProps) return explicitProps;
  if (!explicitProps) return screenProps;
  return { ...screenProps, ...explicitProps };
}
*/

function mergeConfig(config: ExpoAnalyticsConfig): InternalConfig {
  return {
    hostname: config.hostname,
    collectorUrl: config.collectorUrl ?? 'https://collector.onedollarstats.com/events',
    autocollect: config.autocollect ?? true,
    devmode: config.devmode ?? false,
    collapseDynamicRoutes: config.collapseDynamicRoutes ?? true,
    excludePages: config.excludePages,
    includePages: config.includePages
  };
}

function isGroupSegment(segment: string): boolean {
  return /^\(.+\)$/.test(segment);
}

function collapsePath(segments: readonly string[]): string {
  const visible = segments.filter(s => !isGroupSegment(s));
  if (visible.length === 0) return '/';
  return '/' + visible.join('/');
}

function useTrackedPath(config: InternalConfig): string {
  const pathname = usePathname();
  const segments = useSegments();
  return config.collapseDynamicRoutes ? collapsePath(segments as readonly string[]) : pathname;
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
      config.collapseDynamicRoutes,
      config.excludePages,
      config.includePages
    ]
  );

  const lastPathRef = useRef<string | null>(null);
  // TODO(page-scope): restore when page-scope detection is designed.
  // const overrideRef = useRef<Override>(null);
  // const propsOverrideRef = useRef<PropsOverride>(null);
  const announcedRef = useRef(false);
  const trackedPath = useTrackedPath(merged);

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
    if (isExcluded(trackedPath, merged)) return;
    if (lastPathRef.current === trackedPath) return;
    lastPathRef.current = trackedPath;
    send('PageView', trackedPath, merged);
  }, [trackedPath, merged]);

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

  const value = useMemo<ContextValue>(
    () => ({ config: merged, lastPathRef }),
    [merged]
  );

  return createElement(Context.Provider, { value }, children);
}

type Props = Record<string, string>;

export type AnalyticsAPI = {
  event(eventName: string, pathOrProps?: string | Props, props?: Props): void;
  view(pathOrProps?: string | Props, props?: Props): void;
};

export function useAnalytics(): AnalyticsAPI {
  const ctx = useRequiredContext('useAnalytics');
  const trackedPath = useTrackedPath(ctx.config);

  const event = useCallback(
    (eventName: string, pathOrProps?: string | Props, props?: Props) => {
      const targetPath = typeof pathOrProps === 'string' ? pathOrProps : trackedPath;
      const eventProps = typeof pathOrProps === 'object' ? pathOrProps : props;
      send(eventName, targetPath, ctx.config, eventProps);
    },
    [ctx, trackedPath]
  );

  const view = useCallback(
    (pathOrProps?: string | Props, props?: Props) => {
      const targetPath = typeof pathOrProps === 'string' ? pathOrProps : trackedPath;
      const viewProps = typeof pathOrProps === 'object' ? pathOrProps : props;
      send('PageView', targetPath, ctx.config, viewProps);
    },
    [ctx, trackedPath]
  );

  return { event, view };
}

// TODO(page-scope): restore when page-scope detection is designed.
/*
export function useAnalyticsPath(customPath: string): void {
  const ctx = useRequiredContext('useAnalyticsPath');
  const pathname = usePathname();
  useEffect(() => {
    const entry: Override = { realPath: pathname, customPath, source: 'hook' };
    ctx.overrideRef.current = entry;
    return () => {
      if (ctx.overrideRef.current === entry) ctx.overrideRef.current = null;
    };
  }, [ctx, pathname, customPath]);
}

export type AnalyticsPathProps = { path: string };

export function AnalyticsPath({ path }: AnalyticsPathProps): null {
  const ctx = useRequiredContext('AnalyticsPath');
  const pathname = usePathname();
  useEffect(() => {
    const existing = ctx.overrideRef.current;
    if (existing && existing.realPath === pathname && existing.source === 'hook') return;
    const entry: Override = { realPath: pathname, customPath: path, source: 'component' };
    ctx.overrideRef.current = entry;
    return () => {
      if (ctx.overrideRef.current === entry) ctx.overrideRef.current = null;
    };
  }, [ctx, pathname, path]);
  return null;
}

export function useAnalyticsProps(props: Record<string, string>): void {
  const ctx = useRequiredContext('useAnalyticsProps');
  const pathname = usePathname();
  useEffect(() => {
    const entry: PropsOverride = { realPath: pathname, props, source: 'hook' };
    ctx.propsOverrideRef.current = entry;
    return () => {
      if (ctx.propsOverrideRef.current === entry) ctx.propsOverrideRef.current = null;
    };
  }, [ctx, pathname, props]);
}

export type AnalyticsPropsProps = Record<string, string>;

export function AnalyticsProps(props: AnalyticsPropsProps): null {
  const ctx = useRequiredContext('AnalyticsProps');
  const pathname = usePathname();
  useEffect(() => {
    const existing = ctx.propsOverrideRef.current;
    if (existing && existing.realPath === pathname && existing.source === 'hook') return;
    const entry: PropsOverride = { realPath: pathname, props, source: 'component' };
    ctx.propsOverrideRef.current = entry;
    return () => {
      if (ctx.propsOverrideRef.current === entry) ctx.propsOverrideRef.current = null;
    };
  }, [ctx, pathname, props]);
  return null;
}
*/

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

const SAFE_GET_THRESHOLD = 1500;

function send(
  eventName: string,
  path: string,
  config: InternalConfig,
  props?: Record<string, string>
): void {
  if (shouldSkipSend(config)) return;
  const url = `https://${config.hostname}${path}`;
  if (config.devmode) devLog(eventName, url, props);

  const body = JSON.stringify({
    u: url,
    e: [{ t: eventName, ...(props && { p: props }) }]
  });

  if (Platform.OS === 'web') {
    sendWeb(config.collectorUrl, body);
  } else {
    sendNative(config.collectorUrl, body);
  }
}

function sendNative(collectorUrl: string, body: string): void {
  fetch(collectorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  }).catch(() => {});
}

function sendWeb(collectorUrl: string, body: string): void {
  const bytes = new TextEncoder().encode(body);
  const bin = String.fromCharCode(...bytes);
  const payloadBase64 = btoa(bin);

  if (payloadBase64.length <= SAFE_GET_THRESHOLD) {
    const img = new Image(1, 1);
    img.onerror = () => sendBeaconOrFetch(collectorUrl, body);
    img.src = `${collectorUrl}?data=${payloadBase64}`;
    return;
  }

  sendBeaconOrFetch(collectorUrl, body);
}

function sendBeaconOrFetch(collectorUrl: string, body: string): void {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(collectorUrl, body)) {
    return;
  }

  fetch(collectorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
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
