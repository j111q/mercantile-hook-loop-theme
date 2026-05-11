import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextareaControl,
	SelectControl,
	Button,
	ButtonGroup,
} from '@wordpress/components';
import metadata from './block.json';
import './style.css';

const VARIANT_OPTIONS = [
	{ label: __( 'Default', 'mercantile-hook-loop' ), value: 'default' },
	{ label: __( 'Wapuu', 'mercantile-hook-loop' ), value: 'wapuu' },
];

const itemClass = ( variant ) =>
	'mh-ticker__item' + ( 'wapuu' === variant ? ' is-wapuu' : '' );

const ItemEditor = ( { item, index, total, update, remove, move } ) => (
	<div
		style={ {
			borderBottom: '1px solid #e0e0e0',
			paddingBottom: 12,
			marginBottom: 12,
		} }
	>
		<TextareaControl
			label={ `#${ index + 1 }` }
			value={ item.text || '' }
			onChange={ ( text ) => update( index, { text } ) }
			help={ __(
				'Allowed inline HTML: <strong>, <em>, <span class="mh-mono-blue">.',
				'mercantile-hook-loop'
			) }
			rows={ 2 }
		/>
		<SelectControl
			label={ __( 'Variant', 'mercantile-hook-loop' ) }
			value={ item.variant || 'default' }
			options={ VARIANT_OPTIONS }
			onChange={ ( variant ) => update( index, { variant } ) }
		/>
		<div
			style={ {
				display: 'flex',
				justifyContent: 'space-between',
				marginTop: 6,
			} }
		>
			<ButtonGroup>
				<Button
					size="small"
					variant="secondary"
					onClick={ () => move( index, -1 ) }
					disabled={ index === 0 }
					accessibleWhenDisabled
				>
					↑
				</Button>
				<Button
					size="small"
					variant="secondary"
					onClick={ () => move( index, 1 ) }
					disabled={ index === total - 1 }
					accessibleWhenDisabled
				>
					↓
				</Button>
			</ButtonGroup>
			<Button
				size="small"
				variant="secondary"
				isDestructive
				onClick={ () => remove( index ) }
			>
				{ __( 'Remove', 'mercantile-hook-loop' ) }
			</Button>
		</div>
	</div>
);

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const items = Array.isArray( attributes.items ) ? attributes.items : [];

		const update = ( i, partial ) =>
			setAttributes( {
				items: items.map( ( it, idx ) =>
					idx === i ? { ...it, ...partial } : it
				),
			} );

		const remove = ( i ) =>
			setAttributes( {
				items: items.filter( ( _, idx ) => idx !== i ),
			} );

		const add = () =>
			setAttributes( {
				items: [ ...items, { text: '', variant: 'default' } ],
			} );

		const move = ( i, dir ) => {
			const j = i + dir;
			if ( j < 0 || j >= items.length ) {
				return;
			}
			const next = items.slice();
			[ next[ i ], next[ j ] ] = [ next[ j ], next[ i ] ];
			setAttributes( { items: next } );
		};

		const blockProps = useBlockProps( {
			className: 'mh-ticker__rail is-editor-preview',
		} );

		return (
			<>
				<InspectorControls>
					<PanelBody
						title={ __(
							'Ticker items',
							'mercantile-hook-loop'
						) }
					>
						{ items.map( ( item, i ) => (
							<ItemEditor
								key={ i }
								item={ item }
								index={ i }
								total={ items.length }
								update={ update }
								remove={ remove }
								move={ move }
							/>
						) ) }
						<Button variant="primary" onClick={ add }>
							{ __( 'Add item', 'mercantile-hook-loop' ) }
						</Button>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div className="mh-ticker__track">
						{ items.map( ( item, i ) => (
							<p
								key={ i }
								className={ itemClass( item.variant ) }
								dangerouslySetInnerHTML={ {
									__html: item.text || '',
								} }
							/>
						) ) }
					</div>
				</div>
			</>
		);
	},
	save: () => null,
} );
