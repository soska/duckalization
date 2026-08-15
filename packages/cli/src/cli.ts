#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pc from 'picocolors';
import { extract, writeOutputs, type Diagnostic } from '@duckalization/extract';
import {
  applyOutput,
  approve,
  buildBrief,
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

Options:
  --cwd <path>      Project root (default: current directory)
  --config <path>   Config file (default: duckalization.config.json if present)
  --out-dir <path>  Override output directory (extract)
  --dry-run         Extract and report, but write nothing
  --silent          Only print errors
  --limit <n>       Cap entries per brief
  --by <name>       Recorded as translator/approver in review metadata
  --id <id>         Restrict approve to specific IDs (repeatable)
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
      for (const locale of targetLocales(config, positionals)) {
        const brief = await buildBrief(config, locale, {
          ...(flags.limit && { limit: Number(flags.limit) }),
        });
        if (brief.entries.length === 0) {
          console.log(`${pc.bold(locale)}: nothing to translate`);
          continue;
        }
        const briefPath = await writeBrief(config, brief);
        console.log(
          `${pc.bold(locale)}: ${brief.entries.length} entr${brief.entries.length === 1 ? 'y' : 'ies'} → ${pc.cyan(path.relative(config.cwd, briefPath))}`
        );
      }
      console.log(pc.gray('Translate each brief per its "instructions", then: duckalize translate apply <output.json>'));
      return 0;
    }

    case 'apply': {
      if (positionals.length === 0) {
        console.error(pc.red('apply needs at least one output file.'));
        return 1;
      }
      let failed = false;
      for (const file of positionals) {
        const output = JSON.parse(await fs.readFile(path.resolve(file), 'utf8')) as TranslationOutput;
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
