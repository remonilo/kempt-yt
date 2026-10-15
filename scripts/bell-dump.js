// Paste in the console on a channel page you're subscribed to (signed in). Copies JSON to the clipboard;
// save it as samples/bell-channel-data.json. Run it once per bell state (All, Personalized, None) if you can.
(() => {
  const browse = document.querySelector('ytd-browse:not([hidden])');
  const out = { url: location.href, label: document.querySelector('yt-subscribe-button-view-model button')?.ariaLabel };
  const seen = new Set();
  const find = (o, path, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 40 || seen.has(o)) return;
    seen.add(o);
    for (const [k, v] of Object.entries(o)) {
      if (/subscribeButtonViewModel|notification/i.test(k)) (out.hits ??= []).push({ path: path + '.' + k, v });
      else find(v, path + '.' + k, depth + 1);
    }
  };
  find(browse?.data?.header, 'header');
  find(window.ytInitialData?.frameworkUpdates, 'frameworkUpdates');
  const el = document.querySelector('yt-subscribe-button-view-model');
  out.elKeys = el ? Object.keys(el).filter((k) => !k.startsWith('on')).slice(0, 50) : null;
  for (const k of ['data', 'viewModel', 'props', '__data']) if (el?.[k]) out['el.' + k] = el[k];
  const json = JSON.stringify(out, (_, v) => (typeof v === 'function' ? undefined : v), 1);
  copy(json);
  console.log(`copied ${json.length} chars`, out);
})();
