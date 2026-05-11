import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl } from '@wordpress/components';
import metadata from './block.json';
import './style.css';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, prefix, count = 1 } = attributes;
		const blockProps = useBlockProps( {
			className: 'mh-ticker__tab is-new',
		} );

		return (
			<>
				<InspectorControls>
					<PanelBody
						title={ __( 'Wapuu Drop', 'mercantile-hook-loop' ) }
					>
						<TextControl
							label={ __( 'Prefix', 'mercantile-hook-loop' ) }
							value={ prefix || '' }
							onChange={ ( v ) => setAttributes( { prefix: v } ) }
						/>
						<TextControl
							label={ __( 'Label', 'mercantile-hook-loop' ) }
							value={ label || '' }
							onChange={ ( v ) => setAttributes( { label: v } ) }
						/>
						<RangeControl
							label={ __(
								'Wapuus per click',
								'mercantile-hook-loop'
							) }
							value={ count }
							min={ 1 }
							max={ 12 }
							onChange={ ( v ) => setAttributes( { count: v } ) }
						/>
					</PanelBody>
				</InspectorControls>
				<button
					{ ...blockProps }
					type="button"
					onClick={ ( e ) => e.preventDefault() }
				>
					<span className="mh-ticker__tab-plus" aria-hidden="true">
						{ prefix || '+' }
					</span>
					<span>{ label || 'New' }</span>
				</button>
			</>
		);
	},
	save: () => null,
} );
