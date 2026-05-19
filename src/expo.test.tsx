import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createElement, useEffect, type ReactNode } from 'react';
import { render, renderHook, act } from '@testing-library/react';

// usePathname / useSegments are mutable per-test.
let mockPathname = '/home';
let mockSegments: string[] | null = null;

function defaultSegmentsFor(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

vi.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useSegments: () => mockSegments ?? defaultSegmentsFor(mockPathname)
}));

// Capture AppState handler so tests can drive it
const appStateListeners: Array<(state: string) => void> = [];
const removeMock = vi.fn();

// Mutable Platform.OS so transport tests can flip between native/web
let mockPlatformOS: 'ios' | 'android' | 'web' = 'ios';

vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    }
  },
  AppState: {
    addEventListener: vi.fn((_event: string, handler: (state: string) => void) => {
      appStateListeners.push(handler);
      return { remove: removeMock };
    })
  }
}));

import {
  OneDollarStatsProvider,
  useAnalytics,
  withAnalyticsPage,
  type ExpoAnalyticsConfig
} from './expo';

function providerEl(config: ExpoAnalyticsConfig, children: ReactNode = createElement('div')) {
  return createElement(OneDollarStatsProvider, { config }, children);
}

function renderProvider(config: ExpoAnalyticsConfig) {
  return render(providerEl(config));
}

function wrapper(config: ExpoAnalyticsConfig) {
  return ({ children }: { children: ReactNode }) => providerEl(config, children);
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchSpy);
  mockPathname = '/home';
  mockSegments = null;
  mockPlatformOS = 'ios';
  appStateListeners.length = 0;
  removeMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('OneDollarStatsProvider — auto page view tracking', () => {
  test('fires PageView on mount', () => {
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('fires PageView on pathname change', () => {
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    mockPathname = '/about';
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('deduplicates identical pathname re-renders', () => {
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    rerender(providerEl({ hostname: 'example.com' }));
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('respects autocollect=false', () => {
    renderProvider({ hostname: 'example.com', autocollect: false });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('respects excludePages', () => {
    mockPathname = '/admin/dashboard';
    renderProvider({ hostname: 'example.com', excludePages: ['/admin'] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('respects includePages (whitelist)', () => {
    mockPathname = '/about';
    renderProvider({ hostname: 'example.com', includePages: ['/home'] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('uses custom collectorUrl', () => {
    renderProvider({ hostname: 'example.com', collectorUrl: 'https://custom.com/track' });

    expect(fetchSpy).toHaveBeenCalledWith('https://custom.com/track', expect.any(Object));
  });
});

describe('OneDollarStatsProvider — AppState foreground', () => {
  test('fires PageView when AppState transitions to active', () => {
    renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // initial mount

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('does NOT fire on background or inactive', () => {
    renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    act(() => {
      appStateListeners.forEach(h => h('background'));
      appStateListeners.forEach(h => h('inactive'));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('cleans up AppState listener on unmount', () => {
    const { unmount } = renderProvider({ hostname: 'example.com' });

    unmount();
    expect(removeMock).toHaveBeenCalled();
  });

  test('does not fire on active when autocollect=false', () => {
    renderProvider({ hostname: 'example.com', autocollect: false });

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('useAnalytics — manual event() and view()', () => {
  test('event() sends with current pathname', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.event('button_click'));

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'button_click' }],
          debug: false
        })
      })
    );
  });

  test('event() includes props', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.event('signup', { plan: 'pro' }));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'signup', p: { plan: 'pro' } }],
          debug: false
        })
      })
    );
  });

  test('view() with explicit path overrides pathname', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.view('/custom-path'));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/custom-path',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('view() without path falls back to current pathname', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.view());

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('view() includes props', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.view('/landing', { campaign: 'spring' }));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/landing',
          e: [{ t: 'PageView', p: { campaign: 'spring' } }],
          debug: false
        })
      })
    );
  });

  test('event/view still work when autocollect=false', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com', autocollect: false })
    });

    act(() => result.current.event('manual'));
    act(() => result.current.view('/manual'));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('event() ignores excludePages — fires even on an excluded path', () => {
    mockPathname = '/admin/dashboard';
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({
        hostname: 'example.com',
        autocollect: false,
        excludePages: ['/admin']
      })
    });

    act(() => result.current.event('button_click'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'button_click' }],
          debug: false
        })
      })
    );
  });

  test('view() ignores excludePages — fires even on an excluded path', () => {
    mockPathname = '/admin/dashboard';
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({
        hostname: 'example.com',
        autocollect: false,
        excludePages: ['/admin']
      })
    });

    act(() => result.current.view());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('event() ignores includePages — fires for paths NOT in the whitelist', () => {
    mockPathname = '/about';
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({
        hostname: 'example.com',
        autocollect: false,
        includePages: ['/home']
      })
    });

    act(() => result.current.event('button_click'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'button_click' }],
          debug: false
        })
      })
    );
  });

  test('view() ignores includePages — fires for paths NOT in the whitelist', () => {
    mockPathname = '/about';
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({
        hostname: 'example.com',
        autocollect: false,
        includePages: ['/home']
      })
    });

    act(() => result.current.view());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('view(props) — object-only form attaches props to current pathname', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com', autocollect: false })
    });

    act(() => result.current.view({ campaign: 'spring' }));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView', p: { campaign: 'spring' } }],
          debug: false
        })
      })
    );
  });

  test('event(name, props) — object-only form attaches props to current pathname', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.event('signup', { plan: 'pro' }));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'signup', p: { plan: 'pro' } }],
          debug: false
        })
      })
    );
  });

  test('event(name, path, props) — three-arg form', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.event('signup', '/landing', { plan: 'pro' }));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/landing',
          e: [{ t: 'signup', p: { plan: 'pro' } }],
          debug: false
        })
      })
    );
  });

  test('event(name, path) — string-only second arg sets path with no props', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.event('signup', '/landing'));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/landing',
          e: [{ t: 'signup' }],
          debug: false
        })
      })
    );
  });
});

