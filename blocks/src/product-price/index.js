/**
 * Editor for `mercantile/product-price`.
 *
 * Pure server-side block — no attributes, no inner blocks. The
 * editor preview mimics WC's `get_price_html()` output: outer
 * `.wc-block-components-product-price__value` span (which our
 * `.mh-pdp__spec-row` CSS already targets) plus the standard
 * `.woocommerce-Price-amount` / `.woocommerce-Price-currencySymbol`
 * spans. `add_editor_style('style.css')` pulls the front-end rules
 * into the editor, so the preview reads like the real PDP row.
 *
 * Placeholder amount is `$24.00` — a price that's average across
 * the catalog, so the preview "feels real" without claiming to be
 * any specific product.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps( {
			className: 'mh-pdp__spec-price',
			'aria-label': __(
				'Product price (placeholder)',
				'mercantile-hook-loop'
			),
		} );
		return (
			<div { ...blockProps }>
				<span className="wc-block-components-product-price__value">
					<span className="woocommerce-Price-amount amount">
						<bdi>
							<span className="woocommerce-Price-currencySymbol">
								$
							</span>
							24.00
						</bdi>
					</span>
				</span>
			</div>
		);
	},
	save: () => null,
} );
