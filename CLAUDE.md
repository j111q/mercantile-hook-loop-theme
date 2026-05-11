# Mercantile Hook Loop — block-theme working notes

Lessons captured while converting this theme away from `wp:html` islands
toward a real block-native composition. Keep these in mind before adding
or editing blocks here.

> The single biggest mindset shift: **a "block theme" isn't measured by
> how few `wp:html` islands you have — it's measured by how much of the
> rendered chrome an editor user can change without touching code.**

## Architecture — the "use what's already there" hierarchy

1. **Try block supports first.** `style.color`, `style.position`,
   `style.border`, `style.spacing`, `style.typography.letterSpacing`
   etc. cover most chrome. Reach for those before writing
   `.mh-foo { background:…; color:…; font:…; position:sticky; … }`.
   Editors get visual controls; theme keeps less CSS.
2. **Then core blocks.** `core/group`, `core/paragraph`, `core/heading`,
   `core/separator`, `core/columns` go further than reflex suggests.
   The `wp:html` reflex is a cheat — opaque in the Site Editor.
3. **Then custom blocks.** Add one only when (a) inline SVG with
   `currentColor`, (b) Interactivity API directives, or (c) live data
   needs an attribute schema you can't get from core. Don't reach for
   them just to skip writing block markup.
4. **CSS last, scoped to the block that owns it.** A surface-level
   className hook (e.g. `.mh-ticker` on the outer group) earns its
   keep only for chrome blocks can't express: fixed `height`,
   `overflow:hidden`, `z-index`, `::before` pseudos. Everything else
   — wrapper chrome (padding/background/border), UA-default resets
   (paragraph margin, link color/underline), keyframes, content
   variant styles — belongs in the owning block's own
   `blocks/src/<slug>/style.css`, declared via `"style":
   "file:./style-index.css"` in `block.json`. WordPress then enqueues
   each block's CSS only on pages that render it. Do NOT blanket
   resets across the surface (`.mh-ticker p`, `.mh-ticker > *`) — that
   reaches across block boundaries and fights theme.json from the
   wrong layer.

## Custom blocks — the editing model is the design decision

5. **`ServerSideRender` alone is not a real block.** It's an iframe of
   front-end output. A real block has a JS `edit` component. Use SSR
   *inside* edit when you specifically want a live preview of dynamic
   data (e.g. WC product counts).
6. **InnerBlocks vs. attribute array — both are valid.** InnerBlocks
   when each item deserves full block treatment (rich text, nesting,
   drag-reorder via toolbar). Attribute array when items are uniform
   records (`{text, variant}`) and inline canvas editing would clutter
   — edit via InspectorControls instead.
7. **`block.json`'s `"render": "file:./render.php"` is `include`d
   under output buffering.** The PHP file `echo`s; it does NOT `return`
   a string. Easy to get wrong since shortcodes work the opposite way.

## Interactivity API — the SSR/hydration seam

8. **`data-wp-text` runs server-side too.** If `state.X` isn't seeded
   via `wp_interactivity_state()`, the directive processor replaces
   the rendered content with empty string. Seed it server-side; the
   JS getter takes over post-hydration.
9. **Cross-store reads are the cleanest WC integration.**
   `store('woocommerce', {}, { lock })` returns a reactive reference
   to WC's cart. A getter that reduces `state.cart.items[].quantity`
   updates automatically because WC's own store handles the events.
   No own fetch logic, no own event listeners.
