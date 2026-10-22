# Design tokens

The source of truth for the site's visual language, in [W3C design-token
format](https://design-tokens.github.io/community-group/format/) (DTCG:
`$value`, `$type`, `$description`, references as `{group.token}`).
`scripts/build-tokens.mjs` turns them into `src/design/tokens.css`. Never edit
that file by hand.

```bash
npm run tokens          # regenerate tokens.css (in site/)
npm run build           # fails first if tokens.css is stale (build-tokens --check)
```

## Files → Figma

| File | Figma | CSS |
| --- | --- | --- |
| `primitives.tokens.json` | Variable collection **Primitives**, one mode | `--dk-color-brown-900`, `--dk-space-4`, … |
| `theme.light.tokens.json` + `theme.dark.tokens.json` | Variable collection **Theme**, modes **Light** / **Dark** | `--dk-color-text-muted`, … (dark under `prefers-color-scheme` and `[data-theme='dark']`) |
| `typography.tokens.json` | **Text styles**, one per token | `--dk-text-<style>-size\|weight\|line-height\|…` and `.dk-text-<style>` |
| `effects.tokens.json` | **Effect styles** (color bound to `color.shadow.sticker`) | `--dk-shadow-sticker-sm\|md\|lg` |

- **Primitives** are raw values with no meaning: color ramps (`brown`, `yellow`,
  `orange`, `teal`, `red`, `pink`, `green`), `font.*`, `space`, `radius`,
  `borderWidth`, `duration`, `easing`, `breakpoint`, `zIndex`. Alpha variants
  carry an `-aNN` suffix (`red.600-a14` is red.600 at 14%). Washes that were
  `color-mix()` are stored as their concrete result, so Figma gets real colors.
- **Theme** tokens are semantic roles (`surface`, `text`, `border`, `accent`,
  `status`, `wash`, `stamp`, `xray`, `terminal`, `shadow`). They only reference
  primitives. Both theme files must have identical keys, and the build fails
  otherwise.
- **Typography**: fluid styles store their largest size as `fontSize`, and the
  `clamp()` lives in `$extensions["dev.duckalization.fluid"]`. The width axis
  (`font-stretch`) is in `$extensions["dev.duckalization.fontStretch"]`.

## Naming

- The JSON path is the Figma name (`color/text/muted`, `font/lineHeight/130`).
- In CSS it's `--dk-` plus the path in kebab-case (`--dk-color-text-muted`,
  `--dk-font-line-height-130`).
- In scales whose steps are numeric, the key is the value: `font.size.17` = 17px,
  `font.lineHeight.130` = 1.3. `space` is a 4px grid (`space.4` = 16px), and `_5`
  marks a half step (`space.1_5` = 6px).
- Media queries can't read custom properties. CSS writes the breakpoint
  literal with a `/* token: breakpoint.md */` comment.

## Rules for CSS

Colors, type, spacing, radii, border widths, shadows and motion come from
`var(--dk-…)`. These stay literal on purpose: layout sizes (widths, heights,
grid tracks), transforms and positions, `em`-relative values, loop cycles
(blink, caret, pulse), and the agent bubble's organic `border-radius`. Each
one carries a short comment where it isn't obvious.
