/**
 * Editor for `mercantile/product-attribute-value`.
 *
 * Static placeholder cell ("60/40 ring-spun cotton/recycled poly")
 * with the user's styling applied. Same pattern as the name
 * sibling — the block is rendered once in the editor; at front-end
 * render the parent loops product attributes and applies this
 * block's saved styling to every row's `<td>`.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps( {
			className: 'woocommerce-product-attributes-item__value',
		} );
		return (
			<td { ...blockProps }>
				{ __(
					'60/40 ring-spun cotton/recycled poly',
					'mercantile-hook-loop'
				) }
			</td>
		);
	},
	save: () => null,
} );
