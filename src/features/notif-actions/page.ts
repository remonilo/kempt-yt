// Opens YouTube's own share dialog for a video. `ytd-app.resolveCommand` is missing; a yt-service-request action
// runs the same endpoint a card's ⋮ Share item does.
export const notifActions = {
  shareVideo(videoId: string) {
    const app = document.querySelector('ytd-app');
    const endpoint = {
      commandMetadata: { webCommandMetadata: { sendPost: true, apiUrl: '/youtubei/v1/share/get_share_panel' } },
      shareEntityServiceEndpoint: {
        serializedShareEntity: btoa('\n\x0b' + videoId), // protobuf field 1 (video id), as card ⋮ Share items carry it
        commands: [{ openPopupAction: { popup: { unifiedSharePanelRenderer: { showLoadingSpinner: true } }, popupType: 'DIALOG', beReused: true } }],
      },
    };
    app?.dispatchEvent(new CustomEvent('yt-action', {
      bubbles: true, composed: true, detail: { actionName: 'yt-service-request', args: [app, endpoint], returnValue: [] },
    }));
  },
};
