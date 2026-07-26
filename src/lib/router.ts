import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'project'; slug: string }
  | { name: 'about' }
  | { name: 'admin' };

function parse(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'library') return { name: 'library' };
  if (parts[0] === 'about') return { name: 'about' };
  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'p' && parts[1]) return { name: 'project', slug: parts[1] };
  return { name: 'home' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parse());

  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}
