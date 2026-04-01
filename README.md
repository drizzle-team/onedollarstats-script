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
