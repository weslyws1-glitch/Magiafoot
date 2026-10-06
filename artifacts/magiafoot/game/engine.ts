import { buildBestLineup, buildBench, CLUBS, FORMATIONS, getClub, getFormation, makeCareerMarket, makeRoster } from './data.ts';
import type { Career, Club, Fixture, FormationId, FormationSlot, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey, Intensity, LeagueResult, MatchEvent, MatchSession, MatchStats, Player, Position, SponsorshipContract, SponsorshipProposal, SponsorshipSlot, StadiumUpgradeKey, StandingRow } from './types.ts';

export const POSITION_LABELS: Record<Position, string> = {
  GOL: 'GOL', ZAG: 'ZAG', LE: 'LAT', LD: 'LAT', VOL: 'VOL',
  MC: 'MEI', MEI: 'MEI', PE: 'PON', PD: 'PON', ATA: 'ATA',
};

export const EMPTY_STATS: MatchStats = {
  shots: 0, saves: 0, fouls: 0, offsides: 0, corners: 0,
  yellowCards: 0, redCards: 0, injuries: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const newStats = (): MatchStats => ({ ...EMPTY_STATS });
const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 29);
const gameRandom = (game: MatchSession) => {
  game.randomSeed = (Math.imul(game.randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
  return game.randomSeed / 4_294_967_296;
};

function makeLeagueSchedule(): Fixture[] {
  const clubs = CLUBS.map((club) => club.id);
  const ring = [...clubs];
  const fixtures: Fixture[] = [];
  const firstHalfRounds = clubs.length - 1;
  for (let roundIndex = 0; roundIndex < firstHalfRounds; roundIndex += 1) {
    for (let pair = 0; pair < clubs.length / 2; pair += 1) {
      const left = ring[pair];
      const right = ring[clubs.length - 1 - pair];
      if (!left || !right) continue;
      const flip = (roundIndex + pair) % 2 === 1;
      fixtures.push({
        id: `liga-${roundIndex + 1}-${pair + 1}`,
        roundIndex,
        homeClubId: flip ? right : left,
        awayClubId: flip ? left : right,
      });
      fixtures.push({
        id: `liga-${roundIndex + firstHalfRounds + 1}-${pair + 1}`,
        roundIndex: roundIndex + firstHalfRounds,
        homeClubId: flip ? left : right,
        awayClubId: flip ? right : left,
      });
    }
    const last = ring.pop();
    if (last) ring.splice(1, 0, last);
  }
  return fixtures;
}

export const LEAGUE_FIXTURES = makeLeagueSchedule();
export const LEAGUE_ROUNDS = CLUBS.length * 2 - 2;

export function createCareer(coachName: string, clubId: string): Career {
  const club = getClub(clubId);
  if (!club) throw new Error('Escolha um clube disponível.');
  const roster = makeRoster(club);
  const formationId: FormationId = '4-3-3';
  const lineup = buildBestLineup(roster, formationId);
  const benchIds = buildBench(roster, lineup);
  const captain = lineup
    .map((slot) => roster.find((player) => player.id === slot.playerId))
    .filter((player): player is Player => Boolean(player))
    .sort((a, b) => b.morale + b.strength - a.morale - a.strength)[0];
  return {
    schemaVersion: 1,
    id: `carreira-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coachName: coachName.trim(),
    clubId,
    season: 1,
    roundIndex: 0,
    players: roster,
    market: makeCareerMarket(club),
    formationId,
    lineup,
    benchIds,
    captainId: captain?.id ?? lineup[0]?.playerId ?? '',
    tactics: { mentality: 'equilibrada', pressure: 'normal', tempo: 'normal' },
    boardTrust: 66,
    fanTrust: 60,
    balance: club.balance,
    stadiumLevel: 0,
    ticketPrice: club.ticketPrice,
    stadiumUpgrades: { stands: 1, pitch: 1, roof: 0, lighting: 1, seats: 1, boxes: 0, scoreboard: 0, security: 1, turnstiles: 1, parking: 0, drainage: 0, irrigation: 0 },
    headquartersUpgrades: { board: 1, finance: 1, meeting: 1, legal: 0, technology: 0, marketing: 1, sponsors: 0, commercial: 0, store: 0, members: 0, museum: 0, press: 1, events: 0, history: 1 },
    headquartersRevenuePricing: { store: 3, members: 3, events: 3 },
    headquartersImageAcquisition: { museum: 1, press: 1, history: 1 },
    headquartersInvestments: { marketing: 3, commercial: 3 },
    sponsorships: { proposals: [], contracts: [], lastMarketRound: -1, history: [] },
    results: [],
    liveMatch: null,
    lastResult: null,
    lastNews: 'A diretoria deseja uma temporada competitiva. O primeiro passo é entrar em campo.',
    createdAt: new Date().toISOString(),
  };
}

function positionFamily(position: Position): string {
  if (position === 'GOL') return 'goalkeeper';
  if (position === 'ZAG' || position === 'LE' || position === 'LD') return 'defense';
  if (position === 'VOL' || position === 'MC' || position === 'MEI') return 'midfield';
  return 'attack';
}

export function positionFitMultiplier(natural: Position, target: Position): number {
  if (natural === target) return 1;
  if (natural === 'GOL' || target === 'GOL') return 0.46;
  return positionFamily(natural) === positionFamily(target) ? 0.84 : 0.69;
}

export function effectiveStrength(player: Player, position: Position = player.position): number {
  const fitnessFactor = 0.64 + clamp(player.fitness, 0, 100) * 0.0036;
  const moraleFactor = 0.88 + clamp(player.morale, 0, 100) * 0.0024;
  const statusFactor = player.status === 'available' ? 1 : 0;
  return Math.round(player.strength * fitnessFactor * moraleFactor * positionFitMultiplier(player.position, position) * statusFactor);
}

export function assignPlayerToSlot(career: Career, slotId: string, playerId: string): Career {
  const targetIndex = career.lineup.findIndex((slot) => slot.id === slotId);
  const targetPlayer = career.players.find((player) => player.id === playerId);
  if (targetIndex < 0 || !targetPlayer || targetPlayer.status !== 'available') return career;
  const lineup = career.lineup.map((slot) => ({ ...slot }));
  const currentSlotIndex = lineup.findIndex((slot) => slot.playerId === playerId);
  const outgoingId = lineup[targetIndex]?.playerId;
  if (!outgoingId) return career;

  if (currentSlotIndex >= 0 && currentSlotIndex !== targetIndex) {
    const other = lineup[currentSlotIndex];
    const target = lineup[targetIndex];
    if (other && target) {
      lineup[currentSlotIndex] = { ...other, playerId: outgoingId };
      lineup[targetIndex] = { ...target, playerId };
    }
    return { ...career, lineup, captainId: career.captainId };
  }

  lineup[targetIndex] = { ...lineup[targetIndex]!, playerId };
  const benchIds = buildBench(career.players, lineup);
  const newCaptain = career.captainId === outgoingId ? playerId : career.captainId;
  return { ...career, lineup, benchIds, captainId: newCaptain };
}

export function changeFormation(career: Career, formationId: FormationId): Career {
  const formation = getFormation(formationId);
  const availablePlayers = career.players.filter((player) => player.status === 'available');
  const lineup = buildBestLineup(availablePlayers, formationId);
  const benchIds = buildBench(availablePlayers, lineup);
  const captainId = lineup.some((slot) => slot.playerId === career.captainId)
    ? career.captainId
    : lineup[0]?.playerId ?? '';
  return {
    ...career,
    formationId: formation.id,
    lineup,
    benchIds,
    captainId,
  };
}

export function updateTactics(career: Career, tactics: Career['tactics']): Career {
  return { ...career, tactics: { ...tactics } };
}

export function setCaptain(career: Career, playerId: string): Career {
  return career.lineup.some((slot) => slot.playerId === playerId) ? { ...career, captainId: playerId } : career;
}

export function getCurrentFixture(career: Career): Fixture | undefined {
  return LEAGUE_FIXTURES.find((fixture) => fixture.roundIndex === career.roundIndex
    && (fixture.homeClubId === career.clubId || fixture.awayClubId === career.clubId));
}

function addEvent(game: MatchSession, type: MatchEvent['type'], text: string, clubId?: string, playerId?: string) {
  game.events.push({
    id: `evento-${game.fixture.id}-${game.minute}-${game.events.length}`,
    minute: game.minute,
    type,
    text,
    ...(clubId ? { clubId } : {}),
    ...(playerId ? { playerId } : {}),
  });
}

function currentGamePlayers(career: Career, game: MatchSession) {
  return game.userLineup
    .filter((slot) => !slot.sentOff)
    .map((slot) => ({ slot, player: career.players.find((item) => item.id === slot.playerId) }))
    .filter((item): item is { slot: FormationSlot; player: Player } => Boolean(item.player && item.player.status === 'available'));
}

function recoverBetweenRounds(players: Player[], currentRound: number): Player[] {
  return players.map((player) => {
    const expiredInjury = player.status === 'injured'
      && player.injuryUntilRound !== null
      && currentRound > player.injuryUntilRound;
    const expiredSuspension = player.status === 'suspended'
      && player.suspendedUntilRound !== null
      && currentRound > player.suspendedUntilRound;
    return {
      ...player,
      fitness: clamp(player.fitness + 22, 15, 100),
      ...(expiredInjury ? { status: 'available' as const, injuryUntilRound: null } : {}),
      ...(expiredSuspension ? { status: 'available' as const, suspendedUntilRound: null } : {}),
    };
  });
}

export function startMatch(career: Career): Career {
  if (career.liveMatch) return career;
  const fixture = getCurrentFixture(career);
  if (!fixture) return career;
  const club = getClub(career.clubId);
  if (!club) return career;

  const recoveredPlayers = recoverBetweenRounds(career.players, career.roundIndex);
  const eligibleIds = new Set(recoveredPlayers.filter((player) => player.status === 'available').map((player) => player.id));
  let lineup = career.lineup.map((slot) => ({ ...slot }));
  if (lineup.some((slot) => !eligibleIds.has(slot.playerId))) {
    lineup = buildBestLineup(recoveredPlayers, career.formationId);
  }
  const benchIds = career.benchIds.filter((id) => eligibleIds.has(id) && !lineup.some((slot) => slot.playerId === id));
  for (const id of buildBench(recoveredPlayers, lineup)) {
    if (benchIds.length >= 7) break;
    if (!benchIds.includes(id)) benchIds.push(id);
  }
  const game: MatchSession = {
    fixture,
    userClubId: career.clubId,
    phase: 'pregame',
    minute: 0,
    homeGoals: 0,
    awayGoals: 0,
    homeStats: newStats(),
    awayStats: newStats(),
    userLineup: lineup.map((slot) => ({ ...slot })),
    userBenchIds: benchIds,
    substitutionsUsed: 0,
    events: [],
    randomSeed: (hash(`${career.clubId}-${career.roundIndex}-${career.season}`) + 19) >>> 0,
  };
  return { ...career, players: recoveredPlayers, lineup, benchIds, liveMatch: game };
}

function statLine(game: MatchSession, clubId: string): MatchStats {
  return clubId === game.fixture.homeClubId ? game.homeStats : game.awayStats;
}

function activeClubPlayer(career: Career, game: MatchSession): Player | undefined {
  const candidates = currentGamePlayers(career, game).map((item) => item.player);
  if (!candidates.length) return undefined;
  return candidates[Math.floor(gameRandom(game) * candidates.length)];
}

function teamPower(career: Career, game: MatchSession, clubId: string): number {
  if (clubId !== career.clubId) return getClub(clubId)?.rating ?? 64;
  const slots = game.userLineup.filter((slot) => !slot.sentOff);
  const power = slots.reduce((sum, slot) => {
    const player = career.players.find((item) => item.id === slot.playerId);
    return sum + (player ? effectiveStrength(player, slot.position) : 0);
  }, 0);
  return power / Math.max(11, slots.length);
}

function attackModifier(career: Career, game: MatchSession, clubId: string): number {
  if (clubId !== career.clubId) return 1;
  const mentality = career.tactics.mentality === 'ofensiva' ? 1.12 : career.tactics.mentality === 'cautelosa' ? 0.89 : 1;
  const tempo = career.tactics.tempo === 'alta' ? 0.035 : career.tactics.tempo === 'baixa' ? -0.025 : 0;
  const pressure = career.tactics.pressure === 'alta' ? 0.018 : career.tactics.pressure === 'baixa' ? -0.008 : 0;
  return mentality + tempo + pressure;
}

function getOtherClub(game: MatchSession, clubId: string): string {
  return clubId === game.fixture.homeClubId ? game.fixture.awayClubId : game.fixture.homeClubId;
}

function maybeInjurePlayer(career: Career, game: MatchSession, clubId: string): Career {
  const stat = statLine(game, clubId);
  const isUser = clubId === career.clubId;
  const candidate = isUser ? activeClubPlayer(career, game) : undefined;
  const risk = isUser
    ? (candidate && candidate.fitness < 45 ? 0.00125 : 0.00032)
    : 0.00018;
  if (gameRandom(game) >= risk) return career;
  stat.injuries += 1;
  if (!isUser || !candidate) {
    addEvent(game, 'medical', `${game.minute}′ Atendimento médico em campo. A partida continua.`, clubId);
    return career;
  }

  const slot = game.userLineup.find((item) => item.playerId === candidate.id && !item.sentOff);
  if (!slot) return career;
  const players = career.players.map((player) => player.id === candidate.id
    ? { ...player, status: 'injured' as const, injuryUntilRound: game.fixture.roundIndex + 1, fitness: Math.max(10, player.fitness - 12) }
    : player);
  const replacementId = game.userBenchIds.find((id) => players.some((player) => player.id === id && player.status === 'available'));
  const patchedSlot = replacementId
    ? { ...slot, playerId: replacementId, sentOff: false, offReason: undefined }
    : { ...slot, sentOff: true, offReason: 'injury' as const };
  game.userLineup = game.userLineup.map((item) => item.id === slot.id ? patchedSlot : item);
  addEvent(game, 'medical', `${candidate.name} sente a perna. O atendimento médico entra em campo.`, clubId, candidate.id);
  if (replacementId) {
    game.userBenchIds = game.userBenchIds.filter((id) => id !== replacementId).concat(candidate.id);
    game.substitutionsUsed = Math.min(5, game.substitutionsUsed + 1);
    const replacement = players.find((player) => player.id === replacementId);
    addEvent(game, 'substitution', `${replacement?.name ?? 'Um reserva'} entra no lugar de ${candidate.name}. O jogo segue.`, clubId, replacementId);
  } else {
    addEvent(game, 'substitution', `${candidate.name} deixa o campo. ${getClub(clubId)?.name} continua com um a menos.`, clubId, candidate.id);
  }
  return { ...career, players, lineup: game.userLineup, benchIds: game.userBenchIds };
}

function simulateChance(career: Career, game: MatchSession, clubId: string): Career {
  const otherClubId = getOtherClub(game, clubId);
  const attackPower = teamPower(career, game, clubId) * attackModifier(career, game, clubId);
  const defensePower = teamPower(career, game, otherClubId);
  const difference = clamp(attackPower - defensePower, -20, 20);
  const shotChance = clamp(0.095 + difference * 0.002 + (clubId === career.clubId && career.tactics.tempo === 'alta' ? 0.025 : 0), 0.055, 0.18);
  const stats = statLine(game, clubId);
  const player = clubId === career.clubId ? activeClubPlayer(career, game) : undefined;
  if (gameRandom(game) < shotChance) {
    stats.shots += 1;
    const finisher = player?.name ?? 'O atacante';
    const goalChance = clamp(0.083 + difference * 0.0012, 0.045, 0.15);
    if (gameRandom(game) < goalChance) {
      if (clubId === game.fixture.homeClubId) game.homeGoals += 1;
      else game.awayGoals += 1;
      addEvent(game, 'goal', `${game.minute}′ GOL! ${getClub(clubId)?.name}. ${finisher} balança a rede!`, clubId, player?.id);
      if (player) {
        const players = career.players.map((item) => item.id === player.id ? { ...item, morale: clamp(item.morale + 3, 0, 100) } : item);
        career = { ...career, players };
      }
    } else if (gameRandom(game) < 0.58) {
      statLine(game, otherClubId).saves += 1;
      addEvent(game, 'save', `${game.minute}′ ${finisher} finaliza. O goleiro espalma para longe!`, clubId, player?.id);
      if (gameRandom(game) < 0.48) {
        statLine(game, clubId).corners += 1;
        addEvent(game, 'corner', `${game.minute}′ Escanteio para ${getClub(clubId)?.name}.`, clubId);
      }
    } else {
      addEvent(game, 'shot', `${game.minute}′ ${finisher} arrisca. A bola passa perto do gol.`, clubId, player?.id);
    }
  }

  if (gameRandom(game) < 0.077) {
    stats.fouls += 1;
    const fouled = clubId === career.clubId ? player : undefined;
    addEvent(game, 'foul', `${game.minute}′ Falta de ${getClub(clubId)?.name}. O árbitro marca.`, clubId, fouled?.id);
    if (gameRandom(game) < 0.105) {
      stats.yellowCards += 1;
      const offender = fouled ?? activeClubPlayer(career, game);
      addEvent(game, 'yellow', `${game.minute}′ Cartão amarelo para ${offender?.name ?? 'um jogador'}.`, clubId, offender?.id);
      if (gameRandom(game) < 0.018) {
        stats.redCards += 1;
        if (offender && clubId === career.clubId) {
          game.userLineup = game.userLineup.map((slot) => slot.playerId === offender.id
            ? { ...slot, sentOff: true, offReason: 'red' }
            : slot);
        }
        addEvent(game, 'red', `${game.minute}′ Cartão vermelho! ${offender?.name ?? 'Um jogador'} é expulso.`, clubId, offender?.id);
      }
    }
  }
  if (gameRandom(game) < 0.026) {
    stats.offsides += 1;
    addEvent(game, 'offside', `${game.minute}′ Impedimento assinalado.`, clubId);
  }
  if (gameRandom(game) < 0.037 && stats.corners < stats.shots + 2) {
    stats.corners += 1;
    addEvent(game, 'corner', `${game.minute}′ Escanteio para ${getClub(clubId)?.name}.`, clubId);
  }
  return career;
}

function simulateMinute(career: Career, game: MatchSession) {
  game.minute += 1;
  if (game.userLineup.some((slot) => !slot.sentOff)) {
    const drain = 0.075
      + (career.tactics.tempo === 'alta' ? 0.10 : career.tactics.tempo === 'normal' ? 0.055 : 0.015)
      + (career.tactics.pressure === 'alta' ? 0.075 : career.tactics.pressure === 'normal' ? 0.04 : 0);
    const activeIds = new Set(game.userLineup.filter((slot) => !slot.sentOff).map((slot) => slot.playerId));
    career = {
      ...career,
      players: career.players.map((player) => activeIds.has(player.id)
        ? { ...player, fitness: Math.max(5, player.fitness - drain) }
        : player),
    };
  }

  const userClubId = career.clubId;
  const opponentId = getOtherClub(game, userClubId);
  career = maybeInjurePlayer(career, game, userClubId);
  career = maybeInjurePlayer(career, game, opponentId);
  career = simulateChance(career, game, game.fixture.homeClubId);
  career = simulateChance(career, game, game.fixture.awayClubId);
  if (game.events.length === 0 || gameRandom(game) < 0.09) {
    addEvent(game, 'shot', `${game.minute}′ As equipes disputam cada espaço do campo.`, undefined);
  }
  if (game.minute === 45) {
    game.phase = 'halftime';
    addEvent(game, 'halftime', `Intervalo! ${game.homeGoals} × ${game.awayGoals}. Respire, ajuste o time e volte para o segundo tempo.`);
  } else if (game.minute === 90) {
    game.phase = 'finished';
    addEvent(game, 'fulltime', `Apito final! ${getClub(game.fixture.homeClubId)?.name} ${game.homeGoals} × ${game.awayGoals} ${getClub(game.fixture.awayClubId)?.name}.`);
  }
  return career;
}

export function advanceMatch(career: Career, minutes = 5): Career {
  const existing = career.liveMatch;
  if (!existing || existing.phase === 'finished') return career;
  const game: MatchSession = {
    ...existing,
    homeStats: { ...existing.homeStats },
    awayStats: { ...existing.awayStats },
    userLineup: existing.userLineup.map((slot) => ({ ...slot })),
    userBenchIds: [...existing.userBenchIds],
    events: [...existing.events],
  };
  let next: Career = { ...career, liveMatch: game };
  if (game.phase === 'pregame') {
    game.phase = 'first_half';
    addEvent(game, 'kickoff', 'Bola rolando! Começa a partida.', career.clubId);
    return next;
  }
  if (game.phase === 'halftime') {
    game.phase = 'second_half';
    addEvent(game, 'second_half', 'As equipes voltam. Começa o segundo tempo!', career.clubId);
    return next;
  }
  const safeMinutes = clamp(Math.floor(minutes), 1, 5);
  const endMinute = Math.min(game.phase === 'first_half' ? 45 : 90, game.minute + safeMinutes);
  while (game.minute < endMinute && game.phase !== 'finished') {
    next = simulateMinute(next, game);
  }
  return { ...next, liveMatch: game };
}

export function substitutePlayer(career: Career, outgoingId: string, incomingId: string): Career {
  const game = career.liveMatch;
  if (!game || game.phase === 'finished' || game.substitutionsUsed >= 5) return career;
  if (!game.userBenchIds.includes(incomingId)) return career;
  const index = game.userLineup.findIndex((slot) => slot.playerId === outgoingId && !slot.sentOff);
  if (index < 0) return career;
  const incoming = career.players.find((player) => player.id === incomingId);
  if (!incoming || incoming.status !== 'available') return career;
  const gameCopy: MatchSession = {
    ...game,
    userLineup: game.userLineup.map((slot, slotIndex) => slotIndex === index ? { ...slot, playerId: incomingId, sentOff: false, offReason: undefined } : { ...slot }),
    userBenchIds: game.userBenchIds.filter((id) => id !== incomingId).concat(outgoingId),
    substitutionsUsed: game.substitutionsUsed + 1,
    events: [...game.events],
  };
  const outgoing = career.players.find((player) => player.id === outgoingId);
  addEvent(gameCopy, 'substitution', `${incoming.name} entra no lugar de ${outgoing?.name ?? 'um companheiro'}. Substituições: ${gameCopy.substitutionsUsed}/5.`, career.clubId, incomingId);
  return {
    ...career,
    lineup: gameCopy.userLineup.map((slot) => ({ ...slot })),
    benchIds: [...gameCopy.userBenchIds],
    liveMatch: gameCopy,
  };
}

function matchWinner(homeGoals: number, awayGoals: number) {
  return homeGoals === awayGoals ? 'draw' : homeGoals > awayGoals ? 'home' : 'away';
}

function cpuScore(home: Club, away: Club, seed: number): [number, number] {
  let value = seed >>> 0;
  const roll = () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
  const homeGoals = clamp(Math.floor(roll() * (0.9 + home.rating / 45)), 0, 4);
  const awayGoals = clamp(Math.floor(roll() * (0.9 + away.rating / 45)), 0, 4);
  return [homeGoals, awayGoals];
}

const SPONSOR_POOL = [
  { name: 'Aurora Energia', category: 'Energia', prestige: 74, fanImpact: 2, boardImpact: 3 },
  { name: 'Vitta Saúde', category: 'Saúde', prestige: 70, fanImpact: 4, boardImpact: 2 },
  { name: 'Nexa Telecom', category: 'Tecnologia', prestige: 78, fanImpact: 2, boardImpact: 4 },
  { name: 'MobiPay', category: 'Financeiro', prestige: 66, fanImpact: -1, boardImpact: 4 },
  { name: 'Brava Alimentos', category: 'Alimentos', prestige: 62, fanImpact: 3, boardImpact: 2 },
  { name: 'Titan Sports', category: 'Esportes', prestige: 82, fanImpact: 5, boardImpact: 3 },
  { name: 'Orbe Logística', category: 'Logística', prestige: 61, fanImpact: 0, boardImpact: 3 },
  { name: 'Pulse Mobile', category: 'Tecnologia', prestige: 72, fanImpact: 3, boardImpact: 3 },
];

function recentFormScore(career: Career): number {
  const recent = [...career.results]
    .filter((result) => result.homeClubId === career.clubId || result.awayClubId === career.clubId)
    .sort((a, b) => b.roundIndex - a.roundIndex)
    .slice(0, 5);
  if (!recent.length) return 50;
  let points = 0;
  for (const result of recent) {
    const home = result.homeClubId === career.clubId;
    const gf = home ? result.homeGoals : result.awayGoals;
    const ga = home ? result.awayGoals : result.homeGoals;
    points += gf > ga ? 3 : gf === ga ? 1 : 0;
  }
  return Math.round((points / (recent.length * 3)) * 100);
}

function sponsorshipMarketScore(career: Career): number {
  const form = recentFormScore(career);
  const marketing = career.headquartersInvestments?.marketing ?? 3;
  const commercial = career.headquartersInvestments?.commercial ?? 3;
  return clamp(Math.round(form * 0.42 + career.boardTrust * 0.18 + career.fanTrust * 0.18 + marketing * 4 + commercial * 4), 10, 100);
}

function sponsorshipSlotForIndex(index: number): SponsorshipSlot {
  return (['principal', 'sleeve', 'back', 'institutional'] as SponsorshipSlot[])[index % 4]!;
}

export function refreshSponsorshipMarket(career: Career, force = false): Career {
  const currentRound = career.roundIndex;
  if (!force && career.sponsorships?.lastMarketRound === currentRound) return career;

  const score = sponsorshipMarketScore(career);
  const count = score >= 82 ? 4 : score >= 65 ? 3 : score >= 45 ? 2 : 1;
  const occupied = new Set((career.sponsorships?.contracts ?? []).map((item) => item.slot));
  const availableSlots = (['principal', 'sleeve', 'back', 'institutional'] as SponsorshipSlot[]).filter((slot) => !occupied.has(slot));
  const proposalCount = Math.min(count, Math.max(1, availableSlots.length));
  const seed = hash(`sponsor-${career.clubId}-${career.season}-${currentRound}`);
  const pool = [...SPONSOR_POOL].sort((a, b) => ((hash(a.name) ^ seed) >>> 0) - ((hash(b.name) ^ seed) >>> 0));
  const commercial = career.headquartersInvestments?.commercial ?? 3;
  const proposals: SponsorshipProposal[] = [];

  for (let i = 0; i < proposalCount; i += 1) {
    const brand = pool[i % pool.length]!;
    const slot = availableSlots[i] ?? sponsorshipSlotForIndex(i);
    const slotFactor = slot === 'principal' ? 1.75 : slot === 'sleeve' ? 0.72 : slot === 'back' ? 0.95 : 0.58;
    const strength = 0.62 + score / 100 + commercial * 0.08;
    const base = Math.round((85_000 + brand.prestige * 4_700) * slotFactor * strength);
    const durationMatches = score >= 75 ? 10 + ((seed + i) % 5) : 6 + ((seed + i) % 5);
    const signingBonus = Math.round(base * (0.75 + ((seed >> (i + 1)) % 25) / 100));
    const perMatch = Math.round(base * 0.18);
    const winBonus = Math.round(base * 0.07);
    proposals.push({
      id: `sp-${currentRound}-${i}-${brand.name.replace(/\s+/g, '-').toLowerCase()}`,
      sponsorName: brand.name,
      category: brand.category,
      slot,
      signingBonus,
      perMatch,
      winBonus,
      durationMatches,
      expiresRound: currentRound + 2,
      fanImpact: brand.fanImpact,
      boardImpact: brand.boardImpact,
      prestige: brand.prestige,
      note: score >= 75 ? 'A marca quer aproveitar a boa fase e crescer junto com o clube.' : score <= 40 ? 'A empresa vê potencial, mas oferece valores conservadores pelo momento do time.' : 'Proposta compatível com o momento esportivo e comercial do clube.',
    });
  }

  return {
    ...career,
    sponsorships: {
      proposals,
      contracts: career.sponsorships?.contracts ?? [],
      lastMarketRound: currentRound,
      history: career.sponsorships?.history ?? [],
    },
  };
}

export function acceptSponsorshipProposal(career: Career, proposalId: string): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal || state.contracts.some((item) => item.slot === proposal.slot)) return career;

  const contract: SponsorshipContract = {
    ...proposal,
    acceptedRound: career.roundIndex,
    matchesRemaining: proposal.durationMatches,
    totalEarned: proposal.signingBonus,
  };

  return {
    ...career,
    balance: career.balance + proposal.signingBonus,
    boardTrust: clamp(career.boardTrust + proposal.boardImpact, 0, 100),
    fanTrust: clamp(career.fanTrust + proposal.fanImpact, 0, 100),
    sponsorships: {
      proposals: state.proposals.filter((item) => item.id !== proposalId && item.slot !== proposal.slot),
      contracts: [...state.contracts, contract],
      lastMarketRound: state.lastMarketRound,
      history: [`${proposal.sponsorName} assinou por ${proposal.durationMatches} jogos.`, ...state.history].slice(0, 20),
    },
    lastNews: `${proposal.sponsorName} é o novo patrocinador do clube. Acordo de ${proposal.durationMatches} jogos.`,
  };
}

export function declineSponsorshipProposal(career: Career, proposalId: string): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal) return career;
  return {
    ...career,
    sponsorships: {
      ...state,
      proposals: state.proposals.filter((item) => item.id !== proposalId),
      history: [`Proposta de ${proposal.sponsorName} recusada.`, ...state.history].slice(0, 20),
    },
  };
}

function settleSponsorshipsAfterMatch(career: Career, won: boolean): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  if (!state.contracts.length) return refreshSponsorshipMarket(career, true);

  let sponsorIncome = 0;
  const active: SponsorshipContract[] = [];
  const history = [...state.history];

  for (const contract of state.contracts) {
    const payment = contract.perMatch + (won ? contract.winBonus : 0);
    sponsorIncome += payment;
    const remaining = Math.max(0, contract.matchesRemaining - 1);
    if (remaining > 0) {
      active.push({ ...contract, matchesRemaining: remaining, totalEarned: contract.totalEarned + payment });
    } else {
      history.unshift(`Contrato com ${contract.sponsorName} chegou ao fim após ${contract.durationMatches} jogos.`);
    }
  }

  const updated: Career = {
    ...career,
    balance: career.balance + sponsorIncome,
    sponsorships: { proposals: [], contracts: active, lastMarketRound: -1, history: history.slice(0, 20) },
  };
  return refreshSponsorshipMarket(updated, true);
}

export function ticketDemandMultiplier(ticketPrice: number, referencePrice: number): number {
  const safeReference = Math.max(1, referencePrice);
  const ratio = ticketPrice / safeReference;
  if (ratio <= 0.7) return 1.18;
  if (ratio <= 0.85) return 1.10;
  if (ratio <= 1.0) return 1.0;
  if (ratio <= 1.15) return 0.90;
  if (ratio <= 1.3) return 0.78;
  if (ratio <= 1.5) return 0.64;
  return 0.48;
}

export function setTicketPrice(career: Career, price: number): Career {
  const club = getClub(career.clubId);
  const base = club?.ticketPrice ?? 25;
  const min = Math.max(5, Math.round(base * 0.45));
  const max = Math.max(min + 1, Math.round(base * 2.2));
  const nextPrice = clamp(Math.round(price), min, max);
  return { ...career, ticketPrice: nextPrice };
}

export function finalizeMatch(career: Career): Career {
  const game = career.liveMatch;
  if (!game || game.phase !== 'finished') return career;
  const roundFixtures = LEAGUE_FIXTURES.filter((fixture) => fixture.roundIndex === game.fixture.roundIndex);
  const newResults: LeagueResult[] = roundFixtures.map((fixture) => {
    const isUserMatch = fixture.id === game.fixture.id;
    const home = getClub(fixture.homeClubId);
    const away = getClub(fixture.awayClubId);
    if (!home || !away) throw new Error('Partida da liga sem clube válido.');
    const seed = hash(`${fixture.id}-${career.season}`);
    if (isUserMatch) {
      const userHome = career.clubId === fixture.homeClubId;
      return {
        ...fixture,
        homeGoals: userHome ? game.homeGoals : game.awayGoals,
        awayGoals: userHome ? game.awayGoals : game.homeGoals,
        attendance: Math.round((home.stadiumCapacity + Math.max(0, (career.stadiumUpgrades?.stands ?? career.stadiumLevel + 1) - 1) * 4_000) * Math.min(0.92, Math.min(0.78, 0.49 + (career.stadiumUpgrades?.seats ?? 1) * 0.025 + (career.stadiumUpgrades?.roof ?? 0) * 0.02) * ticketDemandMultiplier(career.ticketPrice ?? home.ticketPrice, home.ticketPrice))),
      };
    }
    const [homeGoals, awayGoals] = cpuScore(home, away, seed);
    return {
      ...fixture,
      homeGoals,
      awayGoals,
      attendance: Math.round(home.stadiumCapacity * (0.28 + (seed % 32) / 100)),
    };
  });

  const result = newResults.find((item) => item.id === game.fixture.id);
  if (!result) return career;
  const homeWin = matchWinner(result.homeGoals, result.awayGoals);
  const userWon = homeWin === 'draw' ? false : (homeWin === 'home') === (result.homeClubId === career.clubId);
  const isDraw = homeWin === 'draw';
  const trustDelta = isDraw ? 1 : userWon ? 7 : -5;
  const club = getClub(career.clubId);
  const attendance = club && game.fixture.homeClubId === career.clubId
    ? Math.round((club.stadiumCapacity + Math.max(0, (career.stadiumUpgrades?.stands ?? career.stadiumLevel + 1) - 1) * 4_000) * Math.min(0.92, Math.min(0.78, 0.49 + (career.stadiumUpgrades?.seats ?? 1) * 0.025 + (career.stadiumUpgrades?.roof ?? 0) * 0.02) * ticketDemandMultiplier(career.ticketPrice ?? club.ticketPrice, club.ticketPrice)))
    : 0;
  const gateIncome = club ? attendance * (career.ticketPrice ?? club.ticketPrice) : 0;
  const wageBill = career.players.reduce((sum, player) => sum + player.wage, 0);
  const updatedPlayers = career.players.map((player) => {
    const event = game.events.find((item) => item.type === 'red' && item.playerId === player.id && item.clubId === career.clubId);
    const moraleDelta = userWon ? 4 : isDraw ? 1 : -3;
    return {
      ...player,
      morale: clamp(player.morale + moraleDelta, 10, 100),
      ...(event ? { status: 'suspended' as const, suspendedUntilRound: game.fixture.roundIndex + 1 } : {}),
    };
  });
  const revenue = gateIncome - wageBill;
  const leagueResult = { ...result, attendance };
  const resultText = isDraw ? 'Um ponto para cada lado.' : userWon ? 'Vitória! A torcida comemora.' : 'A diretoria espera uma reação na próxima rodada.';
  const afterMatch: Career = {
    ...career,
    players: updatedPlayers,
    results: [...career.results.filter((item) => item.roundIndex !== game.fixture.roundIndex), ...newResults],
    roundIndex: career.roundIndex + 1,
    balance: Math.max(0, career.balance + revenue),
    boardTrust: clamp(career.boardTrust + trustDelta, 0, 100),
    fanTrust: clamp(career.fanTrust + (userWon ? 3 : isDraw ? 0 : -3), 0, 100),
    liveMatch: null,
    lastResult: leagueResult,
    lastNews: `${resultText} Bilheteria de ${formatCurrency(gateIncome)}; salários de ${formatCurrency(wageBill)}.`,
  };
  return settleSponsorshipsAfterMatch(afterMatch, userWon);
}

export function calculateStandings(results: LeagueResult[]): StandingRow[] {
  const rows = CLUBS.map((club) => ({
    club,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  for (const result of results) {
    const home = rows.find((row) => row.club.id === result.homeClubId);
    const away = rows.find((row) => row.club.id === result.awayClubId);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;
    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;
    if (result.homeGoals > result.awayGoals) {
      home.wins += 1; home.points += 3; away.losses += 1;
    } else if (result.homeGoals < result.awayGoals) {
      away.wins += 1; away.points += 3; home.losses += 1;
    } else {
      home.draws += 1; away.draws += 1; home.points += 1; away.points += 1;
    }
  }
  return rows.sort((a, b) =>
    b.points - a.points
    || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    || b.goalsFor - a.goalsFor
    || a.club.name.localeCompare(b.club.name, 'pt-BR'),
  );
}

export function getCurrentLeaguePosition(career: Career): number {
  return calculateStandings(career.results).findIndex((row) => row.club.id === career.clubId) + 1;
}

export function serializeCareer(career: Career): string {
  return JSON.stringify(career);
}

export function parseCareer(saved: string | null): Career | null {
  if (!saved) return null;
  try {
    const value: unknown = JSON.parse(saved);
    if (typeof value !== 'object' || value === null) return null;
    const parsed = value as Partial<Career>;
    if (
      parsed.schemaVersion !== 1
      || typeof parsed.coachName !== 'string'
      || typeof parsed.clubId !== 'string'
      || !getClub(parsed.clubId)
      || !Array.isArray(parsed.players)
      || parsed.players.length < 25
      || !Array.isArray(parsed.lineup)
      || !Array.isArray(parsed.results)
    ) return null;
    const fallbackHeadquarters: Career['headquartersUpgrades'] = { board: 1, finance: 1, meeting: 1, legal: 0, technology: 0, marketing: 1, sponsors: 0, commercial: 0, store: 0, members: 0, museum: 0, press: 1, events: 0, history: 1 };
    const fallbackHeadquartersRevenuePricing: Career['headquartersRevenuePricing'] = { store: 3, members: 3, events: 3 };
    const fallbackHeadquartersImageAcquisition: Career['headquartersImageAcquisition'] = { museum: 1, press: 1, history: 1 };
    const fallbackHeadquartersInvestments: Career['headquartersInvestments'] = { marketing: 3, commercial: 3 };
    const fallbackSponsorships: Career['sponsorships'] = { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
    const fallbackUpgrades: Career['stadiumUpgrades'] = {
      stands: Math.max(1, Math.min(5, (parsed.stadiumLevel ?? 0) + 1)),
      pitch: 1, roof: 0, lighting: 1, seats: 1, boxes: 0,
      scoreboard: 0, security: 1, turnstiles: 1, parking: 0, drainage: 0, irrigation: 0,
    };
    return {
      ...(parsed as Career),
      ticketPrice: typeof (parsed as Career).ticketPrice === 'number' ? (parsed as Career).ticketPrice : (getClub(parsed.clubId)?.ticketPrice ?? 25),
      stadiumUpgrades: { ...fallbackUpgrades, ...((parsed as Career).stadiumUpgrades ?? {}) },
      headquartersUpgrades: { ...fallbackHeadquarters, ...((parsed as Career).headquartersUpgrades ?? {}) },
      headquartersRevenuePricing: { ...fallbackHeadquartersRevenuePricing, ...((parsed as Career).headquartersRevenuePricing ?? {}) },
      headquartersImageAcquisition: { ...fallbackHeadquartersImageAcquisition, ...((parsed as Career).headquartersImageAcquisition ?? {}) },
      headquartersInvestments: { ...fallbackHeadquartersInvestments, ...((parsed as Career).headquartersInvestments ?? {}) },
      fanTrust: typeof (parsed as Career).fanTrust === 'number' ? (parsed as Career).fanTrust : 60,
      sponsorships: { ...fallbackSponsorships, ...((parsed as Career).sponsorships ?? {}) },
    };
  } catch {
    return null;
  }
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function matchPhaseLabel(phase: MatchSession['phase']): string {
  return {
    pregame: 'Pré-jogo',
    first_half: '1º tempo',
    halftime: 'Intervalo',
    second_half: '2º tempo',
    finished: 'Fim de jogo',
  }[phase];
}

export function getIntensityLabel(value: Intensity): string {
  return value === 'baixa' ? 'Baixa' : value === 'alta' ? 'Alta' : 'Normal';
}

export function currentFormationSlots(formationId: FormationId) {
  return FORMATIONS.find((formation) => formation.id === formationId)?.slots ?? FORMATIONS[0]!.slots;
}

export function getPlayer(career: Career, playerId: string | undefined): Player | undefined {
  return playerId ? career.players.find((player) => player.id === playerId) : undefined;
}

export function getClubName(clubId: string): string {
  return getClub(clubId)?.name ?? 'Clube';
}

export function addTransferPlayer(career: Career, playerId: string): Career {
  const player = career.market.find((item) => item.id === playerId);
  if (!player || career.balance < player.value || career.players.length >= 32) return career;
  return {
    ...career,
    balance: career.balance - player.value,
    players: [...career.players, { ...player, status: 'available', fitness: 90, morale: 70 }],
    market: career.market.filter((item) => item.id !== playerId),
    lastNews: `${player.name} assinou com ${getClubName(career.clubId)}.`,
  };
}

export function sellPlayer(career: Career, playerId: string): Career {
  if (career.players.length <= 18 || career.lineup.some((slot) => slot.playerId === playerId) || career.benchIds.includes(playerId)) return career;
  const player = career.players.find((item) => item.id === playerId);
  if (!player) return career;
  const saleValue = Math.round(player.value * 0.75);
  return {
    ...career,
    balance: career.balance + saleValue,
    players: career.players.filter((item) => item.id !== playerId),
    lastNews: `${player.name} foi negociado por ${formatCurrency(saleValue)}.`,
  };
}

export const HEADQUARTERS_REVENUE_PRICE_MULTIPLIER: Record<number, number> = {
  1: 0.70,
  2: 0.85,
  3: 1.00,
  4: 1.25,
  5: 1.55,
};

export const HEADQUARTERS_REVENUE_DEMAND_MULTIPLIER: Record<number, number> = {
  1: 1.28,
  2: 1.14,
  3: 1.00,
  4: 0.78,
  5: 0.56,
};

export function headquartersRevenueLabel(level: number): string {
  return ({ 1: 'Muito baixo', 2: 'Baixo', 3: 'Normal', 4: 'Alto', 5: 'Muito alto' } as Record<number, string>)[clamp(Math.round(level), 1, 5)] ?? 'Normal';
}

export function headquartersRevenueDemandLabel(level: number): string {
  return ({ 1: 'Muito alta', 2: 'Alta', 3: 'Normal', 4: 'Baixa', 5: 'Muito baixa' } as Record<number, string>)[clamp(Math.round(level), 1, 5)] ?? 'Normal';
}

export function setHeadquartersRevenuePricing(career: Career, key: HeadquartersRevenueKey, level: number): Career {
  const safeLevel = clamp(Math.round(level), 1, 5);
  return {
    ...career,
    headquartersRevenuePricing: {
      ...(career.headquartersRevenuePricing ?? { store: 3, members: 3, events: 3 }),
      [key]: safeLevel,
    },
  };
}

export const HEADQUARTERS_INVESTMENT_MONTHLY_COST: Record<number, number> = {
  1: 18_000,
  2: 36_000,
  3: 65_000,
  4: 105_000,
  5: 165_000,
};

export function headquartersInvestmentLabel(level: number): string {
  return ({ 1: 'Muito baixo', 2: 'Baixo', 3: 'Normal', 4: 'Alto', 5: 'Muito alto' } as Record<number, string>)[clamp(Math.round(level), 1, 5)] ?? 'Normal';
}

export function setHeadquartersInvestment(career: Career, key: HeadquartersInvestmentKey, level: number): Career {
  const safeLevel = clamp(Math.round(level), 1, 5);
  return {
    ...career,
    headquartersInvestments: {
      ...(career.headquartersInvestments ?? { marketing: 3, commercial: 3 }),
      [key]: safeLevel,
    },
  };
}

export function setHeadquartersImageAcquisition(career: Career, key: HeadquartersImageKey, level: number): Career {
  const safeLevel = clamp(Math.round(level), 1, 3);
  return {
    ...career,
    headquartersImageAcquisition: {
      ...(career.headquartersImageAcquisition ?? { museum: 1, press: 1, history: 1 }),
      [key]: safeLevel,
    },
  };
}

export const HEADQUARTERS_UPGRADE_BASE_COST: Record<HeadquartersUpgradeKey, number> = {
  board: 300_000,
  finance: 260_000,
  meeting: 180_000,
  legal: 240_000,
  technology: 320_000,
  marketing: 360_000,
  sponsors: 420_000,
  commercial: 340_000,
  store: 280_000,
  members: 300_000,
  museum: 520_000,
  press: 250_000,
  events: 430_000,
  history: 160_000,
};

export function headquartersUpgradeCost(key: HeadquartersUpgradeKey, level: number): number {
  return Math.round(HEADQUARTERS_UPGRADE_BASE_COST[key] * (1 + Math.max(0, level) * 0.52));
}

export function upgradeHeadquartersFacility(career: Career, key: HeadquartersUpgradeKey): Career {
  const current = career.headquartersUpgrades?.[key] ?? 0;
  if (current >= 5) return career;
  const cost = headquartersUpgradeCost(key, current);
  if (career.balance < cost) return career;
  const names: Record<HeadquartersUpgradeKey, string> = {
    board: 'diretoria', finance: 'departamento financeiro', meeting: 'sala de reuniões',
    legal: 'departamento jurídico', technology: 'tecnologia e TI', marketing: 'marketing',
    sponsors: 'patrocínios', commercial: 'departamento comercial', store: 'loja oficial',
    members: 'sócio-torcedor', museum: 'museu', press: 'centro de imprensa',
    events: 'auditório e eventos', history: 'arquivo histórico',
  };
  return {
    ...career,
    balance: career.balance - cost,
    headquartersUpgrades: { ...career.headquartersUpgrades, [key]: current + 1 },
    lastNews: `A sede recebeu investimento em ${names[key]}. Estrutura agora no nível ${current + 1}.`,
  };
}

export const STADIUM_UPGRADE_BASE_COST: Record<StadiumUpgradeKey, number> = {
  stands: 850_000,
  pitch: 320_000,
  roof: 1_100_000,
  lighting: 420_000,
  seats: 280_000,
  boxes: 900_000,
  scoreboard: 460_000,
  security: 240_000,
  turnstiles: 210_000,
  parking: 520_000,
  drainage: 360_000,
  irrigation: 260_000,
};

export function stadiumUpgradeCost(key: StadiumUpgradeKey, level: number): number {
  const base = STADIUM_UPGRADE_BASE_COST[key];
  return Math.round(base * (1 + Math.max(0, level) * 0.55));
}

export function upgradeStadiumFacility(career: Career, key: StadiumUpgradeKey): Career {
  const current = career.stadiumUpgrades?.[key] ?? 0;
  if (current >= 5) return career;
  const cost = stadiumUpgradeCost(key, current);
  if (career.balance < cost) return career;

  const upgrades = { ...career.stadiumUpgrades, [key]: current + 1 };
  const nextStadiumLevel = key === 'stands' ? Math.max(career.stadiumLevel, upgrades.stands - 1) : career.stadiumLevel;
  const names: Record<StadiumUpgradeKey, string> = {
    stands: 'arquibancadas',
    pitch: 'gramado',
    roof: 'cobertura',
    lighting: 'iluminação',
    seats: 'cadeiras',
    boxes: 'camarotes',
    scoreboard: 'placar eletrônico',
    security: 'segurança',
    turnstiles: 'catracas',
    parking: 'estacionamento',
    drainage: 'drenagem',
    irrigation: 'irrigação',
  };
  return {
    ...career,
    balance: career.balance - cost,
    stadiumLevel: nextStadiumLevel,
    stadiumUpgrades: upgrades,
    lastNews: `O estádio recebeu uma melhoria em ${names[key]}. Estrutura agora no nível ${current + 1}.`,
  };
}

export function upgradeStadium(career: Career): Career {
  return upgradeStadiumFacility(career, 'stands');
}

export function getRosterGroups(career: Career) {
  const starters = new Set(career.lineup.map((slot) => slot.playerId));
  const bench = new Set(career.benchIds);
  return {
    starters: career.lineup.map((slot) => ({ slot, player: career.players.find((item) => item.id === slot.playerId) })).filter((item): item is { slot: FormationSlot; player: Player } => Boolean(item.player)),
    bench: career.players.filter((player) => bench.has(player.id)),
    unavailable: career.players.filter((player) => player.status !== 'available'),
    reserves: career.players.filter((player) => !starters.has(player.id) && !bench.has(player.id) && player.status === 'available'),
  };
}
