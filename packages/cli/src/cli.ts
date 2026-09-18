#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pc from 'picocolors';
import { extract, writeOutputs, type Diagnostic } from '@duckalization/extract';
import {
  applyOutput,
  approve,
  approveGlossary,
  buildBrief,
  glossaryReview,
  invalidateTerm,
  lintLocale,
  pruneLocale,
  resolveTranslateConfig,
  reviewOverview,
  translationStatus,
  writeBrief,
  type TranslateConfig,
  type TranslateDiagnostic,
  type TranslationOutput,
} from '@duckalization/translate';

const HELP = `duckalize — content-addressed i18n tooling

Usage:
  duckalize extract                     Scan source, write <outDir>/<locale>.json + .meta.json
  duckalize translate status            Missing/orphaned counts per target locale
  duckalize translate check             Exit 1 if any target locale has missing entries (CI)
  duckalize translate brief [locale…]   Write work orders to <outDir>/.work/<locale>.brief.json
  duckalize translate apply <file…>     Validate agent output and merge into catalogs
  duckalize translate prune [locale…]   Archive and remove orphaned entries
  duckalize translate lint [locale…]    Run apply-time checks over existing catalogs
  duckalize review status [locale…]     Review-state counts (machine/approved/edited/unreviewed)
  duckalize review approve <locale>     Record sign-off (all entries, or --id per entry)
  duckalize glossary review [locale…]   Show glossary terms + approval state; sign off with
                                        --approve or --approve-term (brief/apply require it)
  duckalize glossary invalidate <term> [locale…]
                                        Reset review state of every translation whose English
                                        source uses <term> (after changing its translation)

Options:
  --cwd <path>      Project root (default: current directory)
  --config <path>   Config file (default: duckalization.config.json if present)
  --out-dir <path>  Override output directory (extract)
  --dry-run         Report, but write nothing (extract, glossary invalidate)
  --silent          Only print errors
  --limit <n>       Cap entries per brief
  --by <name>       Recorded as translator/approver in review metadata
  --id <id>         Restrict approve to specific IDs (repeatable)
  --approve         Sign off on the whole glossary for the given locale(s)
  --approve-term <term>  Sign off on specific glossary terms (repeatable)
  -h, --help        Show this help
`;

function printExtractDiagnostic(d: Diagnostic): void {
  const label = d.severity === 'error' ? pc.red(`error[${d.code}]`) : pc.yellow(`warning[${d.code}]`);
  const where = d.ref ? pc.cyan(` ${d.ref.file}:${d.ref.line}:${d.ref.column}`) : '';
  console.error(`${label}${where}\n  ${d.message}\n`);
}

function printTranslateDiagnostic(d: TranslateDiagnostic): void {
  const label = d.severity === 'error' ? pc.red(`error[${d.code}]`) : pc.yellow(`warning[${d.code}]`);
  const id = d.id ? pc.cyan(` ${d.id}`) : '';
  console.error(`${label}${id} — ${d.message}`);
}

interface Flags {
  cwd?: string;
  config?: string;
  'out-dir'?: string;
  'dry-run'?: boolean;
  silent?: boolean;
  limit?: string;
  by?: string;
  id?: string[];
  approve?: boolean;
  'approve-term'?: string[];
  help?: boolean;
}

async function runExtract(flags: Flags): Promise<number> {
  const result = await extract(
    {
      ...(flags.cwd && { cwd: flags.cwd }),
      ...(flags['out-dir'] && { outDir: flags['out-dir'] }),
    },
    flags.config
  );

  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  for (const d of flags.silent ? errors : result.diagnostics) printExtractDiagnostic(d);

  const { files, calls, messages, durationMs } = result.stats;
  const summary = `${messages} unique message${messages === 1 ? '' : 's'} from ${calls} call${calls === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'} (${durationMs.toFixed(0)}ms)`;

  if (errors.length > 0) {
    console.error(pc.red(`✗ ${errors.length} error${errors.length === 1 ? '' : 's'} — nothing written.`));
    return 1;
  }
  if (flags['dry-run']) {
    if (!flags.silent) console.log(`${pc.yellow('dry-run')} ${summary}`);
    return 0;
  }
  const paths = await writeOutputs(result, result.config);
  if (!flags.silent) {
    console.log(`${pc.green('✓')} ${summary} → ${pc.cyan(path.relative(result.config.cwd, paths.catalogPath))}`);
  }
  return 0;
}