10. **Don't `import '@woocommerce/...'`.** webpack can't resolve it
    (lives in WP's runtime import map, not in `node_modules`). Just
    use `store(…, { lock })` to grab a reference; let WC enqueue the
    module via other blocks on the page. For the seeded server state
    that hydrates the first paint, call
    `Automattic\WooCommerce\Blocks\Utils\BlocksSharedState::load_cart_state( $consent )`
    from the block's `render.php`.

## i18n — every user-facing string is translation-ready

11. **All user-facing strings flow through a translation function.**
    PHP: `__()` / `esc_html__()` / `esc_attr__()` with textdomain
    `'mercantile-hook-loop'`. JS (editor): `__( 'foo',
    'mercantile-hook-loop' )` from `@wordpress/i18n`. Applies even to
    "hardcoded" labels like `LIVE` / `STOP` — hardcoded means
    not author-editable, not English-only.
12. **block.json attribute `default` values are NOT auto-translated.**
    `register_block_type` translates `title` / `description` /
    `keywords` when `textdomain` is set, but attribute defaults pass
    through verbatim. If a default is user-facing, run it through
    `__()` at render-time when the attribute is empty.
13. **iAPI view.js: seed translated strings via PHP, don't `__()` in
    JS.** render.php runs strings through `__()` server-side; view.js
    reads them via `getConfig()` (or `state` if reactive) and never
    touches the textdomain. Keeps the Interactivity module free of
    translation-loading concerns. See rule 14 for the state-vs-config
    split.

14. **`wp_interactivity_config()` for static values, state for
    reactive.** Config is read-only and never re-renders consumers —
    asset URLs, translated labels, timing constants, feature flags.
    State is for things that mutate at runtime (`isPaused`, derived
    getters that depend on mutating values). Putting static data in
    state still works but is wasteful: every consumer subscribes for
    changes that never come.

## Build pipeline (`@wordpress/scripts`)

15. **`WP_EXPERIMENTAL_MODULES=true` is required for
    `viewScriptModule`.** Without it, wp-scripts silently skips module
    entries — you get no `view.js`, your iAPI store never registers,
    no error. The flag is already set in `package.json` scripts; keep
    it there.
16. **Auto-discover blocks via `glob`, don't hardcode slugs.**
    `functions.php` already does this — `glob( get_theme_file_path(
    'blocks/build' ) . '/*/block.json' )` registers everything under
    `blocks/build/`. One less file to edit per new block.
17. **Beware the `*/` doc-block trap in PHP comments.** Putting `*/`
    inside a `/** */` comment closes it early — caused a fatal error
    here from the literal string `blocks/build/*/block.json` inside a
    docblock. Avoid `*/` in docblock prose.
18. **`block.json`'s `"style"` is a runtime hint, not a build trigger.**
    wp-scripts only bundles CSS that is `import`ed from the JS entry.
    A bare `style.css` next to `index.js` is silently ignored. Pattern:
    `import './style.css';` from `index.js`, then point `block.json`
    at the emitted file with `"style": "file:./style-index.css"` (the
    name wp-scripts uses for CSS extracted from the index entry).
19. **Block-supports gotchas when expressing chrome as defaults.**
    Setting wrapper chrome (padding, color, border, fontWeight) via
    `supports` + default `attributes.style` lets the editor tweak
    everything from the Site Editor and removes the corresponding CSS.
    Three sharp edges that cost time:
    - **Some support keys are still `__experimental*` even on modern
      WP.** `border` works only as `__experimentalBorder`; the
      typography subkey for `fontWeight` is `__experimentalFontWeight`
      (and `fontStyle`, `letterSpacing`, `textDecoration`,
      `textTransform`, `writingMode`, `fontFamily` are also still
      `__experimental*`). The matching style attribute path drops the
      prefix (`style.typography.fontWeight` etc.).
    - **`safecss_filter_attr` blocks `rgba()` in inline styles.** Its
      function-stripping regex only allows `var/calc/min/max/clamp/
      repeat`; `rgb`/`rgba` fall through, then the `(` fails the
      safety check and the property is dropped silently. Use a hex
      color or a CSS custom property (`var(--…)`) instead.
    - **Self-closing block markup (`<!-- wp:foo /-->`) does honor
      block.json default attributes.** Render-time supports apply to
      defaults the same way they apply to user-set values, so you do
      not have to repeat the chrome inline in the template part.

## Refactoring instincts

20. **Empty-block-as-styled-div is a smell.** The pulsing dot started
    as an empty `core/group` — uneditable, looked like a placeholder
    in the Site Editor. Folded it into the LIVE paragraph as a
    `::before` instead — cleaner DOM, one fewer block.
21. **Merging tightly-related blocks beats keeping them "atomic."**
    `site-mark` + dot + LIVE were three siblings; users only ever
    edited them together. One `mercantile/ticker-lead` block is more
    honest about the unit.

## Project layout for theme-local blocks

```
blocks/
├── src/
│   └── <slug>/
│       ├── block.json     # apiVersion 3, editorScript: file:./index.js,
│       │                  # style: file:./style-index.css (when shipping
│       │                  # block-owned CSS), render: file:./render.php,
│       │                  # optional viewScriptModule: file:./view.js
│       ├── index.js       # JSX edit/save; must `import './style.css'`
│       │                  # for wp-scripts to bundle the stylesheet
│       ├── style.css      # block-owned styles; wp-scripts emits this as
│       │                  # build/<slug>/style-index.css
│       ├── render.php     # echoes HTML (don't return)
│       └── view.js        # ESM, iAPI store; only when you need
│                          # client-side reactivity beyond SSR
└── build/                 # gitignored; produced by `pnpm build`
```

`functions.php` registers every `blocks/build/*/block.json` at `init`
— no editing needed when adding a block. `pnpm build` (or `pnpm start`
for watch) compiles `blocks/src/` to `blocks/build/`. Build artifacts
are not committed.
