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
 * `mercantile/pdp-modal`. The modal scaffold lives in parts/pdp-modal.html
 * and is rendered in every page via the header template part. Click
 * interception is handled with a global delegate so it works for any
 * `<a href="/product/...">` link in any block (catalog cells, related
 * products in another modal, mini-cart line items, etc.).
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const NAMESPACE = 'mercantile/pdp-modal';

const { state, actions } = store( NAMESPACE, {
	state: {
		isOpen: false,
		isLoading: false,
		html: '',
		currentUrl: '',
	},
	actions: {
		*open( url ) {
			state.isOpen = true;
			state.isLoading = true;
			state.currentUrl = url;
			document.body.style.overflow = 'hidden';

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
				document.body.style.overflow = '';
				window.location.href = url;
				return;
			}

			state.isLoading = false;
		},
		close() {
			if ( ! state.isOpen ) return;
			state.isOpen = false;
			state.html = '';
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
	},
} );

// ---- Global click delegate ----
// Intercept clicks on any link pointing at /product/<slug>/ and route
// them through the modal. Lives outside the interactivity store so it
// catches links in any block — product-collection cells, related links
// inside an open modal, the mini-cart's product names, etc.
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

document.addEventListener( 'click', function ( event ) {
	if ( event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ) {
		return;
	}
	const link = event.target.closest( 'a[href*="/product/"]' );
	if ( ! link || ! isProductLink( link ) ) {
		return;
	}
	if ( link.target === '_blank' ) return;
	// Don't intercept if we're already inside the modal — let the user
	// navigate away if they explicitly want to leave.
	if ( link.closest( '.mh-pdp-modal' ) ) return;

	event.preventDefault();
	actions.open( link.href );
} );

// Handle browser back / forward.
window.addEventListener( 'popstate', function ( event ) {
	if ( state.isOpen && ( ! event.state || ! event.state.mhPdpModal ) ) {
		// User hit back — close the modal. Don't trigger another history
		// step (the back button itself already advanced history).
		state.isOpen = false;
		state.html = '';
		document.body.style.overflow = '';
	}
} );
