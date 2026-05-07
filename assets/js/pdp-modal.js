/**
 * Mercantile Hook Loop — PDP modal via the WordPress Interactivity API.
 *
 * When the user clicks a product link from the catalog (e.g. a product card
 * in the home grid), this module intercepts the navigation, fetches the
 * product page, extracts the `.mh-pdp` card, and renders it inside a
 * fixed-position modal overlay with a frosted-glass scrim. The user can
 * close via the × button, by clicking the scrim, or with the Escape key.
 *
 * Falls back to native navigation when:
 * - The user holds a modifier key (cmd/ctrl/shift/alt) — opens in new tab
 * - The link has target="_blank"
 * - The fetch errors
 * - JavaScript / the Interactivity API are unavailable
 *
 * Direct loads of /product/<slug> still render the full page (no modal),
 * so external / shared links still work.
 *
 * Architecture: a single global interactive store named
 * `mercantile/pdp-modal`. All event listeners (click, keydown, popstate) are
 * registered through IxAPI directives on the modal scaffold rather than via
 * vanilla `addEventListener`, so the lifecycle is owned by the IxAPI runtime
 * and the registration is declarative in `parts/pdp-modal.html`. The click
 * delegate uses `data-wp-on-document--click` so it catches any
 * `<a href="/product/...">` in any block (catalog cells, related products,
 * mini-cart line items) without per-template directive plumbing.
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const NAMESPACE = 'mercantile/pdp-modal';

// Pool of in-character loading messages shown briefly while we fetch
// the product page. Picked at random per open, never repeating the
// previous one.
const LOADING_LABELS = [
	'compiling…',
	'unwrapping it…',
	'running the_content()…',
	'pulling from wp-content/merch…',
	'polishing the kerning…',
	'committing markup…',
	'wapuu woke up…',
	"did_action( 'preview' )…",
	'fetching, gently…',
];

let lastLoadingLabel = null;
function pickLoadingLabel() {
	const options = LOADING_LABELS.filter( ( l ) => l !== lastLoadingLabel );
	const next = options[ Math.floor( Math.random() * options.length ) ];
	lastLoadingLabel = next;
	return next;
}

// ASCII Wapuu — original art, drawn by Jill, ~100×51 of U+2588 blocks.
// Rendered character-by-character while the product page is fetching
// (see startWapuuReveal). Each open shuffles a fresh reveal order so
// the wapuu materialises differently every time.
const WAPUU_ART = `                                            ████████████████
                                       █████████████████████████
                                   ████████████████    ████████████
                                 █████████                    █████████████████████████████
                               ██████                           ███████████████████████████
                             ██████             ███             ████                   ████
                           ██████               ███               █████              █████
                          ████████   █████                          ██████        ███████
                       ███████ ███  ██████                             ████████████████
                   █████████          █           ███                    ███████████
                  ███████ ██        ████████████████████████              ████
                  ██████████     ████████████████████████████             ████
                  ███████████████████████████                              ████
                   ████████████████████████                                 ███
                   ████   ███████████████                                   ████
                  ████   █████████████████    ███████████████               ████
                  ██████████████████████████████████████████████             ███
                 ██████████████████████       █████████████████████          ████
                █████████████    ███████     █ █████████████████████         ████
                █████  ██████    ████████    ██ ██████████████████████       ████
               ██████  ███████    ████████  ███ ███████████████████████      ████
               ██████   ██████    ████████  ████ ██████████████████████      ████
               ██████   ███████    ███████ █████ ██████████████████████      ████
               ███████  ████████    ██████ █████ ██████████████████████      ████
               ███████   ███████    █████ █████ ███████████████████████      ████
               ████████   ███ ███    ████ █████ ███████████████████████      ████
          ██████████████  ███ ████    ██ █████ ████████████████████████      ███
         ███████████████   ████████   ██ █████████████████████████████      ████
        █████   █████████   ████████    ████ ██████████████████████████     ████
       ████       █████████  ████████   ███     ██████████           ███   ████
       ████        █████████ █████████ ███       ███████                   ████
        ████        ████████ ██████████████       ████                    ████
         ████         █████████████████████        ███                   ████
          █████       █████████████████████         ███                 █████
           ██████      █████████████████████        ███               ██████
             ██████     ████████████████████        ███             ██████
              ████████  ████████████████████        ███          ████████
                 ███████████████████████████       ███      ███████████
                   ███████     █████████████      ██████████████  ████
                                    █████████   ██████████████   ████
                   ██████████            ████████████████████   ████
                  █████████████           █████████  ███████  █████
                 ████     ██████                   ███████   █████
                 ████        █████              ████████   █████
                 █████        ███████    ████████████    ██████
                  █████         █████████████████     ███████
                   ██████         ███████████      ████████
                     ████████                  █████████
                       ██████████         ████████████
                          ████████████████████████
                               ██████████████`;

// Pre-compute the indices of every block character so reveal can
// shuffle them once and step through. Newlines and spaces stay put.
const WAPUU_BLOCK_INDICES = ( () => {
	const out = [];
	for ( let i = 0; i < WAPUU_ART.length; i++ ) {
		if ( WAPUU_ART[ i ] === '█' ) out.push( i );
	}
	return out;
} )();

// Total reveal duration, in ms. Tuned to feel like the wapuu is
// 'rendering in' rather than appearing instantly — but short enough
// that fast networks still show most of him.
const WAPUU_REVEAL_MS = 900;

let wapuuTimer = null;

function startWapuuReveal() {
	stopWapuuReveal();
	const el = document.querySelector( '.mh-pdp-modal__loading .mh-wapuu-ascii' );
	if ( ! el ) return;

	// Start with a blank canvas the same shape as the final art —
	// every block becomes a space, every newline stays. This locks
	// in the height of the loading area so it doesn't reflow as the
	// wapuu fills in.
	const blank = WAPUU_ART.replace( /█/g, ' ' );
	const buf = blank.split( '' );
	el.textContent = blank;

	// Fisher-Yates shuffle of the block indices.
	const order = WAPUU_BLOCK_INDICES.slice();
	for ( let i = order.length - 1; i > 0; i-- ) {
		const j = Math.floor( Math.random() * ( i + 1 ) );
		[ order[ i ], order[ j ] ] = [ order[ j ], order[ i ] ];
	}

	const total = order.length;
	const tickMs = 16;
	const ticks = Math.max( 1, Math.round( WAPUU_REVEAL_MS / tickMs ) );
	const perTick = Math.max( 1, Math.ceil( total / ticks ) );
	let cursor = 0;

	wapuuTimer = setInterval( () => {
		const end = Math.min( cursor + perTick, total );
		for ( let i = cursor; i < end; i++ ) {
			buf[ order[ i ] ] = '█';
		}
		cursor = end;
		el.textContent = buf.join( '' );
		if ( cursor >= total ) {
			stopWapuuReveal();
		}
	}, tickMs );
}

function stopWapuuReveal() {
	if ( wapuuTimer ) {
		clearInterval( wapuuTimer );
		wapuuTimer = null;
	}
}

const { state, actions } = store( NAMESPACE, {
	state: {
		isOpen: false,
		isLoading: false,
		html: '',
		currentUrl: '',
		loadingText: 'compiling…',
	},
	actions: {
		*open( url ) {
			state.isOpen = true;
			state.isLoading = true;
			state.loadingText = pickLoadingLabel();
			state.currentUrl = url;
			document.body.style.overflow = 'hidden';
			// Kick off the wapuu reveal on the next tick so the
			// loading element has rendered in the DOM.
			setTimeout( startWapuuReveal, 0 );

			try {
				// Always fetch fresh — the browser otherwise serves a stale
				// cached HTML, which means template / inline-style changes
				// (e.g. tweaks to padding on .mh-pdp__side) only show up
				// after a hard refresh of the product URL itself.
				const response = yield fetch( url, {
					credentials: 'same-origin',
					cache: 'no-store',
				} );
				if ( ! response.ok ) {
					throw new Error( 'Fetch failed: ' + response.status );
				}
				const text = yield response.text();
				const doc = new DOMParser().parseFromString( text, 'text/html' );
				const card = doc.querySelector( '.mh-pdp' );
				if ( ! card ) {
					throw new Error( 'No .mh-pdp in response' );
				}
				// Strip the breadcrumb header's close button — the modal has
				// its own × that's wired to the IxAPI close action.
				const innerClose = card.querySelector( '.mh-pdp__close' );
				if ( innerClose ) {
					innerClose.remove();
				}
				state.html = card.outerHTML;
				// Update the URL bar so the back button works.
				try {
					window.history.pushState( { mhPdpModal: true, url }, '', url );
				} catch ( e ) { /* ignore history failures */ }
			} catch ( e ) {
				// Bail to native navigation on any fetch / parse error.
				state.isOpen = false;
				state.isLoading = false;
				stopWapuuReveal();
				document.body.style.overflow = '';
				window.location.href = url;
				return;
			}

			state.isLoading = false;
			stopWapuuReveal();
		},
		close() {
			if ( ! state.isOpen ) return;
			state.isOpen = false;
			state.html = '';
			stopWapuuReveal();
			document.body.style.overflow = '';
			// If we opened via pushState, restore the URL on close.
			if ( window.history.state && window.history.state.mhPdpModal ) {
				try {
					window.history.back();
				} catch ( e ) { /* ignore */ }
			}
		},
		stopPropagation( event ) {
			event.stopPropagation();
		},
	},
	callbacks: {
		onKeydown( event ) {
			if ( event.key === 'Escape' && state.isOpen ) {
				actions.close();
			}
		},
		// Imperatively syncs state.html into the element's innerHTML when
		// state.html changes. There's no native data-wp-html directive in
		// the Interactivity API (only data-wp-text for textContent), so we
		// use data-wp-watch on the content element which fires this callback
		// any time the watched state changes.
		onContentChange() {
			const { ref } = getElement();
			if ( ! ref ) return;
			if ( ref.innerHTML !== state.html ) {
				ref.innerHTML = state.html || '';
			}
		},
		// Document-level click delegate, registered via
		// data-wp-on-document--click on the modal root. Catches any
		// <a href="/product/..."> in any block (catalog cells, related
		// products, mini-cart line items, etc.) without per-template
		// directive plumbing.
		onDocumentClick( event ) {
			if ( event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ) {
				return;
			}
			const link = event.target.closest( 'a[href*="/product/"]' );
			if ( ! link || ! isProductLink( link ) ) return;
			if ( link.target === '_blank' ) return;
			// Don't intercept if we're already inside the modal — let the
			// user navigate away if they explicitly want to leave.
			if ( link.closest( '.mh-pdp-modal' ) ) return;
			event.preventDefault();
			actions.open( link.href );
		},
		// Window-level popstate handler, registered via
		// data-wp-on-window--popstate. Closes the modal when the user
		// hits the browser back button (the back itself advances history,
		// so we just clear modal state here).
		onPopstate( event ) {
			if ( state.isOpen && ( ! event.state || ! event.state.mhPdpModal ) ) {
				state.isOpen = false;
				state.html = '';
				stopWapuuReveal();
				document.body.style.overflow = '';
			}
		},
	},
} );

function isProductLink( link ) {
	if ( ! link || ! link.href ) return false;
	let pathname;
	try {
		pathname = new URL( link.href, window.location.origin ).pathname;
	} catch ( e ) {
		return false;
	}
	return pathname.startsWith( '/product/' );
}
