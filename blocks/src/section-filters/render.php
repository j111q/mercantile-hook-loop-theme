<?php
/**
 * Server render for `mercantile/section-filters`.
 *
 * Emits the catalog filter pills + native <select> mobile fallback.
 * Counts products per category in real time, flags the chip matching
 * the queried object as `.is-on`, and seeds the shared
 * `mercantile/catalog` iAPI store. Chip anchors carry
 * `data-wp-on--click="actions.navigate"` and
 * `data-wp-on--mouseenter="actions.prefetch"` so navigation swaps the
 * sibling .mh-grid-wrap router region without a full page reload.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'wc_get_page_permalink' ) ) {
	return;
}

$cat_slugs = array_filter(
	array_map(
		'trim',
		explode( ',', isset( $attributes['categories'] ) ? (string) $attributes['categories'] : '' )
	)
);
if ( empty( $cat_slugs ) ) {
	$cat_slugs = array( 'apparel', 'drinkware', 'accessories' );
}

$cats = array();
foreach ( $cat_slugs as $slug ) {
	$term = get_term_by( 'slug', $slug, 'product_cat' );
	if ( $term && ! is_wp_error( $term ) ) {
		$cats[] = $term;
	}
}

$total = (int) wp_count_posts( 'product' )->publish;

$active_slug = 'all';
if ( is_product_taxonomy() ) {
	$current = get_queried_object();
	if ( $current && isset( $current->slug ) ) {
		$active_slug = $current->slug;
	}
}

$shop_url   = wc_get_page_permalink( 'shop' );
$default_label = isset( $attributes['label'] ) && '' !== $attributes['label']
	? (string) $attributes['label']
	: __( '§ CATALOG', 'mercantile-hook-loop' );

// Surface the query context inline: `§ SEARCH: COZY` on a search,
// `§ DRINKWARE` on a category archive, otherwise the configured label.
// Mono uppercase is the visual register the prototype set for the label
// slot — we lowercase the dynamic part via CSS to avoid double-encoding
// the user's input. The chips below still drive the actual filtering.
if ( is_search() ) {
	$q          = get_search_query();
	/* translators: %s: search query term. */
	$label_text = sprintf( __( '§ SEARCH: %s', 'mercantile-hook-loop' ), strtoupper( $q ) );
} elseif ( is_product_taxonomy() ) {
	$current_term = get_queried_object();
	if ( $current_term && isset( $current_term->name ) ) {
		$label_text = '§ ' . strtoupper( $current_term->name );
	} else {
		$label_text = $default_label;
	}
} else {
	$label_text = $default_label;
}

$all_label   = __( 'All', 'mercantile-hook-loop' );
$select_aria = __( 'Filter products', 'mercantile-hook-loop' );

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                 => 'mh-section-filters',
		'data-wp-interactive'   => 'mercantile/catalog',
		'data-wp-router-region' => 'mercantile/catalog-head',
	)
);

ob_start();
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<span class="mh-section-filters__label"><?php echo esc_html( $label_text ); ?></span>
	<div class="mh-section-filters__chips">
		<a
			href="<?php echo esc_url( $shop_url ); ?>"
			class="mh-section-filters__chip<?php echo 'all' === $active_slug ? ' is-on' : ''; ?>"
			data-wp-on--click="actions.navigate"
			data-wp-on--mouseenter="actions.prefetch"
		><?php echo esc_html( $all_label ); ?> <span class="mh-section-filters__count"><?php echo esc_html( (string) $total ); ?></span></a>
		<?php foreach ( $cats as $cat ) : ?>
			<a
				href="<?php echo esc_url( get_term_link( $cat ) ); ?>"
				class="mh-section-filters__chip<?php echo $cat->slug === $active_slug ? ' is-on' : ''; ?>"
				data-wp-on--click="actions.navigate"
				data-wp-on--mouseenter="actions.prefetch"
			><?php echo esc_html( $cat->name ); ?> <span class="mh-section-filters__count"><?php echo esc_html( (string) $cat->count ); ?></span></a>
		<?php endforeach; ?>
	</div>
	<select class="mh-section-filters__mobile" aria-label="<?php echo esc_attr( $select_aria ); ?>" onchange="if(this.value)location.href=this.value">
		<option value="<?php echo esc_url( $shop_url ); ?>"<?php echo 'all' === $active_slug ? ' selected' : ''; ?>><?php echo esc_html( $all_label ); ?> &middot; <?php echo esc_html( (string) $total ); ?></option>
		<?php foreach ( $cats as $cat ) : ?>
			<option value="<?php echo esc_url( get_term_link( $cat ) ); ?>"<?php echo $cat->slug === $active_slug ? ' selected' : ''; ?>><?php echo esc_html( $cat->name ); ?> &middot; <?php echo esc_html( (string) $cat->count ); ?></option>
		<?php endforeach; ?>
	</select>
</div>
<?php
echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