describe('Provider scoping', () => {
  test('useAnalytics throws outside provider', () => {
    expect(() => renderHook(() => useAnalytics())).toThrow(
      /must be used inside <OneDollarStatsProvider>/
    );
  });
});

describe('Path filtering logic (smoke)', () => {
  test('includePages whitelist with multiple entries', () => {
    mockPathname = '/blog/post-1';
    renderProvider({ hostname: 'example.com', includePages: ['/home', '/blog'] });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('excludePages with nested path matching', () => {
    mockPathname = '/admin/users/123';
    renderProvider({ hostname: 'example.com', excludePages: ['/admin'] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('collapseDynamicRoutes', () => {
  test('default (true) collapses dynamic segments using useSegments', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('collapseDynamicRoutes: false keeps the concrete pathname', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    renderProvider({ hostname: 'example.com', collapseDynamicRoutes: false });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/abc123',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('group segments like (tabs) are stripped when collapsing', () => {
    mockPathname = '/home';
    mockSegments = ['(tabs)', 'home'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('catch-all segments [...slug] are preserved', () => {
    mockPathname = '/posts/a/b/c';
    mockSegments = ['posts', '[...slug]'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/posts/[...slug]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('empty segments collapse to "/"', () => {
    mockPathname = '/';
    mockSegments = [];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('manual event() uses the collapsed path', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com' })
    });

    act(() => result.current.event('cta_click'));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'cta_click' }],
          debug: false
        })
      })
    );
  });

  test('view() without explicit path uses the collapsed path', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com', autocollect: false })
    });

    act(() => result.current.view());

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('view(explicitPath) ignores collapse and forwards the path as-is', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com', autocollect: false })
    });

    act(() => result.current.view('/explicit/abc123'));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/explicit/abc123',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('mixed dynamic + static segments collapse', () => {
    mockPathname = '/orgs/acme/users/u-42';
    mockSegments = ['orgs', '[org]', 'users', '[userId]'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/orgs/[org]/users/[userId]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('multiple groups in the chain are all stripped', () => {
    mockPathname = '/home';
    mockSegments = ['(tabs)', '(stack)', 'home'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('group + dynamic segment combined: group stripped, dynamic kept', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['(tabs)', 'profile', '[id]'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('only-group segments collapse to "/"', () => {
    mockPathname = '/';
    mockSegments = ['(tabs)'];
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('dedup happens against the collapsed path: /profile/abc → /profile/xyz fires only once', () => {
    // Same template, different concrete ids. Auto PageView should fire once on mount
    // and NOT refire when the concrete pathname changes but the template stays the same.
    mockPathname = '/profile/abc';
    mockSegments = ['profile', '[id]'];
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    mockPathname = '/profile/xyz';
    // mockSegments stays ['profile', '[id]'] — same template
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('dedup with collapseDynamicRoutes: false treats concrete ids as distinct pages', () => {
    mockPathname = '/profile/abc';
    mockSegments = ['profile', '[id]'];
    const { rerender } = renderProvider({
      hostname: 'example.com',
      collapseDynamicRoutes: false
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    mockPathname = '/profile/xyz';
    rerender(providerEl({ hostname: 'example.com', collapseDynamicRoutes: false }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/xyz',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('navigating between two different templates fires two PageViews', () => {
    mockPathname = '/profile/abc';
    mockSegments = ['profile', '[id]'];
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('/profile/[id]') })
    );

    mockPathname = '/posts/a/b';
    mockSegments = ['posts', '[...slug]'];
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('/posts/[...slug]') })
    );
  });

  test('excludePages matches the collapsed template', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    renderProvider({ hostname: 'example.com', excludePages: ['/profile/[id]'] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('includePages whitelist matches the collapsed template', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    renderProvider({ hostname: 'example.com', includePages: ['/profile/[id]'] });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('/profile/[id]') })
    );
  });

  test('excludePages with collapseDynamicRoutes: false matches the concrete path', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    renderProvider({
      hostname: 'example.com',
      collapseDynamicRoutes: false,
      excludePages: ['/profile/[id]']
    });

    // Template-shaped exclude does NOT match the concrete path when collapse is off
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('/profile/abc123') })
    );
  });

  test('AppState foreground refire uses the collapsed path', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('toggling collapseDynamicRoutes between renders flips path shape', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('/profile/[id]') })
    );

    rerender(providerEl({ hostname: 'example.com', collapseDynamicRoutes: false }));
    // New tracked path (/profile/abc123) differs from lastPathRef (/profile/[id]) → refire
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('/profile/abc123') })
    );
  });
});

describe('devmode', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('on web localhost + devmode: true prints the connect message once', () => {
    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: true });

    const connectCall = logSpy.mock.calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes('OneDollarStats connected')
    );
    expect(connectCall).toBeDefined();
    expect(connectCall![0]).toContain('Tracking localhost as example.com');
  });

  test('on web localhost + devmode: false does NOT print the connect message', () => {
    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: false });

    const connectCall = logSpy.mock.calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes('OneDollarStats connected')
    );
    expect(connectCall).toBeUndefined();
  });

  test('on native platform + devmode: true does NOT print the connect message', () => {
    mockPlatformOS = 'ios';
    renderProvider({ hostname: 'example.com', devmode: true });

    const connectCall = logSpy.mock.calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes('OneDollarStats connected')
    );
    expect(connectCall).toBeUndefined();
  });

  test('devmode: true logs every outgoing event to the console', () => {
    mockPlatformOS = 'ios';
    mockPathname = '/home';
    renderProvider({ hostname: 'example.com', devmode: true });

    const eventLog = logSpy.mock.calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes('Event name: PageView')
    );
    expect(eventLog).toBeDefined();
    expect(eventLog![0]).toContain('https://example.com/home');
  });
});

