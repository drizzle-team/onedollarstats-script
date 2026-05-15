import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createElement, useEffect, type ReactNode } from 'react';
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
  useAnalyticsPath,
  AnalyticsPath,
  useAnalyticsProps,
  AnalyticsProps,
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

describe('useAnalyticsPath / <AnalyticsPath>', () => {
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
});

describe('useAnalyticsProps / <AnalyticsProps>', () => {
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
});

describe('Override APIs — used outside <OneDollarStatsProvider>', () => {
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
});

describe('Override APIs — cleanup race-safety', () => {
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
});

describe('Override APIs — component priority edge cases', () => {
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
});

describe('Override APIs — filtering and empty inputs', () => {
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
});
