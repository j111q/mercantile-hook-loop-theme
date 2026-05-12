
<?php
/**
 * Server render for `mercantile/catalog-load-more`.
 *
 * Emits a button with IxAPI directives that hook into a small
 * `mercantile/catalog-load-more` store (see view.js). State is seeded
 * here so the SSR pass for `data-wp-text="state.nextPage"` resolves
 * to the right page number on first paint and the JS reactivity
 * picks it up post-hydration. The whole control hides itself
 * (via `data-wp-class--is-exhausted` toggling `is-exhausted`) when
 * the next fetch comes back with no more products.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$current_page = max( 1, (int) get_query_var( 'paged' ) );
$next_page    = $current_page + 1;

// Seed the IxAPI store so the SSR data-wp-text directive lands on
// the right value, and the JS getter takes over once hydrated.
wp_interactivity_state(
	'mercantile/catalog-load-more',
	array(
		'currentPage' => $current_page,
		'nextPage'    => $next_page,
		'isLoading'   => false,
		'isExhausted' => false,
	)
);

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                          => 'mh-load-more',
		'type'                           => 'button',
		'data-wp-interactive'            => 'mercantile/catalog-load-more',
		'data-wp-class--is-loading'      => 'state.isLoading',
		'data-wp-class--is-exhausted'    => 'state.isExhausted',
		'data-wp-on--click'              => 'actions.loadNext',
		'data-wp-init'                   => 'callbacks.observe',
	)
);

printf(
	'<button %1$s>' .
		'<span class="mh-load-more__code">' .
			'[<span class="k">mercantile</span> <span class="k">next_page</span>=<span class="v">"<span data-wp-text="state.nextPage">%2$d</span>"</span>]' .
		'</span>' .
		'<span class="mh-load-more__cta">load more &#x27F6;</span>' .
	'</button>',
	$wrapper_attrs,
	$next_page
);
