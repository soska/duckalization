// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { messageId } from '@duckalization/id';
import {
  createDuck,
  DuckProvider,
  useDuck,
  useLocale,
  type Duck,
} from '../src/index.js';

function Greeting() {
  const { __ } = useDuck();
  return <h1>{__('Hello')}</h1>;
}

function LocaleSwitcher() {
  const [locale, setLocale] = useLocale();
  return <button onClick={() => setLocale('es')}>current: {locale}</button>;
}

const withProvider = (duck: Duck, ui: ReactNode) =>
  render(<DuckProvider duck={duck}>{ui}</DuckProvider>);

const heading = () => screen.getByRole('heading').textContent;

const newDuck = () => {
  const duck = createDuck({ onMissing: false });
  duck.load('es', { [messageId('Hello')]: 'Hola' });
  return duck;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DuckProvider + useDuck', () => {
  it('renders source-locale text', () => {
    withProvider(newDuck(), <Greeting />);
    expect(heading()).toBe('Hello');
  });

  it('re-renders when the locale changes', () => {
    const duck = newDuck();
    withProvider(duck, <Greeting />);

    act(() => duck.setLocale('es'));
    expect(heading()).toBe('Hola');

    act(() => duck.setLocale('en'));
    expect(heading()).toBe('Hello');
  });

  it('re-renders when a catalog arrives after mount (lazy loading)', () => {
    const duck = createDuck({ onMissing: false });
    duck.setLocale('fr');
    withProvider(duck, <Greeting />);
    expect(heading()).toBe('Hello');

    act(() => duck.load('fr', { [messageId('Hello')]: 'Bonjour' }));
    expect(heading()).toBe('Bonjour');
  });

  it('throws a clear error outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Greeting />)).toThrow(/requires a <DuckProvider>/);
  });
});

describe('useLocale', () => {
  it('reads and sets the active locale', async () => {
    const duck = newDuck();
    withProvider(
      duck,
      <>
        <Greeting />
        <LocaleSwitcher />
      </>
    );

    expect(screen.getByRole('button').textContent).toBe('current: en');
    await act(async () => screen.getByRole('button').click());
    expect(screen.getByRole('button').textContent).toBe('current: es');
    expect(heading()).toBe('Hola');
  });
});
