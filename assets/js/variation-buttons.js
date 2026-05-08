/**
 * Mercantile Hook Loop — variation form size buttons.
 *
 * The `woocommerce/add-to-cart-form` block renders variable-product
 * attribute pickers as <select> dropdowns by default, which fights the
 * prototype's design of mono-font button rows. This script enhances
 * each variation <select> with a row of styled buttons that wrap around
 * it: clicks on a button drive the underlying <select> state via a
 * native `change` event, so WC's existing variation logic (price /
 * image / availability / cart submission) keeps working unchanged.
 *
 * Hooks into a MutationObserver on document.body so forms inserted
 * later — e.g. when the PDP modal hydrates its content via the IxAPI
 * store — also get enhanced.
 *
 * Buttons are marked `.is-unavailable` when the corresponding option
 * has no in-stock + purchasable variation given the user's current
 * other-attribute selections. WC ships the full variation matrix as a
 * JSON blob on `form.variations_form[data-product_variations]`; we
 * parse it once per form and re-evaluate availability whenever any
 * attribute select changes (including cross-attribute fan-out — e.g.
 * picking a Color disables Sizes that are out of stock for that color).
 *
 * Vanilla JS, no jQuery dependency. Native `change` events bubble and
 * jQuery's event system honours them, so WC's own jQuery handlers fire.
 */

