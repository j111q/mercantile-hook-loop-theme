/**
 * Editor for `mercantile/product-attributes`.
 *
 * Pure server-side block — no configurable attributes, no inner
 * blocks. `edit()` returns a mocked `.shop_attributes` table that
 * mirrors the markup WooCommerce emits on the front-end
 * (woocommerce-product-attributes / -item / __label / __value). The
 * theme's add_editor_style() pulls style.css into the editor, so the
 * `.mh-pdp__panel--details .shop_attributes` rules apply 1:1 — the
 * editor preview looks like the real PDP without any SSR.
 *
 * Rows use em-dash placeholders so it's visually clear these aren't
 * real product values (this template part has no product context).
 * Front-end render comes from render.php, which calls
 * wc_display_product_attributes() against the global $product.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import metadata from './block.json';

// Mock rows for the editor preview. Values match the kind of data
// the real WC product-attributes table emits — fabric blends, care
// instructions, capacity, fit — so the editor preview feels like a
// real PDP row rather than an obviously-fake placeholder.
const PLACEHOLDER_ROWS = [
	{
		label: 'Material',
		slug: 'attribute_pa_material',
		value: '60/40 ring-spun cotton/recycled poly',
	},
	{
		label: 'Care',
		slug: 'attribute_pa_care',
		value: 'Machine wash cold · tumble dry low',
	},
	{
		label: 'Capacity',
		slug: 'attribute_pa_capacity',
		value: '14 oz',
	},
	{
		label: 'Fit',
		slug: 'attribute_pa_fit',
		value: 'Unisex',
	},
	{
		label: 'Construction',
		slug: 'attribute_pa_construction',
		value: 'Embroidered logo, ribbed cuffs',
	},
];

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps();
		return (
			<div { ...blockProps }>
				<table
					className="woocommerce-product-attributes shop_attributes"
					aria-label={ __(
						'Product attributes (placeholder)',
						'mercantile-hook-loop'
					) }
				>
					<tbody>
						{ PLACEHOLDER_ROWS.map( ( row ) => (
							<tr
								key={ row.slug }
								className={ `woocommerce-product-attributes-item woocommerce-product-attributes-item--${ row.slug }` }
							>
								<th
									className="woocommerce-product-attributes-item__label"
									scope="row"
								>
									{ row.label }
								</th>
								<td className="woocommerce-product-attributes-item__value">
									{ row.value }
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			</div>
		);
	},
	save: () => null,
} );
