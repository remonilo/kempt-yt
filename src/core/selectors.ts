// YouTube runs two markup generations (Polymer ytd-* and newer yt-*-view-model); list both when they differ.
export const S = {
  masthead: 'ytd-masthead',
  mastheadMenu: 'ytd-masthead #buttons > ytd-topbar-menu-button-renderer', // avatar (signed in)
  popups: 'ytd-popup-container', // account menu, ⋯ menus; items are stamped by stampMenus
  notifItem: 'ytd-notification-renderer', // bell panel item (under popups): a link + #menu
  notifText: ':scope > a > .text', // title + time column inside a notifItem
  guide: 'ytd-guide-renderer #sections',
  guideDrawer: 'tp-yt-app-drawer#guide', // always present; its ytd-guide-renderer appears on first open (watch pages)
  guideRenderer: 'ytd-guide-renderer',
  miniGuide: 'ytd-mini-guide-renderer',
  guideButton: 'ytd-masthead #guide-button button', // ☰
  channelTabs: 'ytd-browse[page-subtype="channels"] yt-tab-group-shape',
  channelSubMenu: 'ytd-browse[page-subtype="channels"]:not([hidden]) ytd-channel-sub-menu-renderer', // Playlists tab: Sort by
  sortItems: '#sort-menu tp-yt-paper-listbox > a', // inside channelSubMenu or a comments header
  watchFlexy: 'ytd-watch-flexy',
  watchMetadata: 'ytd-watch-metadata',
  watchActions: 'ytd-watch-metadata #actions',
  watchMore: 'ytd-watch-metadata ytd-menu-renderer > #button-shape', // the visible ⋯ button
  comments: 'ytd-watch-flexy ytd-comments#comments',
  commentList: 'ytd-item-section-renderer > #contents', // inside comments: threads + continuation row
  commentThread: 'ytd-comment-thread-renderer',
  commentText: ':is(#author-text, #content-text)', // inside a ytd-comment-view-model; not its buttons or counts
  liveChat: 'ytd-live-chat-frame#chat',
  chatToggle: '#show-hide-button button', // inside liveChat: hides or shows chat; absent when a replay has no chat
  // YouTube moves these between #secondary-inner (two columns) and #below (one column). Always present.
  panels: 'ytd-watch-flexy #panels', // engagement panels: transcript, Ask, ...
  shortsPanels: 'ytd-shorts #anchored-panel', // the Shorts player's engagement panels: comments, description, audio
  commentsPanel: 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]',
  panelTitle: 'ytd-engagement-panel-title-header-renderer', // inside a panel: title, icon menus, close
  panelSortItems: '#menu yt-dropdown-menu tp-yt-paper-listbox > a', // inside panelTitle: the comments sort icon menu
  chatContainer: 'ytd-watch-flexy #chat-container',
  description: 'ytd-watch-metadata #description',
  askButton: 'ytd-watch-metadata [kyt-icon="SPARK"] button', // needs stamp(S.watchActions)
  watchSubscribe: 'ytd-watch-metadata ytd-subscribe-button-renderer', // its bell needs stampBell
  channelHeader: 'ytd-browse:not([hidden]) yt-page-header-view-model', // channel header; its Subscribe bell needs stampBell
  searchHeader: 'ytd-search:not([hidden]) ytd-search-header-renderer', // chip bar + Filters button; filter groups in its data
  homeGrid: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
  subsGrid: 'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer > #contents',
  subsRichGrid: 'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer', // holds #header ... #contents; our tabs go first
  historyList: 'ytd-browse[page-subtype="history"] ytd-section-list-renderer > #contents', // one ytd-item-section-renderer per day
  historyTitle: 'ytd-item-section-header-renderer #title', // "Today", "Thursday", "27 Sept"
  historyChips: 'ytd-browse[page-subtype="history"] ytd-section-list-renderer > #header-container', // All/Videos/Shorts chip bar row
  // Header card stats: the old header's byline, or the view-model header that owned playlists get (2026-10).
  // A hidden copy of the new header sits in yt-page-header-portal, hence the child combinator.
  playlistByline: 'ytd-browse[page-subtype="playlist"]:not([hidden]) ytd-playlist-header-renderer:not([hidden]) ytd-playlist-byline-renderer .metadata-stats, ' +
    'ytd-browse[page-subtype="playlist"]:not([hidden]) > yt-page-header-renderer yt-content-metadata-view-model',
  playlistsGrid: 'ytd-browse:not([hidden]):not([page-subtype]) ytd-rich-grid-renderer', // Library > Playlists (/feed/playlists has no page-subtype)
  playlistBrowse: 'ytd-browse[page-subtype="playlist"]:not([hidden])',
  playlistHeader: 'ytd-browse[page-subtype="playlist"]:not([hidden]) > yt-page-header-renderer', // its action buttons need stamp
  playlistHeaderOld: 'ytd-browse[page-subtype="playlist"]:not([hidden]) > ytd-playlist-header-renderer', // Watch later, Liked videos; same stamp
  playlistList: 'ytd-browse[page-subtype="playlist"]:not([hidden]) ytd-playlist-video-list-renderer', // rows in #contents, data.contents
  historyActions: 'ytd-browse[page-subtype="history"] ytd-browse-feed-actions-renderer', // right column; buttons need stamp
  historyLinks: 'ytd-browse[page-subtype="history"] ytd-browse-feed-actions-renderer ytd-compact-link-renderer', // Comments/Posts/Live chat (My Activity)
  lockupDate: '.ytContentMetadataViewModelMetadataText', // last one in a lockup is the age ("7 hr ago"), aria-label has the long form
  lockupMeta: '.ytLockupViewModelMetadata', // title, channel and metadata rows of a lockup
  lockupChannel: '.ytLockupMetadataViewModelMetadata a[href^="/"]', // first is the channel ("/@handle"); collabs may have none
  lockupAvatar: '.ytLockupMetadataViewModelAvatar img',
  fsActions: '#movie_player .ytp-fullscreen-quick-actions', // fullscreen like/dislike/comments/share/⋯ row; needs stamp
  progressBar: '#movie_player .ytp-chrome-bottom .ytp-progress-bar', // #movie_player also holds a hidden 0x0 spare bar outside .ytp-chrome-bottom
  liveBadge: '.ytBadgeShapeThumbnailLive', // the red LIVE thumbnail badge of a stream on now (any language)
} as const;
