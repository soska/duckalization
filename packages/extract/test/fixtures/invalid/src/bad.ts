declare function __(message: string | Record<string, string>, options?: Record<string, unknown>): string;

export function bad(name: string, greeting: string) {
  const a = __(`Hello ${name}`);
  const b = __(greeting);
  const c = __({ single: 'nope', other: 'ok' });
  const d = __('');
  return [a, b, c, d];
}
