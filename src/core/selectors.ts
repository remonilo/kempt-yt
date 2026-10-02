// Every YouTube selector lives here. Features import names, never raw selectors.
// YouTube runs two markup generations (Polymer ytd-* and newer yt-*-view-model); list both when they differ.
export const S = {
  app: 'ytd-app',
  masthead: 'ytd-masthead',
  mastheadEnd: 'ytd-masthead #end',
  guide: 'ytd-guide-renderer #sections',
  watchFlexy: 'ytd-watch-flexy',
  secondary: 'ytd-watch-flexy #secondary-inner',
  comments: 'ytd-watch-flexy ytd-comments#comments',
  liveChat: 'ytd-live-chat-frame#chat',
  subscribeBtn: 'ytd-subscribe-button-renderer, yt-subscribe-button-view-model',
} as const;
