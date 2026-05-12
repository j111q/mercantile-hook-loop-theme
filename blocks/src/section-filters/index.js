import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import metadata from './block.json';
import './style.css';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { categories } = attributes;
		const blockProps = useBlockProps();

		return (
			<>
				<InspectorControls>
					<PanelBody
						title={ __(
							'Section Filters',
							'mercantile-hook-loop'
						) }
					>
						<TextControl
							label={ __(
								'Category slugs (comma separated)',
								'mercantile-hook-loop'
							) }
							help={ __(
								'Product category slugs rendered as chips, in display order.',
								'mercantile-hook-loop'
							) }
							value={ categories || '' }
							onChange={ ( v ) =>
								setAttributes( { categories: v } )
							}
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<ServerSideRender
						block={ metadata.name }
						attributes={ attributes }
					/>
				</div>
			</>
		);
	},
	save: () => null,
} );
