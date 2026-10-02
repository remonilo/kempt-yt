// Isolated world -> main-world.ts. JSON strings in `detail` because Firefox drops objects across worlds.
let seq = 0;

export function call<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const onRes = (e: Event) => {
      const msg = JSON.parse((e as CustomEvent<string>).detail);
      if (msg.id !== id) return;
      document.removeEventListener('kyt:res', onRes);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.result as T);
    };
    document.addEventListener('kyt:res', onRes);
    document.dispatchEvent(new CustomEvent('kyt:req', { detail: JSON.stringify({ id, method, args }) }));
  });
}
