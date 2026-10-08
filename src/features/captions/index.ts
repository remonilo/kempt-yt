import type { Feature } from '../../core/feature.ts';

// CSS only. Apple-style captions (PLAN.md §10.34); YouTube's own caption Options are hidden while on.
export const captions: Feature = {
  id: 'captions', label: 'Captions', hint: 'Apple-style subtitles', group: 'watch', icon: 'captions', defaultOn: true,
  options: {
    style: { type: 'choice', label: 'Style', default: 'shadow', choices: { shadow: 'Shadow', box: 'Box', blur: 'Blur' } },
    // Percent of the default size. A new key: the old `size` stored 's' | 'm' | 'l'.
    scale: { type: 'number', label: 'Size', default: 100, min: 50, max: 200, step: 10, slider: true, unit: '%', cssVar: '--kyt-captions-scale' },
  },
};
