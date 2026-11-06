import type { Feature } from '../../core/feature.ts';
import { el, observe, waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

/** YouTube moves the played fill with an inline `transform: scaleX(p)`, which would stretch a masked wave.
 *  So style.css draws track, buffered and played as three unscaled wave layers per segment and clips the last two to
 *  l and p, which this file copies from YouTube's fills into --kyt-l and --kyt-p on media events (no timers, no
 *  per-frame observer). */
export const progressBar: Feature = {
  id: 'progress-bar',
  label: 'Fun progress bar', hint: 'Wave, snake, comet or paper boat', group: 'watch', icon: 'wave',
  defaultOn: false,
  routes: ['watch'],
  options: {
    style: { type: 'choice', label: 'Style', default: 'wave',
      choices: { wave: 'Wave', snake: 'Snake', comet: 'Comet', boat: 'Paper boat' } },
    drift: { type: 'boolean', label: 'Animate', default: true },
  },
  async run({ signal }) {
    const bar = await waitFor<HTMLElement>(S.progressBar, { signal, timeout: Infinity });
    const player = bar?.closest<HTMLElement>('#movie_player');
    if (!bar || !player) return;

    // Chapters split the bar into segments. Shifting each segment's wave by its x (mod one wavelength, done in
    // style.css) keeps one continuous sine across the gaps.
    const sync = () => {
      const lists = [...bar.querySelectorAll<HTMLElement>('.ytp-progress-list')];
      const x0 = bar.getBoundingClientRect().left;
      const rects = lists.map((l) => l.getBoundingClientRect()); // reads first, writes after
      const offs = rects.map((r) => r.left - x0);
      let pos = 0; // playhead x in the bar: SponsorBlock segments behind it are cut off in the non-wave styles
      // SponsorBlock's segments (ul#previewbar > li) get the same phase so style.css can draw them as the wave.
      const segs = [...bar.querySelectorAll<HTMLElement>('#previewbar > li')];
      const segRects = segs.map((s) => s.getBoundingClientRect());
      const segOffs = segRects.map((r) => r.left - x0);
      const fresh: Element[] = segs.filter((s) => !s.style.getPropertyValue('--kyt-off'));
      for (const [i, s] of segs.entries()) s.style.setProperty('--kyt-off', `${segOffs[i]}px`);
      for (const [i, list] of lists.entries()) {
        let wave = list.querySelector<HTMLElement>(':scope > .kyt-wave');
        if (!wave) {
          wave = el('div', 'kyt-wave', el('i'), el('i')); // buffered, played
          list.append(wave);
          fresh.push(wave);
        }
        wave.style.setProperty('--kyt-off', `${offs[i]}px`);
        // Paper boat colors the water inside SponsorBlock segments: a copy of each segment that overlaps this chapter,
        // inside the played layer so it is cut at the playhead. Rebuilt only when the segments move.
        const played = wave.lastElementChild!;
        const mine = segs.flatMap((sg, j) => {
          const x = segOffs[j], w = segRects[j].width;
          return !sg.matches('[sponsorblock-category$="poi_highlight"]') && x < offs[i] + rects[i].width && x + w > offs[i]
            ? [[x, w, sg.style.backgroundColor] as const] : [];
        });
        const key = mine.join('|');
        if (played.getAttribute('data-kyt-segs') !== key) {
          played.setAttribute('data-kyt-segs', key);
          played.replaceChildren(...mine.map(([x, w, color]) => {
            const b = el('b', 'kyt-seg');
            b.style.cssText = `left:${x - offs[i]}px;width:${w}px;--kyt-off:${x}px;--kyt-seg:${color}`;
            fresh.push(b);
            return b;
          }));
        }
        // On the chapter container (unscaled, unlike the list): the snake's apple (its ::after) hides once --kyt-p > 0.
        for (const [sel, v] of [['.ytp-play-progress', '--kyt-p'], ['.ytp-load-progress', '--kyt-l']] as const) {
          const x = list.querySelector<HTMLElement>(sel)?.style.transform.match(/scaleX\(([^)]+)\)/)?.[1];
          list.parentElement?.style.setProperty(v, x ?? '0');
          if (v === '--kyt-p' && Number(x) > 0) pos = offs[i] + Number(x) * rects[i].width;
        }
      }
      bar.style.setProperty('--kyt-pos', `${pos}px`);
      // Layers added later (chapter lists, SponsorBlock rerenders) start their drift at 0: put them on the clock of
      // the existing ones so every piece stays in phase.
      if (fresh.length) {
        const drifts = (e: Element) =>
          e.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation && a.animationName === 'kyt-wave-drift');
        const old = [...bar.querySelectorAll('.kyt-wave')].find((w) => !fresh.includes(w));
        const ref = old && drifts(old)[0];
        // After both are ready: a running ref has a startTime, while copying currentTime into a pending animation
        // would lag by a frame.
        if (ref) for (const e of fresh) for (const a of drifts(e))
          void Promise.all([ref.ready, a.ready]).then(() => {
            if (ref.startTime != null) a.startTime = ref.startTime; else a.currentTime = ref.currentTime;
          }, () => {}); // cancelled: the layer is gone
      }
    };

    // Media events don't bubble: capture them on the player. pointermove with a button held covers scrubbing,
    // where the bar moves before the video does; plain hovering changes nothing.
    for (const type of ['timeupdate', 'progress', 'seeked', 'durationchange', 'loadedmetadata'])
      player.addEventListener(type, sync, { capture: true, signal });
    bar.addEventListener('pointermove', (e) => e.buttons && sync(), { signal });
    bar.addEventListener('click', sync, { signal }); // a click seek moves YouTube's fill before seeked fires
    // YouTube rebuilds the segment lists when chapters load or change, often while buffering (no media events).
    observe(bar, { childList: true, subtree: true }, sync, signal);
    const ro = new ResizeObserver(sync);
    ro.observe(bar);
    signal.addEventListener('abort', () => {
      ro.disconnect();
      bar.querySelectorAll('.kyt-wave').forEach((w) => w.remove());
      bar.style.removeProperty('--kyt-pos');
      bar.querySelectorAll<HTMLElement>('.ytp-progress-list').forEach((l) => {
        l.parentElement?.style.removeProperty('--kyt-p');
        l.parentElement?.style.removeProperty('--kyt-l');
      });
    }, { once: true });
    sync();
  },
};
