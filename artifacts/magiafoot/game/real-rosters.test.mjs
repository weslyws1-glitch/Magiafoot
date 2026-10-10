import assert from 'node:assert/strict';
import test from 'node:test';
import { CLUBS, getClub, makeRoster, makeMarketPlayers } from './data.ts';
import { REAL_ROSTERS_2026 } from './real-rosters-2026.ts';
import {
  advanceMatch, createCareer, finalizeMatch, parseCareer,
  recalibrate2026CareerRoster, serializeCareer, startMatch,
} from './engine.ts';

test('all registered clubs have valid squads with bounded realistic strength', () => {
  const ids = new Set();
  for (const [clubId, records] of Object.entries(REAL_ROSTERS_2026)) {
    for (const row of records) {
      assert.ok(row[9], 'missing ESPN identity ' + clubId);
      assert.ok(!ids.has(row[9]), 'a footballer cannot belong to two clubs');
      ids.add(row[9]);
    }
  }
  for (const club of CLUBS) {
    const players = makeRoster(club);
    assert.ok(players.length >= 25 && players.length <= 65, club.id);
    assert.equal(new Set(players.map((player) => player.id)).size, players.length, club.id);
    assert.ok(players.every((player) => player.strength >= 43 && player.strength <= 91), club.id);
    assert.equal(players.filter((player) => player.id.includes('-real-')).length,
      REAL_ROSTERS_2026[club.id]?.length ?? 0, club.id);
    assert.ok(players.filter((player) => player.id.includes('-academy-'))
      .every((player) => player.strength <= club.rating), club.id);
  }
});

test('young reserve goalkeeper no longer has star rating', () => {
  const roster = makeRoster(getClub('flamengo'));
  const firstKeeper = roster.find((player) => player.name === 'Agustín Rossi');
  const youngKeeper = roster.find((player) => player.name === 'Gabriel Werneck');
  assert.ok(firstKeeper && youngKeeper);
  assert.ok(firstKeeper.strength > youngKeeper.strength + 15);
});

test('transfer market draws genuine footballers from identified clubs', () => {
  for (const club of CLUBS) {
    const candidates = makeMarketPlayers(club);
    assert.equal(candidates.length, 28, club.id);
    assert.equal(new Set(candidates.map((p) => p.id)).size, candidates.length, club.id);
    assert.ok(candidates.every((p) => p.id.includes('-real-')), club.id);
  }
});

test('old careers can opt into safer ratings without losing contracts and results', () => {
  const newSave = createCareer('Teste', 'flamengo');
  const older = {
    ...newSave, rosterRebalanced2026: false,
    players: newSave.players.map((player) => ({ ...player, strength: 88 })),
  };
  const next = recalibrate2026CareerRoster(older);
  assert.equal(next.rosterRebalanced2026, true);
  assert.deepEqual(next.players.map((player) => player.id), older.players.map((player) => player.id));
  assert.deepEqual(next.results, older.results);
  assert.deepEqual(next.finance, older.finance);
  assert.equal(next.roundIndex, older.roundIndex);
  assert.equal(next.balance, older.balance);
  assert.ok(next.players.some((player) => player.strength < 70));
  assert.equal(parseCareer(serializeCareer(next))?.rosterRebalanced2026, true);
  assert.strictEqual(recalibrate2026CareerRoster(next), next);
});

test('league match can kick off and result remains saved', () => {
  for (const clubId of ['flamengo', 'volta-redonda', 'brusque', 'anapolis']) {
    let career = startMatch(createCareer('Teste', clubId));
    assert.ok(career.liveMatch, clubId);
    career = advanceMatch(career, 1);
    assert.equal(career.liveMatch?.phase, 'first_half', clubId);
    career = {
      ...career,
      liveMatch: { ...career.liveMatch, phase: 'finished', minute: 90, homeGoals: 1, awayGoals: 0 },
    };
    const finalized = finalizeMatch(career);
    const restored = parseCareer(serializeCareer(finalized));
    assert.equal(restored?.roundIndex, 1, clubId);
    assert.ok(restored?.lastResult, clubId);
  }
});
