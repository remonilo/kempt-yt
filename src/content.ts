import { createRunner } from './core/feature.ts';
import { onRoute, routeOf } from './core/router.ts';
import { loadSettings, onSettingsChange, readCache, writeCache, type Settings } from './core/settings.ts';
import { features } from './features/index.ts';

const update = createRunner(features);
let route = routeOf(location.pathname);
let settings = readCache();
const apply = () => update(route, settings);
const setSettings = (s: Settings) => {
  settings = s;
  writeCache(s);
  apply();
};

apply(); // from cache: correct flags before first paint
loadSettings().then(setSettings);
onSettingsChange(setSettings);
onRoute((r) => {
  route = r;
  apply();
});
