/**
 * View-side iAPI store for `mercantile/ticker-lead`.
 *
 * Click on the LIVE button pauses the ticker: state.isPaused flips true,
 * state.label swaps to the stop string. A timer reverts both after the
 * configured pause duration. The sibling ticker-track stops its marquee
 * via a CSS `:has()` rule that reads `.mh-ticker__lead.is-paused` on the
 * parent `.mh-ticker` group — no cross-block messaging needed.
 *
 * Static values (translated labels, pause duration) live in iAPI
 * config, not state — they never change after first paint. render.php
 * runs the strings through __() before seeding, so this module is free
 * of i18n and textdomain concerns.
 */
import { getConfig, store } from '@wordpress/interactivity';

const { state } = store( 'mercantile/ticker-lead', {
	state: {
		get label() {
			const { liveText, stopText } = getConfig();
			return state.isPaused ? stopText : liveText;
		},
	},
	actions: {
		togglePause() {
			if ( state.isPaused ) {
				return;
			}
			state.isPaused = true;
			const ms = Number( getConfig().pauseMs ) || 5000;
			setTimeout( () => {
				state.isPaused = false;
			}, ms );
		},
	},
} );
