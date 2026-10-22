#!/usr/bin/env node
// Builds src/design/tokens.css from the DTCG token files in src/design/tokens.
//
//   node scripts/build-tokens.mjs           write tokens.css
//   node scripts/build-tokens.mjs --check   exit 1 if tokens.css is stale (CI)
//
// References ({color.brown.900}) become var() chains, so the dark theme only
// reassigns the semantic layer. Fails loudly on unknown references, untyped
// tokens, or light/dark theme files whose keys differ.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const TOKENS = 'src/design/tokens';
const OUT = 'src/design/tokens.css';
const PREFIX = 'dk';
const FLUID = 'dev.duckalization.fluid';
const STRETCH = 'dev.duckalization.fontStretch';
const UNIT = 'dev.duckalization.cssUnit';

const load = (name) => JSON.parse(readFileSync(root(`${TOKENS}/${name}.tokens.json`), 'utf8'));

/** Flatten a DTCG tree into Map<path, {type, value, extensions, unit}>, inheriting group $type. */
function flatten(tree, file) {
  const out = new Map();
  const walk = (node, path, type, unit) => {
    const groupType = node.$type ?? type;
    const groupUnit = node.$extensions?.[UNIT] ?? unit;
    if ('$value' in node) {
      if (!groupType) throw new Error(`${file}: token ${path.join('.')} has no $type`);
      out.set(path.join('.'), { type: groupType, value: node.$value, extensions: node.$extensions ?? {}, unit: groupUnit });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      walk(child, [...path, key], groupType, groupUnit);
    }
  };
  walk(tree, [], undefined, undefined);
  return out;
}

const primitives = flatten(load('primitives'), 'primitives');
const light = flatten(load('theme.light'), 'theme.light');
const dark = flatten(load('theme.dark'), 'theme.dark');
const typography = flatten(load('typography'), 'typography');
const effects = flatten(load('effects'), 'effects');

// Light and dark must describe the same roles.
const onlyIn = (a, b) => [...a.keys()].filter((k) => !b.has(k));
const drift = [...onlyIn(light, dark).map((k) => `only in light: ${k}`), ...onlyIn(dark, light).map((k) => `only in dark: ${k}`)];
if (drift.length) throw new Error(`Theme files disagree:\n  ${drift.join('\n  ')}`);

const known = new Set([...primitives.keys(), ...light.keys(), ...typography.keys(), ...effects.keys()]);
// JSON paths keep Figma's camelCase (lineHeight); CSS names are kebab-case (line-height).
const cssVar = (path) => `--${PREFIX}-${path.replaceAll('.', '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
const REF = /^\{([^}]+)\}$/;

/** A single value: references become var(), everything else is formatted by type. */
function format(value, type, unit, where) {
  if (typeof value === 'string' && REF.test(value)) {
    const target = value.match(REF)[1];
    if (!known.has(target)) throw new Error(`${where}: unknown reference {${target}}`);
    return `var(${cssVar(target)})`;
  }
  switch (type) {
    case 'fontFamily':
      return (Array.isArray(value) ? value : [value]).map((f) => (/\s/.test(f) ? `'${f}'` : f)).join(', ');
    case 'cubicBezier':
      return `cubic-bezier(${value.join(', ')})`;
    case 'number':
    case 'fontWeight':
      return unit ? `${value}${unit}` : String(value);
    default:
      return String(value);
  }
}

const decls = (entries) => entries.map(([name, value]) => `  ${name}: ${value};`).join('\n');

// :root primitives
const primitiveDecls = [...primitives].map(([path, t]) => [cssVar(path), format(t.value, t.type, t.unit, path)]);

// Theme (light on :root, dark via media query and [data-theme])
const themeDecls = (map) => [...map].map(([path, t]) => [cssVar(path), format(t.value, t.type, t.unit, path)]);

// Typography: one var per property, plus a utility class per style.
const typeDecls = [];
const typeClasses = [];
for (const [path, t] of typography) {
  const name = path.replace(/^text\./, '').replaceAll('.', '-');
  const base = `--${PREFIX}-text-${name}`;
  const v = t.value;
  const fluid = t.extensions[FLUID];
  const size = fluid
    ? `clamp(${format(fluid.min, 'dimension', null, path)}, ${fluid.vw}vw, ${format(fluid.max, 'dimension', null, path)})`
    : format(v.fontSize, 'dimension', null, path);
  const props = [
    ['family', format(v.fontFamily, 'fontFamily', null, path), 'font-family'],
    ['weight', format(v.fontWeight, 'fontWeight', null, path), 'font-weight'],
    ['size', size, 'font-size'],
    ['line-height', format(v.lineHeight, 'number', null, path), 'line-height'],
  ];
  if (v.letterSpacing) props.push(['letter-spacing', format(v.letterSpacing, 'dimension', null, path), 'letter-spacing']);
  if (t.extensions[STRETCH]) props.push(['stretch', format(t.extensions[STRETCH], 'number', null, path), 'font-stretch']);
  for (const [prop, value] of props) typeDecls.push([`${base}-${prop}`, value]);
  typeClasses.push(`.${PREFIX}-text-${name} {\n${props.map(([prop, , css]) => `  ${css}: var(${base}-${prop});`).join('\n')}\n}`);
}

// Effects: shadows keep their color as a var, so they follow the theme.
const effectDecls = [...effects].map(([path, t]) => {
  const s = t.value;
  const part = (k, type) => format(s[k], type, null, path);
  return [cssVar(path), `${part('offsetX')} ${part('offsetY')} ${part('blur')} ${part('spread')} ${part('color', 'color')}`];
});

const indent = (block) => block.replace(/^/gm, '  ');

const breakpoints = [...primitives].filter(([p]) => p.startsWith('breakpoint.')).map(([p, t]) => `${p} = ${t.value}`);

const css = `/* generated by scripts/build-tokens.mjs — do not edit. Source: ${TOKENS}/*.tokens.json */
/* Breakpoints (media queries can't read custom properties; CSS uses these literals):
   ${breakpoints.join('\n   ')} */

${'/*'} Primitives and type never change with the theme. ${'*/'}
:root {
${decls(primitiveDecls)}

${decls(typeDecls)}
}

${'/*'} Theme roles and effects, declared on :root and on any [data-theme] subtree,
   so a section can render in the other mode (the /design guide does). Effects
   are repeated per theme because their color var resolves where it's declared. ${'*/'}
:root,
[data-theme='light'] {
  color-scheme: light;
${decls(themeDecls(light))}

${decls(effectDecls)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
${indent(decls(themeDecls(dark)))}

${indent(decls(effectDecls))}
  }
}

[data-theme='dark'] {
  color-scheme: dark;
${decls(themeDecls(dark))}

${decls(effectDecls)}
}

${typeClasses.join('\n\n')}
`;

const outPath = root(OUT);
if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(outPath, 'utf8');
  } catch {}
  if (current !== css) {
    console.error(`${OUT} is stale: run \`npm run tokens\` in site/.`);
    process.exit(1);
  }
  console.log(`${OUT} is up to date.`);
} else {
  writeFileSync(outPath, css);
  console.log(`wrote ${OUT} (${primitives.size} primitives, ${light.size} theme roles × 2 modes, ${typography.size} text styles, ${effects.size} effects)`);
}
