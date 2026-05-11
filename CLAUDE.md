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
4. **CSS last, scoped to a className.** A `.mh-ticker`-style hook still
   earns its keep for things blocks can't express: fixed `height`,
   `overflow:hidden`, `::before` pseudos, descendant resets (paragraph
   margin, link color/underline) that need to be neutralized only
   inside one surface.

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

## Build pipeline (`@wordpress/scripts`)

11. **`WP_EXPERIMENTAL_MODULES=true` is required for
    `viewScriptModule`.** Without it, wp-scripts silently skips module
    entries — you get no `view.js`, your IxAPI store never registers,
    no error. The flag is already set in `package.json` scripts; keep
    it there.
12. **Auto-discover blocks via `glob`, don't hardcode slugs.**
    `functions.php` already does this — `glob( get_theme_file_path(
    'blocks/build' ) . '/*/block.json' )` registers everything under
    `blocks/build/`. One less file to edit per new block.
13. **Beware the `*/` doc-block trap in PHP comments.** Putting `*/`
    inside a `/** */` comment closes it early — caused a fatal error
    here from the literal string `blocks/build/*/block.json` inside a
    docblock. Avoid `*/` in docblock prose.

## Refactoring instincts

14. **Empty-block-as-styled-div is a smell.** The pulsing dot started
    as an empty `core/group` — uneditable, looked like a placeholder
    in the Site Editor. Folded it into the LIVE paragraph as a
    `::before` instead — cleaner DOM, one fewer block.
15. **Merging tightly-related blocks beats keeping them "atomic."**
    `site-mark` + dot + LIVE were three siblings; users only ever
    edited them together. One `mercantile/ticker-lead` block is more
    honest about the unit.

## Project layout for theme-local blocks

```
blocks/
├── src/
│   └── <slug>/
│       ├── block.json     # apiVersion 3, editorScript: file:./index.js,
│       │                  # render: file:./render.php, optional
│       │                  # viewScriptModule: file:./view.js
│       ├── index.js       # JSX edit/save (no JSX, no build needed only
│       │                  # if you really want; default here is JSX)
│       ├── render.php     # echoes HTML (don't return)
│       └── view.js        # ESM, IxAPI store; only when you need
│                          # client-side reactivity beyond SSR
└── build/                 # gitignored; produced by `pnpm build`
```

`functions.php` registers every `blocks/build/*/block.json` at `init`
— no editing needed when adding a block. `pnpm build` (or `pnpm start`
for watch) compiles `blocks/src/` to `blocks/build/`. Build artifacts
are not committed.
