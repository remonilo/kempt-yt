import type { Feature } from '../../core/feature.ts';

// CSS only. Apple-style captions (PLAN.md §10.34); YouTube's own caption Options are hidden while on.
export const captions: Feature = {
  id: 'captions', label: 'Captions', hint: 'Apple-style subtitles', group: 'watch', icon: 'captions', defaultOn: true,
  options: {
    style: { type: 'choice', label: 'Style', default: 'shadow', choices: { shadow: 'Shadow', box: 'Box', blur: 'Blur' } },
    size: { type: 'choice', label: 'Size', default: 'm', choices: { s: 'S', m: 'M', l: 'L' } },
  },
};
