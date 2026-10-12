import { observe, waitFor } from './dom.ts';
import { S } from './selectors.ts';

/**
 * Runs `mount` on the comments panel's title bar (fullscreen, narrow windows) once its sort menu exists. YouTube
 * replaces the panel element when a new video loads, so `mount` runs again for the new one and the last run's signal
 * aborts. Observes #panels' children, then the panel only until its sort menu shows up.
 */
export async function onCommentsPanel(signal: AbortSignal, mount: (title: Element, panel: Element, signal: AbortSignal) => void) {
  const panels = await waitFor(S.panels, { signal });
  if (!panels) return;
  let current: Element | null = null;
  let run: AbortController | undefined;
  const bind = async () => {
    const panel = panels.querySelector(`:scope > ${S.commentsPanel}`);
    if (panel === current) return;
    current = panel;
    run?.abort();
    run = new AbortController();
    if (!panel) return;
    const s = AbortSignal.any([signal, run.signal]);
    const first = await waitFor(S.panelSortItems, { root: panel, signal: s, timeout: Infinity });
    const title = first?.closest(S.panelTitle);
    if (title && !s.aborted) mount(title, panel, s);
  };
  observe(panels, { childList: true }, bind, signal);
  bind();
}
