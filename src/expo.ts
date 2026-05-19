import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentType,
  type FC,
  type MutableRefObject,
  type ReactNode
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { usePathname, useSegments } from 'expo-router';

/**
 * Configuration for {@link OneDollarStatsProvider}.
 *
 * Pass this to the provider once at the root of your app:
 *
 * ```tsx
 * <OneDollarStatsProvider config={{ hostname: 'example.com', devmode: true }}>
 *   <Stack />
 * </OneDollarStatsProvider>
 * ```
 */
export type ExpoAnalyticsConfig = {
  /**
   * The domain events are attributed to. Sent as `https://<hostname><path>`.
   *
   * Required. Use your real production domain even when developing locally —
   * combine with `devmode: true` to make events flow while on `localhost`.
   */
  hostname: string;

  /**
   * Where events are POSTed.
   *
   * @default 'https://collector.onedollarstats.com/events'
   */
  collectorUrl?: string;

  /**
   * Path prefixes whose auto-`PageView` should be skipped.
   * Matches against the *tracked* path (after `collapseDynamicRoutes` /
   * group-stripping / query-stripping).
   *
   * Prefix match: `'/admin'` matches `/admin`, `/admin/users`, `/admin/users/123`.
   *
   * Ignored by manual {@link AnalyticsAPI.view} / {@link AnalyticsAPI.event} calls.
   * Overridden by {@link AnalyticsPageOptions.skip | `skip: true`} on a page-level HOC.
   */
  excludePages?: string[];

  /**
   * Whitelist of path prefixes — only these get an auto-`PageView`. Everything
   * else is excluded. Same prefix-match rules as {@link excludePages}.
   *
   * Ignored by manual {@link AnalyticsAPI.view} / {@link AnalyticsAPI.event} calls.
   * Overridden by {@link AnalyticsPageOptions.skip | `skip: true`} on a page-level HOC
   * (skip wins even when this whitelist would include the page).
   */
  includePages?: string[];

  /**
   * Fire `PageView` automatically on route change and when the app returns
   * to the foreground.
   *
   * Manual {@link AnalyticsAPI.view} / {@link AnalyticsAPI.event} calls are
   * always allowed regardless of this flag.
   *
   * @default true
   */
  autocollect?: boolean;

  /**
   * Development mode.
   *
   * - On web `localhost`, events are normally dropped. Set this to `true` to
   *   send them anyway so you can verify the integration.
   * - Logs every outgoing event (name, URL, props) to the console.
   * - A connect message is printed once on mount.
   *
   * @default false
   */
  devmode?: boolean;

  /**
   * Record routes as their expo-router template instead of the concrete path.
   *
   * - `true` (default): `/profile/abc123` → `/profile/[id]`,
   *   `/posts/a/b/c` → `/posts/[...slug]`, `(tabs)` group segments are stripped.
   * - `false`: track the literal `usePathname()` value (`/profile/abc123`).
   *
   * @default true
   */
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

type Override = { realPath: string; customPath: string } | null;
type PropsOverride = { realPath: string; props: Record<string, string> } | null;
type SkipOverride = { realPath: string; skip: boolean } | null;

type ContextValue = {
  config: InternalConfig;
  lastPathRef: MutableRefObject<string | null>;
  overrideRef: MutableRefObject<Override>;
  propsOverrideRef: MutableRefObject<PropsOverride>;
  skipRef: MutableRefObject<SkipOverride>;
};

const Context = createContext<ContextValue | null>(null);

function resolvePath(
  autoPath: string,
  realPathname: string,
  overrideRef: MutableRefObject<Override>
): string {
  const o = overrideRef.current;
  return o && o.realPath === realPathname ? o.customPath : autoPath;
}

function resolveProps(
  realPathname: string,
  propsOverrideRef: MutableRefObject<PropsOverride>
): Record<string, string> | undefined {
  const o = propsOverrideRef.current;
  return o && o.realPath === realPathname ? o.props : undefined;
}

function mergeProps(
  pageProps: Record<string, string> | undefined,
  callProps: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!pageProps && !callProps) return undefined;
  if (!pageProps) return callProps;
  if (!callProps) return pageProps;
  return { ...pageProps, ...callProps };
}

