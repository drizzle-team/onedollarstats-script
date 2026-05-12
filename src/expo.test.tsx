import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render, renderHook, act } from '@testing-library/react';

// usePathname is mutable per-test
let mockPathname = '/home';

vi.mock('expo-router', () => ({
  usePathname: () => mockPathname
}));

// Capture AppState handler so tests can drive it
const appStateListeners: Array<(state: string) => void> = [];
const removeMock = vi.fn();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
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
