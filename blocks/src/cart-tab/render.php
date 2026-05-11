<?php
/**
 * Server render for `mercantile/cart-tab`.
 *
 * Emits the ticker's cart link with an Interactivity API binding
 * (`data-wp-text="state.itemCount"`) so the count stays current as the
 * shopper adds or removes items elsewhere on the page. The state is
 * derived in view.js from WooCommerce's locked `woocommerce` IxAPI
 * cart store; we seed that store server-side via load_cart_state() so
 * the count is correct on first paint, before any client-side fetch.
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

$cart_url = ! empty( $attributes['cartUrl'] ) ? esc_url( $attributes['cartUrl'] ) : esc_url( wc_get_cart_url() );
$label    = isset( $attributes['label'] ) ? (string) $attributes['label'] : 'cart';

// Pre-populate the WC cart state in the IxAPI store so the initial
// hydrated value of state.itemCount matches the server-rendered count.
// load_cart_state() requires the consent acknowledgment string so WC
// knows we're aware we're touching a private/locked store.
if ( class_exists( 'Automattic\\WooCommerce\\Blocks\\Utils\\BlocksSharedState' ) ) {
	$consent = 'I acknowledge that using private APIs means my theme or plugin will inevitably break in the next version of WooCommerce';
	\Automattic\WooCommerce\Blocks\Utils\BlocksSharedState::load_cart_state( $consent );
}

$initial_count = isset( WC()->cart ) ? (int) WC()->cart->get_cart_contents_count() : 0;

// Seed our own state so the SSR pass for data-wp-text="state.itemCount"
// resolves to the same number that the client-side getter will compute
// once view.js hydrates. Stored as a string so a 0 count still renders
// as "0" rather than being coerced to an empty value by the directive
// processor.
wp_interactivity_state(
	'mercantile/cart-tab',
	array( 'itemCount' => (string) $initial_count )
);

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                                            => 'mh-ticker__tab',
		'data-wp-interactive'                              => 'mercantile/cart-tab',
	)
);

printf(
	'<p %1$s><a href="%2$s" data-wp-on--click="actions.openCart">%3$s <strong data-wp-text="state.itemCount">%4$d</strong></a></p>',
	$wrapper_attrs,
	$cart_url,
	esc_html( $label ),
	$initial_count
);
