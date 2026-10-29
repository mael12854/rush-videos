import { useEffect, useState } from 'react';

export type Route = { path: string[]; query: URLSearchParams };

function parse(): Route {
  const [p, q] = window.location.pathname.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(window.location.search || q) };
}

export function navigate(to: string, replace = false) {
  if (to === window.location.pathname + window.location.search) return;
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.dispatchEvent(new Event('rush:nav'));
  window.scrollTo(0, 0);
}

export function useRoute() {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => setR(parse());
    window.addEventListener('popstate', on);
    window.addEventListener('rush:nav', on);
    return () => {
      window.removeEventListener('popstate', on);
      window.removeEventListener('rush:nav', on);
    };
  }, []);
  return r;
}
