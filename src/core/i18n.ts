// Strings we draw ourselves follow YouTube's UI language, read from <html lang>. The browser's language can differ
// (YouTube's own language setting wins), so chrome.i18n would pick the wrong one.

/** Languages every string table covers: English plus YouTube's ten largest UI languages. */
export type Lang = 'en' | 'es' | 'pt' | 'de' | 'fr' | 'ru' | 'ja' | 'ko' | 'hi' | 'id' | 'tr';

/** YouTube's UI language as a BCP 47 tag ("de-DE"), for Intl. */
export const uiLang = () => document.documentElement.lang || navigator.language;

/** The entry of a feature's string table for YouTube's UI language; English for any other language. */
export function local<T>(table: Record<Lang, T>): T {
  return table[uiLang().split('-')[0].toLowerCase() as Lang] ?? table.en;
}
