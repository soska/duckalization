import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyOutput,
  approve,
  approveGlossary,
  buildBrief,
  glossaryReview,
  invalidateTerm,
  lintLocale,
  pruneLocale,
  reviewOverview,
  translationStatus,
} from '../src/index.js';
import { IDS, setupProject, writeTargetCatalog } from './helpers.js';

const readJson = async (config: { cwd: string }, rel: string) =>
  JSON.parse(await fs.readFile(path.join(config.cwd, rel), 'utf8'));

describe('status', () => {
  it('reports missing and orphaned ids per locale', async () => {
    const config = await setupProject();
    await writeTargetCatalog(config, 'es', {
      [IDS.hello]: 'Hola, {name}',
      stale123: 'Viejo',
    });

    const [es] = await translationStatus(config);
    expect(es?.total).toBe(4);
    expect(es?.translated).toBe(1);
    expect(es?.missing).toHaveLength(3);
    expect(es?.orphaned).toEqual(['stale123']);
  });
});

describe('brief', () => {
  it('builds a self-contained work order', async () => {
    const config = await setupProject();
    const brief = await buildBrief(config, 'es');

    expect(brief.locale).toBe('es');
    expect(brief.entries).toHaveLength(4);
    expect(brief.pluralCategories).toContain('one');
    expect(brief.style).toContain('always tú');
    expect(brief.style).toContain('concise');

    const hello = brief.entries.find((e) => e.id === IDS.hello);
    expect(hello?.source?.[0]).toContain("__('Hello, {name}'");

    expect(brief.glossary['Soundbite']).toEqual({
      doNotTranslate: true,
      note: 'Product feature name',
    });
    expect(brief.glossary['assignment']?.approvedTranslation).toBe('tarea');
  });

  it('only includes glossary terms that appear in the batch', async () => {
    const config = await setupProject();
    await writeTargetCatalog(config, 'es', {
      [IDS.soundbite]: 'Comparte un Soundbite',
      [IDS.assignment]: 'Nueva tarea',
    });
    const brief = await buildBrief(config, 'es');
    expect(brief.entries).toHaveLength(2);
    expect(brief.glossary['Soundbite']).toBeUndefined();
    expect(brief.glossary['assignment']).toBeUndefined();
  });

  it('caps entries with the limit option', async () => {
    const config = await setupProject();
    const brief = await buildBrief(config, 'es', { limit: 2 });
    expect(brief.entries).toHaveLength(2);
  });
});

