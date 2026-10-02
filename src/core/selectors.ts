// Every YouTube selector lives here. Features import names, never raw selectors.
// YouTube runs two markup generations (Polymer ytd-* and newer yt-*-view-model); list both when they differ.
export const S = {
  app: 'ytd-app',
  masthead: 'ytd-masthead',
  mastheadEnd: 'ytd-masthead #end',
  mastheadButtons: 'ytd-masthead #buttons',
  mastheadMenu: 'ytd-masthead #buttons > ytd-topbar-menu-button-renderer', // avatar (signed in)
  guide: 'ytd-guide-renderer #sections',
  watchFlexy: 'ytd-watch-flexy',
  watchMetadata: 'ytd-watch-metadata',
  watchActions: 'ytd-watch-metadata #actions',
  watchMore: 'ytd-watch-metadata ytd-menu-renderer > #button-shape', // the visible ⋯ button
  secondary: 'ytd-watch-flexy #secondary-inner',
  comments: 'ytd-watch-flexy ytd-comments#comments',
  liveChat: 'ytd-live-chat-frame#chat',
  subscribeBtn: 'ytd-subscribe-button-renderer, yt-subscribe-button-view-model',
} as const;
