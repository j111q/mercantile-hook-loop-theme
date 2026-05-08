/**
 * Mercantile Hook Loop — AJAX add-to-cart for the PDP modal.
 *
 * WooCommerce's add-to-cart form submits via classic POST by default,
 * which triggers a full page reload to /product/<slug>/?add-to-cart=ID.
 * Inside our IxAPI PDP modal, that reload navigates the underlying
 * page from the catalog to the actual product page, so the modal
 * suddenly overlays a duplicate PDP instead of the catalog grid the
 * user was browsing.
 *
 * Intercept the submit, POST the form data to WC's ajax endpoint
 * (`/?wc-ajax=add_to_cart`) instead, and dispatch the legacy
 * `added_to_cart` jQuery event so mini-cart fragment listeners and
 * the WooCommerce Blocks data store both refresh.
 *
 * Scoped to forms inside `.mh-pdp-modal` so direct PDP loads keep
 * their normal browser-native submit (which is fine — there's no
 * underlying page to disturb on a direct load).
 */

( function () {
	const ENDPOINT = '/?wc-ajax=add_to_cart';

	function findFormInModal( target ) {
		if ( ! ( target instanceof HTMLFormElement ) ) return null;
		if ( ! target.matches( 'form.cart, form.variations_form' ) ) return null;
		if ( ! target.closest( '.mh-pdp-modal' ) ) return null;
		return target;
	}

	function buildBody( form ) {
		const fd = new FormData( form );
		const params = new URLSearchParams();

		// WC's `wc-ajax=add_to_cart` endpoint (class-wc-ajax.php::add_to_cart)
		// expects `product_id` to be the *variation* ID for variable products
		// — it then derives the parent_id + variation attributes from the
		// variation object. Our form sends `product_id=<parent>` and
		// `variation_id=<child>`, which makes WC's handler try to add the
		// parent directly (impossible for variable products) and respond with
		// `{error: true, product_url: '/product/<slug>/'}` — we then
		// helpfully navigated there. Swap so the variation id wins.
		const variationId = fd.get( 'variation_id' );
		const useVariationAsProduct = variationId && variationId !== '0' && variationId !== '';

		for ( const [ key, value ] of fd.entries() ) {
			if ( key === 'product_id' && useVariationAsProduct ) {
				continue; // overridden below
			}
			params.append( key, value );
		}

		if ( useVariationAsProduct ) {
			params.set( 'product_id', variationId );
		} else if ( ! params.has( 'product_id' ) ) {
			// Simple products — fall back to the form's data-product_id.
			const pid = form.dataset.product_id || form.getAttribute( 'data-product_id' );
			if ( pid ) params.set( 'product_id', pid );
		}

		return params.toString();
	}

	function disableButton( form, disable ) {
		const btn = form.querySelector( '.single_add_to_cart_button' );
		if ( ! btn ) return;
		btn.classList.toggle( 'is-loading', disable );
		btn.disabled = disable;
	}

	async function submitAjax( form ) {
		disableButton( form, true );
		try {
			const response = await fetch( ENDPOINT, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: buildBody( form ),
			} );
			const data = await response.json();

			if ( data?.error && data?.product_url ) {
				// Server says go to product URL (e.g. for grouped products
				// that need attribute selection). Fall back to native nav.
				window.location.href = data.product_url;
				return;
			}
			if ( data?.error ) {
				console.warn( 'Mercantile cart-ajax: add failed', data );
				disableButton( form, false );
				return;
			}

			// Notify the rest of WC. Mini-cart blocks listen for a few
			// flavours of event — fire all of them so both the legacy
			// fragments path and the @woocommerce/block-data store update.
			if ( window.jQuery ) {
				const $ = window.jQuery;
				const $body = $( document.body );
				$body.trigger( 'added_to_cart', [
					data?.fragments,
					data?.cart_hash,
					$( form ).find( '.single_add_to_cart_button' ),
				] );
				$body.trigger( 'wc_fragment_refresh' );
				$body.trigger( 'wc_fragments_refreshed' );
			}
			// Newer WC blocks listen for a custom DOM event from the
			// document on cart updates. Fire one with details so the
			// mini-cart block re-reads cart state.
			document.body.dispatchEvent(
				new CustomEvent( 'wc-blocks_added_to_cart', {
					bubbles: true,
					detail: { productId: form.dataset.product_id },
				} )
			);
		} catch ( e ) {
			console.warn( 'Mercantile cart-ajax: network error', e );
		} finally {
			disableButton( form, false );
		}
	}

	document.addEventListener(
		'submit',
		function ( event ) {
			const form = findFormInModal( event.target );
			if ( ! form ) return;
			event.preventDefault();
			event.stopPropagation();
			submitAjax( form );
		},
		true // capture phase — beat WC's own jQuery submit handler
	);
} )();