describe('applyOutput', () => {
  const goodOutput = {
    locale: 'es',
    translations: {
      [IDS.hello]: 'Hola, {name}',
      [IDS.items]: { other: '{count} artículos', one: '{count} artículo' },
      [IDS.soundbite]: 'Comparte un Soundbite',
      [IDS.assignment]: 'Nueva tarea',
    },
    notes: {
      [IDS.hello]: { confidence: 'high' as const, note: 'tú-form' },
    },
  };

  it('merges valid output with sorted keys and normalized plural order', async () => {
    const config = await setupProject();
    const result = await applyOutput(config, goodOutput, { by: 'test-agent', at: '2026-08-14' });

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.applied).toBe(4);

    const catalog = await readJson(config, 'locales/es.json');
    expect(Object.keys(catalog)).toEqual([...Object.keys(catalog)].sort());
    expect(Object.keys(catalog[IDS.items])).toEqual(['one', 'other']);

    const sidecar = await readJson(config, 'locales/es.review.json');
    expect(sidecar[IDS.hello]).toMatchObject({
      status: 'machine',
      by: 'test-agent',
      at: '2026-08-14',
      confidence: 'high',
      note: 'tú-form',
    });
  });

  it('rejects unknown ids and writes nothing', async () => {
    const config = await setupProject();
    const result = await applyOutput(config, {
      locale: 'es',
      translations: { invented999: 'Hola' },
    });
    expect(result.diagnostics[0]?.code).toBe('unknown-id');
    expect(result.applied).toBe(0);
    await expect(fs.access(path.join(config.cwd, 'locales/es.json'))).rejects.toThrow();
  });

  it('enforces do-not-translate glossary terms as errors', async () => {
    const config = await setupProject();
    const result = await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.soundbite]: 'Comparte un fragmento de audio' },
    });
    expect(result.diagnostics[0]?.code).toBe('glossary-dnt');
    expect(result.applied).toBe(0);
  });

  it('warns (but applies) when an approved glossary term is not used', async () => {
    const config = await setupProject();
    const result = await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.assignment]: 'Nueva asignación' },
    });
    expect(result.diagnostics[0]).toMatchObject({ severity: 'warning', code: 'glossary-term' });
    expect(result.applied).toBe(1);
  });

  it('rejects invented placeholders, warns on dropped ones', async () => {
    const config = await setupProject();
    const bad = await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.hello]: 'Hola, {nombre}' },
    });
    expect(bad.diagnostics.map((d) => d.code).sort()).toEqual([
      'missing-placeholder',
      'unknown-placeholder',
    ]);
    expect(bad.applied).toBe(0);

    const dropped = await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.items]: { one: 'un artículo', other: '{count} artículos' } },
    });
    expect(dropped.diagnostics).toEqual([]);
    expect(dropped.applied).toBe(1);
  });

  it('validates plural shape against the locale', async () => {
    const config = await setupProject();

    const missingOther = await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.items]: { one: '{count} artículo' } },
    });
    expect(missingOther.diagnostics.some((d) => d.code === 'missing-other')).toBe(true);

    const typeMismatch = await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.items]: '{count} artículos' },
    });
    expect(typeMismatch.diagnostics[0]?.code).toBe('type-mismatch');

    const impossibleForm = await applyOutput(config, {
      locale: 'ja',
      translations: { [IDS.items]: { one: '{count}個', other: '{count}個' } },
    });
    expect(
      impossibleForm.diagnostics.some((d) => d.code === 'unexpected-plural-form')
    ).toBe(true);
  });
});

describe('prune', () => {
  it('archives and removes orphans from catalog and sidecar', async () => {
    const config = await setupProject();
    await applyOutput(config, {
      locale: 'es',
      translations: { [IDS.hello]: 'Hola, {name}' },
    });
    const catalog = await readJson(config, 'locales/es.json');
    catalog.stale123 = 'Viejo';
    await writeTargetCatalog(config, 'es', catalog);

    const result = await pruneLocale(config, 'es');
    expect(result.removed).toEqual(['stale123']);

    const pruned = await readJson(config, 'locales/es.json');
    expect(pruned.stale123).toBeUndefined();
    expect(pruned[IDS.hello]).toBe('Hola, {name}');

    const archive = await readJson(config, 'locales/.archive/es.json');
    expect(archive.stale123).toBe('Viejo');
  });
});

describe('review', () => {
  it('tracks machine status, detects hand edits, and records approvals', async () => {
    const config = await setupProject();
    await applyOutput(config, {
      locale: 'es',
      translations: {
        [IDS.hello]: 'Hola, {name}',
        [IDS.soundbite]: 'Comparte un Soundbite',
      },
    });

    let overview = await reviewOverview(config, 'es');
    expect(overview.counts.machine).toBe(2);

    // Hand-edit one entry directly in the catalog.
    const catalog = await readJson(config, 'locales/es.json');
    catalog[IDS.hello] = 'Qué onda, {name}';
    await writeTargetCatalog(config, 'es', catalog);

    overview = await reviewOverview(config, 'es');
    expect(overview.entries[IDS.hello]).toBe('edited');
    expect(overview.entries[IDS.soundbite]).toBe('machine');

    const result = await approve(config, 'es', { by: 'armando' });
    expect(result.approved).toHaveLength(2);

    overview = await reviewOverview(config, 'es');
    expect(overview.counts.approved).toBe(2);
  });
});

describe('lint', () => {
  it('surfaces glossary violations and orphans in existing catalogs', async () => {
    const config = await setupProject();
    await writeTargetCatalog(config, 'es', {
      [IDS.soundbite]: 'Comparte un fragmento',
      stale123: 'Viejo',
    });

    const diagnostics = await lintLocale(config, 'es');
    const codes = diagnostics.map((d) => d.code).sort();
    expect(codes).toEqual(['glossary-dnt', 'orphaned-id']);
  });
});

