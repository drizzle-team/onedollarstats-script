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
  // TODO(page-scope): restore when override APIs are reintroduced.
  // useAnalyticsPath,
  // AnalyticsPath,
  // useAnalyticsProps,
  // AnalyticsProps,
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'button_click' }]
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
          e: [{ t: 'signup', p: { plan: 'pro' } }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView', p: { campaign: 'spring' } }]
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
          e: [{ t: 'PageView', p: { campaign: 'spring' } }]
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
          e: [{ t: 'signup', p: { plan: 'pro' } }]
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
          e: [{ t: 'signup', p: { plan: 'pro' } }]
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
          e: [{ t: 'signup' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'cta_click' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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

// TODO(page-scope): restore the test blocks below when the override APIs
// (useAnalyticsPath / AnalyticsPath / useAnalyticsProps / AnalyticsProps) are
// reintroduced. The original test bodies are preserved verbatim inside block
// comments so they can be uncommented in one move. The `describe.skip` shells
// keep the test runner reporting the deferral explicitly.

describe.skip('useAnalyticsPath / <AnalyticsPath>', () => {
  /*
  function ScreenWithHook({ override }: { override: string }) {
    useAnalyticsPath(override);
    return createElement('div');
  }

  function renderWithChild(config: ExpoAnalyticsConfig, child: ReactNode) {
    return render(providerEl(config, child));
  }

  test('useAnalyticsPath rewrites the auto-collected PageView URL', () => {
    mockPathname = '/profile/abc123';
    renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithHook, { override: '/profile/[id]' })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('manual event() inside an overridden screen uses the override', () => {
    mockPathname = '/profile/abc123';
    function ScreenWithHookAndEvent() {
      useAnalyticsPath('/profile/[id]');
      const { event } = useAnalytics();
      useEffect(() => {
        event('cta_click');
      }, [event]);
      return createElement('div');
    }
    renderWithChild({ hostname: 'example.com' }, createElement(ScreenWithHookAndEvent));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'cta_click' }]
        })
      })
    );
  });

  test('navigating away clears the override; next PageView uses the real path', () => {
    mockPathname = '/profile/abc123';
    const { rerender } = renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithHook, { override: '/profile/[id]' })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('/profile/[id]')
      })
    );

    mockPathname = '/about';
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('AppState foreground refire uses the override path', () => {
    mockPathname = '/profile/abc123';
    renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithHook, { override: '/profile/[id]' })
    );
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
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('<AnalyticsPath path="..."> produces the same effect as the hook', () => {
    mockPathname = '/profile/abc123';
    renderWithChild(
      { hostname: 'example.com' },
      createElement(AnalyticsPath, { path: '/profile/[id]' })
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('when both hook and component are present, the hook value wins', () => {
    mockPathname = '/profile/abc123';
    function BothInOneScreen() {
      useAnalyticsPath('/from-hook');
      return createElement(AnalyticsPath, { path: '/from-component' });
    }
    renderWithChild({ hostname: 'example.com' }, createElement(BothInOneScreen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/from-hook',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('excludePages matches against the override path', () => {
    mockPathname = '/profile/abc123';
    renderWithChild(
      { hostname: 'example.com', excludePages: ['/profile/[id]'] },
      createElement(ScreenWithHook, { override: '/profile/[id]' })
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('<AnalyticsPath> alone + manual event() uses override', () => {
    mockPathname = '/profile/abc123';
    function Screen() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('cta_click');
      }, [event]);
      return createElement(AnalyticsPath, { path: '/profile/[id]' });
    }
    renderWithChild({ hostname: 'example.com' }, createElement(Screen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'cta_click' }]
        })
      })
    );
  });

  test('<AnalyticsPath> updates when its path prop changes', () => {
    mockPathname = '/profile/abc123';
    const { rerender } = renderWithChild(
      { hostname: 'example.com' },
      createElement(AnalyticsPath, { path: '/profile/[id]' })
    );
    fetchSpy.mockClear();

    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement(AnalyticsPath, { path: '/profile/[slug]' })
      )
    );

    // Trigger a manual event to see which override is active.
    function Reader() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('probe');
      }, [event]);
      return null;
    }
    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement('div', null, [
          createElement(AnalyticsPath, { key: 'ap', path: '/profile/[slug]' }),
          createElement(Reader, { key: 'r' })
        ])
      )
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[slug]',
          e: [{ t: 'probe' }]
        })
      })
    );
  });

  test('<AnalyticsPath> unmount restores the real pathname for subsequent sends', () => {
    mockPathname = '/profile/abc123';
    const { rerender } = renderWithChild(
      { hostname: 'example.com' },
      createElement(AnalyticsPath, { path: '/profile/[id]' })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Unmount the AnalyticsPath: render the provider with no override child.
    rerender(providerEl({ hostname: 'example.com' }));

    // Now probe with a manual event — should use the real pathname.
    function Reader() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('probe');
      }, [event]);
      return null;
    }
    rerender(providerEl({ hostname: 'example.com' }, createElement(Reader)));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/abc123',
          e: [{ t: 'probe' }]
        })
      })
    );
  });

  test('hook wins even when component mounted first', () => {
    mockPathname = '/profile/abc123';
    // Component first in JSX (mounts/effect-fires first), hook in parent scope (effect fires after)
    function ScreenComponentFirst() {
      useAnalyticsPath('/from-hook');
      return createElement(AnalyticsPath, { path: '/from-component' });
    }
    // Compare with reverse mount order to confirm hook wins regardless
    function ScreenHookFirst() {
      useAnalyticsPath('/from-hook');
      return createElement('div', null, createElement(AnalyticsPath, { path: '/from-component' }));
    }
    renderWithChild({ hostname: 'example.com' }, createElement(ScreenComponentFirst));
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('/from-hook')
      })
    );

    fetchSpy.mockClear();
    renderWithChild({ hostname: 'example.com' }, createElement(ScreenHookFirst));
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('/from-hook')
      })
    );
  });

  test('useAnalyticsPath arg change rewrites the override entry', () => {
    mockPathname = '/profile/abc123';
    const { rerender } = renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithHook, { override: '/profile/[id]' })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement(ScreenWithHook, { override: '/profile/[slug]' })
      )
    );

    // Probe via manual event — should reflect the new override.
    function Reader() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('probe');
      }, [event]);
      return null;
    }
    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement('div', null, [
          createElement(ScreenWithHook, { key: 'sw', override: '/profile/[slug]' }),
          createElement(Reader, { key: 'r' })
        ])
      )
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[slug]',
          e: [{ t: 'probe' }]
        })
      })
    );
  });

  test('view(explicitPath) still wins over an active override', () => {
    mockPathname = '/profile/abc123';
    function Screen() {
      useAnalyticsPath('/profile/[id]');
      const { view } = useAnalytics();
      useEffect(() => {
        view('/explicitly-passed');
      }, [view]);
      return null;
    }
    renderWithChild({ hostname: 'example.com' }, createElement(Screen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/explicitly-passed',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('includePages whitelist matches against the override path', () => {
    mockPathname = '/profile/abc123';
    renderWithChild(
      { hostname: 'example.com', includePages: ['/profile/[id]'] },
      createElement(ScreenWithHook, { override: '/profile/[id]' })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('/profile/[id]')
      })
    );
  });
  */
});

describe.skip('useAnalyticsProps / <AnalyticsProps>', () => {
  /*
  function ScreenWithProps({ props }: { props: Record<string, string> }) {
    useAnalyticsProps(props);
    return createElement('div');
  }

  function renderWithChild(config: ExpoAnalyticsConfig, child: ReactNode) {
    return render(providerEl(config, child));
  }

  test('useAnalyticsProps attaches props to auto PageView', () => {
    mockPathname = '/admin/dashboard';
    renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithProps, { props: { section: 'admin' } })
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://collector.onedollarstats.com/events',
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: { section: 'admin' } }]
        })
      })
    );
  });

  test('manual event() merges screen props', () => {
    mockPathname = '/admin/dashboard';
    function ScreenWithPropsAndEvent() {
      useAnalyticsProps({ section: 'admin' });
      const { event } = useAnalytics();
      useEffect(() => {
        event('cta_click');
      }, [event]);
      return createElement('div');
    }
    renderWithChild({ hostname: 'example.com' }, createElement(ScreenWithPropsAndEvent));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'cta_click', p: { section: 'admin' } }]
        })
      })
    );
  });

  test('explicit event(name, props) overrides screen props per key', () => {
    mockPathname = '/admin/dashboard';
    function Screen() {
      useAnalyticsProps({ section: 'admin', tier: 'pro' });
      const { event } = useAnalytics();
      useEffect(() => {
        event('signup', { section: 'override' });
      }, [event]);
      return createElement('div');
    }
    renderWithChild({ hostname: 'example.com' }, createElement(Screen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'signup', p: { section: 'override', tier: 'pro' } }]
        })
      })
    );
  });

  test('explicit event(name, props) merges additively when keys differ', () => {
    mockPathname = '/admin/dashboard';
    function Screen() {
      useAnalyticsProps({ section: 'admin' });
      const { event } = useAnalytics();
      useEffect(() => {
        event('signup', { extra: 'x' });
      }, [event]);
      return createElement('div');
    }
    renderWithChild({ hostname: 'example.com' }, createElement(Screen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'signup', p: { section: 'admin', extra: 'x' } }]
        })
      })
    );
  });

  test('useAnalyticsProps unmount: subsequent events have no p key', () => {
    mockPathname = '/admin/dashboard';
    const { rerender } = renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithProps, { props: { section: 'admin' } })
    );
    fetchSpy.mockClear();

    // Unmount the screen with props, render a probe that fires event()
    function Reader() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('after_unmount');
      }, [event]);
      return null;
    }
    rerender(providerEl({ hostname: 'example.com' }, createElement(Reader)));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'after_unmount' }]
        })
      })
    );
  });

  test('<AnalyticsProps {...}> alone produces the same effect', () => {
    mockPathname = '/admin/dashboard';
    renderWithChild(
      { hostname: 'example.com' },
      createElement(AnalyticsProps, { section: 'admin' })
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: { section: 'admin' } }]
        })
      })
    );
  });

  test('hook wins when both useAnalyticsProps and <AnalyticsProps> present', () => {
    mockPathname = '/admin/dashboard';
    function BothInOneScreen() {
      useAnalyticsProps({ source: 'from-hook' });
      return createElement(AnalyticsProps, { source: 'from-component' });
    }
    renderWithChild({ hostname: 'example.com' }, createElement(BothInOneScreen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: { source: 'from-hook' } }]
        })
      })
    );
  });

  test('navigating away clears the props override', () => {
    mockPathname = '/admin/dashboard';
    const { rerender } = renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithProps, { props: { section: 'admin' } })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Navigate to a screen with no useAnalyticsProps
    mockPathname = '/about';
    rerender(providerEl({ hostname: 'example.com' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/about',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('AppState foreground refire uses the current screen props', () => {
    mockPathname = '/admin/dashboard';
    renderWithChild(
      { hostname: 'example.com' },
      createElement(ScreenWithProps, { props: { section: 'admin' } })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: { section: 'admin' } }]
        })
      })
    );
  });

  test('useAnalyticsProps + useAnalyticsPath coexist independently', () => {
    mockPathname = '/profile/abc123';
    function Screen() {
      useAnalyticsPath('/profile/[id]');
      useAnalyticsProps({ section: 'profile' });
      return createElement('div');
    }
    renderWithChild({ hostname: 'example.com' }, createElement(Screen));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/profile/[id]',
          e: [{ t: 'PageView', p: { section: 'profile' } }]
        })
      })
    );
  });
  */
});

describe.skip('Override APIs — used outside <OneDollarStatsProvider>', () => {
  /*
  test('useAnalyticsPath throws outside provider', () => {
    expect(() => renderHook(() => useAnalyticsPath('/x'))).toThrow(
      /useAnalyticsPath must be used inside <OneDollarStatsProvider>/
    );
  });

  test('<AnalyticsPath> throws outside provider', () => {
    expect(() => render(createElement(AnalyticsPath, { path: '/x' }))).toThrow(
      /AnalyticsPath must be used inside <OneDollarStatsProvider>/
    );
  });

  test('useAnalyticsProps throws outside provider', () => {
    expect(() => renderHook(() => useAnalyticsProps({ a: 'b' }))).toThrow(
      /useAnalyticsProps must be used inside <OneDollarStatsProvider>/
    );
  });

  test('<AnalyticsProps> throws outside provider', () => {
    expect(() => render(createElement(AnalyticsProps, { a: 'b' }))).toThrow(
      /AnalyticsProps must be used inside <OneDollarStatsProvider>/
    );
  });
  */
});

describe.skip('Override APIs — cleanup race-safety', () => {
  /*
  // The unmount cleanup of useAnalyticsPath/useAnalyticsProps does an identity check:
  // it only nulls the override ref if it still equals the entry it originally wrote.
  // The risk it guards against: stale unmount clears a newer entry written by a different hook
  // instance on the same realPath. We can't easily produce that race in a render-based test
  // because React effects unmount in a deterministic order, but we can verify the guard via
  // a contrived scenario: two stacked path hooks where the inner one unmounts first.

  test('useAnalyticsPath cleanup does not clear a newer override entry', () => {
    mockPathname = '/profile/abc123';

    function Inner() {
      useAnalyticsPath('/inner');
      return createElement('div');
    }

    function Outer({ showInner }: { showInner: boolean }) {
      useAnalyticsPath('/outer');
      return showInner ? createElement(Inner) : null;
    }

    const { rerender } = render(
      providerEl({ hostname: 'example.com' }, createElement(Outer, { showInner: true }))
    );
    fetchSpy.mockClear();

    // Unmount Inner only; Outer remains. Outer effect re-runs (no, deps unchanged), but its
    // entry should still win since the rule is: each instance's cleanup only nulls if its own
    // entry is still current. After Inner unmounts, the override should fall back to Outer.
    rerender(
      providerEl({ hostname: 'example.com' }, createElement(Outer, { showInner: false }))
    );

    function Reader() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('probe');
      }, [event]);
      return null;
    }
    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement('div', null, [
          createElement(Outer, { key: 'o', showInner: false }),
          createElement(Reader, { key: 'r' })
        ])
      )
    );

    // The Outer hook re-ran its effect when its children changed? No — its deps (ctx, pathname,
    // customPath) didn't change, so its entry is still the original one written on mount.
    // Acceptable outcomes for this scenario: probe uses /outer (good) OR /profile/abc123
    // (acceptable if Outer's entry was inadvertently cleared by Inner's stale cleanup).
    // We assert the GOOD path: /outer survives.
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/outer',
          e: [{ t: 'probe' }]
        })
      })
    );
  });

  test('useAnalyticsProps cleanup does not clear a newer props override entry', () => {
    mockPathname = '/admin/dashboard';

    function Inner() {
      useAnalyticsProps({ source: 'inner' });
      return createElement('div');
    }

    function Outer({ showInner }: { showInner: boolean }) {
      useAnalyticsProps({ source: 'outer' });
      return showInner ? createElement(Inner) : null;
    }

    const { rerender } = render(
      providerEl({ hostname: 'example.com' }, createElement(Outer, { showInner: true }))
    );
    fetchSpy.mockClear();

    rerender(
      providerEl({ hostname: 'example.com' }, createElement(Outer, { showInner: false }))
    );

    function Reader() {
      const { event } = useAnalytics();
      useEffect(() => {
        event('probe');
      }, [event]);
      return null;
    }
    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement('div', null, [
          createElement(Outer, { key: 'o', showInner: false }),
          createElement(Reader, { key: 'r' })
        ])
      )
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'probe', p: { source: 'outer' } }]
        })
      })
    );
  });
  */
});

describe.skip('Override APIs — component priority edge cases', () => {
  /*
  test('<AnalyticsPath> overwrites a hook entry from a DIFFERENT realPath', () => {
    // Hook wrote entry for old path; we navigate; on the new path, only the component is mounted.
    // The component's guard checks `existing.realPath === pathname` — since old != new, it should
    // proceed to overwrite. This verifies the guard scopes to the current pathname.
    mockPathname = '/old';
    function OldScreen() {
      useAnalyticsPath('/old-template');
      return createElement('div');
    }
    const { rerender } = render(
      providerEl({ hostname: 'example.com' }, createElement(OldScreen))
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    mockPathname = '/new';
    rerender(
      providerEl(
        { hostname: 'example.com' },
        createElement(AnalyticsPath, { path: '/new-template' })
      )
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/new-template',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });

  test('hook beats component for props too (parallel to path)', () => {
    mockPathname = '/admin/dashboard';
    function ScreenComponentFirst() {
      useAnalyticsProps({ source: 'from-hook' });
      return createElement(AnalyticsProps, { source: 'from-component' });
    }
    render(providerEl({ hostname: 'example.com' }, createElement(ScreenComponentFirst)));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"source":"from-hook"')
      })
    );

    fetchSpy.mockClear();

    function ScreenHookSecondaryNest() {
      useAnalyticsProps({ source: 'from-hook' });
      return createElement('div', null, createElement(AnalyticsProps, { source: 'from-component' }));
    }
    render(providerEl({ hostname: 'example.com' }, createElement(ScreenHookSecondaryNest)));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"source":"from-hook"')
      })
    );
  });
  */
});

describe.skip('Override APIs — filtering and empty inputs', () => {
  /*
  test('includePages whitelist excludes an overridden screen whose template is not listed', () => {
    mockPathname = '/profile/abc123';
    function ScreenWithHook() {
      useAnalyticsPath('/profile/[id]');
      return createElement('div');
    }
    render(
      providerEl(
        { hostname: 'example.com', includePages: ['/home'] },
        createElement(ScreenWithHook)
      )
    );

    // The override resolves to /profile/[id], which is NOT in the whitelist → no send.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('excludePages applies to AppState refire of an overridden path', () => {
    mockPathname = '/profile/abc123';
    function ScreenWithHook() {
      useAnalyticsPath('/profile/[id]');
      return createElement('div');
    }
    render(
      providerEl(
        { hostname: 'example.com', excludePages: ['/profile/[id]'] },
        createElement(ScreenWithHook)
      )
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => {
      appStateListeners.forEach(h => h('active'));
    });

    // Refire must also be suppressed because lastPathRef was never set (initial send skipped).
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('useAnalyticsProps({}) results in PageView with no p key', () => {
    mockPathname = '/admin/dashboard';
    function Screen() {
      useAnalyticsProps({});
      return createElement('div');
    }
    render(providerEl({ hostname: 'example.com' }, createElement(Screen)));

    // Empty object → JSON.stringify with spread produces `p: {}`. mergeProps returns `{}` (truthy).
    // The send function uses `...(props && { p: props })` — empty object is truthy, so p IS included.
    // This test documents observed behavior; if a future change strips empty objects, update here.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com/admin/dashboard',
          e: [{ t: 'PageView', p: {} }]
        })
      })
    );
  });

  test('<AnalyticsPath path=""> sends an empty path (no protection)', () => {
    mockPathname = '/profile/abc123';
    render(
      providerEl(
        { hostname: 'example.com' },
        createElement(AnalyticsPath, { path: '' })
      )
    );

    // No client-side guard — empty string is forwarded as-is. Documenting current behavior.
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          u: 'https://example.com',
          e: [{ t: 'PageView' }]
        })
      })
    );
  });
  */
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
          e: [{ t: 'PageView' }]
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
      e: [{ t: 'PageView' }]
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
        e: [{ t: 'PageView' }]
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
          e: [{ t: 'PageView' }]
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
      e: [{ t: 'signup', p: { tier: 'pro' } }]
    });
  });
});
