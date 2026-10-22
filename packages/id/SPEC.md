# `messageId` specification

Version 1. This is the contract for computing duckalization catalog IDs. An
extractor written in any language (Rust, Go, Python, …) that follows it
produces the same IDs as `@duckalization/id`, so its catalog works with the
runtime, the bundler plugin, and `duckalize translate`.

The algorithm is frozen: changing any step moves every ID and orphans every
existing translation.

Conformance: reproduce every vector in [`test-vectors.json`](./test-vectors.json)
(shipped in the npm package as `@duckalization/id/test-vectors.json`). Each
vector gives the `message`, optional `context`, the exact hash `input` string,
its `utf16Length`, the 53-bit `hash` as an integer, and the final `id`.

## 1. Message

A message is either:

- a **string**, or
- a **plural object**: a map from CLDR plural category to string. Allowed keys
  are `zero`, `one`, `two`, `few`, `many`, `other`. Extractors must require
  `other`.

## 2. Canonical form

- A string message is its own canonical form, byte for byte. No trimming, no
  whitespace collapsing, no case folding, **no Unicode normalization** (`é` as
  U+00E9 and `e` + U+0301 are different messages).
- A plural object is serialized by walking the categories in this fixed order:
  `zero`, `one`, `two`, `few`, `many`, `other`. Skip absent categories. Emit
  `<category>` U+0001 `<text>` for each present one, joined by U+0001.
  Source-code key order does not matter.

  `{ other: "{count} items", one: "{count} item" }` →
  `one␁{count} item␁other␁{count} items` (␁ = U+0001)

## 3. Hash input

- No context, or an **empty** context: the input is the canonical form.
- Non-empty context: `<context>` U+0000 `<canonical form>`.

An empty context is indistinguishable from no context. The JS extractor
rejects `context: ''`; other extractors should too.

## 4. Hash: cyrb53, seed 0, over UTF-16 code units

The input is consumed as a sequence of **UTF-16 code units**, not bytes and
not code points. Characters outside the BMP (emoji, many CJK extensions)
contribute two units, their surrogate pair. In Rust,
`str::encode_utf16()`; in Go, `utf16.Encode([]rune(s))`; in Python, the
16-bit units of `s.encode('utf-16-le')`.

All arithmetic is on unsigned 32-bit integers with wrap-around. `imul(a, b)`
is the low 32 bits of `a * b` (`u32::wrapping_mul`). `>>` is a logical shift.

```text
h1 = 0xdeadbeef
h2 = 0x41c6ce57
for each code unit c:
    h1 = imul(h1 ^ c, 2654435761)   // 0x9E3779B1
    h2 = imul(h2 ^ c, 1597334677)   // 0x5F356495
h1 = imul(h1 ^ (h1 >> 16), 2246822507) ^ imul(h2 ^ (h2 >> 13), 3266489909)
h2 = imul(h2 ^ (h2 >> 16), 2246822507) ^ imul(h1 ^ (h1 >> 13), 3266489909)
hash = (h2 & 0x1FFFFF) * 2^32 + h1   // 53-bit integer, fits in u64 / f64
```

The second finalization line uses the **new** `h1` from the line above it.

## 5. ID

The ID is `hash` in base 36, lowercase digits `0-9a-z`, with no padding and
no prefix. It is 1 to 11 characters long.

## Explicit IDs

A call site may override the hash with an explicit `{ id: "checkout.cta" }`.
That ID is used verbatim. Catalog tooling has no way to recompute it, so an
extractor marks the entry with `"explicitId": true` in the meta sidecar (see
[the catalog formats](https://github.com/soska/duckalization/blob/main/docs/formats.md)).

## Reference implementation (Rust)

```rust
pub fn message_id(canonical: &str, context: Option<&str>) -> String {
    let input = match context {
        Some(ctx) if !ctx.is_empty() => format!("{ctx}\u{0}{canonical}"),
        _ => canonical.to_owned(),
    };
    let (mut h1, mut h2) = (0xdeadbeef_u32, 0x41c6ce57_u32);
    for c in input.encode_utf16() {
        let c = u32::from(c);
        h1 = (h1 ^ c).wrapping_mul(2654435761);
        h2 = (h2 ^ c).wrapping_mul(1597334677);
    }
    h1 = (h1 ^ (h1 >> 16)).wrapping_mul(2246822507) ^ (h2 ^ (h2 >> 13)).wrapping_mul(3266489909);
    h2 = (h2 ^ (h2 >> 16)).wrapping_mul(2246822507) ^ (h1 ^ (h1 >> 13)).wrapping_mul(3266489909);
    let mut n = (u64::from(h2 & 0x1F_FFFF) << 32) | u64::from(h1);
    let digits = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut out = Vec::new();
    loop {
        out.push(digits[(n % 36) as usize]);
        n /= 36;
        if n == 0 { break; }
    }
    out.reverse();
    String::from_utf8(out).unwrap()
}
```

`canonical` is the output of step 2. Build it for a plural object as
described there.
