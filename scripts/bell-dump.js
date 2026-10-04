// Paste into the DevTools console on a signed-in /watch page of a channel you are subscribed to.
// Prints the bell's state data (what core.ts stampBell reads) and copies it to the clipboard.
(() => {
  const el = document.querySelector('ytd-subscription-notification-toggle-button-renderer-next, ytd-subscription-notification-toggle-button-renderer');
  if (!el) return 'no bell: not subscribed, or not signed in';
  const d = el.data;
  const out = JSON.stringify({
    tag: el.tagName.toLowerCase(),
    kytBell: el.getAttribute('kyt-bell'),
    currentStateId: d?.currentStateId,
    keys: Object.keys(d ?? {}),
    states: d?.states?.map((s) => ({ stateId: s.stateId, iconType: (s.state?.buttonRenderer ?? s.state)?.icon?.iconType, keys: Object.keys(s.state ?? {}) })),
  }, null, 1);
  copy(out);
  return out;
})();