describe('Query string handling', () => {
  // expo-router's usePathname() is documented to return the path WITHOUT a query
  // string. These tests cover two angles:
  //   1. Real expo-router contract — pathname stays identical across query-only
  //      navigations, so de-dup naturally suppresses a refire.
  //   2. Defensive guard — if a usePathname implementation ever returns a path
  //      that includes "?foo=bar" or "#section", the library strips it before
  //      comparing/sending, so behavior is the same.

  test('expo-router contract: query-only nav keeps pathname constant, no refire', () => {
    mockPathname = '/home';
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Simulate navigation that only changes the query string. With real
    // expo-router, usePathname() still returns '/home' — the path is unchanged.
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('defensive: pathname with query string is stripped before send', () => {
    mockPathname = '/home?ref=twitter';
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false,
        })
      })
    );
  });

  test('defensive: changing only the query part de-dups, no second fire', () => {
    mockPathname = '/home?ref=twitter';
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Same path, different query — must not fire again.
    mockPathname = '/home?ref=facebook';
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Same path, no query — still must not fire (already de-duped).
    mockPathname = '/home';
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('defensive: changing path with query still fires (different path)', () => {
    mockPathname = '/home?ref=twitter';
    const { rerender } = renderProvider({ hostname: 'example.com' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    mockPathname = '/about?ref=twitter';
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('defensive: hash fragment is stripped just like query', () => {
    mockPathname = '/home#section-2';
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false,
        })
      })
    );
  });

  test('defensive: query strip applies with collapseDynamicRoutes: false', () => {
    mockPathname = '/profile/abc123?ref=twitter';
    mockSegments = ['profile', '[id]'];
    renderProvider({ hostname: 'example.com', collapseDynamicRoutes: false });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/abc123',
          e: [{ t: 'PageView' }],
          debug: false,
        })
      })
    );
  });

  test('manual event() emits the stripped path', () => {
    mockPathname = '/home?ref=twitter';
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: wrapper({ hostname: 'example.com', autocollect: false })
    });

    act(() => result.current.event('cta_click'));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'cta_click' }],
          debug: false,
        })
      })
    );
  });
});

