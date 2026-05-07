<?php
/**
 * Mercantile Hook Loop bootstrap.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'after_setup_theme',
	function () {
		add_theme_support( 'wp-block-styles' );
		add_theme_support( 'editor-styles' );
		add_editor_style( 'style.css' );

		// Declare WooCommerce block-theme support so WC ships its block templates.
		// The classic gallery zoom/lightbox/slider supports are intentionally NOT added —
		// the theme uses the block-based woocommerce/product-gallery block instead.
		add_theme_support( 'woocommerce' );
	}
);

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style(
			'mercantile-hook-loop-fonts',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=UnifrakturCook:wght@700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap',
			array(),
			null
		);

		wp_enqueue_style(
			'mercantile-hook-loop-style',
			get_stylesheet_uri(),
			array( 'mercantile-hook-loop-fonts' ),
			wp_get_theme()->get( 'Version' )
		);
	}
);

/**
 * Register and enqueue the PDP modal script as an Interactivity API
 * client-side module. Triggered globally so a click on any product link
 * (catalog cell, related-products row, mini-cart line) opens the
 * product in a modal instead of full-page navigation.
 *
 * Direct loads of /product/<slug> still render the page normally; the
 * modal scaffold sits dormant (via the `hidden` attribute on the root)
 * unless the IxAPI store flips `state.isOpen` to true.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( function_exists( 'wp_enqueue_script_module' ) ) {
			wp_enqueue_script_module(
				'mercantile-hook-loop/pdp-modal',
				get_template_directory_uri() . '/assets/js/pdp-modal.js',
				array( '@wordpress/interactivity' ),
				wp_get_theme()->get( 'Version' )
			);
		}
	}
);

/**
 * Re-label a few WooCommerce Checkout step headings to match the
 * Mercantile prototype (Contact / Shipping address / Payment).
 */
add_filter(
	'gettext_woocommerce',
	function ( $translation, $text ) {
		switch ( $text ) {
			case 'Contact information':
				return 'Contact';
			case 'Billing address':
			case 'Billing':
				return 'Shipping address';
			case 'Payment options':
				return 'Payment';
		}
		return $translation;
	},
	10,
	2
);

add_action(
	'enqueue_block_editor_assets',
	function () {
		wp_enqueue_style(
			'mercantile-hook-loop-fonts-editor',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=UnifrakturCook:wght@700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap',
			array(),
			null
		);
	}
);

/**
 * `[mh_product_attributes]` — render the WooCommerce product attributes
 * table inline.
 *
 * WooCommerce ships `wc_display_product_attributes()` which outputs
 * `<table class="shop_attributes">` with one row per visible attribute
 * (plus weight/dimensions if set). It's normally only called inside the
 * "Additional information" tab on the single-product page.
 *
 * Expose it as a shortcode so the PDP template can render attributes as
 * labeled spec rows in the sidebar Details panel, without the tabs UI.
 * Restyled in style.css to match the .mh-pdp__spec-row rhythm.
 *
 * Returns empty string off-product, so accidental placement on other
 * pages renders nothing instead of erroring.
 */
add_shortcode(
	'mh_product_attributes',
	function () {
		global $product;
		if ( ! is_a( $product, 'WC_Product' ) ) {
			return '';
		}
		ob_start();
		wc_display_product_attributes( $product );
		return ob_get_clean();
	}
);
