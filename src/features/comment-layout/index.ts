import type { Feature } from '../../core/feature.ts';

// CSS only: the comments header as two rows (count and search, then the sort row) over a divider, 43px avatars and
// a boxed "Add a comment" field (Figma Comments section 54:9667). Same on the page and in the comments panel.
export const commentLayout: Feature = {
  id: 'comment-layout',
  label: 'Comment layout', hint: 'Sort row, divider, larger avatars, boxed comment field', group: 'watch', icon: 'comments',
  defaultOn: true,
};
