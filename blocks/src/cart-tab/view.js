/**
 * View-side iAPI store for `mercantile/cart-tab`.
 *
 * - state.itemCount is derived from WooCommerce's locked `woocommerce`
 *   cart store. We don't import that store as a webpack module — its
 *   state is seeded server-side by BlocksSharedState::load_cart_state()
 *   (called from render.php) and mutated at runtime by WC's own cart
 *   iAPI module, which is auto-loaded whenever a WC block enqueues it
 *   (mini-cart, product-collection, add-to-cart, etc.). We just hold a
 *   reference to the namespace and let iAPI's reactivity propagate
 *   the cart updates.
 *
 * - actions.openCart intercepts the click and asks the locked
 *   `woocommerce/mini-cart` store to open its drawer. If the mini-cart
 *   isn't on the page, the action is a no-op and the link follows its
 *   href to /cart/ as a graceful fallback.
 */
import { store } from '@wordpress/interactivity';

const wcLock =
	'I acknowledge that using a private store means my plugin will inevitably break on the next store release.';

const { state: wcState } = store( 'woocommerce', {}, { lock: wcLock } );

store( 'mercantile/cart-tab', {
	state: {
		get itemCount() {
			const items = wcState?.cart?.items ?? [];
			return items.reduce(
				( total, item ) => total + ( item.quantity || 0 ),
				0
			);
		},
	},
	actions: {
		openCart( event ) {
			const miniCart = store(
				'woocommerce/mini-cart',
				{},
				{ lock: wcLock }
			);
			if ( miniCart?.actions?.openDrawer ) {
				event.preventDefault();
				miniCart.actions.openDrawer();
			}
		},
	},
} );
