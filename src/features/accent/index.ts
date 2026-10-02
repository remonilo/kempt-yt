import type { Feature } from '../../core/feature.ts';

export const accent: Feature = {
  id: 'accent',
  label: 'Accent color',
  defaultOn: true,
  options: { color: { type: 'color', label: 'Color', default: '#cb274a', cssVar: '--kyt-accent' } },
};
