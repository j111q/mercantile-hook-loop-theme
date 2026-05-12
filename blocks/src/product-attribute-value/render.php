
<?php
/**
 * Server render for `mercantile/product-attribute-value`.
 *
 * Reads the current attribute's value out of block context (provided
 * by the parent mercantile/product-attributes loop) and emits a
 * styled `<td>`. The value comes through as already-escape-safe HTML
 * (WC's term-list / option-list formatters handle escaping), so it's
 * echoed without an additional esc_html pass — same convention WC's
 * `wc_display_product_attributes` uses.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$row = isset( $block->context['mercantile/currentAttribute'] )
	? $block->context['mercantile/currentAttribute']
	: null;

if ( ! is_array( $row ) || ! isset( $row['value'] ) ) {
	return;
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class' => 'woocommerce-product-attributes-item__value',
	)
);

// $row['value'] is pre-formatted HTML from WC's attribute helpers
// (see parent render.php) — already escape-safe per WC convention.
printf( '<td %s>%s</td>', $wrapper_attrs, $row['value'] );
