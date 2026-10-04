// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const repo = 'https://github.com/remonilo/kempt-yt';

// GitHub Pages project site: https://remonilo.github.io/kempt-yt/
export default defineConfig({
  site: 'https://remonilo.github.io',
  base: '/kempt-yt',
  compressHTML: false, // readable dist/*.html; Pages gzips anyway
  integrations: [
    starlight({
      title: 'Kempt',
      description: 'A browser extension that gives YouTube one consistent, quiet design.',
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/site/` },
      customCss: ['./src/styles/docs.css'],
      lastUpdated: true,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Kempt', slug: 'docs' },
            { label: 'Installation', slug: 'docs/installation' },
            { label: 'Settings', slug: 'docs/settings' },
            { label: 'FAQ', slug: 'docs/faq' },
            { label: 'Privacy', slug: 'docs/privacy' },
          ],
        },
        {
          label: 'Features',
          items: [
            { label: 'Watch page tabs', slug: 'docs/features/watch-tabs' },
            { label: 'Timeline', slug: 'docs/features/timeline' },
            { label: 'Grid size', slug: 'docs/features/grid' },
            { label: 'Sidebar', slug: 'docs/features/sidebar' },
            { label: 'Look', slug: 'docs/features/look' },
            { label: 'Icons', slug: 'docs/features/icons' },
            { label: 'Top bar & Watch later', slug: 'docs/features/top-bar' },
            { label: 'Comment sort', slug: 'docs/features/comment-sort' },
            { label: 'Shorts', slug: 'docs/features/shorts' },
            { label: 'Languages', slug: 'docs/features/languages' },
          ],
        },
        {
          label: 'How it works',
          items: [
            { label: 'Architecture', slug: 'docs/internals/architecture' },
            { label: 'Page bridge', slug: 'docs/internals/page-bridge' },
            { label: 'YouTube quirks', slug: 'docs/internals/youtube-quirks' },
            { label: 'Performance', slug: 'docs/internals/performance' },
            { label: 'Adding a feature', slug: 'docs/internals/adding-a-feature' },
            { label: 'Testing', slug: 'docs/internals/testing' },
          ],
        },
      ],
    }),
  ],
});
