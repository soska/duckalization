/**
 * Regional locales ('es-MX') inherit per-language settings ('es') — the same
 * fallback rule the runtime uses for catalog lookup, so tooling and runtime
 * agree on what "es" covers.
 */
export function baseLanguage(locale: string): string {
  return locale.split('-')[0]!;
}

/** Most general first: `'es-MX'` → `['es', 'es-MX']`, `'es'` → `['es']`. */
export function localeChain(locale: string): string[] {
  const base = baseLanguage(locale);
  return base === locale ? [locale] : [base, locale];
}

/** A per-locale value, falling back from the exact locale to its base language. */
export function forLocale<T>(
  values: Record<string, T> | undefined,
  locale: string
): T | undefined {
  if (!values) return undefined;
  return values[locale] ?? values[baseLanguage(locale)];
}
