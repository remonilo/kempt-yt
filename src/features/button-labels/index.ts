import type { Feature } from '../../core/feature.ts';

// Icon-only Create, with or without our icons (decision 45). YouTube draws Share/Save/Download/Shop icon-only itself.
export const buttonLabels: Feature = {
  id: 'button-labels', label: 'Hide button labels', hint: 'Icon-only Create button', group: 'look', icon: 'add', defaultOn: true,
};
