#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import pc from 'picocolors';
import { extract } from './index.js';
import { writeOutputs } from './emit.js';
import type { Diagnostic } from './types.js';

const HELP = `duckalize — content-addressed i18n tooling

Usage:
  duckalize extract [options]

Options:
  --cwd <path>      Project root (default: current directory)
  --config <path>   Config file (default: duckalization.config.json if present)
  --out-dir <path>  Override output directory
  --dry-run         Extract and report, but write nothing
  --silent          Only print errors
  -h, --help        Show this help
`;

function printDiagnostic(diagnostic: Diagnostic): void {
  const label =
    diagnostic.severity === 'error'
      ? pc.red(`error[${diagnostic.code}]`)
      : pc.yellow(`warning[${diagnostic.code}]`);
  const where = diagnostic.ref
    ? pc.cyan(` ${diagnostic.ref.file}:${diagnostic.ref.line}:${diagnostic.ref.column}`)
    : '';
  console.error(`${label}${where}\n  ${diagnostic.message}\n`);
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
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const command = positionals[0];
  if (values.help || command === undefined) {
    console.log(HELP);
    return values.help ? 0 : 1;
  }
  if (command !== 'extract') {
    console.error(pc.red(`Unknown command "${command}".`));
    console.log(HELP);
    return 1;
  }

  const result = await extract(
    {
      ...(values.cwd && { cwd: values.cwd }),
      ...(values['out-dir'] && { outDir: values['out-dir'] }),
    },
    values.config
  );

  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  const warnings = result.diagnostics.filter((d) => d.severity === 'warning');
  for (const diagnostic of values.silent ? errors : result.diagnostics) {
    printDiagnostic(diagnostic);
  }

  const { files, calls, messages, durationMs } = result.stats;
  const summary =
    `${messages} unique message${messages === 1 ? '' : 's'} ` +
    `from ${calls} call${calls === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'} ` +
    `(${durationMs.toFixed(0)}ms)`;

  if (errors.length > 0) {
    console.error(
      pc.red(`✗ ${errors.length} error${errors.length === 1 ? '' : 's'} — nothing written.`)
    );
    return 1;
  }

  if (values['dry-run']) {
    if (!values.silent) {
      console.log(`${pc.yellow('dry-run')} ${summary}`);
    }
    return 0;
  }

  const paths = await writeOutputs(result, result.config);
  if (!values.silent) {
    const shown = path.relative(result.config.cwd, paths.catalogPath);
    console.log(`${pc.green('✓')} ${summary} → ${pc.cyan(shown)}`);
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(pc.red('Extraction failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
);
