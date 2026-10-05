// Every YouTube selector lives here. Features import names, never raw selectors.
// YouTube runs two markup generations (Polymer ytd-* and newer yt-*-view-model); list both when they differ.
export const S = {
  app: 'ytd-app',
  masthead: 'ytd-masthead',
  mastheadEnd: 'ytd-masthead #end',
  mastheadButtons: 'ytd-masthead #buttons',
  mastheadMenu: 'ytd-masthead #buttons > ytd-topbar-menu-button-renderer', // avatar (signed in)
  guide: 'ytd-guide-renderer #sections',
  guideDrawer: 'tp-yt-app-drawer#guide', // always present; its ytd-guide-renderer appears on first open (watch pages)
  guideRenderer: 'ytd-guide-renderer',
  miniGuide: 'ytd-mini-guide-renderer',
  guideButton: 'ytd-masthead #guide-button button', // ☰
  channelTabs: 'ytd-browse[page-subtype="channels"] yt-tab-group-shape',
  watchFlexy: 'ytd-watch-flexy',
  watchMetadata: 'ytd-watch-metadata',
  watchActions: 'ytd-watch-metadata #actions',
  watchMore: 'ytd-watch-metadata ytd-menu-renderer > #button-shape', // the visible ⋯ button
  secondary: 'ytd-watch-flexy #secondary-inner',
  comments: 'ytd-watch-flexy ytd-comments#comments',
  liveChat: 'ytd-live-chat-frame#chat',
  // YouTube moves these between #secondary-inner (two columns) and #below (one column). Always present.
  panels: 'ytd-watch-flexy #panels', // engagement panels: transcript, Ask, ...
  commentsPanel: 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]',
  chatContainer: 'ytd-watch-flexy #chat-container',
  description: 'ytd-watch-metadata #description',
  askButton: 'ytd-watch-metadata [kyt-icon="SPARK"] button', // needs stamp(S.watchActions)
  watchSubscribe: 'ytd-watch-metadata ytd-subscribe-button-renderer', // its bell needs stampBell
  subscribeBtn: 'ytd-subscribe-button-renderer, yt-subscribe-button-view-model',
  homeGrid: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
  subsGrid: 'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer > #contents',
  historyList: 'ytd-browse[page-subtype="history"] ytd-section-list-renderer > #contents', // one ytd-item-section-renderer per day
  historyTitle: 'ytd-item-section-header-renderer #title', // "Today", "Thursday", "27 Sept"
  lockupDate: '.ytContentMetadataViewModelMetadataText', // last one in a lockup is the age ("7 hr ago"), aria-label has the long form
  lockupMeta: '.ytLockupViewModelMetadata', // title, channel and metadata rows of a lockup
  progressBar: '.html5-video-player .ytp-progress-bar',
  liveBadge: '.ytBadgeShapeThumbnailLive', // the red LIVE thumbnail badge of a stream on now (any language)
} as const;