describe('withAnalyticsPage', () => {
  function renderWithPage(
    config: ExpoAnalyticsConfig,
    Page: React.ComponentType
  ) {
    return render(providerEl(config, createElement(Page)));
  }

  function makePage(name: string = 'Page') {
    const Comp = () => createElement('div');
    Comp.displayName = name;
    return Comp;
  }

  // ── Static options ────────────────────────────────────────────────

  test('1. { path } rewrites the auto PageView URL', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { path: '/profile/[id]' });
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('2. { props } attaches props to the auto PageView', () => {
    mockPathname = '/admin/dashboard';
    const Page = withAnalyticsPage(makePage('Admin'), { props: { section: 'admin' } });
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: { section: 'admin' } }],
          debug: false
        })
      })
    );
  });

  test('3. { path, props } does both', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), {
      path: '/profile/[id]',
      props: { section: 'user' }
    });
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView', p: { section: 'user' } }],
          debug: false
        })
      })
    );
  });

  test('4. useAnalytics().event inside wrapped page uses override path and merges page props', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    function PageBody() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('cta_click');
      }, [event]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, {
      path: '/profile/[id]',
      props: { section: 'user' }
    });
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'cta_click', p: { section: 'user' } }],
          debug: false
        })
      })
    );
  });

  test('5. call-site event(name, { foo }) overrides page-level props.foo', () => {
    mockPathname = '/admin/dashboard';
    function PageBody() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('signup', { section: 'override', extra: 'x' });
      }, [event]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, {
      props: { section: 'admin', tier: 'pro' }
    });
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'signup', p: { section: 'override', tier: 'pro', extra: 'x' } }],
          debug: false
        })
      })
    );
  });

  test('6. view(explicit) wins over the page-level path override', () => {
    mockPathname = '/profile/abc123';
    function PageBody() {
      const { view } = useAnalytics();
      useEffect(() => {
        view('/explicitly-passed');
      }, [view]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, { path: '/profile/[id]' });
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/explicitly-passed',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('7. unmount clears the override; next page is unaffected', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const ProfilePage = withAnalyticsPage(makePage('Profile'), { path: '/profile/[id]' });
    const { rerender } = renderWithPage({ hostname: 'example.com' }, ProfilePage);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Navigate to a different page with no HOC.
    mockPathname = '/about';
    mockSegments = ['about'];
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('8. AppState foreground refire uses the override path and props', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), {
      path: '/profile/[id]',
      props: { section: 'user' }
    });
    renderWithPage({ hostname: 'example.com' }, Page);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView', p: { section: 'user' } }],
          debug: false
        })
      })
    );
  });

  test('9. a Button child rendered inside the wrapped page gets the page path and props', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];

    function Button() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('button_click', { extra: 'x' });
      }, [event]);
      return createElement('div');
    }
    function PageBody() {
      return createElement('div', null, createElement(Button));
    }
    const Page = withAnalyticsPage(PageBody, {
      path: '/profile/[id]',
      props: { section: 'user' }
    });
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'button_click', p: { section: 'user', extra: 'x' } }],
          debug: false
        })
      })
    );
  });

  test('10a. excludePages matches against the HOC path override', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { path: '/profile/[id]' });
    renderWithPage(
      { hostname: 'example.com', excludePages: ['/profile/[id]'] },
      Page
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('10b. includePages whitelist matches against the HOC path override', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { path: '/profile/[id]' });
    renderWithPage(
      { hostname: 'example.com', includePages: ['/profile/[id]'] },
      Page
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('/profile/[id]')
      })
    );
  });

  test('10c. includePages whitelist EXCLUDES a page whose HOC path is not listed', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { path: '/profile/[id]' });
    renderWithPage(
      { hostname: 'example.com', includePages: ['/home'] },
      Page
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('11. withAnalyticsPage(C) with no options is a no-op', () => {
    mockPathname = '/home';
    const Page = withAnalyticsPage(makePage('Home'));
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('12. override wins when collapseDynamicRoutes: false', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { path: '/profile/[id]' });
    renderWithPage(
      { hostname: 'example.com', collapseDynamicRoutes: false },
      Page
    );

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  // ── Dynamic (hook) options ────────────────────────────────────────

  test('13. hook options apply path and props returned by the hook', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    function useOptions() {
      return { path: '/profile/[id]', props: { tier: 'pro' } };
    }
    const Page = withAnalyticsPage(makePage('Profile'), useOptions);
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView', p: { tier: 'pro' } }],
          debug: false
        })
      })
    );
  });

  test('14. dynamic props change does NOT fire a second PageView', () => {
    mockPathname = '/home';
    mockSegments = ['home'];

    let setTheme: (t: string) => void = () => {};
    function useThemeOptions() {
      const [theme, set] = (require('react') as typeof import('react')).useState('light');
      setTheme = set;
      return { props: { theme } };
    }
    const Page = withAnalyticsPage(makePage('Home'), useThemeOptions);
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView', p: { theme: 'light' } }],
          debug: false
        })
      })
    );

    // Flip the theme inside the wrapped page — this triggers a re-render,
    // updates the propsOverrideRef, but must NOT trigger another PageView
    // because the pathname didn't change.
    act(() => {
      setTheme('dark');
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('15. after dynamic props update, manual event() picks up the NEW props', () => {
    mockPathname = '/home';
    mockSegments = ['home'];

    let setTheme: (t: string) => void = () => {};
    let fireEvent: () => void = () => {};

    function useThemeOptions() {
      const [theme, set] = (require('react') as typeof import('react')).useState('light');
      setTheme = set;
      return { props: { theme } };
    }
    function PageBody() {
      const { event } = useAnalytics();
      fireEvent = () => event('cta');
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, useThemeOptions);
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    // Flip theme; this re-renders the wrapper which updates the propsOverrideRef.
    act(() => {
      setTheme('dark');
    });

    // Fire event AFTER the theme flip — should pick up the new value.
    act(() => {
      fireEvent();
    });

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'cta', p: { theme: 'dark' } }],
          debug: false
        })
      })
    );
  });

  test('16. hook options returning {} is a no-op', () => {
    mockPathname = '/home';
    function useEmpty() {
      return {};
    }
    const Page = withAnalyticsPage(makePage('Home'), useEmpty);
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('17. hook options can call other hooks (rules-of-hooks consistency)', () => {
    mockPathname = '/home';
    function useWithState() {
      const [count] = (require('react') as typeof import('react')).useState(42);
      return { props: { count: String(count) } };
    }
    const Page = withAnalyticsPage(makePage('Home'), useWithState);
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView', p: { count: '42' } }],
          debug: false
        })
      })
    );
  });

  // ── skip option ───────────────────────────────────────────────────

  test('18. skip: true suppresses the auto PageView', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { skip: true });
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('19. skip: true beats includePages whitelist', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { skip: true });
    renderWithPage(
      { hostname: 'example.com', includePages: ['/profile/[id]'] },
      Page
    );

    // Without skip, this would fire because the path is whitelisted.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('20. skip: true suppresses AppState foreground refire', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];
    const Page = withAnalyticsPage(makePage('Profile'), { skip: true });
    renderWithPage({ hostname: 'example.com' }, Page);

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('21. skip: true does NOT suppress manual view()', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];

    function PageBody() {
      const { view } = useAnalytics();
      useEffect(() => {
        view();
      }, [view]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, { skip: true, path: '/profile/[id]' });
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
  });

  test('22. skip: true does NOT suppress manual event()', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];

    function PageBody() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('cta_click');
      }, [event]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, { skip: true, path: '/profile/[id]' });
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'cta_click' }],
          debug: false
        })
      })
    );
  });

  test('23. skip works with dynamic options (hook returns skip)', () => {
    mockPathname = '/profile/abc123';
    mockSegments = ['profile', '[id]'];

    function useOptions() {
      return { skip: true };
    }
    const Page = withAnalyticsPage(makePage('Profile'), useOptions);
    renderWithPage({ hostname: 'example.com' }, Page);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('24. dynamic skip flipping false → true mid-mount: already-fired PageView stays, AppState refire is suppressed', () => {
    mockPathname = '/home';
    mockSegments = ['home'];

    let setSkip: (s: boolean) => void = () => {};
    function useOptions() {
      const [skip, set] = (require('react') as typeof import('react')).useState(false);
      setSkip = set;
      return { skip };
    }
    const Page = withAnalyticsPage(makePage('Home'), useOptions);
    renderWithPage({ hostname: 'example.com' }, Page);

    // Initial PageView fires (skip was false).
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // User opts out: flip skip to true.
    act(() => {
      setSkip(true);
    });

    // No additional fetches just from the flip.
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // AppState foreground should now be suppressed.
    act(() => {
      appStateListeners.forEach(h => h('active'));
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // ── view() prop merging (gap from earlier) ────────────────────────

  test('25. useAnalytics().view() merges page-level props with call-site props', () => {
    mockPathname = '/admin/dashboard';

    function PageBody() {
      const { view } = useAnalytics();
      useEffect(() => {
        view({ extra: 'x' });
      }, [view]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, {
      props: { section: 'admin', tier: 'pro' }
    });
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: { section: 'admin', tier: 'pro', extra: 'x' } }],
          debug: false
        })
      })
    );
  });

  test('26. view(path, props) call-site props override page-level props per key', () => {
    mockPathname = '/admin/dashboard';

    function PageBody() {
      const { view } = useAnalytics();
      useEffect(() => {
        view('/explicit', { section: 'override' });
      }, [view]);
      return createElement('div');
    }
    const Page = withAnalyticsPage(PageBody, {
      props: { section: 'admin', tier: 'pro' }
    });
    renderWithPage({ hostname: 'example.com', autocollect: false }, Page);

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/explicit',
          e: [{ t: 'PageView', p: { section: 'override', tier: 'pro' } }],
          debug: false
        })
      })
    );
  });
});