async function translateConfigFrom(flags: Flags): Promise<TranslateConfig> {
  return resolveTranslateConfig(
    { ...(flags.cwd && { cwd: flags.cwd }) },
    flags.config
  );
}

function targetLocales(config: TranslateConfig, positionals: string[]): string[] {
  if (positionals.length > 0) return positionals;
  if (config.targetLocales.length === 0) {
    throw new Error(
      'No target locales: pass them as arguments or set "targetLocales" in duckalization.config.json'
    );
  }
  return config.targetLocales;
}

/**
 * The glossary is the thing you get right first: a wrong term is wrong in
 * every string that uses it, so bulk translation waits for human sign-off.
 */
async function glossaryGate(config: TranslateConfig, locale: string): Promise<boolean> {
  const { pending } = await glossaryReview(config, locale);
  if (pending.length === 0) return true;
  console.error(
    pc.red(
      `✗ ${locale}: ${pending.length} glossary term${pending.length === 1 ? '' : 's'} not approved (${pending.join(', ')}).`
    )
  );
  console.error(
    pc.gray(`  Proofread them, then sign off: duckalize glossary review ${locale} --approve`)
  );
  return false;
}

async function runTranslate(sub: string, positionals: string[], flags: Flags): Promise<number> {
  const config = await translateConfigFrom(flags);

  switch (sub) {
    case 'status':
    case 'check': {
      const statuses = await translationStatus(config, positionals.length ? positionals : undefined);
      let missingTotal = 0;
      for (const s of statuses) {
        missingTotal += s.missing.length;
        const missing = s.missing.length > 0 ? pc.yellow(`${s.missing.length} missing`) : pc.green('complete');
        const orphans = s.orphaned.length > 0 ? pc.red(` ${s.orphaned.length} orphaned`) : '';
        console.log(`${pc.bold(s.locale)}: ${s.translated}/${s.total} translated, ${missing}${orphans}`);
      }
      if (sub === 'check' && missingTotal > 0) {
        console.error(pc.red(`✗ ${missingTotal} missing translation${missingTotal === 1 ? '' : 's'}.`));
        return 1;
      }
      return 0;
    }

    case 'brief': {
      let blocked = false;
      let written = 0;
      for (const locale of targetLocales(config, positionals)) {
        const brief = await buildBrief(config, locale, {
          ...(flags.limit && { limit: Number(flags.limit) }),
        });
        if (brief.entries.length === 0) {
          console.log(`${pc.bold(locale)}: nothing to translate`);
          continue;
        }
        if (!(await glossaryGate(config, locale))) {
          blocked = true;
          continue;
        }
        const briefPath = await writeBrief(config, brief);
        written++;
        console.log(
          `${pc.bold(locale)}: ${brief.entries.length} entr${brief.entries.length === 1 ? 'y' : 'ies'} → ${pc.cyan(path.relative(config.cwd, briefPath))}`
        );
      }
      if (written > 0) {
        console.log(pc.gray('Translate each brief per its "instructions", then: duckalize translate apply <output.json>'));
      }
      return blocked ? 1 : 0;
    }

    case 'apply': {
      if (positionals.length === 0) {
        console.error(pc.red('apply needs at least one output file.'));
        return 1;
      }
      let failed = false;
      for (const file of positionals) {
        const output = JSON.parse(await fs.readFile(path.resolve(file), 'utf8')) as TranslationOutput;
        if (!(await glossaryGate(config, output.locale))) {
          failed = true;
          continue;
        }
        const result = await applyOutput(config, output, {
          ...(flags.by && { by: flags.by }),
        });
        for (const d of result.diagnostics) printTranslateDiagnostic(d);
        if (result.applied > 0) {
          console.log(
            `${pc.green('✓')} ${pc.bold(output.locale)}: ${result.applied} entr${result.applied === 1 ? 'y' : 'ies'} applied → ${pc.cyan(path.relative(config.cwd, result.catalogPath!))}`
          );
        } else {
          console.error(pc.red(`✗ ${output.locale}: rejected — nothing written.`));
          failed = true;
        }
      }
      return failed ? 1 : 0;
    }

    case 'prune': {
      for (const locale of targetLocales(config, positionals)) {
        const result = await pruneLocale(config, locale);
        if (result.removed.length === 0) {
          console.log(`${pc.bold(locale)}: no orphans`);
        } else {
          console.log(
            `${pc.bold(locale)}: ${result.removed.length} orphan${result.removed.length === 1 ? '' : 's'} archived → ${pc.cyan(path.relative(config.cwd, result.archivePath!))}`
          );
        }
      }
      return 0;
    }

    case 'lint': {
      let hasErrors = false;
      for (const locale of targetLocales(config, positionals)) {
        const diagnostics = await lintLocale(config, locale);
        if (diagnostics.length === 0) {
          console.log(`${pc.bold(locale)}: ${pc.green('clean')}`);
          continue;
        }
        console.log(pc.bold(locale));
        for (const d of diagnostics) printTranslateDiagnostic(d);
        hasErrors ||= diagnostics.some((d) => d.severity === 'error');
      }
      return hasErrors ? 1 : 0;
    }

    default:
      console.error(pc.red(`Unknown translate subcommand "${sub}".`));
      console.log(HELP);
      return 1;
  }
}

