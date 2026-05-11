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
		// "copy →" link on the dark [mercantile id="…"] PDP codeblock —
		// never actually copies; cycles snark messages for 3.2s.
		// Loaded site-wide so it also fires when the codeblock is
		// injected by the IxAPI modal.
		wp_enqueue_script(
			'mercantile-hook-loop-copy-easter-egg',
			get_template_directory_uri() . '/assets/js/copy-easter-egg.js',
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

/* -----------------------------------------------------------------------
 * Prototype-chrome shortcodes.
 *
 * The PDP and shop-head designs mimic the WordPress editor's Publish
 * meta-box, breadcrumb, permalink row, and category-filter chips. The
 * original templates rendered those bits as static `wp:html` blocks with
 * hard-coded copy ("post.php?action=edit", "all 17", "permalink:
 * http://localhost:8883/product/slug · modified just now") so they
 * looked design-correct on screenshots but lied about real product
 * state. These shortcodes generate the same markup from real WC data,
 * so the design is preserved and the content tells the truth.
 * -------------------------------------------------------------------- */

/**
 * `[mh_pdp_breadcrumb]` — mercantile / shop / <category> / <title>
 *
 * Matches the design of the static breadcrumb that used to live in the
 * PDP header. "mercantile" links to home, "shop" links to the shop
 * page, the category links to the category archive, and the product
 * title is rendered as bold non-link text (we're already on its page).
 * The close × button (back to shop) is rendered as a sibling so the
 * existing `.mh-pdp__header` flex layout still works.
 */
add_shortcode(
	'mh_pdp_breadcrumb',
	function () {
		global $product;
		if ( ! is_a( $product, 'WC_Product' ) ) {
			return '';
		}
		$shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
		$cat_html = '';
		$terms    = get_the_terms( $product->get_id(), 'product_cat' );
		if ( $terms && ! is_wp_error( $terms ) ) {
			$primary = reset( $terms );
			$cat_html = sprintf(
				'<a href="%s">%s</a><span class="sl">/</span>',
				esc_url( get_term_link( $primary ) ),
				esc_html( strtolower( $primary->name ) )
			);
		}
		return sprintf(
			'<header class="mh-pdp__header"><div class="mh-pdp__crumb"><a href="%s">mercantile</a><span class="sl">/</span><a href="%s">shop</a><span class="sl">/</span>%s<b>%s</b></div><a class="mh-pdp__close" href="%s" aria-label="Back to shop">&times;</a></header>',
			esc_url( home_url( '/' ) ),
			esc_url( $shop_url ),
			$cat_html,
			esc_html( strtolower( $product->get_name() ) ),
			esc_url( $shop_url )
		);
	}
);

/**
 * `[mh_pdp_permalink]` — permalink: <site>/product/<slug> · modified <date>
 *
 * Replaces the static "permalink: http://localhost:8883/product/slug ·
 * modified just now" line. Splits the URL at the slug so the slug can
 * be highlighted blue (matching the prototype's editor-style URL row),
 * and renders the real last-modified time as a human-readable diff
 * ("3 days ago"). On the index page (no product context) returns empty.
 */
add_shortcode(
	'mh_pdp_permalink',
	function () {
		global $product;
		if ( ! is_a( $product, 'WC_Product' ) ) {
			return '';
		}
		$permalink = get_permalink( $product->get_id() );
		$slug      = basename( untrailingslashit( $permalink ) );
		// Everything up to (and including) /product/ — strip the slug off the end.
		$prefix    = substr( $permalink, 0, strrpos( untrailingslashit( $permalink ), '/' ) + 1 );

		$modified  = get_post_modified_time( 'U', true, $product->get_id() );
		$diff      = human_time_diff( $modified, current_time( 'timestamp', true ) );

		return sprintf(
			'<div class="mh-pdp__permalink">permalink: <span class="k">%s</span><b class="hl-blue">%s</b><span class="mh-pdp__permalink-meta">&middot; modified %s ago</span></div>',
			esc_html( $prefix ),
			esc_html( $slug ),
			esc_html( $diff )
		);
	}
);

/**
 * `[mh_pdp_publish_meta]` — the Publish meta-box mimic in the sidebar.
 *
 * Renders three status rows (status / visibility / stock) with REAL
 * values: post_status, catalog_visibility, and stock_status. The
 * design treats this as a wp-admin Publish meta-box reference, so the
 * presence of the panel is intentional — only the values were stale.
 */
add_shortcode(
	'mh_pdp_publish_meta',
	function () {
		global $product;
		if ( ! is_a( $product, 'WC_Product' ) ) {
			return '';
		}

		$status      = get_post_status( $product->get_id() );
		$status_dot  = 'publish' === $status ? 'g' : ''; // green dot when published
		$status_text = 'publish' === $status ? 'published' : esc_html( $status );

		$visibility = $product->get_catalog_visibility(); // visible / catalog / search / hidden
		$visibility_text = 'visible' === $visibility ? 'public' : esc_html( $visibility );

		$in_stock = $product->is_in_stock();
		$stock_text = $in_stock ? '<b>in stock</b>' : '<b class="oos">out of stock</b>';

		return sprintf(
			'<section class="mh-pdp__panel"><h3>Publish</h3>' .
			'<div class="mh-status-row"><span>status</span><span class="v %s">&bull; %s</span></div>' .
			'<div class="mh-status-row"><span>visibility</span><span class="v">%s</span></div>' .
			'<div class="mh-status-row"><span>stock</span><span class="v">%s</span></div>' .
			'</section>',
			esc_attr( $status_dot ),
			$status_text,
			$visibility_text,
			$stock_text
		);
	}
);

/**
 * `[mh_pdp_codeblock]` — the dark `[mercantile id="…"]` shortcode strip.
 *
 * Editorial-zine bit that sits below the gallery on every PDP. Replaces
 * the old hard-coded `[mercantile id="slug" size="M"] copy →` row with
 * the *real* product slug. The "copy →" link is the easter egg target —
 * see `assets/js/copy-easter-egg.js` for the snark cycle.
 *
 * Variable products get a `size="M"` placeholder so the codeblock has
 * the same visual rhythm whether the product is simple or variable;
 * the snark fires regardless of what's in the brackets.
 */
add_shortcode(
	'mh_pdp_codeblock',
	function () {
		global $product;
		if ( ! is_a( $product, 'WC_Product' ) ) {
			return '';
		}
		$slug = $product->get_slug();
		$size_attr = $product->is_type( 'variable' )
			? ' <span class="k">size</span>=<span class="v">"M"</span>'
			: '';
		return sprintf(
			'<div class="mh-shortcode"><span>[<span class="k">mercantile</span> <span class="k">id</span>=<span class="v">"%s"</span>%s]</span><span class="copy" role="button" tabindex="0">copy &rarr;</span></div>',
			esc_html( $slug ),
			$size_attr
		);
	}
);

/**
 * `[mh_section_filters]` — shop section-head with real category counts.
 *
 * The original markup hard-coded "all 17 / apparel 08 / drinkware 04 /
 * accessories 05" — when products are added or removed those numbers
 * lie. This shortcode counts products per category in real time, marks
 * the matching tab `.is-on` based on the current archive (shop / cat),
 * and emits both the desktop chip-row markup and the mobile <select>
 * fallback the original template had.
 *
 * Pads counts to 2 digits ("08") to keep the prototype's typographic
 * rhythm consistent with the rest of the editorial-zine design.
 */
add_shortcode(
	'mh_section_filters',
	function () {
		if ( ! function_exists( 'wc_get_page_permalink' ) ) {
			return '';
		}

		// Total published products.
		$total = (int) wp_count_posts( 'product' )->publish;

		// Categories to render as filter chips, in display order.
		$cat_slugs = array( 'apparel', 'drinkware', 'accessories' );
		$cats      = array();
		foreach ( $cat_slugs as $slug ) {
			$term = get_term_by( 'slug', $slug, 'product_cat' );
			if ( $term && ! is_wp_error( $term ) ) {
				$cats[] = $term;
			}
		}

		// Detect the active filter so we can flag it .is-on.
		$active_slug = 'all';
		if ( is_product_taxonomy() ) {
			$current = get_queried_object();
			if ( $current && isset( $current->slug ) ) {
				$active_slug = $current->slug;
			}
		}

		$shop_url = wc_get_page_permalink( 'shop' );
		$pad      = static function ( $n ) {
			return str_pad( (string) $n, 2, '0', STR_PAD_LEFT );
		};

		// Desktop chip row.
		ob_start();
		?>
		<span class="mh-section-head__label">/* shop &middot; <?php echo esc_html( $total ); ?> items */</span>
		<div class="mh-filters">
			<a href="<?php echo esc_url( $shop_url ); ?>" class="mh-filter<?php echo 'all' === $active_slug ? ' is-on' : ''; ?>">all <span class="mh-n"><?php echo esc_html( $pad( $total ) ); ?></span></a>
			<?php foreach ( $cats as $cat ) : ?>
				<a href="<?php echo esc_url( get_term_link( $cat ) ); ?>" class="mh-filter<?php echo $cat->slug === $active_slug ? ' is-on' : ''; ?>"><?php echo esc_html( strtolower( $cat->name ) ); ?> <span class="mh-n"><?php echo esc_html( $pad( $cat->count ) ); ?></span></a>
			<?php endforeach; ?>
		</div>
		<select class="mh-filters-m" aria-label="Filter products" onchange="if(this.value)location.href=this.value">
			<option value="<?php echo esc_url( $shop_url ); ?>"<?php echo 'all' === $active_slug ? ' selected' : ''; ?>>all &middot; <?php echo esc_html( $pad( $total ) ); ?></option>
			<?php foreach ( $cats as $cat ) : ?>
				<option value="<?php echo esc_url( get_term_link( $cat ) ); ?>"<?php echo $cat->slug === $active_slug ? ' selected' : ''; ?>><?php echo esc_html( strtolower( $cat->name ) ); ?> &middot; <?php echo esc_html( $pad( $cat->count ) ); ?></option>
			<?php endforeach; ?>
		</select>
		<?php
		return ob_get_clean();
	}
);