describe('glossary review', () => {
  const writeGlossary = (config: { cwd: string }, glossary: unknown) =>
    fs.writeFile(path.join(config.cwd, 'locales/glossary.json'), JSON.stringify(glossary));

  it('starts with every term pending and records sign-off', async () => {
    const config = await setupProject();

    let review = await glossaryReview(config, 'es');
    expect(review.terms.map((t) => [t.term, t.status])).toEqual([
      ['Soundbite', 'new'],
      ['assignment', 'new'],
    ]);
    expect(review.pending).toEqual(['Soundbite', 'assignment']);

    const partial = await approveGlossary(config, 'es', {
      terms: ['assignment', 'nope'],
      by: 'armando',
      at: '2026-09-18',
    });
    expect(partial).toEqual({ approved: ['assignment'], unknown: ['nope'] });
    expect((await glossaryReview(config, 'es')).pending).toEqual(['Soundbite']);

    await approveGlossary(config, 'es');
    review = await glossaryReview(config, 'es');
    expect(review.pending).toEqual([]);

    const sidecar = await readJson(config, 'locales/es.glossary-review.json');
    expect(sidecar.assignment).toMatchObject({
      translation: 'tarea',
      by: 'armando',
      at: '2026-09-18',
    });
  });

  it('flags changed and added terms, per locale', async () => {
    const config = await setupProject();
    await approveGlossary(config, 'es');
    await approveGlossary(config, 'pt');

    await writeGlossary(config, {
      Soundbite: { translate: false, note: 'Product feature name' },
      assignment: {
        note: 'A homework unit a teacher assigns',
        translations: { es: 'actividad' },
      },
      milestone: { translations: { es: 'meta' } },
    });

    const es = await glossaryReview(config, 'es');
    expect(es.pending).toEqual(['assignment', 'milestone']);
    expect(es.terms.find((t) => t.term === 'assignment')).toMatchObject({
      status: 'changed',
      translation: 'actividad',
      approvedTranslation: 'tarea',
    });

    // Only the es translation changed — pt's approval of "assignment" stands.
    expect((await glossaryReview(config, 'pt')).pending).toEqual(['milestone']);
  });
});

describe('glossary invalidate', () => {
  it('resets review state of entries whose English source uses the term', async () => {
    const config = await setupProject();
    await applyOutput(config, {
      locale: 'es',
      translations: {
        [IDS.hello]: 'Hola, {name}',
        // "tarea" here is unrelated to the glossary term — must not be swept in.
        [IDS.soundbite]: 'Comparte un Soundbite como tarea',
        [IDS.assignment]: 'Nueva tarea',
      },
    });
    await approve(config, 'es');

    const dry = await invalidateTerm(config, 'es', 'assignment', { dryRun: true });
    expect(dry.affected).toEqual([IDS.assignment]);
    expect(dry.reset).toEqual([IDS.assignment]);
    expect((await reviewOverview(config, 'es')).counts.approved).toBe(3);

    const result = await invalidateTerm(config, 'es', 'assignment');
    expect(result.reset).toEqual([IDS.assignment]);

    const overview = await reviewOverview(config, 'es');
    expect(overview.entries[IDS.assignment]).toBe('unreviewed');
    expect(overview.entries[IDS.soundbite]).toBe('approved');
    expect(overview.entries[IDS.hello]).toBe('approved');

    // The translation itself is untouched; a second run has nothing to reset.
    expect((await readJson(config, 'locales/es.json'))[IDS.assignment]).toBe('Nueva tarea');
    const again = await invalidateTerm(config, 'es', 'assignment');
    expect(again.affected).toEqual([IDS.assignment]);
    expect(again.reset).toEqual([]);
  });

  it('rejects terms that are not in the glossary', async () => {
    const config = await setupProject();
    await expect(invalidateTerm(config, 'es', 'asignment')).rejects.toThrow(/not in the glossary/);
  });
});
