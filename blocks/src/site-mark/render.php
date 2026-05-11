<?php
/**
 * Server render for `mercantile/site-mark`.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$href  = ! empty( $attributes['href'] ) ? esc_url( $attributes['href'] ) : esc_url( home_url( '/' ) );
$label = isset( $attributes['label'] ) ? (string) $attributes['label'] : 'Mercantile home';
$size  = isset( $attributes['size'] ) ? (int) $attributes['size'] : 14;

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'mh-site-mark' ) );

$svg = '<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 28 28" width="' . esc_attr( $size ) . '" height="' . esc_attr( $size ) . '" aria-hidden="true"><path fill="currentColor" d="M13.605.924c2.538 0 5.008.756 7.101 2.173a13 13 0 0 1 4.604 5.589c1.674 3.956 1.228 8.478-1.175 12.029a13.4 13.4 0 0 1-5.589 4.603c-3.955 1.674-8.478 1.229-12.028-1.174A13.4 13.4 0 0 1 1.914 18.555C.24 14.6.685 10.077 3.089 6.526A13.4 13.4 0 0 1 8.678 1.923 13 13 0 0 1 13.605.924m0-.81C6.153.114.105 6.162.105 13.614c0 7.451 6.048 13.499 13.5 13.499s13.5-6.048 13.5-13.5S21.057.115 13.605.115Z"/><path fill="currentColor" d="M2.36 13.613a11.27 11.27 0 0 0 6.345 10.125L3.332 9.037a11.4 11.4 0 0 0-.972 4.576m18.846-.567c0-1.39-.5-2.349-.931-3.105-.432-.756-1.107-1.715-1.107-2.633 0-.918.783-1.998 1.89-1.998h.148c-4.576-4.198-11.69-3.888-15.89.702a11.6 11.6 0 0 0-1.107 1.418h.73c1.174 0 2.997-.149 2.997-.149.607-.04.675.851.067.932 0 0-.607.067-1.282.108l4.09 12.19 2.458-7.385-1.755-4.806c-.608-.04-1.175-.108-1.175-.108-.607-.04-.54-.958.068-.932 0 0 1.864.149 2.957.149 1.094 0 2.997-.149 2.997-.149.608-.04.676.852.068.932 0 0-.608.067-1.283.108l4.064 12.097 1.16-3.671c.514-1.607.824-2.74.824-3.713l.013.014ZM13.795 14.585l-3.376 9.815a11.65 11.65 0 0 0 6.913-.176l-.082-.149-3.456-9.49ZM23.474 8.213c.054.378.082.77.082 1.161 0 1.148-.216 2.43-.85 4.024l-3.443 9.936c5.265-3.066 7.142-9.775 4.211-15.121"/></svg>';

printf(
	'<a %1$s href="%2$s" aria-label="%3$s" title="%3$s">%4$s</a>',
	$wrapper_attrs,
	$href,
	esc_attr( $label ),
	$svg
);