function resolveSkip(
  realPathname: string,
  skipRef: MutableRefObject<SkipOverride>
): boolean {
  const o = skipRef.current;
  return !!(o && o.realPath === realPathname && o.skip);
}

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

function stripQuery(path: string): string {
  const q = path.indexOf('?');
  const h = path.indexOf('#');
  const cut = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  return cut === -1 ? path : path.slice(0, cut);
}

function collapsePath(segments: readonly string[]): string {
  const visible = segments.filter(s => !isGroupSegment(s));
  if (visible.length === 0) return '/';
  return '/' + visible.join('/');
}

function useAutoPath(config: InternalConfig): { realPathname: string; autoPath: string } {
  const pathname = usePathname();
  const segments = useSegments();
  const raw = config.collapseDynamicRoutes
    ? collapsePath(segments as readonly string[])
    : pathname;
  return { realPathname: pathname, autoPath: stripQuery(raw) };
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

/**
 * Props for {@link OneDollarStatsProvider}.
 */
export type OneDollarStatsProviderProps = {
  config: ExpoAnalyticsConfig;
  children: ReactNode;
};

/**
 * Root provider for onedollarstats in Expo / expo-router apps.
 *
 * Wraps the app once. While mounted, it auto-collects a `PageView` on every
 * route change and when the app foregrounds.
 *
 * @example
 * ```tsx
 * // app/_layout.tsx
 * import { Stack } from 'expo-router';
 * import { OneDollarStatsProvider } from 'onedollarstats/expo';
 *
 * export default function RootLayout() {
 *   return (
 *     <OneDollarStatsProvider config={{ hostname: 'example.com', devmode: true }}>
 *       <Stack />
 *     </OneDollarStatsProvider>
 *   );
 * }
 * ```
 *
 * **What gets sent automatically:**
 * 1. `PageView` on mount of each route.
 * 2. `PageView` when the app returns to foreground (`AppState` → `'active'`).
 *
 * **What does NOT get sent automatically:** anything else — use
 * {@link useAnalytics} (`event`/`view`) or {@link withAnalyticsPage} to customise.
 *
 * **Tracked path precedence** (highest → lowest):
 * 1. Explicit `view('/x')` call.
 * 2. {@link AnalyticsPageOptions.path | HOC `path`} from {@link withAnalyticsPage}.
 * 3. Collapsed segments from `useSegments()` (if {@link ExpoAnalyticsConfig.collapseDynamicRoutes}).
 * 4. Raw `usePathname()` (if collapse is off).
 *
 * **Filtering precedence** (an auto-`PageView` is suppressed if any apply):
 * 1. {@link AnalyticsPageOptions.skip | HOC `skip: true`} — beats everything else.
 * 2. {@link ExpoAnalyticsConfig.excludePages} matches the tracked path.
 * 3. {@link ExpoAnalyticsConfig.includePages} does NOT match the tracked path.
 * 4. {@link ExpoAnalyticsConfig.autocollect} is `false`.
 *
 * Manual calls via {@link useAnalytics} ignore all four filters.
 *
 * @see {@link useAnalytics} — manual `event` / `view` from any component
 * @see {@link withAnalyticsPage} — declare per-page path/props/skip
 */
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
  const overrideRef = useRef<Override>(null);
  const propsOverrideRef = useRef<PropsOverride>(null);
  const skipRef = useRef<SkipOverride>(null);
  const announcedRef = useRef(false);
  const { realPathname, autoPath } = useAutoPath(merged);

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
    // skip takes precedence over include/excludePages.
    if (resolveSkip(realPathname, skipRef)) return;
    // Read the override ref AT EFFECT TIME, after the HOC has rendered and
    // written into it. Computing trackedPath during render would capture a
    // stale value because the Provider renders before its descendants.
    const trackedPath = stripQuery(resolvePath(autoPath, realPathname, overrideRef));
    if (isExcluded(trackedPath, merged)) return;
    if (lastPathRef.current === trackedPath) return;
    lastPathRef.current = trackedPath;
    send('PageView', trackedPath, merged, resolveProps(realPathname, propsOverrideRef));
  }, [autoPath, realPathname, merged]);

  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!merged.autocollect) return;
      if (resolveSkip(realPathname, skipRef)) return;
      const current = lastPathRef.current;
      if (!current || isExcluded(current, merged)) return;
      send('PageView', current, merged, resolveProps(realPathname, propsOverrideRef));
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [merged, realPathname]);

  const value = useMemo<ContextValue>(
    () => ({ config: merged, lastPathRef, overrideRef, propsOverrideRef, skipRef }),
    [merged]
  );

  return createElement(Context.Provider, { value }, children);
}

