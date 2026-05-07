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

	function enhanceSelect( select ) {
		if ( PROCESSED.has( select ) ) return;
		PROCESSED.add( select );

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
				// Belt-and-suspenders for any plugin still listening via jQuery.
				if ( window.jQuery ) {
					window.jQuery( select ).trigger( 'change' );
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
			[ ...select.options ].forEach( ( opt ) => {
				const btn = buttons.get( opt.value );
				if ( ! btn ) return;
				const selected = opt.value !== '' && opt.value === select.value;
				btn.classList.toggle( 'on', selected );
				btn.setAttribute( 'aria-checked', selected ? 'true' : 'false' );
				const unavailable = opt.disabled || opt.style.display === 'none';
				btn.classList.toggle( 'is-unavailable', unavailable );
				btn.disabled = opt.disabled;
			} );
		};
		select.addEventListener( 'change', () => {
			sync();
			setTimeout( sync, 50 );
		} );

		sync();
	}

	function enhanceForm( form ) {
		form.querySelectorAll( 'select[name^="attribute_"]' ).forEach( enhanceSelect );
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
