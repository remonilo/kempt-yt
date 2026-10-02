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
  localStorage.setItem(KEY, JSON.stringify(s));
}
