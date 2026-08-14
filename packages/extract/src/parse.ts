import { parseAsync } from 'oxc-parser';
import {
  PLURAL_FORMS,
  messageId,
  type Message,
  type PluralForm,
  type PluralMessage,
} from '@duckalization/id';
import type { Diagnostic, MessageEntry, SourceRef } from './types.js';

/** Minimal structural view of oxc's ESTree nodes — we only touch a few shapes. */
interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

const PLURAL_FORM_SET: ReadonlySet<string> = new Set(PLURAL_FORMS);

/** Maps byte offsets from the parser to 1-based line/column positions. */
class LineIndex {
  private readonly lineStarts: number[] = [0];

  constructor(text: string) {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10 /* \n */) {
        this.lineStarts.push(i + 1);
      }
    }
  }

  locate(offset: number): { line: number; column: number } {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (this.lineStarts[mid]! <= offset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return { line: low + 1, column: offset - this.lineStarts[low]! + 1 };
  }
}

function isNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AstNode).type === 'string'
  );
}

/** Depth-first walk over every AST node, iteratively to survive deep trees. */
function* walk(root: AstNode): Generator<AstNode> {
  const stack: AstNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    yield node;
    const children: AstNode[] = [];
    for (const key in node) {
      const value = node[key];
      if (isNode(value)) {
        children.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (isNode(item)) {
            children.push(item);
          }
        }
      }
    }
    // Push in reverse so the LIFO stack yields nodes in source order.
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]!);
    }
  }
}

/** Strip TS wrapper expressions (`as const`, `satisfies`, `!`, parens). */
function unwrap(node: AstNode): AstNode {
  let current = node;
  while (
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'ParenthesizedExpression') &&
    isNode(current.expression)
  ) {
    current = current.expression;
  }
  return current;
}

/** Read a static string from a Literal or expressionless TemplateLiteral. */
function staticString(node: AstNode): string | undefined {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral') {
    const expressions = node.expressions as unknown[];
    const quasis = node.quasis as Array<{ value: { cooked?: string; raw: string } }>;
    if (expressions.length === 0 && quasis.length === 1) {
      return quasis[0]!.value.cooked ?? quasis[0]!.value.raw;
    }
  }
  return undefined;
}

/** Static, non-computed property name of an ObjectExpression property. */
function propertyName(prop: AstNode): string | undefined {
  if (prop.type !== 'Property' || prop.computed === true) {
    return undefined;
  }
  const key = prop.key as AstNode;
  if (key.type === 'Identifier') {
    return key.name as string;
  }
  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }
  return undefined;
}

export interface FileExtraction {
  entries: MessageEntry[];
  diagnostics: Diagnostic[];
  /** Total matching calls seen, including invalid ones. */
  calls: number;
}

/**
 * Parse one source file and extract every call to the configured functions.
 * Pure with respect to the filesystem: takes source text, returns data.
 */
export async function extractFromSource(
  file: string,
  source: string,
  functions: readonly string[]
): Promise<FileExtraction> {
  const entries: MessageEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  const functionSet = new Set(functions);
  const index = new LineIndex(source);
  const refAt = (node: AstNode): SourceRef => ({ file, ...index.locate(node.start) });

  const parsed = await parseAsync(file, source);
  for (const error of parsed.errors) {
    diagnostics.push({
      severity: 'error',
      code: 'parse-error',
      message: error.message,
      ref: { file, line: 1, column: 1 },
    });
  }

  const error = (code: Diagnostic['code'], message: string, node: AstNode) => {
    diagnostics.push({ severity: 'error', code, message, ref: refAt(node) });
  };

  for (const node of walk(parsed.program as unknown as AstNode)) {
    if (node.type !== 'CallExpression') continue;
    const callee = node.callee as AstNode;
    if (callee.type !== 'Identifier' || !functionSet.has(callee.name as string)) {
      continue;
    }

    const args = node.arguments as AstNode[];
    const [rawMessageArg, optionsArg] = args;
    if (!rawMessageArg) {
      error('dynamic-message', `${callee.name}() called without a message`, node);
      continue;
    }

    const message = readMessage(unwrap(rawMessageArg), callee.name as string, error);
    if (message === undefined) continue;

    const meta = optionsArg ? readMeta(unwrap(optionsArg), error) : {};
    if (meta === undefined) continue;

    const id = meta.id ?? messageId(message, meta.context);
    entries.push({
      id,
      message,
      context: meta.context,
      explicitId: meta.id !== undefined,
      ref: refAt(node),
    });
  }

  // Count of matched calls = extracted entries + call-level diagnostics emitted above.
  const calls = entries.length + diagnostics.filter((d) => d.code !== 'parse-error').length;
  return { entries, diagnostics, calls };
}

type ErrorFn = (code: Diagnostic['code'], message: string, node: AstNode) => void;

function readMessage(
  node: AstNode,
  fn: string,
  error: ErrorFn
): Message | undefined {
  if (node.type === 'ObjectExpression') {
    return readPlural(node, error);
  }

  const value = staticString(node);
  if (value === undefined) {
    if (node.type === 'TemplateLiteral') {
      error(
        'template-expressions',
        'Template literals with expressions are unlocalizable. Use {placeholder} syntax and pass values in the options object.',
        node
      );
    } else {
      error(
        'dynamic-message',
        `${fn}() message must be a static string or plural object, got ${node.type}`,
        node
      );
    }
    return undefined;
  }

  if (value === '') {
    error('empty-message', `${fn}() called with an empty message`, node);
    return undefined;
  }
  return value;
}

function readPlural(node: AstNode, error: ErrorFn): PluralMessage | undefined {
  const plural: PluralMessage = {};
  for (const prop of node.properties as AstNode[]) {
    const name = propertyName(prop);
    if (name === undefined) {
      error('invalid-plural', 'Plural objects must use plain, non-computed keys', prop);
      return undefined;
    }
    if (!PLURAL_FORM_SET.has(name)) {
      error(
        'invalid-plural',
        `"${name}" is not a plural form (expected one of: ${PLURAL_FORMS.join(', ')})`,
        prop
      );
      return undefined;
    }
    const value = staticString(unwrap(prop.value as AstNode));
    if (value === undefined) {
      error('invalid-plural', `Plural form "${name}" must be a static string`, prop);
      return undefined;
    }
    plural[name as PluralForm] = value;
  }

  if (plural.other === undefined) {
    error('invalid-plural', 'Plural objects must include the "other" form', node);
    return undefined;
  }
  return plural;
}

interface CallMeta {
  context?: string;
  id?: string;
}

/**
 * Read `context` / `id` out of the options object. Other properties are
 * interpolation values and are ignored. A non-object options argument (e.g. a
 * values variable) is fine — it just carries no metadata.
 */
function readMeta(node: AstNode, error: ErrorFn): CallMeta | undefined {
  if (node.type !== 'ObjectExpression') {
    return {};
  }

  const meta: CallMeta = {};
  for (const prop of node.properties as AstNode[]) {
    const name = propertyName(prop);
    if (name !== 'context' && name !== 'id') continue;

    const value = staticString(unwrap(prop.value as AstNode));
    if (value === undefined || value === '') {
      error(
        'invalid-meta',
        `"${name}" must be an inline, non-empty string literal so the extractor can see it`,
        prop
      );
      return undefined;
    }
    meta[name] = value;
  }
  return meta;
}
