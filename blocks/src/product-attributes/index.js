/**
 * Editor for `mercantile/product-attributes`.
 *
 * Pure server-side block — nothing to configure, no inner blocks. The
 * `edit` component returns a static placeholder that hints at what the
 * block does without trying to mirror the real WC attribute table
 * (which would require an SSR pass per attribute change in the
 * editor — overkill for a pass-through block).
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import { Placeholder } from '@wordpress/components';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps();
		return (
			<div { ...blockProps }>
				<Placeholder
					icon="info-outline"
					label={ __(
						'Product attributes',
						'mercantile-hook-loop'
					) }
					instructions={ __(
						"On the front end, this renders the product's WooCommerce attributes table — material, care, capacity, fit, etc. Empty when the product has no attributes set.",
						'mercantile-hook-loop'
					) }
				/>
			</div>
		);
	},
	save: () => null,
} );
