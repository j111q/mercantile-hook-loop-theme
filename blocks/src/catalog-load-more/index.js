/**
 * Editor for `mercantile/catalog-load-more`.
 *
 * Pure dynamic block — nothing for the user to configure. Editor
 * `edit()` returns a static preview matching the rendered button so
 * the Site Editor shows the same code-interstitial-style "load more"
 * bar that ships at runtime. add_editor_style('style.css') doesn't
 * apply here because the block ships its own style.css; the editor
 * inherits that automatically.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit() {
		const blockProps = useBlockProps( {
			className: 'mh-load-more',
			'aria-label': __(
				'Catalog load-more (preview)',
				'mercantile-hook-loop'
			),
		} );
		return (
			<div { ...blockProps } role="presentation">
				<span className="mh-load-more__code">
					[
					<span className="k">mercantile</span>{ ' ' }
					<span className="k">next_page</span>=
					<span className="v">&quot;2&quot;</span>]
				</span>
				<span className="mh-load-more__cta">load more ⟶</span>
			</div>
		);
	},
	save: () => null,
} );
