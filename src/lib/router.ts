import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'library'; query?: string }
  | { name: 'project'; slug: string }
  | { name: 'about' }
  | { name: 'admin' }
  | { name: 'not-found'; path: string };

// Fired whenever `navigate()` changes the URL via pushState/replaceState.
// The native `popstate` event only fires for back/forward, not for
// history.pushState() calls, so we need our own event to keep every
// useRouter() instance in sync when navigation happens programmatically.
const ROUTE_CHANGE_EVENT = 'immaculate:routechange';

function parse(): Route {
  const parts = window.location.pathname.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'library' && parts.length === 1) {
    const q = new URLSearchParams(window.location.search).get('q');
    return { name: 'library', query: q || undefined };
  }
  if (parts[0] === 'about' && parts.length === 1) return { name: 'about' };
  if (parts[0] === 'admin' && parts.length === 1) return { name: 'admin' };
  if (parts[0] === 'p' && parts[1]) return { name: 'project', slug: decodeURIComponent(parts[1]) };

  return { name: 'not-found', path: window.location.pathname };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parse());

  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onChange);
    window.addEventListener(ROUTE_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, onChange);
    };
  }, []);

  return route;
}

/**
 * Navigate to a clean, SEO-friendly path (e.g. "/p/my-project") using the
 * History API instead of a `#/` hash fragment. Falls back to a full page
 * load if the History API is unavailable for some reason.
 */
export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (typeof window.history?.pushState !== 'function') {
    window.location.assign(path);
    return;
  }

  const url = path.startsWith('/') ? path : `/${path}`;

  if (opts.replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }

  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

/** Builds an absolute, canonical URL for a given app-relative path. */
export function absoluteUrl(path: string): string {
  const base = 'https://immaculate.eu.cc';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Turns a route into its canonical app path, e.g. { name: 'project', slug: 'x' } -> '/p/x' */
export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'library':
      return route.query ? `/library?q=${encodeURIComponent(route.query)}` : '/library';
    case 'about':
      return '/about';
    case 'admin':
      return '/admin';
    case 'project':
      return `/p/${route.slug}`;
    case 'not-found':
      return route.path;
  }
}
