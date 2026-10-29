import { useEffect, useState } from 'react';

export type Route = { path: string[]; query: URLSearchParams };

function parse(): Route {
  const [p, q] = window.location.pathname.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(window.location.search || q) };
}

export function navigate(to: string, replace = false) {
  if (to === window.location.pathname + window.location.search) return;
  // inApp : on peut revenir en arrière sans quitter le site.
  const inApp = replace ? !!history.state?.inApp : true;
  if (replace) history.replaceState({ inApp }, '', to);
  else history.pushState({ inApp }, '', to);
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

export function goBackOr(fallback: string) {
  if (history.state?.inApp) history.back();
  else navigate(fallback, true);
}
