
<?php
/**
 * Server render for `mercantile/product-attributes`.
 *
 * Iterates the current product's visible attributes (plus weight /
 * dimensions if set, mirroring WC's wc_display_product_attributes
 * output) and renders the two template children — name + value —
 * once per row, passing the row's data via block context.
 *
 * Each child reads `$block->context['mercantile/currentAttribute']`
 * for its label / value, and applies its own block-supports styling
 * (color, typography, spacing) on every iteration — so styling set
 * in the editor lands on every row uniformly.
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

/**
 * Build the list of rows to render. Mirrors the structure WC's own
 * `wc_display_product_attributes` produces: weight first, then
 * dimensions, then product attributes in admin order. Custom (non-
 * taxonomy) attributes have their options pipe-imploded; taxonomy
 * attributes resolve term names.
 *
 * Each row is `[ 'label' => string, 'value' => string-of-html,
 * 'slug' => string ]`. `value` is the same HTML wc_display_product_-
 * attributes echoes, already escape-safe per WC convention.
 */
$rows = array();

if ( $product->has_weight() ) {
	$rows[] = array(
		'label' => esc_html__( 'Weight', 'woocommerce' ),
		'value' => esc_html( wc_format_weight( $product->get_weight() ) ),
		'slug'  => 'weight',
	);
}

if ( $product->has_dimensions() ) {
	$rows[] = array(
		'label' => esc_html__( 'Dimensions', 'woocommerce' ),
		'value' => esc_html( wc_format_dimensions( $product->get_dimensions( false ) ) ),
		'slug'  => 'dimensions',
	);
}

foreach ( $product->get_attributes() as $attribute ) {
	if ( ! $attribute->get_visible() ) {
		continue;
	}

	$label = wc_attribute_label( $attribute->get_name(), $product );

	if ( $attribute->is_taxonomy() ) {
		$values = wc_get_product_terms(
			$product->get_id(),
			$attribute->get_name(),
			array( 'fields' => 'names' )
		);
		$value = wptexturize( wp_strip_all_tags( implode( ', ', $values ) ) );
	} else {
		$values = $attribute->get_options();
		$values = array_map( 'wc_clean', $values );
		$value  = wptexturize( implode( ', ', $values ) );
	}

	$rows[] = array(
		'label' => esc_html( $label ),
		'value' => $value,
		'slug'  => sanitize_html_class( 'attribute_' . $attribute->get_name() ),
	);
}

if ( empty( $rows ) ) {
	return;
}

/**
 * Pull the two template children out of the parsed block so we can
 * instantiate them per row with custom context. Order is preserved
 * from how they were saved (always name then value, per the
 * templateLock="all" lock in the editor).
 */
$inner_blocks = isset( $block->parsed_block['innerBlocks'] )
	? $block->parsed_block['innerBlocks']
	: array();

if ( empty( $inner_blocks ) ) {
	return;
}

$body_html = '';
foreach ( $rows as $row ) {
	$cells_html = '';
	foreach ( $inner_blocks as $inner_block ) {
		// Per-iteration context — each child block reads its own
		// label / value out of this and styles itself accordingly.
		$instance    = new WP_Block(
			$inner_block,
			array( 'mercantile/currentAttribute' => $row )
		);
		$cells_html .= $instance->render( array( 'dynamic' => true ) );
	}
	$body_html .= sprintf(
		'<tr class="woocommerce-product-attributes-item woocommerce-product-attributes-item--%s">%s</tr>',
		esc_attr( $row['slug'] ),
		$cells_html
	);
}

$wrapper_attrs = get_block_wrapper_attributes();
printf(
	'<div %1$s><table class="woocommerce-product-attributes shop_attributes"><tbody>%2$s</tbody></table></div>',
	$wrapper_attrs,
	$body_html
);
