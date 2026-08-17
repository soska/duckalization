import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noUnlocalizedStrings } from '../src/no-unlocalized-strings.js';

// Vitest runs with globals off, so hand RuleTester its test hooks explicitly.
const hooks = RuleTester as unknown as {
  describe: unknown;
  it: unknown;
  itOnly: unknown;
};
hooks.describe = describe;
hooks.it = it;
hooks.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-unlocalized-strings', noUnlocalizedStrings, {
  valid: [
    // Already localized
    "<Label>{__('board')}</Label>",
    "<input placeholder={__('Search')} />",
    // Machine-facing attributes are ignored by default
    '<div className="board" />',
    '<div data-testid="main-panel" id="root" />',
    '<a href="/settings" target="_blank" />',
    // Non-human text: no letters once entities are stripped
    '<span>·</span>',
    '<span>&nbsp;</span>',
    '<span>&#8212;</span>',
    '<b>42</b>',
    '<p>{count}</p>',
    '<p> </p>',
    // Dynamic values are the runtime's problem, not the linter's
    '<Label>{name}</Label>',
    '<img alt={imageAlt} />',
    '<p>{`Hello ${name}`}</p>',
    // Empty attribute values
    '<option label="" />',
    // ignore patterns
    {
      code: '<span>DUCK-123</span>',
      options: [{ ignore: ['^DUCK-\\d+$'] }],
    },
    // attributes option replaces the default list entirely
    {
      code: '<input placeholder="Search" />',
      options: [{ attributes: ['tooltip'] }],
    },
  ],

  invalid: [
    {
      code: '<Label>board</Label>',
      errors: [
        {
          messageId: 'jsxText',
          data: { text: 'board', attribute: '' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<Label>{__('board')}</Label>",
            },
          ],
        },
      ],
    },
    {
      // Surrounding whitespace stays outside the wrapper; interior newlines
      // collapse to a space, matching what JSX renders.
      code: '<p>\n  Hello\n  world\n</p>',
      errors: [
        {
          messageId: 'jsxText',
          data: { text: 'Hello world', attribute: '' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<p>\n  {__('Hello world')}\n</p>",
            },
          ],
        },
      ],
    },
    {
      // Apostrophes are escaped in the suggested wrapper
      code: "<p>It's here</p>",
      errors: [
        {
          messageId: 'jsxText',
          suggestions: [
            {
              messageId: 'wrap',
              output: "<p>{__('It\\'s here')}</p>",
            },
          ],
        },
      ],
    },
    {
      // Text split around a child element reports each fragment
      code: '<p>Hello <b>world</b></p>',
      errors: [
        {
          messageId: 'jsxText',
          data: { text: 'Hello', attribute: '' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<p>{__('Hello')} <b>world</b></p>",
            },
          ],
        },
        {
          messageId: 'jsxText',
          data: { text: 'world', attribute: '' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<p>Hello <b>{__('world')}</b></p>",
            },
          ],
        },
      ],
    },
    {
      // String literal in children position
      code: "<Label>{'board'}</Label>",
      errors: [
        {
          messageId: 'jsxText',
          suggestions: [
            {
              messageId: 'wrap',
              output: "<Label>{__('board')}</Label>",
            },
          ],
        },
      ],
    },
    {
      code: '<input placeholder="Search" />',
      errors: [
        {
          messageId: 'attribute',
          data: { text: 'Search', attribute: 'placeholder' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<input placeholder={__('Search')} />",
            },
          ],
        },
      ],
    },
    {
      code: '<button aria-label="Close" />',
      errors: [
        {
          messageId: 'attribute',
          data: { text: 'Close', attribute: 'aria-label' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<button aria-label={__('Close')} />",
            },
          ],
        },
      ],
    },
    {
      // Expression-container attribute values are unwrapped and rewrapped
      code: "<img alt={'A duck'} />",
      errors: [
        {
          messageId: 'attribute',
          data: { text: 'A duck', attribute: 'alt' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<img alt={__('A duck')} />",
            },
          ],
        },
      ],
    },
    {
      // Template literal without expressions counts as a hardcoded string
      code: '<img alt={`A duck`} />',
      errors: [
        {
          messageId: 'attribute',
          suggestions: [
            {
              messageId: 'wrap',
              output: "<img alt={__('A duck')} />",
            },
          ],
        },
      ],
    },
    {
      code: '<Button tooltip="Save" />',
      options: [{ additionalAttributes: ['tooltip'] }],
      errors: [
        {
          messageId: 'attribute',
          data: { text: 'Save', attribute: 'tooltip' },
          suggestions: [
            {
              messageId: 'wrap',
              output: "<Button tooltip={__('Save')} />",
            },
          ],
        },
      ],
    },
  ],
});
