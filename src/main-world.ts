import BUILD from 'kyt:build';
import { handlers } from './features/page.ts';

// Runs in YouTube's page context, where ytcfg and element data are readable. Answers bridge.ts calls with
// the handlers in features/page.ts. Event names carry the build id (see bridge.ts).

document.addEventListener(`kyt:req:${BUILD}`, async (e) => {
  let req;
  try {
    req = JSON.parse((e as CustomEvent<string>).detail);
  } catch {
    return; // not ours
  }
  const { id, method, args } = req;
  let res;
  try {
    res = { id, result: await (handlers as Record<string, (...a: unknown[]) => unknown>)[method](...args) };
  } catch (err) {
    res = { id, error: String(err) };
  }
  document.dispatchEvent(new CustomEvent(`kyt:res:${BUILD}`, { detail: JSON.stringify(res) }));
});

// Tell bridge.ts we're listening (attribute for late readers, event for early ones).
document.documentElement.setAttribute('kyt-mw', BUILD);
document.dispatchEvent(new CustomEvent(`kyt:ready:${BUILD}`));
