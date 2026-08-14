/**
 * Compile-time assertions for the placeholder typing, verified by
 * `pnpm typecheck`. This file is never executed.
 */
import { createDuck } from '../src/index.js';

const { __ } = createDuck();

// Plain messages need no options.
__('Sign in');

// Placeholders in the literal require matching values.
__('Welcome back, {name}', { name: 'Ada' });
__('{done} of {total}', { done: 1, total: 10 });

// @ts-expect-error — '{name}' placeholder demands options
__('Welcome back, {name}');

// @ts-expect-error — 'name' value is missing from the options
__('Welcome back, {name}', { context: 'header' });

// Metadata keys ride along with values.
__('Book', { context: 'verb' });
__('Checkout', { id: 'checkout.cta' });

// Plural messages require count.
__({ one: '{count} item', other: '{count} items' }, { count: 3 });

// @ts-expect-error — plural calls demand a count
__({ one: '{count} item', other: '{count} items' });
