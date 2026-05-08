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

/**
 * Enhance WooCommerce variation <select> dropdowns with mono-font button
 * rows so the prototype's "pick a size" UI matches the design instead of
 * a native select. The script keeps the underlying <select> in the DOM
 * and forwards clicks via native `change` events, so WC's own variation
 * logic (price / image / availability / cart submission) is unchanged.
 *
 * Loaded site-wide because the PDP modal can open variable products from
 * any page (catalog cells, related rows, mini-cart line items). Script
 * is gated by DOM presence — does nothing if no `.variations_form` is on
 * the page.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_script(
			'mercantile-hook-loop-variation-buttons',
			get_template_directory_uri() . '/assets/js/variation-buttons.js',
			array(),
			wp_get_theme()->get( 'Version' ),
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
		// AJAX-submit add-to-cart from inside the PDP modal so the form
		// doesn't reload to /product/<slug>/?add-to-cart=… and leave the
		// modal floating over a duplicate PDP. Loaded site-wide so the
		// modal's submit-handler is registered before any modal opens.
		wp_enqueue_script(
			'mercantile-hook-loop-cart-ajax-submit',
			get_template_directory_uri() . '/assets/js/cart-ajax-submit.js',
			array(),
			wp_get_theme()->get( 'Version' ),
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
	}
);

/**
 * Force-enqueue WooCommerce's variation script (and its localized params)
 * site-wide.
 *
 * WC normally only enqueues `wc-add-to-cart-variation` on `is_product()`
 * pages. The PDP modal can open a variable product from anywhere in the
 * site (catalog cell, related-products row, mini-cart line item), and
 * the modal-injected variations form needs jQuery + WC's VariationForm
 * class to function. Without this, picking a size on a modal-opened
 * product fails silently — variation_id stays at the markup default and
 * Add to Cart's first click does nothing.
 *
 * Nothing extra to do for the inline `<script type="text/template">`
 * tags that WC outputs adjacent to the variations form: those travel
 * with the form HTML when the modal extracts and re-injects `.mh-pdp`.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}
		if ( is_product() ) {
			return; // WC already handles its own enqueue here.
		}
		wp_enqueue_script( 'wc-add-to-cart-variation' );
		wp_localize_script(
			'wc-add-to-cart-variation',
			'wc_add_to_cart_variation_params',
			array(
				'wc_ajax_url'                      => WC_AJAX::get_endpoint( '%%endpoint%%' ),
				'i18n_no_matching_variations_text' => esc_attr__( 'Sorry, no products matched your selection. Please choose a different combination.', 'woocommerce' ),
				'i18n_make_a_selection_text'       => esc_attr__( 'Please select some product options before adding this product to your cart.', 'woocommerce' ),
				'i18n_unavailable_text'            => esc_attr__( 'Sorry, this product is unavailable. Please choose a different combination.', 'woocommerce' ),
				'i18n_reset_alert_text'            => esc_attr__( 'Product selection reset.', 'woocommerce' ),
			)
		);
	},
	20
);