describe('Transport — web platform fallback stack', () => {
  // Capture Image constructions so tests can drive load/error
  type StubImage = { src: string; onerror?: () => void };
  let imageInstances: StubImage[];

  beforeEach(() => {
    imageInstances = [];
    vi.stubGlobal(
      'Image',
      class StubImageCtor {
        src = '';
        onerror?: () => void;
        constructor() {
          imageInstances.push(this);
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('native (Platform.OS = "ios") uses fetch, no Image, no sendBeacon', () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('fetch', fetchSpy);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'ios';
    renderProvider({ hostname: 'example.com' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: false
        })
      })
    );
    // fetch options should NOT include keepalive on native
    const lastCall = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(lastCall.keepalive).toBeUndefined();
    expect(sendBeaconSpy).not.toHaveBeenCalled();
    expect(imageInstances.length).toBe(0);
  });

  test('native does NOT call navigator.sendBeacon even when defined', () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'android';
    renderProvider({ hostname: 'example.com' });

    expect(sendBeaconSpy).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('web + small payload uses Image beacon with base64 data', () => {
    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: true });

    expect(imageInstances.length).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();

    const img = imageInstances[0]!;
    expect(img.src).toMatch(/^https:\/\/collector\.onedollarstats\.com\/events\?data=/);

    // Verify base64 decodes to expected JSON
    const dataParam = img.src.split('?data=')[1]!;
    const decoded = atob(dataParam);
    expect(JSON.parse(decoded)).toEqual({
      u: 'https://example.com/home',
      e: [{ t: 'PageView' }],
      debug: true
    });
  });

  test('web + image onerror falls back to navigator.sendBeacon', () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: true });

    expect(imageInstances.length).toBe(1);
    expect(sendBeaconSpy).not.toHaveBeenCalled();

    // Trigger image error → should call sendBeacon
    imageInstances[0]!.onerror?.();
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    expect(sendBeaconSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      JSON.stringify({
        u: 'https://example.com/home',
        e: [{ t: 'PageView' }],
        debug: true
      })
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('web + sendBeacon returns true does NOT call fetch', () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: true });
    imageInstances[0]!.onerror?.();

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('web + sendBeacon returns false falls back to fetch with keepalive', () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(false);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: true });
    imageInstances[0]!.onerror?.();

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          u: 'https://example.com/home',
          e: [{ t: 'PageView' }],
          debug: true
        })
      })
    );
  });

  test('web + sendBeacon undefined goes straight to fetch with keepalive', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {}, // no sendBeacon at all
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'web';
    renderProvider({ hostname: 'example.com', devmode: true });
    imageInstances[0]!.onerror?.();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(opts.keepalive).toBe(true);
  });

  test('web + payload too large skips Image, goes to sendBeacon/fetch path', () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      configurable: true,
      writable: true
    });

    mockPlatformOS = 'web';
    // Build a screen that fires an event with a huge prop, pushing the base64-encoded
    // payload past the 1500-char threshold so the Image path is bypassed.
    const huge = 'x'.repeat(2000);
    function HugePayloadScreen() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('huge', { huge });
      }, [event]);
      return createElement('div');
    }
    render(
      providerEl(
        { hostname: 'example.com', devmode: true, autocollect: false },
        createElement(HugePayloadScreen)
      )
    );

    // Image was NOT used for the huge event
    expect(imageInstances.length).toBe(0);
    // sendBeacon was called directly
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('web + small payload sends correct body via Image (props included)', () => {
    mockPlatformOS = 'web';
    function ScreenFiresEvent() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('signup', { tier: 'pro' });
      }, [event]);
      return createElement('div');
    }
    render(
      providerEl(
        { hostname: 'example.com', devmode: true, autocollect: false },
        createElement(ScreenFiresEvent)
      )
    );

    expect(imageInstances.length).toBe(1);
    const img = imageInstances[0]!;
    const dataParam = img.src.split('?data=')[1]!;
    expect(JSON.parse(atob(dataParam))).toEqual({
      u: 'https://example.com/home',
      e: [{ t: 'signup', p: { tier: 'pro' } }],
      debug: true
    });
  });
});
