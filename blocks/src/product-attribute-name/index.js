/**
 * Editor for `mercantile/product-attribute-name`.
 *
 * One static placeholder cell ("Material") with the user's styling
 * applied via useBlockProps. Selecting this block in the editor
 * gives the user typography / color / spacing controls — those
 * settings get persisted as block attributes and applied to *every*
 * attribute row at render time, since the parent only ever has one
 * instance of this child block (the template).
 *
 * Placed inside `<th>` so the in-editor preview matches the front-
 * end DOM and the existing `.shop_attributes th` rules style it.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps( {
			className: 'woocommerce-product-attributes-item__label',
		} );
		return (
			<th { ...blockProps } scope="row">
				{ __( 'Material', 'mercantile-hook-loop' ) }
			</th>
		);
	},
	save: () => null,
} );
