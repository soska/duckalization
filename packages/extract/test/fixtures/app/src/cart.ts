declare function __(message: string | Record<string, string>, options?: Record<string, unknown>): string;

export function cartSummary(count: number): string {
  const items = __({ one: '{count} item', other: '{count} items' }, { count });
  const stable = __(`Checkout`, { id: 'checkout.cta' });
  return `${items} — ${stable}`;
}
