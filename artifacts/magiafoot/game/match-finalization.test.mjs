import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceMatch,
  createCareer,
  finalizeMatch,
  parseCareer,
  resolveVarReview,
  serializeCareer,
  startMatch,
  substitutePlayer,
} from './engine.ts';

function assertResultSaved(career, expectedHomeGoals, expectedAwayGoals) {
  const completed = finalizeMatch(career);
  assert.notStrictEqual(completed, career, 'the result must advance the career');
  assert.equal(completed.liveMatch, null, 'the live match must be cleared');
  assert.equal(completed.roundIndex, career.roundIndex + 1, 'one round should be recorded');
  assert.equal(completed.lastResult?.homeGoals, expectedHomeGoals);
  assert.equal(completed.lastResult?.awayGoals, expectedAwayGoals);
  const recovered = parseCareer(serializeCareer(completed));
  assert.ok(recovered, 'the saved career should deserialize');
  assert.equal(recovered.liveMatch, null);
  assert.equal(recovered.lastResult?.homeGoals, expectedHomeGoals);
  assert.equal(recovered.lastResult?.awayGoals, expectedAwayGoals);
  return completed;
}

test('Volta Redonda x Anápolis 0-0 ends and saves without transfer-market crash', () => {
  let career = startMatch(createCareer('QA', 'volta-redonda'));
  assert.equal(career.liveMatch?.fixture.homeClubId, 'volta-redonda');
  assert.equal(career.liveMatch?.fixture.awayClubId, 'anapolis');
  career = {
    ...career,
    liveMatch: { ...career.liveMatch, phase: 'finished', minute: 90, homeGoals: 0, awayGoals: 0 },
  };
  const saved = assertResultSaved(career, 0, 0);
  assert.ok(saved.results.some((result) => result.id === career.liveMatch.fixture.id));
});

test('seven consecutive Volta Redonda games retain results and advance the league', () => {
  let career = createCareer('QA', 'volta-redonda');
  for (let round = 0; round < 7; round += 1) {
    career = startMatch(career);
    let attempts = 0;
    while (career.liveMatch?.phase !== 'finished' && attempts++ < 500) {
      const game = career.liveMatch;
      if (game.pausedForVar) {
        career = resolveVarReview(career);
      } else if (game.requiredSubstitutionPlayerId) {
        const available = game.userBenchIds.find((id) =>
          career.players.some((player) => player.id === id && player.status === 'available')
        );
        if (!available) throw new Error('No substitute for mandatory injury');
        career = substitutePlayer(career, game.requiredSubstitutionPlayerId, available);
      } else {
        career = advanceMatch(career, 5);
      }
    }
    assert.equal(career.liveMatch?.phase, 'finished', 'round ' + (round + 1) + ' did not finish');
    const { homeGoals, awayGoals } = career.liveMatch;
    career = assertResultSaved(career, homeGoals, awayGoals);
  }
  assert.equal(career.roundIndex, 7);
  assert.ok(career.results.length >= 7);
});
