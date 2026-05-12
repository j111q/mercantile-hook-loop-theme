/**
 * Mercantile Hook Loop — shrinking sticky section head.
 *
 * The section-head template part is sticky under the ticker
 * (top: 34px). When the user scrolls past 80px, this script toggles
 * `.is-shrunk` on it so it visually compresses — same sticky
 * offset, less vertical weight. The shrunk styling itself lives in
 * style.css.
 *
 * Infinite-scroll / load-more lives in the
 * `mercantile/catalog-load-more` block (see
 * blocks/src/catalog-load-more/view.js) and is wired up via the
 * Interactivity API. This file is purely the header-shrink loop.
 */

( function () {
	const SHRINK_THRESHOLD_PX = 80;

	function initShrinkingHeader() {
		const head = document.querySelector( '.mh-section-head' );
		if ( ! head ) return;

		let raf = 0;
		const update = () => {
			raf = 0;
			head.classList.toggle(
				'is-shrunk',
				window.scrollY > SHRINK_THRESHOLD_PX
			);
		};

		const onScroll = () => {
			if ( raf ) return;
			raf = window.requestAnimationFrame( update );
		};

		window.addEventListener( 'scroll', onScroll, { passive: true } );
		update();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initShrinkingHeader );
	} else {
		initShrinkingHeader();
	}
} )();
