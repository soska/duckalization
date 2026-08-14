import { extractFromSource, type Diagnostic } from '@duckalization/extract';
import MagicString from 'magic-string';
import { createUnplugin, type UnpluginInstance } from 'unplugin';

export interface DuckalizationPluginOptions {
  /** Translation function names to rewrite. Default: ['__']. */
  functions?: string[];
  /** Files to transform. Default: any .js/.jsx/.ts/.tsx (and c/m variants). */
  include?: RegExp;
  /** Files to skip. Default: /node_modules/. */
  exclude?: RegExp;
  /**
   * Fail the build on unextractable calls instead of warning. Default false:
   * a dynamic call still works at runtime (it hashes and falls back), it just
   * can't be pre-baked — `duckalize extract` is the strict gate.
   */
  failOnError?: boolean;
}

export interface InjectResult {
  /** Rewritten source, or null when no call needed injection. */
  code: string | null;
  map: ReturnType<MagicString['generateMap']> | null;
  diagnostics: Diagnostic[];
  injected: number;
}

/**
 * Rewrite `__('msg')` to `__('msg', undefined, "<id>")` (and two-argument
 * calls to `__('msg', opts, "<id>")`) so the runtime skips hashing entirely
 * and the hash function tree-shakes out of client bundles. Calls that already
 * have three arguments are left alone, which makes the transform idempotent.
 */
export async function injectIds(
  code: string,
  file: string,
  functions: readonly string[]
): Promise<InjectResult> {
  const { entries, diagnostics } = await extractFromSource(file, code, functions);
  const edits = entries.filter((entry) => entry.call.argCount < 3);
  if (edits.length === 0) {
    return { code: null, map: null, diagnostics, injected: 0 };
  }

  const s = new MagicString(code);
  for (const entry of edits) {
    const idLiteral = JSON.stringify(entry.id);
    s.appendRight(
      entry.call.argsEnd,
      entry.call.argCount === 1 ? `, undefined, ${idLiteral}` : `, ${idLiteral}`
    );
  }

  return {
    code: s.toString(),
    map: s.generateMap({ hires: true, source: file }),
    diagnostics,
    injected: edits.length,
  };
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const where = diagnostic.ref
    ? ` ${diagnostic.ref.file}:${diagnostic.ref.line}:${diagnostic.ref.column}`
    : '';
  return `[duckalization] ${diagnostic.code}${where} — ${diagnostic.message}`;
}

const DEFAULT_INCLUDE = /\.[cm]?[jt]sx?$/;
const DEFAULT_EXCLUDE = /node_modules/;

export const DuckalizationPlugin: UnpluginInstance<
  DuckalizationPluginOptions | undefined
> = createUnplugin((options = {}) => {
  const functions = options.functions ?? ['__'];
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;

  return {
    name: 'duckalization',

    transformInclude(id) {
      const path = id.split('?')[0]!;
      return include.test(path) && !exclude.test(path);
    },

    async transform(code, id) {
      // Cheap pre-filter: skip files that can't possibly contain a call.
      if (!functions.some((fn) => code.includes(fn))) {
        return null;
      }

      const file = id.split('?')[0]!;
      const result = await injectIds(code, file, functions);

      for (const diagnostic of result.diagnostics) {
        const message = formatDiagnostic(diagnostic);
        if (options.failOnError) {
          this.error(message);
        } else {
          this.warn(message);
        }
      }

      return result.code === null ? null : { code: result.code, map: result.map };
    },
  };
});

export default DuckalizationPlugin;