async function runReview(sub: string, positionals: string[], flags: Flags): Promise<number> {
  const config = await translateConfigFrom(flags);

  switch (sub) {
    case 'status': {
      for (const locale of targetLocales(config, positionals)) {
        const { counts } = await reviewOverview(config, locale);
        console.log(
          `${pc.bold(locale)}: ${pc.green(`${counts.approved} approved`)}, ${counts.machine} machine, ${pc.yellow(`${counts.edited} edited`)}, ${counts.unreviewed} unreviewed`
        );
      }
      return 0;
    }

    case 'approve': {
      const locale = positionals[0];
      if (!locale) {
        console.error(pc.red('approve needs a locale.'));
        return 1;
      }
      const result = await approve(config, locale, {
        ...(flags.id?.length && { ids: flags.id }),
        ...(flags.by && { by: flags.by }),
      });
      for (const id of result.unknown) {
        console.error(pc.yellow(`warning: ${id} is not in the ${locale} catalog`));
      }
      console.log(`${pc.green('✓')} ${result.approved.length} entr${result.approved.length === 1 ? 'y' : 'ies'} approved in ${pc.bold(locale)}`);
      return 0;
    }

    default:
      console.error(pc.red(`Unknown review subcommand "${sub}".`));
      console.log(HELP);
      return 1;
  }
}

const GLOSSARY_STATUS_LABEL = {
  approved: pc.green('approved'),
  changed: pc.yellow('changed'),
  new: pc.yellow('new'),
} as const;

