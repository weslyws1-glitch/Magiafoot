import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEAGUE_FIXTURES,
  LEAGUE_ROUNDS,
  addTransferPlayer,
  advanceMatch,
  assignPlayerToSlot,
  calculateStandings,
  createCareer,
  effectiveStrength,
  finalizeMatch,
  parseCareer,
  positionFitMultiplier,
  getRosterGroups,
  serializeCareer,
  sellPlayer,
  startMatch,
  substitutePlayer,
  upgradeStadium,
} from './engine.ts';

test('a new career creates a complete fictional first team', () => {
  const career = createCareer('Mara do Vale', 'aurora-vale');
  assert.equal(career.coachName, 'Mara do Vale');
  assert.equal(career.players.length, 26);
  assert.equal(career.lineup.length, 11);
  assert.equal(career.benchIds.length, 7);
  assert.equal(LEAGUE_ROUNDS, 14);
  assert.equal(LEAGUE_FIXTURES.length, 56);
  assert.equal(new Set(career.players.map((player) => player.id)).size, career.players.length);
  assert.equal(assignPlayerToSlot(career, 'ATA-1', career.benchIds[0]).lineup.length, 11);
});

test('playing away from a natural role reduces effective ability', () => {
  const career = createCareer('Mara do Vale', 'aurora-vale');
  const defender = career.players.find((player) => player.position === 'ZAG');
  assert.ok(defender);
  assert.equal(positionFitMultiplier('ZAG', 'ZAG'), 1);
  assert.ok(positionFitMultiplier('ZAG', 'ATA') < 1);
  assert.ok(effectiveStrength(defender, 'ATA') < effectiveStrength(defender, 'ZAG'));
});

test('a full match reaches half-time, accepts a substitution, finishes, and updates the league', () => {
  let career = startMatch(createCareer('Mara do Vale', 'aurora-vale'));
  career = advanceMatch(career);
  assert.equal(career.liveMatch?.phase, 'first_half');
  let guard = 0;
  while (career.liveMatch?.phase === 'first_half' && guard < 12) {
    career = advanceMatch(career, 5);
    guard += 1;
  }
  assert.equal(career.liveMatch?.phase, 'halftime');
  assert.equal(career.liveMatch?.minute, 45);
  assert.ok(career.liveMatch?.events.some((event) => event.type === 'halftime'));

  const outgoing = career.liveMatch?.userLineup[5]?.playerId;
  const incoming = career.liveMatch?.userBenchIds[0];
  assert.ok(outgoing);
  assert.ok(incoming);
  const afterSub = substitutePlayer(career, outgoing, incoming);
  assert.equal(afterSub.liveMatch?.substitutionsUsed, 1);
  assert.ok(afterSub.liveMatch?.userBenchIds.includes(outgoing));
  assert.ok(afterSub.liveMatch?.userLineup.some((slot) => slot.playerId === incoming));
  const midMatchReload = parseCareer(serializeCareer(afterSub));
  assert.equal(midMatchReload?.liveMatch?.phase, 'halftime');
  assert.equal(midMatchReload?.liveMatch?.substitutionsUsed, 1);
  career = afterSub;

  career = advanceMatch(career);
  assert.equal(career.liveMatch?.phase, 'second_half');
  guard = 0;
  while (career.liveMatch?.phase === 'second_half' && guard < 12) {
    career = advanceMatch(career, 5);
    guard += 1;
  }
  assert.equal(career.liveMatch?.phase, 'finished');
  assert.equal(career.liveMatch?.minute, 90);
  assert.ok(career.liveMatch?.events.some((event) => event.type === 'fulltime'));

  const completed = finalizeMatch(career);
  assert.equal(completed.roundIndex, 1);
  assert.equal(completed.liveMatch, null);
  assert.equal(completed.results.length, 4);
  assert.equal(completed.lastResult?.roundIndex, 0);
  assert.ok(calculateStandings(completed.results).every((row) => row.played === 1));

  const reopened = parseCareer(serializeCareer(completed));
  assert.equal(reopened?.coachName, 'Mara do Vale');
  assert.equal(reopened?.roundIndex, 1);
  assert.equal(reopened?.results.length, 4);
});

test('market transactions and stadium upgrades update the local club economy', () => {
  const career = createCareer('Mara do Vale', 'aurora-vale');
  const candidate = career.market[0];
  assert.ok(candidate);
  const signed = addTransferPlayer(career, candidate.id);
  assert.equal(signed.players.length, 27);
  assert.ok(signed.balance < career.balance);
  assert.equal(signed.market.length, career.market.length - 1);

  const reserves = getRosterGroups(signed).reserves;
  const reserve = reserves[0];
  const reserveForSale = reserves[1];
  assert.ok(reserve);
  assert.ok(reserveForSale);
  const promoted = assignPlayerToSlot(signed, 'ATA-1', reserve.id);
  assert.equal(promoted.lineup.find((slot) => slot.id === 'ATA-1')?.playerId, reserve.id);
  assert.equal(promoted.benchIds.length, 7);
  const sold = sellPlayer(promoted, reserveForSale.id);
  assert.equal(sold.players.length, 26);
  assert.ok(sold.balance > promoted.balance);

  const expanded = upgradeStadium(sold);
  assert.equal(expanded.stadiumLevel, 1);
  assert.ok(expanded.balance < sold.balance);
  assert.equal(sellPlayer(sold, sold.lineup[0].playerId), sold);
});

test('a damaged lineup still advances its clock instead of freezing', () => {
  let career = startMatch(createCareer('Mara do Vale', 'aurora-vale'));
  career = advanceMatch(career);
  const game = career.liveMatch;
  assert.ok(game);
  const damaged = {
    ...career,
    players: career.players.map((player) => ({ ...player, status: 'injured', injuryUntilRound: 2 })),
    liveMatch: {
      ...game,
      userLineup: game.userLineup.map((slot) => ({ ...slot, sentOff: true, offReason: 'injury' })),
    },
  };
  const advanced = advanceMatch(damaged, 5);
  assert.equal(advanced.liveMatch?.minute, 5);
  assert.equal(advanced.liveMatch?.phase, 'first_half');
});
