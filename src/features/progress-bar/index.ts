import type { Feature } from '../../core/feature.ts';
import { el, observe, waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

/** YouTube moves the played fill with an inline `transform: scaleX(p)`, which would stretch a masked wave.
 *  So style.css draws track, buffered and played as three unscaled wave layers per segment and clips the last two to
 *  l and p, which this file copies from YouTube's fills into --kyt-l and --kyt-p on media events (no timers, no
 *  per-frame observer). */
export const progressBar: Feature = {
  id: 'progress-bar',
  label: 'Wavy progress bar', hint: 'Played part ripples while playing', group: 'watch', icon: 'wave',
  defaultOn: false,
  routes: ['watch'],
  options: { drift: { type: 'boolean', label: 'Animate wave', default: true } },
  async run({ signal }) {
    const bar = await waitFor<HTMLElement>(S.progressBar, { signal, timeout: Infinity });
    const player = bar?.closest<HTMLElement>('#movie_player');
    if (!bar || !player) return;

    // Chapters split the bar into segments. Shifting each segment's wave by its x (mod one wavelength, done in
    // style.css) keeps one continuous sine across the gaps.
    const sync = () => {
      const lists = [...bar.querySelectorAll<HTMLElement>('.ytp-progress-list')];
      const x0 = bar.getBoundingClientRect().left;
      const offs = lists.map((l) => l.getBoundingClientRect().left - x0); // reads first, writes after
      for (const [i, list] of lists.entries()) {
        let wave = list.querySelector<HTMLElement>(':scope > .kyt-wave');
        if (!wave) {
          wave = el('div', 'kyt-wave', el('i'), el('i')); // buffered, played
          list.append(wave);
        }
        wave.style.setProperty('--kyt-off', `${offs[i]}px`);
        for (const [sel, v] of [['.ytp-play-progress', '--kyt-p'], ['.ytp-load-progress', '--kyt-l']] as const) {
          const x = list.querySelector<HTMLElement>(sel)?.style.transform.match(/scaleX\(([^)]+)\)/)?.[1];
          wave.style.setProperty(v, x ?? '0');
        }
      }
    };

    // Media events don't bubble: capture them on the player. pointermove covers scrubbing, where the bar moves
    // before the video does.
    for (const type of ['timeupdate', 'progress', 'seeked', 'durationchange', 'loadedmetadata'])
      player.addEventListener(type, sync, { capture: true, signal });
    bar.addEventListener('pointermove', sync, { signal });
    // YouTube rebuilds the segment lists when chapters load or change, often while buffering (no media events).
    observe(bar, { childList: true, subtree: true }, sync, signal);
    const ro = new ResizeObserver(sync);
    ro.observe(bar);
    signal.addEventListener('abort', () => {
      ro.disconnect();
      bar.querySelectorAll('.kyt-wave').forEach((w) => w.remove());
    }, { once: true });
    sync();
  },
};
