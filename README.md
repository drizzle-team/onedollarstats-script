<h1 align="center">
  OneDollarStats
</h1>

<div align="center">
  <h3>$1.00/month web analytics 🚀</h3>
  <a href="https://onedollarstats.com">Website</a>  •
  <a href="https://docs.onedollarstats.com/get-started">Documentation</a> •
  <a href="https://discord.gg/55EjXsFUuf">Discord</a>
</div>

### What's onedollarstats package?

**OneDollarStats** is a lightweight, zero-dependency analytics library for client applications that automatically tracks pageviews, UTM
parameters, and custom events with minimal setup.
It supports hash-based navigation, automatically collects UTM parameters, tracks clicks on elements with `data-s-event` attributes, and
integrates effortlessly.

## Installation

```bash
npm i onedollarstats
```

## Getting Started

### Configure analytics

> ⚠️ Initialize analytics on every page for static sites, or at the root layout (app entrypoint) in SPA apps.
> Calling `view` or `event` before `configure` will automatically initialize the tracker with the default configuration.

```ts
import { configure } from "onedollarstats";

// Configure analytics
configure({
  collectorUrl: "https://collector.onedollarstats.com/events",
  autocollect: true, // automatically tracks pageviews & clicks
  hashRouting: true // track SPA hash route changes
});
```

### Manual Tracking

> **Note:** Any path or properties you pass to `view` or `event` take **priority** over values found on the page (like `data-s-path`, `data-s-view-props`, or meta tags).

**Track Pageviews**

By default, pageviews are tracked automatically. If you want to track them manually (for example, with autocollect: false), you can use the `view` function:

```ts
import { view } from "onedollarstats";

// Simple pageview
view("/homepage");

// Pageview with extra properties
view("/checkout", { step: 2, plan: "pro" });
```

**Track Custom Events**

The `event` function can accept different types of arguments depending on your needs:

```ts
import { event } from "onedollarstats";

// Simple event
event("Purchase");

// Event with a path
event("Purchase", "/product");

// Event with properties
event("Purchase", { amount: 1, color: "green" });

// Event with path + properties
event("Purchase", "/product", { amount: 1, color: "green" });
```

## API

#### `configure(config?: AnalyticsConfig)` initializes the tracker with your configuration.

**Config Options:**

| Option             | Type             | Default                                       | Description                                                                       |
| ------------------ | ---------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `collectorUrl`     | `string`         | `https://collector.onedollarstats.com/events` | URL to send analytics events                                                      |
| `trackLocalhostAs` | `string \| null` | `null`                                        | **Deprecated.** Use `hostname` and `devmode`                                      |
| `hostname`         | `string \| null` | `null`                                        | Override event hostname(for server-side or desktop runtimes) Required for devmode |
| `devmode`          | `boolean`        | `false`                                       | For dev testing, requires `hostname`                                              |
| `hashRouting`      | `boolean`        | `false`                                       | Track hash route changes as pageviews                                             |
| `autocollect`      | `boolean`        | `true`                                        | Automatically track pageviews & clicks                                            |
| `excludePages`     | `string[]`       | `[]`                                          | Pages to ignore for automatic tracking                                            |
| `includePages`     | `string[]`       | `[]`                                          | Pages to explicitly include for tracking                                          |

> **Notes:**
>
> - Manual calls of `view` or `event` **ignore** `excludePages`/`includePages`.
> - By default, events from `localhost` are ignored. Use the `hostname` and `devmode` options to simulate a hostname for local development.

---

#### `view(pathOrProps?: string | Record<string, string>, props?:  Record<string, string>)` sends a pageview event.

**Parameters:**

- `pathOrProps` – Optional, **string** represents the path, **object** represents custom properties.
- `props` – Optional, properties if the first argument is a path string.

---

#### `event(eventName: string, pathOrProps?: string |  Record<string, string>, props?:  Record<string, string>)` sends a custom event.

**Parameters:**

- `eventName` – Name of the event.
- `pathOrProps` – Optional, **string** represents the path, **object** represents custom properties.
- `props` – Optional, properties if the second argument is a path string.

## Expo

`onedollarstats/expo` is a dedicated entry point for Expo apps using `expo-router`. It auto-collects pageviews on route change and on app foreground, supports dynamic-route templates (`/profile/[id]` instead of `/profile/abc123`), and sends events natively on iOS/Android and via image beacon + `sendBeacon` on web.

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { OneDollarStatsProvider } from 'onedollarstats/expo';

export default function RootLayout() {
  return (
    <OneDollarStatsProvider config={{ hostname: 'example.com' }}>
      <Stack screenOptions={{ headerShown: false }} />
    </OneDollarStatsProvider>
  );
}
```

Fire custom events or manual pageviews from any component with `useAnalytics()`:

```tsx
import { useAnalytics } from 'onedollarstats/expo';

const { event, view } = useAnalytics();

