import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayLabel, groupOf, historyDate, parseAge, plan } from '../src/features/timeline/dates.ts';

const now = new Date(2024, 11, 15, 9, 0); // Sun 15 Dec 2024, 09:00 local
const ymd = (d: Date | null) => d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test('parseAge: long and short units', () => {
  assert.deepEqual(parseAge('3 days ago'), { n: 3, unit: 'day' });
  assert.deepEqual(parseAge('Streamed 1 hour ago'), { n: 1, unit: 'hour' });
  assert.deepEqual(parseAge('7 hr ago'), { n: 7, unit: 'hour' });
  assert.deepEqual(parseAge('12h ago'), { n: 12, unit: 'hour' });
  assert.deepEqual(parseAge('2 wk ago'), { n: 2, unit: 'week' });
  assert.deepEqual(parseAge('3 mo ago'), { n: 3, unit: 'month' });
  assert.deepEqual(parseAge('5 min ago'), { n: 5, unit: 'minute' });
  assert.equal(parseAge('vor 3 Tagen'), null);
  assert.equal(parseAge('Scheduled for 04/10/2026, 06:00'), null);
});

test('dayLabel', () => {
  assert.equal(dayLabel(now, now), 'Today - 15 Dec 2024');
  assert.equal(dayLabel(new Date(2024, 11, 14, 23), now), 'Yesterday - 14 Dec 2024');
  assert.equal(dayLabel(new Date(2024, 11, 12), now), 'Thursday - 12 Dec 2024');
});

test('groupOf: hours cross midnight into yesterday', () => {
  assert.equal(groupOf('5 hours ago', now)?.key, 'd:2024-12-15');
  assert.equal(groupOf('12 hr ago', now)?.key, 'd:2024-12-14');
  assert.equal(groupOf('Streamed 30 minutes ago', now)?.label, 'Today - 15 Dec 2024');
});

test('groupOf: days are exact, weeks and older are relative', () => {
  assert.equal(groupOf('13 days ago', now)?.key, 'd:2024-12-02');
  assert.equal(groupOf('2 wk ago', now)?.label, '2 weeks ago');
  assert.equal(groupOf('Streamed 1 month ago', now)?.label, '1 month ago');
  assert.equal(groupOf('1 year ago', now)?.key, 'r:1year');
  assert.equal(groupOf('vor 3 Tagen', now), null);
});

test('plan: groups only move back in time', () => {
  const texts = ['Scheduled for tomorrow', '7 hr ago', '8 hr ago', '12 hr ago', 'Streamed 21 hr ago', '15 hr ago',
    'Scheduled for 04/10', '1 day ago', '2 wk ago', '2 wk ago', '1 month ago'];
  const starts = [...plan(texts, now)].map(([i, g]) => `${i}:${g.label}`);
  assert.deepEqual(starts, ['1:Today - 15 Dec 2024', '3:Yesterday - 14 Dec 2024', '8:2 weeks ago', '10:1 month ago']);
});

test('plan: unreadable locale gives no groups', () => {
  assert.equal(plan(['vor 3 Stunden', 'vor 2 Tagen'], now).size, 0);
});

test('historyDate', () => {
  assert.equal(ymd(historyDate('Today', now)), '2024-12-15');
  assert.equal(ymd(historyDate('Yesterday', now)), '2024-12-14');
  assert.equal(ymd(historyDate('Thursday', now)), '2024-12-12');
  assert.equal(ymd(historyDate('27 Sept', now)), '2024-9-27');
  assert.equal(ymd(historyDate('20 Dec 2023', now)), '2023-12-20');
  assert.equal(ymd(historyDate('Dec 20', now)), '2023-12-20');
  assert.equal(ymd(historyDate('Gestern', now, 'de')), '2024-12-14');
  assert.equal(historyDate('Shorts', now), null);
});
