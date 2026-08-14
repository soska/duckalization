const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Replace `{name}` placeholders with values from the options bag.
 * Unknown placeholders are left as-is; `context`/`id` are metadata, never values.
 */
export function interpolate(
  template: string,
  values?: Record<string, unknown>
): string {
  if (!values || !template.includes('{')) {
    return template;
  }
  return template.replace(PLACEHOLDER, (match, name: string) => {
    if (name === 'context' || name === 'id') return match;
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}
