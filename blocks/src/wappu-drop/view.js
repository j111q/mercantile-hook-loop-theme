/**
 * View-side iAPI store for `mercantile/wappu-drop`.
 *
 * Click spawns N <div class="mh-wapuu-poof"> elements anchored just below
 * the button, each with randomized --dx/--dy/--rot CSS vars so the CSS
 * keyframe drifts them out and fades them. The elements remove themselves
 * once their animation ends, so the DOM stays clean.
 *
 * The wapuu SVG URL and per-click count are static — they come from
 * iAPI config (seeded server-side in render.php). No reactive state on
 * this store.
 *
 * Respects `prefers-reduced-motion`: the keyframe is hidden via CSS, but
 * we also skip spawning the nodes to avoid clutter.
 */
import { getConfig, getElement, store } from '@wordpress/interactivity';

const NATIVE_ASPECT = 66 / 60;

store( 'mercantile/wappu-drop', {
	actions: {
		drop() {
			if (
				window.matchMedia &&
				window.matchMedia( '(prefers-reduced-motion: reduce)' )
					.matches
			) {
				return;
			}

			const { ref } = getElement();
			if ( ! ref ) {
				return;
			}
			const { src, count } = getConfig();
			const rect = ref.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const cy = rect.bottom + 10;
			const total = Math.max( 1, Number( count ) || 1 );

			for ( let i = 0; i < total; i++ ) {
				spawn( cx, cy, src, i );
			}
		},
	},
} );

function spawn( x, y, src, i ) {
	const el = document.createElement( 'div' );
	el.className = 'mh-wapuu-poof';

	const img = document.createElement( 'img' );
	img.src = src;
	img.alt = '';
	el.appendChild( img );

	const size = 18 + Math.random() * 22;
	el.style.width = size + 'px';
	el.style.height = size * NATIVE_ASPECT + 'px';
	el.style.left = x + 'px';
	el.style.top = y + 'px';
	el.style.setProperty( '--dx', ( Math.random() - 0.5 ) * 220 + 'px' );
	el.style.setProperty( '--dy', 60 + Math.random() * 200 + 'px' );
	el.style.setProperty( '--rot', ( Math.random() - 0.5 ) * 340 + 'deg' );
	el.style.animationDelay = i * 22 + 'ms';

	const cleanup = () => el.remove();
	el.addEventListener( 'animationend', cleanup, { once: true } );

	document.body.appendChild( el );
}
