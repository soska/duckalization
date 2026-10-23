import type { ReactNode } from 'react';
import { createDuck, useDuck, type Message } from '../shared/real.ts';
import { ES_CATALOG } from './es.ts';

export const duck = createDuck({ sourceLocale: 'en', onMissing: false });
duck.load('es', ES_CATALOG);

type Options = Record<string, unknown>;
type Translate = (message: Message, options?: Options) => string;

/** Keep calls as bare __ / __s identifiers so the extractor can read them. */
export function useT() {
  const live = useDuck();
  const locale = live.getLocale();
  return {
    __: (message: Message, options?: Options): ReactNode => (
      <span key={locale} className="localized">{(live.__ as Translate)(message, options)}</span>
    ),
    __s: (message: Message, options?: Options): string => (live.__ as Translate)(message, options),
  };
}
