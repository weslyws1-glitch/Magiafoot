import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceCareerDay, advanceCareerToNextMatch, advanceMatch,
  createCareer, finalizeMatch, fixtureDate, getCareerDate,
  getDaysUntilNextMatch, parseCareer, serializeCareer,
  setCareerTrainingIntensity, startMatch,
} from './engine.ts';

const ids = ['volta-redonda', 'flamengo', 'anapolis', 'brusque'];

test('new career starts ahead of the real scheduled fixture, not directly in kickoff', () => {
  for (const clubId of ids) {
    const career = createCareer('Calendário', clubId);
    assert.match(getCareerDate(career), /^2026-\d\d-\d\d$/);
    assert.ok(getDaysUntilNextMatch(career) >= 6 && getDaysUntilNextMatch(career) <= 7, clubId);
    assert.equal(startMatch(career), career, 'cannot kick off early: ' + clubId);
  }
});

test('manual one-day progression increases fitness without altering round or results', () => {
  let career = createCareer('Um dia', 'volta-redonda');
  career = {
    ...career,
    players: career.players.map((player) => ({ ...player, fitness: 51 })),
  };
  const date = getCareerDate(career);
  const before = getDaysUntilNextMatch(career);
  const next = advanceCareerDay(career);
  assert.notEqual(getCareerDate(next), date);
  assert.equal(getDaysUntilNextMatch(next), before - 1);
  assert.equal(next.roundIndex, career.roundIndex);
  assert.deepEqual(next.results, career.results);
  assert.ok(next.players.every((player) => player.fitness > 51));
});

test('more rest heals significantly faster than heavy training', () => {
  const base = createCareer('Recuperação', 'flamengo');
  const tired = {
    ...base,
    players: base.players.map((player) => ({ ...player, fitness: 48 })),
  };
  const rest = advanceCareerDay(setCareerTrainingIntensity(tired, 'rest'));
  const light = advanceCareerDay(setCareerTrainingIntensity(tired, 'light'));
  const normal = advanceCareerDay(setCareerTrainingIntensity(tired, 'normal'));
  const intense = advanceCareerDay(setCareerTrainingIntensity(tired, 'intense'));
  const score = (career) => career.players[0].fitness;
  assert.ok(score(rest) > score(light));
  assert.ok(score(light) > score(normal));
  assert.ok(score(normal) > score(intense));
  assert.ok(score(intense) > score(tired));
});

test('injury recovery is counted per day and is not reset at kickoff', () => {
  let career = createCareer('Lesão', 'volta-redonda');
  const playerId = career.players[0].id;
  career = {
    ...career,
    players: career.players.map((p) => p.id === playerId
      ? { ...p, status: 'injured', injuryDaysRemaining: 3, injuryUntilRound: 4, injuryName: 'Lesão muscular', fitness: 43 }
      : p),
  };
  career = advanceCareerDay(career);
  assert.equal(career.players[0].injuryDaysRemaining, 2);
  assert.equal(career.players[0].status, 'injured');
  career = advanceCareerDay(career);
  assert.equal(career.players[0].injuryDaysRemaining, 1);
  career = advanceCareerDay(career);
  assert.equal(career.players[0].injuryDaysRemaining, 0);
  assert.equal(career.players[0].status, 'available');
  assert.ok(career.players[0].fitness > 43);
});

test('automatic progression stops exactly at match date without playing or skipping results', () => {
  for (const clubId of ids) {
    const source = createCareer('Automático', clubId);
    const scheduled = fixtureDate(source.leagueFixtures.find((f) => f.roundIndex === 0
      && (f.homeClubId === clubId || f.awayClubId === clubId)), source.season).toISOString().slice(0, 10);
    const ready = advanceCareerToNextMatch(source);
    assert.equal(getCareerDate(ready), scheduled, clubId);
    assert.equal(getDaysUntilNextMatch(ready), 0);
    assert.equal(ready.roundIndex, 0);
    assert.equal(ready.results.length, 0);
    assert.equal(ready.liveMatch, null);
    assert.strictEqual(advanceCareerDay(ready), ready);
    assert.strictEqual(advanceCareerToNextMatch(ready), ready);
    assert.deepEqual(ready.players.map((p) => p.id), source.players.map((p) => p.id));
  }
});

test('no magic recovery upon kickoff; match lowers fitness; future daily rest improves it', () => {
  for (const clubId of ids) {
    let career = advanceCareerToNextMatch(createCareer('Sem mágica', clubId));
    const before = career.players.map((p) => p.fitness);
    career = startMatch(career);
    assert.ok(career.liveMatch, clubId);
    assert.deepEqual(career.players.map((p) => p.fitness), before, clubId);
    career = advanceMatch(career, 1);
    assert.equal(career.liveMatch?.phase, 'first_half');
    const kickoffPlayerId = career.liveMatch.userLineup[0].playerId;
    const duringPlayer = career.players.find((p) => p.id === kickoffPlayerId);
    assert.ok(duringPlayer.fitness < before[career.players.findIndex((p) => p.id === kickoffPlayerId)], clubId);
    career = { ...career, liveMatch: { ...career.liveMatch, phase: 'finished', minute: 90, homeGoals: 1, awayGoals: 0 } };
    const completed = finalizeMatch(career);
    assert.equal(completed.roundIndex, 1);
    const restored = parseCareer(serializeCareer(completed));
    assert.ok(restored && restored.lastResult);
    assert.ok(getDaysUntilNextMatch(restored) >= 6 && getDaysUntilNextMatch(restored) <= 8);
    const dayAfter = advanceCareerDay(restored);
    const earlier = restored.players.find((p) => p.id === kickoffPlayerId);
    const later = dayAfter.players.find((p) => p.id === kickoffPlayerId);
    assert.ok(later.fitness >= earlier.fitness);
    assert.equal(dayAfter.results.length, restored.results.length);
    assert.equal(dayAfter.roundIndex, restored.roundIndex);
  }
});

test('an older saved career can adopt the day calendar without changing its squad or round', () => {
  let career = createCareer('Legado', 'volta-redonda');
  career = advanceCareerToNextMatch(career);
  career = startMatch(career);
  career = { ...career, liveMatch: { ...career.liveMatch, phase: 'finished', minute: 90 } };
  career = finalizeMatch(career);
  const legacy = { ...career, currentDate: undefined, trainingIntensity: undefined };
  const loaded = parseCareer(serializeCareer(legacy));
  assert.ok(loaded);
  const existingIds = loaded.players.map((p) => p.id);
  const roundIndex = loaded.roundIndex;
  const day1 = advanceCareerDay(loaded);
  assert.equal(day1.roundIndex, roundIndex);
  assert.deepEqual(day1.players.map((p) => p.id), existingIds);
  assert.match(getCareerDate(day1), /^2026-\d\d-\d\d$/);
});
