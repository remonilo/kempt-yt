// captions-chrome.mjs eval for the captions store shot: skips the ad, turns on captions, pauses on a frame with picture.
// DPR=2 node scripts/captions-chrome.mjs 'https://www.youtube.com/watch?v=GdzdAWAU9WY' scripts/captions-shot.js
// then crop the player with the returned rect x2: magick samples/captions-chrome.png -crop WxH+X+Y +repage out.png
const p = document.querySelector('#movie_player'); const v = p.querySelector('video');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
v.muted = true; v.play();
for (let i = 0; i < 90 && (p.classList.contains('ad-showing') || v.currentTime < 9); i++) { document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern')?.click(); await wait(1000); }
p.loadModule?.('captions');
p.setOption?.('captions', 'track', { languageCode: 'en', kind: 'asr' });
await wait(11000);
v.pause();
const r = p.getBoundingClientRect();
return JSON.stringify({ ad: p.classList.contains('ad-showing'), t: v.currentTime, seg: document.querySelectorAll('.ytp-caption-segment').length, x: r.x, y: r.y, w: r.width, h: r.height });
