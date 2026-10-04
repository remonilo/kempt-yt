import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsv, hsvToHex, normHex, pointToHs } from '../src/popup/color.ts';

test('normHex accepts 3 and 6 digits, with or without #, any case', () => {
  assert.equal(normHex('#ABC'), '#aabbcc');
  assert.equal(normHex('cb274a'), '#cb274a');
  assert.equal(normHex(' #CB274A '), '#cb274a');
  assert.equal(normHex('#cb27'), null);
  assert.equal(normHex('zzzzzz'), null);
});

test('hex to hsv and back is lossless', () => {
  for (const hex of ['#cb274a', '#ff0033', '#000000', '#ffffff', '#808080', '#21ba45', '#3e8ef7', '#8e5cf7']) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  }
});

test('hsv of primaries', () => {
  assert.deepEqual(hexToHsv('#ff0000'), { h: 0, s: 1, v: 1 });
  assert.deepEqual(hexToHsv('#00ff00'), { h: 120, s: 1, v: 1 });
  assert.deepEqual(hexToHsv('#0000ff'), { h: 240, s: 1, v: 1 });
});

test('wheel: hue 0 at the top, clockwise; saturation from the centre, capped at the rim', () => {
  assert.deepEqual(pointToHs(0, -50, 50), { h: 0, s: 1 });
  assert.equal(pointToHs(50, 0, 50).h, 90);
  assert.equal(pointToHs(0, 50, 50).h, 180);
  assert.equal(pointToHs(-25, 0, 50).s, 0.5);
  assert.equal(pointToHs(0, -80, 50).s, 1);
});
