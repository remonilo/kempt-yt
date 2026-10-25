export interface Settings {
  features: Record<string, boolean>;
  /** keyed `${featureId}.${optionKey}` */
  options: Record<string, unknown>;
}

const KEY = 'kempt-yt';
const norm = (s?: Partial<Settings>): Settings => ({ features: s?.features ?? {}, options: s?.options ?? {} });

export async function loadSettings(): Promise<Settings> {
  const r = await chrome.storage.sync.get(KEY);
  return norm(r[KEY] as Partial<Settings> | undefined);
}

export function saveSettings(s: Settings): Promise<void> {
  return chrome.storage.sync.set({ [KEY]: s });
}

export function onSettingsChange(cb: (s: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[KEY]) cb(norm(changes[KEY].newValue as Partial<Settings>));
  });
}

// Synchronous mirror in youtube.com localStorage so the first paint already has the right flags.
// chrome.storage stays the source of truth.
export function readCache(): Settings {
  try {
    return norm(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
  } catch {
    return norm();
  }
}

export function writeCache(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {} // blocked site data must not stop apply()
}

// Read-modify-write, one at a time: two writes in the same tick would both read the old object and the second
// would erase the first. storage.sync has no merge. (Separate pages still race; their writes are seconds apart.)
let queue = Promise.resolve();
export function updateSettings(change: (s: Settings) => void): Promise<void> {
  return (queue = queue.then(async () => {
    const s = await loadSettings();
    change(s);
    await saveSettings(s);
  }).catch((e) => console.error('kyt: settings write failed', e)));
}

/** For in-page controls that mirror a popup option (the popup and the page stay in sync through storage). */
export const saveOption = (featureId: string, key: string, value: unknown) =>
  updateSettings((s) => void (s.options[`${featureId}.${key}`] = value));
