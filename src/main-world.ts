// Runs in YouTube's page context: can read ytcfg and Polymer element data.
// Add handlers here; call them from features with ctx.call('name', ...args). Return JSON-safe values.
const handlers: Record<string, (...args: any[]) => unknown> = {
  ping: () => 'pong',
};

document.addEventListener('kyt:req', async (e) => {
  let req;
  try {
    req = JSON.parse((e as CustomEvent<string>).detail);
  } catch {
    return; // not ours
  }
  const { id, method, args } = req;
  let res;
  try {
    res = { id, result: await handlers[method](...args) };
  } catch (err) {
    res = { id, error: String(err) };
  }
  document.dispatchEvent(new CustomEvent('kyt:res', { detail: JSON.stringify(res) }));
});
