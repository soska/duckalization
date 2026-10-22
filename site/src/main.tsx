import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/base.css';
import { Index } from './Index.tsx';

// Each direction is its own chunk, so judging one never loads the others.
const routes: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  '/a': lazy(() => import('./directions/a/Page.tsx')),
  '/b': lazy(() => import('./directions/b/Page.tsx')),
  '/c': lazy(() => import('./directions/c/Page.tsx')),
  '/d': lazy(() => import('./directions/d/Page.tsx')),
  '/e': lazy(() => import('./directions/e/Page.tsx')),
};

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Route = routes[path];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{Route ? <Route /> : <Index />}</Suspense>
  </StrictMode>
);
