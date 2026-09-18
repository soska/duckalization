import type { Rule } from 'eslint';

/**
 * Attributes flagged by default: the ARIA ones are human-facing by spec, the
 * rest are the HTML attributes browsers render as user-visible text. Override
 * with `attributes`, or extend with `additionalAttributes` for design-system
 * props (`tooltip`, `heading`, …).
 */
export const DEFAULT_ATTRIBUTES = [
  'alt',
  'title',
  'placeholder',
  'label',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
] as const;

interface RuleOptions {
  attributes?: string[];
  additionalAttributes?: string[];
  ignore?: string[];
}

type NodeRange = [number, number];

interface BaseNode {
  type: string;
  range: NodeRange;
  parent?: BaseNode;
}

interface JSXTextNode extends BaseNode {
  type: 'JSXText';
  value: string;
}

interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: unknown;
}

interface TemplateLiteralNode extends BaseNode {
  type: 'TemplateLiteral';
  expressions: unknown[];
  quasis: Array<{ value: { cooked: string | null } }>;
}

interface JSXExpressionContainerNode extends BaseNode {
  type: 'JSXExpressionContainer';
  expression: BaseNode;
}

interface JSXAttributeNode extends BaseNode {
  type: 'JSXAttribute';
  name:
    | { type: 'JSXIdentifier'; name: string }
    | {
        type: 'JSXNamespacedName';
        namespace: { name: string };
        name: { name: string };
      };
  value: BaseNode | null;
}

const HTML_ENTITY = /&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#[xX][\da-fA-F]+);/g;

/** JSX renders interior newline runs as a single space; mirror that. */
function collapseJsxText(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ').trim();
}

/** The literal text of a string-ish expression node, or null if it isn't one. */
function stringValue(node: BaseNode): string | null {
  if (node.type === 'Literal') {
    const value = (node as LiteralNode).value;
    return typeof value === 'string' ? value : null;
  }
  if (node.type === 'TemplateLiteral') {
    const tpl = node as TemplateLiteralNode;
    if (tpl.expressions.length === 0 && tpl.quasis.length === 1) {
      return tpl.quasis[0]?.value.cooked ?? null;
    }
  }
  return null;
}

function quote(text: string): string {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `'${escaped}'`;
}

function preview(text: string): string {
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
}

export const noUnlocalizedStrings: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag hardcoded JSX text and human-facing attribute strings that will ship unlocalizable; suggests wrapping them in __()',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          attributes: { type: 'array', items: { type: 'string' } },
          additionalAttributes: { type: 'array', items: { type: 'string' } },
          ignore: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      jsxText:
        'Hardcoded text "{{text}}" will ship unlocalizable — wrap it in __().',
      attribute:
        'Hardcoded {{attribute}} "{{text}}" will ship unlocalizable — wrap it in __().',
      wrap: 'Wrap in __()',
    },
  },

  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const attributes = new Set([
      ...(options.attributes ?? DEFAULT_ATTRIBUTES),
      ...(options.additionalAttributes ?? []),
    ]);
    const ignore = (options.ignore ?? []).map(
      (pattern) => new RegExp(pattern, 'u')
    );
    const { sourceCode } = context;

    // Human-text heuristic: at least one letter once HTML entities are gone,
    // and no match against the user's ignore patterns. Punctuation, numbers,
    // and interpolation glue never trip the rule.
    function looksLikeHumanText(text: string): boolean {
      if (!/\p{L}/u.test(text.replace(HTML_ENTITY, ' '))) return false;
      return !ignore.some((pattern) => pattern.test(text));
    }

    function reportRange(
      range: NodeRange,
      text: string,
      messageId: 'jsxText' | 'attribute',
      attribute?: string
    ): void {
      context.report({
        loc: {
          start: sourceCode.getLocFromIndex(range[0]),
          end: sourceCode.getLocFromIndex(range[1]),
        },
        messageId,
        data: { text: preview(text), attribute: attribute ?? '' },
        suggest: [
          {
            messageId: 'wrap',
            fix: (fixer) =>
              fixer.replaceTextRange(range, `{__(${quote(text)})}`),
          },
        ],
      });
    }

    return {
      JSXText(node: JSXTextNode) {
        const text = collapseJsxText(node.value);
        if (!looksLikeHumanText(text)) return;
        // Report and fix only the trimmed span, so surrounding indentation
        // stays outside the wrapper.
        const leading = node.value.length - node.value.trimStart().length;
        const trailing = node.value.length - node.value.trimEnd().length;
        reportRange(
          [node.range[0] + leading, node.range[1] - trailing],
          text,
          'jsxText'
        );
      },

      // String literals in children position: <Label>{'board'}</Label>
      JSXExpressionContainer(node: JSXExpressionContainerNode) {
        const parentType = node.parent?.type;
        if (parentType !== 'JSXElement' && parentType !== 'JSXFragment') return;
        const text = stringValue(node.expression);
        if (text === null || !looksLikeHumanText(text)) return;
        reportRange(node.range, text, 'jsxText');
      },

      JSXAttribute(node: JSXAttributeNode) {
        const name =
          node.name.type === 'JSXNamespacedName'
            ? `${node.name.namespace.name}:${node.name.name.name}`
            : node.name.name;
        if (!attributes.has(name) || !node.value) return;

        let text: string | null = null;
        if (node.value.type === 'Literal') {
          text = stringValue(node.value);
        } else if (node.value.type === 'JSXExpressionContainer') {
          text = stringValue(
            (node.value as JSXExpressionContainerNode).expression
          );
        }
        if (text === null || !looksLikeHumanText(text)) return;
        reportRange(node.value.range, text, 'attribute', name);
      },
    } as Rule.RuleListener;
  },
};
