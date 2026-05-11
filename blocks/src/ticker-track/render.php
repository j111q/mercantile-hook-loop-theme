<?php
/**
 * Server render for `mercantile/ticker-track`.
 *
 * Items live on the block as the `items` attribute (an array of
 * { text, variant } objects edited from the inspector). For each
 * item we sanitize the text down to a small inline-format whitelist
 * (<strong>, <b>, <em>, <i>, <span class="mh-mono-blue">) so authors
 * can mark up bold prefixes and blue mono fragments without opening
 * the door to arbitrary HTML.
 *
 * The full item list is emitted twice in a row so the CSS marquee
 * animation on .mh-ticker__track can scroll -50% for a seamless loop.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$items = isset( $attributes['items'] ) && is_array( $attributes['items'] ) ? $attributes['items'] : array();
if ( ! $items ) {
	return;
}

$allowed_html = array(
	'strong' => array(),
	'b'      => array(),
	'em'     => array(),
	'i'      => array(),
	'span'   => array( 'class' => array() ),
);

$inner_html = '';
foreach ( $items as $item ) {
	if ( ! is_array( $item ) ) {
		continue;
	}
	$text = isset( $item['text'] ) ? wp_kses( (string) $item['text'], $allowed_html ) : '';
	if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
		continue;
	}
	$variant     = isset( $item['variant'] ) ? (string) $item['variant'] : 'default';
	$class       = 'mh-ticker__item' . ( 'wapuu' === $variant ? ' is-wapuu' : '' );
	$inner_html .= sprintf( '<p class="%s">%s</p>', esc_attr( $class ), $text );
}

if ( '' === $inner_html ) {
	return;
}

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'mh-ticker__rail' ) );

printf(
	'<div %1$s><div class="mh-ticker__track">%2$s%2$s</div></div>',
	$wrapper_attrs,
	$inner_html
);