type Props = Record<string, string>;

/**
 * The object returned by {@link useAnalytics}.
 *
 * Both methods are stable across renders for a given pathname; safe to use as
 * effect deps. They merge HOC-declared props ({@link AnalyticsPageOptions.props})
 * with the call-site `props` you pass — call-site keys win.
 */
export type AnalyticsAPI = {
  /**
   * Send a custom event.
   *
   * Always fires — unaffected by `excludePages`, `includePages`,
   * `autocollect`, or {@link AnalyticsPageOptions.skip | HOC `skip`}. Call this
   * when *you* want the event sent.
   *
   * **Path source** (in order):
   * 1. Explicit `pathOrProps` string, if given.
   * 2. {@link AnalyticsPageOptions.path | HOC `path`} on this page.
   * 3. The current route (collapsed if {@link ExpoAnalyticsConfig.collapseDynamicRoutes}).
   *
   * **Props source** — merged in this order, last writer wins per key:
   * 1. {@link AnalyticsPageOptions.props | HOC `props`} on this page.
   * 2. Call-site `props` you pass.
   *
   * @param eventName Event name.
   * @param pathOrProps Either an explicit path string OR a props object.
   * @param props Props (only used when `pathOrProps` is a string).
   *
   * @example
   * ```ts
   * event('signup');                          // current route
   * event('signup', { plan: 'pro' });         // current route + props
   * event('signup', '/landing');              // explicit path
   * event('signup', '/landing', { plan: 'pro' });  // explicit path + props
   * ```
   */
  event(eventName: string, pathOrProps?: string | Props, props?: Props): void;

  /**
   * Send a `PageView` manually.
   *
   * Always fires — bypasses `excludePages`, `includePages`, `autocollect`,
   * and {@link AnalyticsPageOptions.skip | HOC `skip`}. Useful for declaring
   * a custom virtual page, or for tracking a page that's otherwise excluded.
   *
   * @param pathOrProps Either an explicit path string OR a props object.
   * @param props Props (only used when `pathOrProps` is a string).
   *
   * @example
   * ```ts
   * view();                                       // current route
   * view({ campaign: 'spring' });                 // current route + props
   * view('/landing');                             // explicit path
   * view('/landing', { campaign: 'spring' });     // explicit path + props
   * ```
   *
   * @remarks
   * Unlike auto-`PageView`, manual `view()` calls are NOT deduped against the
   * `lastPathRef`. Calling `view('/x')` twice produces two events.
   */
  view(pathOrProps?: string | Props, props?: Props): void;
};