( function () {
	const PROCESSED = new WeakSet();

	// Strip these "type prefixes" from option labels for cleaner buttons.
	// Mercantile names variations as "Adult Unisex XS", "Women's MD" etc.;
	// the prefix is redundant inside a single product's size picker.
	const STRIP_PREFIXES = [
		'Adult Unisex ',
		"Women's ",
		"Men's ",
		'Youth ',
		'Kids ',
		'Toddler ',
	];

	function cleanLabel( text ) {
		const t = text.trim();
		for ( const p of STRIP_PREFIXES ) {
			if ( t.startsWith( p ) ) return t.slice( p.length );
		}
		return t;
	}

	// Canonical size order for the picker. WC outputs options
	// alphabetically by term slug, which ranks `2XL` before `LG` and
	// looks chaotic. We re-sort the buttons after they're built so a
	// known size set renders left-to-right small → large. Non-size
	// attributes (Color, etc.) all return Infinity rank, which is a
	// stable no-op under V8's stable sort — original order preserved.
	const SIZE_ORDER = [
		'XXS', 'XS', 'S', 'SM', 'M', 'MD', 'L', 'LG',
		'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '6XL',
	];

	function sizeRank( label ) {
		const idx = SIZE_ORDER.indexOf( label.trim().toUpperCase() );
		return idx >= 0 ? idx : Infinity;
	}

	/**
	 * Read & parse WC's variation matrix from the form. Each variation:
	 *   { variation_id, attributes: { attribute_pa_size: "small", ... },
	 *     is_in_stock, is_purchasable, ... }
	 * An empty-string attribute value means "any" (variation matches any
	 * value for that attribute). Returns null if no usable data.
	 */
	function parseVariations( form ) {
		if ( ! form ) return null;
		const raw = form.getAttribute( 'data-product_variations' );
		if ( ! raw || raw === 'false' ) return null;
		try {
			const parsed = JSON.parse( raw );
			return Array.isArray( parsed ) ? parsed : null;
		} catch ( _ ) {
			return null;
		}
	}

	/**
	 * Is there any in-stock + purchasable variation that matches:
	 *   - this attribute (`attrName`) = `attrValue`
	 *   - all other attributes already selected by the user
	 * Variation attribute value of `""` accepts any value for that attr.
	 */
	function hasInStockMatch( variations, attrName, attrValue, otherSelections ) {
		return variations.some( ( v ) => {
			if ( ! v.is_in_stock ) return false;
			if ( v.is_purchasable === false ) return false;
			const attrs = v.attributes || {};
			const myAttr = attrs[ attrName ];
			if ( myAttr && myAttr !== attrValue ) return false;
			for ( const name in otherSelections ) {
				const variAttr = attrs[ name ];
				if ( variAttr && variAttr !== otherSelections[ name ] ) return false;
			}
			return true;
		} );
	}

	function enhanceSelect( select ) {
		if ( PROCESSED.has( select ) ) return;
		PROCESSED.add( select );

		const form = select.closest( 'form.variations_form' );
		const variations = parseVariations( form );

		const labelEl = select.closest( 'tr' )?.querySelector( 'th.label label' );
		const row = document.createElement( 'div' );
		row.className = 'mh-variation-buttons';
		row.setAttribute( 'role', 'radiogroup' );
		if ( labelEl ) {
			row.setAttribute( 'aria-label', labelEl.textContent.trim() );
		}

		const buttons = new Map();
		[ ...select.options ].forEach( ( opt ) => {
			if ( ! opt.value ) return; // skip the empty "Choose an option" placeholder
			const btn = document.createElement( 'button' );
			btn.type = 'button';
			btn.dataset.value = opt.value;
			btn.textContent = cleanLabel( opt.textContent );
			btn.setAttribute( 'role', 'radio' );
			btn.setAttribute( 'aria-checked', 'false' );
			btn.addEventListener( 'click', () => {
				if ( btn.classList.contains( 'is-unavailable' ) ) return;
				// Toggling off if already selected (clicking the active button)
				// matches WC's "reset" behavior for re-choosing.
				const newVal = select.value === opt.value ? '' : opt.value;
				select.value = newVal;
				select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
				// WC's add-to-cart-variation.js binds its handlers via jQuery's
				// event system (delegated on the form, namespaced
				// `change.wc-variation-form`). Native dispatch alone has been
				// observed not to flow through reliably — the variation_id
				// input stays unset and the Add to Cart button keeps its
				// .disabled / wc-variation-selection-needed classes, so the
				// first ATC click runs the "no selection" fallback (which
				// belatedly fires check_variations and shows stock) and the
				// second click is the one that actually submits.
				//
				// Trigger via jQuery AND fire `check_variations` directly on
				// the form so WC's onFindVariation runs immediately, sets the
				// variation_id, and onShow enables the button.
				if ( window.jQuery && form ) {
					const $ = window.jQuery;
					$( select ).trigger( 'change' );
					$( form ).trigger( 'check_variations' );
				}
			} );
			row.appendChild( btn );
			buttons.set( opt.value, btn );
		} );

		// Sort buttons by canonical size order before mounting. Non-size
		// attributes are no-ops (all Infinity rank, stable sort).
		[ ...row.children ]
			.sort( ( a, b ) => sizeRank( a.textContent ) - sizeRank( b.textContent ) )
			.forEach( ( b ) => row.appendChild( b ) );

		// Keep the <select> in the DOM (WC's logic reads from it) but hide it.
		select.style.display = 'none';
		select.insertAdjacentElement( 'afterend', row );

		// Two-way sync: when the underlying select changes (via a click here, a
		// programmatic reset, or the "Clear" link), reflect state in the buttons.
		// WC sets `disabled` on incompatible options after firing its own event,
		// so we re-sync on a microtask delay to catch that pass.
		const sync = () => {
			// Snapshot OTHER selects' current selections on the same form, so
			// stock checks can fan out across attributes (e.g. picking Color=Red
			// disables Sizes that are out of stock for Red).
			const otherSelections = {};
			if ( form ) {
				for ( const s of form.querySelectorAll( 'select[name^="attribute_"]' ) ) {
					if ( s !== select && s.value ) {
						otherSelections[ s.name ] = s.value;
					}
				}
			}

			[ ...select.options ].forEach( ( opt ) => {
				const btn = buttons.get( opt.value );
				if ( ! btn ) return;
				const selected = opt.value !== '' && opt.value === select.value;
				btn.classList.toggle( 'on', selected );
				btn.setAttribute( 'aria-checked', selected ? 'true' : 'false' );

				// Availability sources:
				//   1. WC marked the option disabled or hidden (cross-attribute
				//      incompatibility — there's NO variation at all for this
				//      combination)
				//   2. There IS a matching variation but none in stock /
				//      purchasable given the current other-attribute picks
				let unavailable = opt.disabled || opt.style.display === 'none';
				if ( ! unavailable && variations && opt.value ) {
					unavailable = ! hasInStockMatch( variations, select.name, opt.value, otherSelections );
				}
				btn.classList.toggle( 'is-unavailable', unavailable );
				btn.disabled = unavailable;
			} );
		};
		// Listen on the form so a change on ANY select on this form re-syncs
		// THIS select's buttons. Without this, picking Color wouldn't refresh
		// the Size buttons' stock state for the new color.
		( form || select ).addEventListener( 'change', () => {
			sync();
			setTimeout( sync, 50 );
		} );

		sync();
	}

	function enhanceForm( form ) {
		form.querySelectorAll( 'select[name^="attribute_"]' ).forEach( enhanceSelect );
		// Ensure WC's VariationForm class is initialized on this form.
		// WC's own init runs once at jQuery DOM-ready against existing
		// `.variations_form` nodes; forms hydrated *after* that (e.g. by
		// the IxAPI PDP modal) never get a VariationForm instance, so
		// none of WC's `change.wc-variation-form` / `check_variations`
		// handlers are bound. Calling wc_variation_form() ourselves
		// constructs a new VariationForm for this form, attaching all
		// the change/found_variation/show_variation listeners that turn
		// our select changes into UI updates.
		if (
			window.jQuery &&
			typeof window.jQuery.fn.wc_variation_form === 'function' &&
			typeof window.wc_add_to_cart_variation_params !== 'undefined'
		) {
			const $form = window.jQuery( form );
			if ( ! $form.data( 'wc-variation-form-initialised' ) ) {
				$form.wc_variation_form();
				$form.data( 'wc-variation-form-initialised', true );
			}
		}
	}

	function init() {
		document.querySelectorAll( 'form.variations_form' ).forEach( enhanceForm );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	// Re-enhance forms inserted later (e.g. when the PDP modal hydrates content).
	const observer = new MutationObserver( ( mutations ) => {
		for ( const m of mutations ) {
			for ( const node of m.addedNodes ) {
				if ( ! ( node instanceof HTMLElement ) ) continue;
				if ( node.matches?.( 'form.variations_form' ) ) {
					enhanceForm( node );
				}
				node.querySelectorAll?.( 'form.variations_form' ).forEach( enhanceForm );
			}
		}
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
} )();
