// Isolated world -> main-world.ts. JSON strings in `detail` because Firefox drops objects across worlds.
// content.js may start before main-world.js is listening, so calls wait for its `kyt-mw` ready flag.
// Event names carry the build id: stale main-world copies from earlier builds stay in tabs and must not answer.
import BUILD from 'kyt:build';
import type { Handlers } from '../features/page.ts';

const REQ = `kyt:req:${BUILD}`;
const RES = `kyt:res:${BUILD}`;
let seq = 0;

const ready = new Promise<void>((resolve) => {
  if (document.documentElement.getAttribute('kyt-mw') === BUILD) return resolve();
  document.addEventListener(`kyt:ready:${BUILD}`, () => resolve(), { once: true });
});

type Result<M extends keyof Handlers> = Awaited<ReturnType<Handlers[M]>>;

export async function call<M extends keyof Handlers>(
  method: M,
  ...args: Parameters<Handlers[M]>
): Promise<Result<M>> {
  await ready;
  const id = ++seq;
  return new Promise<Result<M>>((resolve, reject) => {
    const timer = setTimeout(() => {
      document.removeEventListener(RES, onRes);
      reject(new Error(`kyt: bridge call "${method}" timed out`));
    }, 15_000);
    const onRes = (e: Event) => {
      let msg;
      try {
        msg = JSON.parse((e as CustomEvent<string>).detail); // page scripts can fire kyt:res too
      } catch {
        return;
      }
      if (msg?.id !== id) return;
      clearTimeout(timer);
      document.removeEventListener(RES, onRes);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.result);
    };
    document.addEventListener(RES, onRes);
    document.dispatchEvent(new CustomEvent(REQ, { detail: JSON.stringify({ id, method, args }) }));
  });
}