/**
 * Returns `{ event, view }` for sending events from any component below the
 * {@link OneDollarStatsProvider}.
 *
 * Throws if called outside the provider.
 *
 * Both methods read the latest page-level overrides from
 * {@link withAnalyticsPage} at *call time*, so dynamic options updates (e.g.
 * a theme flip) are picked up by subsequent events.
 *
 * @see {@link AnalyticsAPI.event}
 * @see {@link AnalyticsAPI.view}
 *
 * @example
 * ```tsx
 * function CTA() {
 *   const { event } = useAnalytics();
 *   return <Pressable onPress={() => event('cta_click', { variant: 'A' })} />;
 * }
 * ```
 */
export function useAnalytics(): AnalyticsAPI {
  const ctx = useRequiredContext('useAnalytics');
  const { realPathname, autoPath } = useAutoPath(ctx.config);

  // Read refs INSIDE the callback so updates by withAnalyticsPage are picked
  // up at call time, not snapshotted at hook-mount time.
  const event = useCallback(
    (eventName: string, pathOrProps?: string | Props, props?: Props) => {
      const overridden = stripQuery(resolvePath(autoPath, realPathname, ctx.overrideRef));
      const targetPath = typeof pathOrProps === 'string' ? pathOrProps : overridden;
      const callProps = typeof pathOrProps === 'object' ? pathOrProps : props;
      const pageProps = resolveProps(realPathname, ctx.propsOverrideRef);
      send(eventName, targetPath, ctx.config, mergeProps(pageProps, callProps));
    },
    [ctx, autoPath, realPathname]
  );

  const view = useCallback(
    (pathOrProps?: string | Props, props?: Props) => {
      const overridden = stripQuery(resolvePath(autoPath, realPathname, ctx.overrideRef));
      const targetPath = typeof pathOrProps === 'string' ? pathOrProps : overridden;
      const callProps = typeof pathOrProps === 'object' ? pathOrProps : props;
      const pageProps = resolveProps(realPathname, ctx.propsOverrideRef);
      send('PageView', targetPath, ctx.config, mergeProps(pageProps, callProps));
    },
    [ctx, autoPath, realPathname]
  );

  return { event, view };
}

/**
 * Options for {@link withAnalyticsPage}.
 *
 * All fields are optional. Pass either a static object (fixed at wrap time)
 * or a hook function ({@link AnalyticsPageOptionsHook}) that re-runs every
 * render — useful for tracking theme, auth state, locale, A/B variants, etc.
 */
export type AnalyticsPageOptions = {
  /**
   * Replace the auto-tracked path for this page.
   *
   * Wins over {@link ExpoAnalyticsConfig.collapseDynamicRoutes}. Useful when
   * the default segment template (`/profile/[id]`) doesn't match what you
   * want to record.
   *
   * @example
   * ```tsx
   * withAnalyticsPage(Profile, { path: '/profile/[id]' })
   * ```
   */
  path?: string;

  /**
   * Properties attached to the auto-`PageView` AND merged into every
   * `event()` / `view()` call from this page.
   *
   * Call-site props from {@link AnalyticsAPI.event} / {@link AnalyticsAPI.view}
   * override these per key.
   *
   * **Important:** changing `props` does NOT trigger a new `PageView`. PageView
   * dedup is path-only. The new value is picked up by future events and by
   * the AppState foreground refire.
   */
  props?: Record<string, string>;

  /**
   * Exclude this page from auto-`PageView` collection.
   *
   * Highest-priority filter — overrides {@link ExpoAnalyticsConfig.includePages}
   * (a whitelist match no longer fires when `skip` is true) AND
   * {@link ExpoAnalyticsConfig.autocollect}. The AppState foreground refire
   * is also suppressed while `skip` is `true`.
   *
   * Manual {@link AnalyticsAPI.view} / {@link AnalyticsAPI.event} calls from
   * inside this page are **NOT** affected — call them explicitly when you
   * want to record something on a skipped page.
   *
   * Flipping `skip` from `false` → `true` mid-mount does NOT retroactively
   * "undo" an already-sent PageView. It only suppresses future auto fires.
   *
   * @default false
   */
  skip?: boolean;
};

