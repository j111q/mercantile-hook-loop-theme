/**
 * Editor for `mercantile/product-attributes`.
 *
 * Parent template-block. Holds exactly two children (locked
 * template):
 *   - mercantile/product-attribute-name
 *   - mercantile/product-attribute-value
 *
 * Each child holds its own styling attributes (color, typography,
 * spacing) — selecting one in the editor lets the user style the
 * label or the value across every rendered attribute row.
 *
 * The editor preview shows one row populated by the InnerBlocks
 * template (which renders the children's edit() — a static
 * "Material" / "60/40 ring-spun cotton/recycled poly" pair). A
 * helper line beneath the row makes it clear that the same template
 * gets duplicated per product attribute at render time.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import metadata from './block.json';

const TEMPLATE = [
	[ 'mercantile/product-attribute-name', {} ],
	[ 'mercantile/product-attribute-value', {} ],
];

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps();
		return (
			<div { ...blockProps }>
				<table
					className="woocommerce-product-attributes shop_attributes"
					aria-label={ __(
						'Product attributes (template preview)',
						'mercantile-hook-loop'
					) }
				>
					<tbody>
						<tr className="woocommerce-product-attributes-item">
							<InnerBlocks
								template={ TEMPLATE }
								templateLock="all"
								renderAppender={ false }
							/>
						</tr>
					</tbody>
				</table>
				<p
					style={ {
						fontSize: 11,
						opacity: 0.55,
						margin: '6px 0 0',
						fontStyle: 'italic',
					} }
				>
					{ __(
						'Each visible product attribute renders one row using this template — styling applied to the cells above carries through.',
						'mercantile-hook-loop'
					) }
				</p>
			</div>
		);
	},
	save: () => <InnerBlocks.Content />,
} );
