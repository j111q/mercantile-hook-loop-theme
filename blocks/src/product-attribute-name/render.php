
<?php
/**
 * Server render for `mercantile/product-attribute-name`.
 *
 * Reads the current attribute's label out of block context (provided
 * by the parent mercantile/product-attributes loop) and emits a
 * styled `<th>` for that row. Block-supports (color, typography,
 * spacing) flow through `get_block_wrapper_attributes()` so whatever
 * styling the user sets in the editor lands on every rendered row.
 *
 * No context = nothing to render (e.g. accidental placement outside
 * the parent), so the block silently bails.
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

if ( ! is_array( $row ) || empty( $row['label'] ) ) {
	return;
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class' => 'woocommerce-product-attributes-item__label',
		'scope' => 'row',
	)
);

printf( '<th %s>%s</th>', $wrapper_attrs, esc_html( $row['label'] ) );
