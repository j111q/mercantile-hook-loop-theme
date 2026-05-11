
<?php
/**
 * Server render for `mercantile/product-attributes`.
 *
 * Emits the WooCommerce product attributes table — material, care,
 * capacity, fit, weight, dimensions, and anything else the product
 * has set via the standard WC Attributes UI. The table is the same
 * markup WC ships in its "Additional information" tab; we just render
 * it inline so the PDP Details sidebar panel can hold it next to
 * price / category / tags rows.
 *
 * Returns silently off-product (no `$product`) or when WC isn't
 * loaded, and emits nothing if the product has no attributes — which
 * keeps the Details panel clean for products that haven't been
 * populated yet.
 *
 * @var array    $attributes  Block attributes (none used).
 * @var string   $content     Inner HTML (none — block has no inner blocks).
 * @var WP_Block $block       Block instance.
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

// `wc_display_product_attributes()` echoes — capture so we can
// (a) skip rendering the wrapper when there's nothing to show, and
// (b) include the output inside our block-wrapper div, which carries
// the editor-assigned className and other block-supports attrs.
ob_start();
wc_display_product_attributes( $product );
$table_html = ob_get_clean();

if ( '' === trim( $table_html ) ) {
	return;
}

printf(
	'<div %s>%s</div>',
	get_block_wrapper_attributes(),
	$table_html
);