event('signup', { plan: 'pro' });        // event with current route
event('signup', '/landing');              // event with explicit path
view({ campaign: 'spring' });             // pageview with just props
view('/landing', { campaign: 'spring' }); // pageview with explicit path
```

**Expo-specific config options:**

| Option                  | Type       | Default | Description                                                                                  |
| ----------------------- | ---------- | ------- | -------------------------------------------------------------------------------------------- |
| `collapseDynamicRoutes` | `boolean`  | `true`  | Use `useSegments()` to record routes as templates (`/profile/[id]`) instead of concrete paths. Group segments like `(tabs)` are stripped. |

All other options (`hostname`, `collectorUrl`, `devmode`, `autocollect`, `excludePages`, `includePages`) behave the same as in the web tracker above.

### Per-page overrides with `withAnalyticsPage`

When you want to declare a custom path or attach properties to a specific page, wrap the page's default export with `withAnalyticsPage`. The wrapper is the only API that can set page-scoped path/props — there are no hooks for this, so a child component (like a Button) can't accidentally hijack the tracking.

**Static options** — fixed at wrap time:

```tsx
// app/profile/[id].tsx
import { withAnalyticsPage } from 'onedollarstats/expo';

function ProfileScreen() {
  // ...page content
}

export default withAnalyticsPage(ProfileScreen, {
  path: '/profile/[id]',
  props: { section: 'user' }
});
```

**Dynamic options** — pass a hook that returns the options. Useful for tracking theme, auth state, locale, A/B variants, etc.:

```tsx
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { withAnalyticsPage } from 'onedollarstats/expo';

function ProfileScreen() {
  // ...page content
}

function useProfileAnalytics() {
  const theme = useTheme();
  const { isAuthed, plan } = useAuth();
  return {
    path: '/profile/[id]',
    props: {
      theme,
      authed: String(isAuthed),
      plan: plan ?? 'guest',
    }
  };
}

export default withAnalyticsPage(ProfileScreen, useProfileAnalytics);
```

**Important:** changing a dynamic prop does **not** trigger a new PageView. The PageView is keyed only on the route path. A theme flip from `light` to `dark` updates the props in-place, and the next event (or AppState refire) picks up the new value — but the original PageView is not re-sent.

| Moment                            | Pathname        | Theme | What fires                                                              |
| --------------------------------- | --------------- | ----- | ----------------------------------------------------------------------- |
| Page mount                        | `/profile/abc`  | light | `PageView` with `{ theme: 'light', authed: 'false', plan: 'guest' }`    |
| User logs in                      | `/profile/abc`  | light | nothing                                                                 |
| User flips theme                  | `/profile/abc`  | dark  | nothing                                                                 |
| Button → `event('cta')`           | `/profile/abc`  | dark  | `cta` event with `{ theme: 'dark', authed: 'true', plan: 'pro' }`       |
| Navigate to `/settings`           | `/settings`     | dark  | `PageView` for `/settings` with whatever `SettingsScreen`'s HOC declares|
| App backgrounds → returns         | `/settings`     | dark  | `PageView` refire reading current props                                 |

For session attributes that apply to every page (theme, auth, locale), build a shared hook and spread it from each page's options hook — there's no separate "session props" API, just standard React composition.

**Merge precedence** (lowest → highest):

1. `withAnalyticsPage(C, { props })` — page-level props
2. Call-site `event(name, { foo })` / `view({ foo })` — call-site props

Call-site keys overwrite page-level keys.

**Explicit `view('/x')` always wins** over a page-level `path` override.

#### Skipping pages from auto-tracking

Set `skip: true` to exclude a page from auto-collected PageViews entirely. This overrides `includePages` from the Provider config. Manual `view()` and `event()` calls from the page still fire — `skip` only affects automatic tracking.

```tsx
// app/internal-debug.tsx
import { withAnalyticsPage } from 'onedollarstats/expo';

function DebugScreen() {
  // ...
}

export default withAnalyticsPage(DebugScreen, { skip: true });
```

Dynamic skip works the same way — return `skip` from the options hook based on any runtime state (feature flag, user consent, A/B variant):

```tsx
function useDebugOptions() {
  const { hasAnalyticsConsent } = useConsent();
  return { skip: !hasAnalyticsConsent };
}

export default withAnalyticsPage(DebugScreen, useDebugOptions);
```

**Notes:**
- `skip` takes precedence over `includePages` and `excludePages`.
- AppState foreground refire is also suppressed while `skip` is true.
- Flipping `skip` from `false` → `true` mid-mount does NOT retroactively "undo" an already-sent PageView. It only suppresses future auto fires (AppState refire). Use manual `event()` / `view()` from the page if you need control after that point.

## Autocapture

**Page view events**

List of attributes for tags that allow modifying the sent page view:

- `data-s-path` – Optional. Specifies the path representing the page where the event occurred. This attribute should be set on the `<body>` tag.

- `data-s-view-props` – Optional. Defines additional properties to include with the page view event. All properties from elements on the page with this attribute will be collected and sent together.

**Click events**

Automatically capture clicks on elements using these HTML attributes:

- `data-s-event`– Name of the event
- `data-s-event-path` Optional, the path representing the page where the event occurred
- `data-s-event-props` – Optional, properties to send with the event

See full onedollarstats [documentation](https://docs.onedollarstats.com).