function printTable(rows: string[][]): void {
  // Pad on the uncolored text so ANSI codes don't skew the columns.
  const plain = (cell: string) => cell.replace(/\x1b\[[0-9;]*m/g, '');
  const widths = rows[0]!.map((_, col) => Math.max(...rows.map((row) => plain(row[col]!).length)));
  for (const row of rows) {
    const cells = row.map((cell, col) => cell + ' '.repeat(widths[col]! - plain(cell).length));
    console.log(`  ${cells.join('  ').trimEnd()}`);
  }
}

async function runGlossary(sub: string, positionals: string[], flags: Flags): Promise<number> {
  const config = await translateConfigFrom(flags);

  switch (sub) {
    case 'review': {
      const approving = flags.approve || Boolean(flags['approve-term']?.length);
      if (approving && positionals.length === 0) {
        console.error(pc.red('Approving needs explicit locale(s): duckalize glossary review <locale> --approve'));
        return 1;
      }

      let unknownTerms = false;
      for (const locale of targetLocales(config, positionals)) {
        if (approving) {
          const result = await approveGlossary(config, locale, {
            ...(!flags.approve && { terms: flags['approve-term']! }),
            ...(flags.by && { by: flags.by }),
          });
          for (const term of result.unknown) {
            console.error(pc.yellow(`warning: "${term}" is not in the glossary`));
            unknownTerms = true;
          }
        }

        const review = await glossaryReview(config, locale);
        if (review.terms.length === 0) {
          console.log(`${pc.bold(locale)}: glossary is empty — nothing to approve`);
          continue;
        }
        console.log(pc.bold(locale));
        printTable([
          ['TERM', 'TRANSLATION', 'STATUS', 'NOTE'].map((h) => pc.gray(h)),
          ...review.terms.map((t) => [
            t.term,
            t.doNotTranslate
              ? pc.gray('(verbatim)')
              : (t.translation ?? pc.gray('—')) +
                (t.approvedTranslation ? pc.gray(` (was: ${t.approvedTranslation})`) : ''),
            GLOSSARY_STATUS_LABEL[t.status],
            t.note ?? '',
          ]),
        ]);
        if (review.pending.length === 0) {
          console.log(`${pc.green('✓')} all ${review.terms.length} terms approved`);
        } else {
          console.log(
            pc.yellow(
              `${review.pending.length} of ${review.terms.length} terms need sign-off — translate brief/apply are blocked for ${locale}.`
            )
          );
          console.log(
            pc.gray(`  duckalize glossary review ${locale} --approve   (or --approve-term <term>)`)
          );
        }
      }
      return unknownTerms ? 1 : 0;
    }

    case 'invalidate': {
      const [term, ...locales] = positionals;
      if (!term) {
        console.error(pc.red('invalidate needs a glossary term.'));
        return 1;
      }
      const dryRun = Boolean(flags['dry-run']);
      for (const locale of targetLocales(config, locales)) {
        const result = await invalidateTerm(config, locale, term, { dryRun });
        const n = result.affected.length;
        if (n === 0) {
          console.log(`${pc.bold(locale)}: no translated entries use "${term}"`);
          continue;
        }
        const already = n - result.reset.length;
        console.log(
          `${dryRun ? pc.yellow('dry-run') : pc.green('✓')} ${pc.bold(locale)}: ${n} entr${n === 1 ? 'y uses' : 'ies use'} "${term}" — ${result.reset.length} ${dryRun ? 'would be ' : ''}reset to unreviewed${already > 0 ? `, ${already} already unreviewed` : ''}`
        );
        for (const id of result.affected) console.log(`  ${pc.cyan(id)}`);
      }
      if (!dryRun) {
        console.log(pc.gray('Fix the affected translations (translate lint flags them), then: duckalize review approve <locale>'));
      }
      return 0;
    }

    default:
      console.error(pc.red(`Unknown glossary subcommand "${sub}".`));
      console.log(HELP);
      return 1;
  }
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      cwd: { type: 'string' },
      config: { type: 'string' },
      'out-dir': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      silent: { type: 'boolean', default: false },
      limit: { type: 'string' },
      by: { type: 'string' },
      id: { type: 'string', multiple: true },
      approve: { type: 'boolean', default: false },
      'approve-term': { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const flags = values as Flags;

  const [command, sub, ...rest] = positionals;
  if (flags.help || command === undefined) {
    console.log(HELP);
    return flags.help ? 0 : 1;
  }

  switch (command) {
    case 'extract':
      return runExtract(flags);
    case 'translate':
      return runTranslate(sub ?? 'status', sub === undefined ? [] : rest, flags);
    case 'review':
      return runReview(sub ?? 'status', sub === undefined ? [] : rest, flags);
    case 'glossary':
      return runGlossary(sub ?? 'review', sub === undefined ? [] : rest, flags);
    default:
      console.error(pc.red(`Unknown command "${command}".`));
      console.log(HELP);
      return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(pc.red('Failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
);
