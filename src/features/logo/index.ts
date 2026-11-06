import type { Feature } from '../../core/feature.ts';

export const logo: Feature = {
  id: 'logo', label: 'Logo', hint: 'Restyle the YouTube logo in the accent color', group: 'look', icon: 'play',
  defaultOn: false,
  options: { style: { type: 'choice', label: 'Style', default: 'pixel', choices: { pixel: 'Pixel play button', snake: 'Snake', comet: 'Comet', boat: 'Paper boat' } } },
};
