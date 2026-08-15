import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Duck } from '@duckalization/runtime';

// Apps depending on @duckalization/react need nothing else installed.
export { createDuck } from '@duckalization/runtime';
export type {
  Catalog,
  Duck,
  DuckConfig,
  Message,
  MissingHandler,
  PluralMessage,
  TranslateFn,
} from '@duckalization/runtime';

const DuckContext = createContext<Duck | null>(null);

export interface DuckProviderProps {
  duck: Duck;
  children?: ReactNode;
}

/**
 * Provides a Duck instance to the tree. Create the instance at module scope
 * in client apps, or per request on the server, and pass it in — the provider
 * deliberately doesn't own creation, so SSR isolation stays in the app's hands.
 */
export function DuckProvider({ duck, children }: DuckProviderProps) {
  return createElement(DuckContext.Provider, { value: duck }, children);
}

/**
 * The provided Duck instance, subscribed to locale/catalog changes: any
 * component calling this re-renders when `setLocale` or `load` fires.
 *
 *   const { __ } = useDuck();
 *   return <h1>{__('Sign in')}</h1>;
 *
 * The destructured `__` is the bare identifier the extractor scans for.
 */
export function useDuck(): Duck {
  const duck = useContext(DuckContext);
  if (!duck) {
    throw new Error('useDuck() requires a <DuckProvider> above it in the tree');
  }
  useSyncExternalStore(duck.subscribe, duck.getVersion, duck.getVersion);
  return duck;
}

/** Current locale plus a setter — a locale switcher in one line. */
export function useLocale(): [string, (locale: string) => void] {
  const duck = useDuck();
  return [duck.getLocale(), duck.setLocale];
}
