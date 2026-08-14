import { describe, expect, it, vi } from 'vitest';
import { messageId } from '@duckalization/id';
import { createDuck } from '../src/index.js';

describe('createDuck', () => {
  it('returns inline text for the source locale without any catalog', () => {
    const { __ } = createDuck();
    expect(__('Sign in')).toBe('Sign in');
    expect(__('Welcome back, {name}', { name: 'Ada' })).toBe('Welcome back, Ada');
  });

  it('looks up translations by content-derived id', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', { [messageId('Sign in')]: 'Iniciar sesión' });
    duck.setLocale('es');
    expect(duck.__('Sign in')).toBe('Iniciar sesión');
  });

  it('distinguishes contexts', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', {
      [messageId('Book')]: 'Libro',
      [messageId('Book', 'verb')]: 'Reservar',
    });
    duck.setLocale('es');
    expect(duck.__('Book')).toBe('Libro');
    expect(duck.__('Book', { context: 'verb' })).toBe('Reservar');
  });

  it('honors explicit and injected ids', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', { 'checkout.cta': 'Pagar', injected123: 'Guardar' });
    duck.setLocale('es');
    expect(duck.__('Checkout', { id: 'checkout.cta' })).toBe('Pagar');
    expect(duck.__('Save', undefined, 'injected123')).toBe('Guardar');
  });

  it('falls back to the inline message and reports missing entries', () => {
    const onMissing = vi.fn();
    const duck = createDuck({ onMissing });
    duck.setLocale('es');
    expect(duck.__('Untranslated')).toBe('Untranslated');
    expect(onMissing).toHaveBeenCalledWith(messageId('Untranslated'), 'Untranslated', 'es');
  });

  it('interpolates the translated text, not the source', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', { [messageId('Welcome back, {name}')]: 'Bienvenido, {name}' });
    duck.setLocale('es');
    expect(duck.__('Welcome back, {name}', { name: 'Ada' })).toBe('Bienvenido, Ada');
  });

  it('selects plural forms with Intl.PluralRules', () => {
    const { __ } = createDuck();
    const items = { one: '{count} item', other: '{count} items' };
    expect(__(items, { count: 1 })).toBe('1 item');
    expect(__(items, { count: 2 })).toBe('2 items');
  });

  it('uses the target locale plural rules, including forms English lacks', () => {
    const duck = createDuck({ onMissing: false });
    const source = { one: '{count} day', other: '{count} days' };
    duck.load('ru', {
      [messageId(source)]: {
        one: '{count} день',
        few: '{count} дня',
        many: '{count} дней',
        other: '{count} дня',
      },
    });
    duck.setLocale('ru');
    expect(duck.__(source, { count: 1 })).toBe('1 день');
    expect(duck.__(source, { count: 3 })).toBe('3 дня');
    expect(duck.__(source, { count: 5 })).toBe('5 дней');
  });

  it('falls back from a regional locale to its base language', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', { [messageId('Sign in')]: 'Iniciar sesión' });
    duck.setLocale('es-MX');
    expect(duck.__('Sign in')).toBe('Iniciar sesión');
  });

  it('accumulates catalogs across load calls', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', { [messageId('One')]: 'Uno' });
    duck.load('es', { [messageId('Two')]: 'Dos' });
    duck.setLocale('es');
    expect(duck.__('One')).toBe('Uno');
    expect(duck.__('Two')).toBe('Dos');
  });

  it('notifies subscribers on locale and catalog changes', () => {
    const duck = createDuck({ onMissing: false });
    const listener = vi.fn();
    const unsubscribe = duck.subscribe(listener);

    duck.setLocale('es');
    duck.setLocale('es');
    duck.load('es', {});
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    duck.setLocale('fr');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps instances isolated', () => {
    const a = createDuck({ onMissing: false });
    const b = createDuck({ onMissing: false });
    a.setLocale('es');
    expect(a.getLocale()).toBe('es');
    expect(b.getLocale()).toBe('en');
  });

  it('works with a destructured __', () => {
    const duck = createDuck({ onMissing: false });
    duck.load('es', { [messageId('Hello')]: 'Hola' });
    duck.setLocale('es');
    const { __ } = duck;
    expect(__('Hello')).toBe('Hola');
  });
});
