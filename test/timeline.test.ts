import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inType, kindOf, matches } from '../src/features/timeline/filter.ts';
import { dayLabel, groupOf, historyDate, parseAge, plan } from '../src/features/timeline/dates.ts';

const now = new Date(2024, 11, 15, 9, 0); // Sun 15 Dec 2024, 09:00 local
const ymd = (d: Date | null) => d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test('parseAge: long and short units', () => {
  assert.deepEqual(parseAge('3 days ago'), { n: 3, unit: 'day', extra: false });
  assert.deepEqual(parseAge('Streamed 1 hour ago'), { n: 1, unit: 'hour', extra: true });
  assert.deepEqual(parseAge('7 hr ago'), { n: 7, unit: 'hour', extra: false });
  assert.deepEqual(parseAge('12h ago'), { n: 12, unit: 'hour', extra: false });
  assert.deepEqual(parseAge('Streamed 2w ago'), { n: 2, unit: 'week', extra: true });
  assert.deepEqual(parseAge('3 mo ago'), { n: 3, unit: 'month', extra: false });
  assert.deepEqual(parseAge('5 min ago'), { n: 5, unit: 'minute', extra: false });
  assert.equal(parseAge('vor 3 Tagen'), null);
  assert.equal(parseAge('Scheduled for 04/10/2026, 06:00'), null);
  assert.equal(parseAge('2.4 thousand watching'), null);
});

// Long forms (aria-label) from YouTube in each UI language, logged out.
test('parseAge: YouTube UI languages', () => {
  const ok: [string, string, number, string, boolean][] = [
    ['es', 'Emitido hace 2 semanas', 2, 'week', true], ['es', 'hace 1 año', 1, 'year', false],
    ['pt', 'há 1 mês', 1, 'month', false], ['de', 'vor 1 Tag gestreamt', 1, 'day', true],
    ['de', 'vor 8 Stunden', 8, 'hour', false], ['fr', 'Diffusé il y a 2 semaines', 2, 'week', true],
    ['ru', 'Трансляция закончилась 5 месяцев назад', 5, 'month', true], ['ru', '1 год назад', 1, 'year', false],
    ['ja', '2 週間前 に配信済み', 2, 'week', true], ['ja', '3 か月前', 3, 'month', false],
    ['ko', '스트리밍 시간: 2주 전', 2, 'week', true], ['ko', '1년 전', 1, 'year', false],
    ['hi', '3 माह पहले', 3, 'month', false], ['id', 'Streaming 2 minggu yang lalu', 2, 'week', true],
    ['tr', '2 hafta önce yayınlandı', 2, 'week', true], ['tr', '1 yıl önce', 1, 'year', false],
  ];
  for (const [l, text, n, unit, extra] of ok) assert.deepEqual(parseAge(text, l), { n, unit, extra }, `${l}: ${text}`);
  for (const [l, text] of [['de', 'Geplant für: 04.10.26, 08:00'], ['ja', '7582 人が視聴中'], ['ru', 'Зрителей: 75']]) {
    assert.equal(parseAge(text, l), null, `${l}: ${text}`);
  }
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
  assert.equal(groupOf('vor 3 Tagen', now, 'de')?.label, 'Donnerstag - 12. Dez. 2024');
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

test('kindOf: shorts, streams (badge, words around the age, no age), plain videos', () => {
  const k = (age: string, o: { short?: boolean; badge?: boolean; readable?: boolean; lang?: string } = {}) =>
    kindOf({ short: !!o.short, badge: !!o.badge, age: parseAge(age, o.lang), readable: o.readable ?? true });
  assert.equal(k('', { short: true }), 'short');
  assert.equal(k('30K watching', { badge: true }), 'live');
  assert.equal(k('Streamed 2 weeks ago'), 'live');
  assert.equal(k('vor 2 Wochen gestreamt', { lang: 'de' }), 'live');
  assert.equal(k('Scheduled for 04/10/2026, 06:00'), 'live');
  assert.equal(k('7 hours ago'), 'video');
  assert.equal(k('3 か月前', { lang: 'ja' }), 'video');
  assert.equal(k('بث قبل ٣ أيام', { readable: false }), 'video'); // unreadable language: no guess
});

test('inType: chips', () => {
  assert.ok(inType('video', 'all') && inType('short', 'all'));
  assert.ok(inType('video', 'videos') && !inType('live', 'videos'));
  assert.ok(inType('live', 'live') && !inType('video', 'live'));
  assert.ok(inType('short', 'shorts') && !inType('video', 'shorts'));
});

test('matches: all words, any case, accents folded', () => {
  assert.ok(matches('Amélie Poulain | Jesse James West', 'amelie west'));
  assert.ok(matches('Anything', ''));
  assert.ok(!matches('penguinz0 | 7 hr ago', 'penguinz0 fern'));
});