/**
 * Hook variant of {@link AnalyticsPageOptions}.
 *
 * The HOC calls this function in the same render slot every render, so
 * React's rules-of-hooks apply: you can use `useState`, `useContext`,
 * `useLocalSearchParams`, etc. inside.
 *
 * Convention: name it with the `use*` prefix so ESLint's rules-of-hooks
 * recognises it as a hook.
 *
 * @example
 * ```tsx
 * function useProfileOptions() {
 *   const theme = useTheme();
 *   const { isAuthed } = useAuth();
 *   return {
 *     path: '/profile/[id]',
 *     props: { theme, authed: String(isAuthed) }
 *   };
 * }
 * export default withAnalyticsPage(ProfileScreen, useProfileOptions);
 * ```
 */
export type AnalyticsPageOptionsHook = () => AnalyticsPageOptions;

/**
 * Wrap a page component to declare per-page analytics options
 * ({@link AnalyticsPageOptions.path | path}, {@link AnalyticsPageOptions.props | props},
 * {@link AnalyticsPageOptions.skip | skip}).
 *
 * This is the **only** API that can set page-scoped overrides — there are no
 * hooks for it. A Button or other child component rendered inside the page
 * cannot influence the tracked path/props/skip; only the HOC at the page's
 * default export can.
 *
 * @param Component The page's default-exported component.
 * @param options Either a static {@link AnalyticsPageOptions} object or a
 *   hook function ({@link AnalyticsPageOptionsHook}) that returns one.
 *   Omit entirely for a no-op wrapper.
 *
 * @example Static
 * ```tsx
 * // app/profile/[id].tsx
 * function ProfileScreen() { ... }
 *
 * export default withAnalyticsPage(ProfileScreen, {
 *   path: '/profile/[id]',
 *   props: { section: 'user' }
 * });
 * ```
 *
 * @example Dynamic (hook)
 * ```tsx
 * function useProfileOptions() {
 *   const theme = useTheme();
 *   return { path: '/profile/[id]', props: { theme } };
 * }
 * export default withAnalyticsPage(ProfileScreen, useProfileOptions);
 * ```
 *
 * @example Skip a page entirely
 * ```tsx
 * export default withAnalyticsPage(InternalDebugScreen, { skip: true });
 * ```
 *
 * @see {@link OneDollarStatsProvider} — must be an ancestor in the tree
 * @see {@link useAnalytics} — for manual `event` / `view` from anywhere
 */
export function withAnalyticsPage<P extends object>(
  Component: ComponentType<P>,
  options?: AnalyticsPageOptions | AnalyticsPageOptionsHook
): ComponentType<P> {
  const Wrapped: FC<P> = (props) => {
    const ctx = useRequiredContext('withAnalyticsPage');
    const pathname = usePathname();
    const resolved: AnalyticsPageOptions =
      typeof options === 'function' ? options() : options ?? {};

    if (resolved.path !== undefined) {
      ctx.overrideRef.current = { realPath: pathname, customPath: resolved.path };
    }
    if (resolved.props !== undefined) {
      ctx.propsOverrideRef.current = { realPath: pathname, props: resolved.props };
    }
    if (resolved.skip !== undefined) {
      ctx.skipRef.current = { realPath: pathname, skip: resolved.skip };
    }

    useEffect(() => {
      return () => {
        if (ctx.overrideRef.current?.realPath === pathname) {
          ctx.overrideRef.current = null;
        }
        if (ctx.propsOverrideRef.current?.realPath === pathname) {
          ctx.propsOverrideRef.current = null;
        }
        if (ctx.skipRef.current?.realPath === pathname) {
          ctx.skipRef.current = null;
        }
      };
    }, [ctx, pathname]);

    return createElement(Component, props);
  };
  Wrapped.displayName = `withAnalyticsPage(${Component.displayName ?? Component.name ?? 'Anonymous'})`;
  return Wrapped;
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
    e: [{ t: eventName, ...(props && { p: props }) }],
    debug: config.devmode
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
