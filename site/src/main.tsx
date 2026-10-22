import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/base.css';

// The landing page is the site. The round-1 explorations stay under /explore
// for reference; each is its own chunk, so the landing page never loads them.
const Landing = lazy(() => import('./landing/Page.tsx'));
const Explore = lazy(() => import('./Index.tsx').then((m) => ({ default: m.Index })));

const directions: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  a: lazy(() => import('./directions/a/Page.tsx')),
  b: lazy(() => import('./directions/b/Page.tsx')),
  c: lazy(() => import('./directions/c/Page.tsx')),
  d: lazy(() => import('./directions/d/Page.tsx')),
  e: lazy(() => import('./directions/e/Page.tsx')),
  f: lazy(() => import('./directions/f/Page.tsx')),
  g: lazy(() => import('./directions/g/Page.tsx')),
  i: lazy(() => import('./directions/i/Page.tsx')),
};

function route(path: string): React.LazyExoticComponent<() => React.JSX.Element> {
  if (path === '/explore') return Explore;
  const match = /^\/explore\/([a-z])$/.exec(path);
  return (match && directions[match[1]!]) || Landing;
}

const Route = route(window.location.pathname.replace(/\/+$/, '') || '/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Route />
    </Suspense>
  </StrictMode>
);
