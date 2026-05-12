
<?php
/**
 * Server render for `mercantile/product-price`.
 *
 * Emits the same price HTML the front-end wp:woocommerce/product-price
 * block does — including the `wc-block-components-product-price__value`
 * span the theme's existing `.mh-pdp__spec-row .wc-block-components-
 * product-price__value` rules style. We swapped to a theme-owned block
 * because the WC block has no editor fallback in template-part
 * contexts (no `$product`, no preview, block goes "broken" in the
 * Site Editor). render.php is the source of truth on the front-end;
 * index.js mirrors the same DOM shape for the editor preview.
 *
 * Returns silently when there is no product (so accidental placement
 * outside a product context renders nothing) or when `get_price_html`
 * has nothing to show.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'WC' ) ) {
	return;
}

global $product;
if ( ! is_a( $product, 'WC_Product' ) ) {
	return;
}

$price_html = $product->get_price_html();
if ( '' === trim( (string) $price_html ) ) {
	return;
}

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'mh-pdp__spec-price' ) );

// get_price_html() is already escape-safe per WC convention; the
// wrapping `wc-block-components-product-price__value` span matches
// the class the WC block uses so our existing CSS targets it.
printf(
	'<div %1$s><span class="wc-block-components-product-price__value">%2$s</span></div>',
	$wrapper_attrs,
	$price_html
);
