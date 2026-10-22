/*
 * The token files, read as data for the /design guide, so the guide can't
 * drift from them. Mirrors scripts/build-tokens.mjs: same flattening (group
 * $type is inherited), same CSS variable names.
 */
import effectsJson from './tokens/effects.tokens.json';
import primitivesJson from './tokens/primitives.tokens.json';
import darkJson from './tokens/theme.dark.tokens.json';
import lightJson from './tokens/theme.light.tokens.json';
import typographyJson from './tokens/typography.tokens.json';

export type Token = {
  /** Dotted JSON path, which is also the Figma name with `/` (`color.text.muted`). */
  path: string;
  type: string;
  value: unknown;
  description?: string;
  extensions: Record<string, unknown>;
  unit?: string;
};

type Tree = { [key: string]: unknown };

const UNIT = 'dev.duckalization.cssUnit';
export const FLUID = 'dev.duckalization.fluid';
export const STRETCH = 'dev.duckalization.fontStretch';

function flatten(tree: Tree): Token[] {
  const out: Token[] = [];
  const walk = (node: Tree, path: string[], type?: string, unit?: string) => {
    const ext = (node.$extensions ?? {}) as Record<string, unknown>;
    const groupType = (node.$type as string | undefined) ?? type;
    const groupUnit = (ext[UNIT] as string | undefined) ?? unit;
    if ('$value' in node) {
      out.push({
        path: path.join('.'),
        type: groupType ?? 'unknown',
        value: node.$value,
        description: node.$description as string | undefined,
        extensions: ext,
        unit: groupUnit,
      });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith('$')) walk(child as Tree, [...path, key], groupType, groupUnit);
    }
  };
  walk(tree, []);
  return out;
}

export const primitives = flatten(primitivesJson as Tree);
export const light = flatten(lightJson as Tree);
export const dark = flatten(darkJson as Tree);
export const typography = flatten(typographyJson as Tree);
export const effects = flatten(effectsJson as Tree);

/** `font.lineHeight.130` → `--dk-font-line-height-130`, as the generator names it. */
export const cssVar = (path: string) => `--dk-${path.replaceAll('.', '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const REF = /^\{([^}]+)\}$/;
const byPath = new Map([...primitives, ...light].map((t) => [t.path, t]));

/** The referenced path of a `{a.b}` value, or undefined for a literal. */
export const refOf = (value: unknown) => (typeof value === 'string' ? REF.exec(value)?.[1] : undefined);

/** Follows references down to a primitive's literal value. */
export function resolve(value: unknown): unknown {
  const ref = refOf(value);
  if (!ref) return value;
  const target = byPath.get(ref);
  return target ? resolve(target.value) : value;
}

/** Tokens under a path prefix (`space`, `color.brown`). */
export const under = (tokens: Token[], prefix: string) => tokens.filter((t) => t.path.startsWith(`${prefix}.`));

/** The last path segment (`space.1_5` → `1_5`). */
export const leaf = (path: string) => path.slice(path.lastIndexOf('.') + 1);

/** Pixel value of a dimension like `6px` (0 if it isn't one). */
export const px = (value: unknown) => (typeof value === 'string' && value.endsWith('px') ? parseFloat(value) : 0);
