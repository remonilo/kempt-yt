import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUploadDate, pickYear, readRange, shift, uploadDateOf, withRange, yearSpan } from '../src/features/search-filters/query.ts';

test('readRange: pulls after:/before: out, keeps the rest', () => {
  assert.deepEqual(readRange('cookies after:2024-01-01 recipe before:2024-07-01'),
    { text: 'cookies recipe', after: '2024-01-01', before: '2024-07-01' });
  assert.deepEqual(readRange('cookies'), { text: 'cookies' });
  assert.deepEqual(readRange('BEFORE:2020-05-05'), { text: '', before: '2020-05-05' });
});

test('readRange: quoted and malformed operators stay text', () => {
  assert.deepEqual(readRange('"after:2024-01-01" talk'), { text: '"after:2024-01-01" talk' });
  assert.deepEqual(readRange('after:2024 before:yesterday'), { text: 'after:2024 before:yesterday' });
  assert.deepEqual(readRange('"unclosed after:2024-01-01'), { text: '"unclosed after:2024-01-01' });
});

test('withRange: replaces, adds and clears', () => {
  assert.equal(withRange('cookies after:2020-01-01', { after: '2024-01-01' }), 'cookies after:2024-01-01');
  assert.equal(withRange('cookies', { after: '2024-01-01', before: '2024-02-01' }), 'cookies after:2024-01-01 before:2024-02-01');
  assert.equal(withRange('cookies after:2020-01-01 before:2021-01-01', {}), 'cookies');
  assert.equal(withRange('"a  b"  c', {}), '"a  b" c');
});

test('shift: moves a day across month and year ends', () => {
  assert.equal(shift('2024-03-01', -1), '2024-02-29');
  assert.equal(shift('2023-12-31', 1), '2024-01-01');
  assert.equal(shift(undefined, 1), undefined);
  assert.equal(shift('', 1), undefined);
});

test('yearSpan: whole years only', () => {
  assert.deepEqual(yearSpan('2007-01-01', '2008-12-31'), [2007, 2008]);
  assert.deepEqual(yearSpan('2007-01-01', '2007-12-31'), [2007, 2007]);
  assert.equal(yearSpan('2007-01-02', '2008-12-31'), null);
  assert.equal(yearSpan('', ''), null);
});

test('pickYear: a second year extends, a third starts over', () => {
  const one = pickYear('', '', 2008);
  assert.deepEqual(one, { from: '2008-01-01', to: '2008-12-31' });
  const two = pickYear(one.from, one.to, 2007);
  assert.deepEqual(two, { from: '2007-01-01', to: '2008-12-31' });
  assert.deepEqual(pickYear(two.from, two.to, 2010), { from: '2010-01-01', to: '2010-12-31' });
  assert.deepEqual(pickYear('2023-03-05', '2023-04-01', 2020), { from: '2020-01-01', to: '2020-12-31' });
});

test('uploadDateOf: reads the upload date out of sp', () => {
  assert.equal(uploadDateOf('EgQIAhAB'), 2); // Today + Videos
  assert.equal(uploadDateOf('EgQIBRAB'), 5); // This year
  assert.equal(uploadDateOf('EgQQARgC'), undefined); // Videos + Over 20 minutes
  assert.equal(uploadDateOf('CAMSAhAB'), undefined); // sort by popularity + Videos
  assert.equal(uploadDateOf('EgA%3D'), undefined);
  assert.equal(uploadDateOf('EgUQAdABAQ%3D%3D'), undefined); // VR180, a two-byte key
  assert.equal(uploadDateOf('!!'), undefined);
  assert.equal(uploadDateOf('EgQI'), undefined); // truncated
});

test('isUploadDate: only the group whose links differ in upload date', () => {
  assert.equal(isUploadDate(['EgQIAhAB', 'EgQIAxAB', 'EgQIBBAB', 'EgQIBRAB']), true);
  assert.equal(isUploadDate(['EgA%3D', 'EgQIAxAB', 'EgQIBBAB']), true); // Today selected: its link removes it
  assert.equal(isUploadDate(['EgQIAhAB', 'EgYIAhABGAI%3D']), false); // Today active, Duration options carry it
  assert.equal(isUploadDate([null, 'CAMSAhAB']), false);
});
