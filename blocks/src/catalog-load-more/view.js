/**
 * View-side IxAPI store for `mercantile/catalog-load-more`.
 *
 * - `state.currentPage` / `state.nextPage` track which page we'll
 *   fetch next. Both are seeded server-side from `?paged=…` so the
 *   button label reads the right number on first paint.
 * - `state.isLoading` toggles the `.is-loading` class on the button
 *   (which drives the opacity pulse + the bigger blinking ▼).
 * - `state.isExhausted` toggles `.is-exhausted` (`display:none` via
 *   style.css) when the catalog runs out — removes the button from
 *   the layout without disrupting the IxAPI ref.
 * - `actions.loadNext` fetches `<current-url>?paged=N+1`, extracts
 *   the product cells from the response, and appends them to the
 *   live grid. Falls back to no-op on 404 / empty / short-page.
 * - `callbacks.observe` wires an IntersectionObserver to the button
 *   so it auto-loads as it scrolls into view; click is the
 *   no-IO / no-JS fallback.
 */
import { store, getElement } from '@wordpress/interactivity';

const PRODUCT_LIST_SELECTOR = '.mh-grid .wc-block-product-template';

const { state, actions } = store( 'mercantile/catalog-load-more', {
	state: {
		// Server-seeded keys:
		// - currentPage (int)
		// - nextPage (int)
		// - isLoading (bool)
		// - isExhausted (bool)
	},
	actions: {
		*loadNext( event ) {
			if ( state.isLoading || state.isExhausted ) {
				return;
			}
			if ( event ) {
				event.preventDefault?.();
			}
			state.isLoading = true;

			const list = document.querySelector( PRODUCT_LIST_SELECTOR );
			if ( ! list ) {
				state.isExhausted = true;
				state.isLoading = false;
				return;
			}
			// Count the items the server rendered on first paint as
			// the "full page" expectation. Beats hardcoding a number
			// (which would skew if the template's perPage changes).
			const perPage = list.children.length;

			const url = new URL( window.location.href );
			url.searchParams.set( 'paged', String( state.nextPage ) );

			try {
				const response = yield fetch( url.toString(), {
					credentials: 'same-origin',
					headers: { Accept: 'text/html' },
				} );
				if ( ! response.ok ) {
					state.isExhausted = true;
					return;
				}
				const html = yield response.text();
				const doc = new DOMParser().parseFromString(
					html,
					'text/html'
				);
				const nextList = doc.querySelector( PRODUCT_LIST_SELECTOR );
				const items = nextList ? Array.from( nextList.children ) : [];
				if ( items.length === 0 ) {
					state.isExhausted = true;
					return;
				}

				const frag = document.createDocumentFragment();
				for ( const item of items ) {
					frag.appendChild( item.cloneNode( true ) );
				}
				list.appendChild( frag );

				state.currentPage = state.nextPage;
				state.nextPage = state.currentPage + 1;

				// Short page → that was the final page. Skip the next
				// fetch (which would just 404 / return empty).
				if ( items.length < perPage ) {
					state.isExhausted = true;
				}
			} catch ( e ) {
				// Network blip — back off and let the user retry by
				// clicking. Leave isExhausted false so the next click
				// can try again.
			}
			state.isLoading = false;
		},
	},
	callbacks: {
		observe() {
			const { ref } = getElement();
			if ( ! ref ) return;

			const observer = new IntersectionObserver(
				( entries ) => {
					for ( const entry of entries ) {
						if (
							entry.isIntersecting &&
							! state.isLoading &&
							! state.isExhausted
						) {
							actions.loadNext();
						}
					}
				},
				{
					// Start fetching when the button is within 400px
					// of the viewport bottom — feels like auto-load
					// rather than a stall at the bottom.
					rootMargin: '0px 0px 400px 0px',
					threshold: 0,
				}
			);
			observer.observe( ref );
		},
	},
} );
