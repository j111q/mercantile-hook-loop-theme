/**
 * Mercantile Hook Loop — catalog scroll behaviors.
 *
 * Two coupled scroll-driven UI behaviors that live on the catalog
 * archives (shop, category, search):
 *
 * 1. **Shrinking section head.** The section-head template part is
 *    sticky under the ticker (top: 34px). When the user scrolls past
 *    the hero, this script toggles `.is-shrunk` on the section head
 *    so it visually compresses — same sticky offset, less vertical
 *    weight. The shrunk styling itself lives in style.css.
 *
 * 2. **Infinite scroll (load more).** Pagination blocks were removed
 *    from the catalog templates; this script appends subsequent
 *    pages of products as the user scrolls toward the bottom of the
 *    grid. Uses an IntersectionObserver-driven sentinel placed
 *    after the `.mh-grid` so we only fetch when the user is actually
 *    close to the end.
 *
 * Vanilla JS, no jQuery, no Interactivity API hooks — entirely
 * additive over the SSR markup so the catalog still works without JS
 * (it just stops at the first page).
 */

( function () {
	const SHRINK_THRESHOLD_PX = 80;

	/* --------- Shrinking section head ------------------------------ */

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

	/* --------- Infinite scroll ------------------------------------- */

	function initInfiniteScroll() {
		// The grid wrapper is .mh-grid-wrap with .mh-grid as the
		// product-collection block inside it. We only enable
		// infinite scroll where both exist.
		const wrap = document.querySelector( '.mh-grid-wrap' );
		const grid = wrap?.querySelector( '.mh-grid' );
		const list = grid?.querySelector( '.wc-block-product-template' );
		if ( ! wrap || ! grid || ! list ) return;

		// Working URL — we walk through ?paged=2, ?paged=3, … starting
		// from whatever the current URL says (so the behavior composes
		// if someone deep-links to e.g. /shop/page/2/).
		const currentUrl = new URL( window.location.href );
		let currentPage = parseInt( currentUrl.searchParams.get( 'paged' ) || '1', 10 );
		if ( ! Number.isFinite( currentPage ) || currentPage < 1 ) {
			currentPage = 1;
		}

		let exhausted = false;
		let loading = false;

		// Sentinel — invisible div after the grid that triggers the
		// next fetch when it scrolls into view. Placed inside
		// .mh-grid-wrap so its layout is bound to the grid's column.
		const sentinel = document.createElement( 'div' );
		sentinel.className = 'mh-load-more-sentinel';
		sentinel.setAttribute( 'aria-hidden', 'true' );
		sentinel.style.cssText =
			'min-height:1px;width:100%;contain:strict;pointer-events:none';
		wrap.appendChild( sentinel );

		// Optional status line for assistive tech (and visible state
		// once the run completes).
		const status = document.createElement( 'p' );
		status.className = 'mh-load-more-status';
		status.setAttribute( 'role', 'status' );
		status.setAttribute( 'aria-live', 'polite' );
		status.textContent = '';
		wrap.appendChild( status );

		async function loadNext() {
			if ( exhausted || loading ) return;
			loading = true;

			const nextPage = currentPage + 1;
			const url = new URL( window.location.href );
			url.searchParams.set( 'paged', String( nextPage ) );

			try {
				const response = await fetch( url.toString(), {
					credentials: 'same-origin',
					headers: { Accept: 'text/html' },
				} );
				if ( ! response.ok ) {
					// 404 on the next page means no more — bail out
					// silently rather than retrying.
					exhausted = true;
					sentinel.remove();
					return;
				}
				const html = await response.text();
				const doc = new DOMParser().parseFromString( html, 'text/html' );

				// Extract the product cells from the next page's grid.
				// WC wraps each product cell in <li class="product …">
				// inside <ul class="wc-block-product-template">.
				const nextList = doc.querySelector(
					'.mh-grid .wc-block-product-template'
				);
				const items = nextList ? nextList.children : null;
				if ( ! items || items.length === 0 ) {
					exhausted = true;
					sentinel.remove();
					return;
				}

				const frag = document.createDocumentFragment();
				for ( const item of Array.from( items ) ) {
					frag.appendChild( item.cloneNode( true ) );
				}
				list.appendChild( frag );

				currentPage = nextPage;

				// If the next page has fewer items than expected (last
				// page short-load) the next fetch will 404 or be empty;
				// no need to track total pages manually.
			} catch ( e ) {
				// Network blip — don't lock the user out, but back off
				// so we don't hammer the server.
				setTimeout( () => {
					loading = false;
				}, 1500 );
				return;
			}
			loading = false;
		}

		const observer = new IntersectionObserver(
			( entries ) => {
				for ( const entry of entries ) {
					if ( entry.isIntersecting ) {
						loadNext();
					}
				}
			},
			{
				// Start fetching when the sentinel is within 400px of
				// the viewport bottom — feels like "auto-load" rather
				// than a stall at the bottom.
				rootMargin: '0px 0px 400px 0px',
				threshold: 0,
			}
		);
		observer.observe( sentinel );
	}

	/* --------- Boot ------------------------------------------------ */

	function boot() {
		initShrinkingHeader();
		initInfiniteScroll();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
} )();
