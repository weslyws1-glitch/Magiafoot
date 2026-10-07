import { buildBestLineup, buildBench, CLUBS, FORMATIONS, getClub, getFormation, makeCareerMarket, makeRoster } from './data.ts';
import type { AdministrationDepartmentKey, AdministrativeProfessional, Career, Club, Fixture, FormationId, FormationSlot, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey, Intensity, LeagueResult, MatchEvent, MatchSession, MatchStats, Player, PlayerMarketStatus, PlayerSquadRole, PlayerTrainingFocus, PlayerTransferOffer, Position, SponsorshipContract, SponsorshipProposal, SponsorshipSlot, StadiumUpgradeKey, StandingRow, TrainingCenterUpgradeKey } from './types.ts';

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

export function seasonYear(season: number): number {
  return 2026 + Math.max(0, season - 1);
}

export function seasonRoundDate(season: number, roundIndex: number): Date {
  const year = seasonYear(season);
  const start = new Date(Date.UTC(year, 2, 1));
  const day = start.getUTCDay();
  const firstSundayOffset = (7 - day) % 7;
  const firstRound = new Date(Date.UTC(year, 2, 1 + firstSundayOffset));
  const date = new Date(firstRound);
  date.setUTCDate(firstRound.getUTCDate() + Math.max(0, roundIndex) * 7);
  return date;
}

export function formatSeasonRoundDate(season: number, roundIndex: number): string {
  return seasonRoundDate(season, roundIndex).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function assignSquadNumbers(players: Player[]): Player[] {
  const used = new Set<number>();
  return players.map((player, index) => {
    const existing = player.shirtNumber;
    if (typeof existing === 'number' && existing >= 1 && existing <= 99 && !used.has(existing)) {
      used.add(existing);
      return player;
    }
    const preferred =
      player.position === 'GOL' ? [1,12,22] :
      player.position === 'ZAG' ? [3,4,13,14,23] :
      player.position === 'LD' ? [2,22,32] :
      player.position === 'LE' ? [6,16,26] :
      player.position === 'VOL' ? [5,15,25] :
      player.position === 'MC' ? [8,18,28] :
      player.position === 'MEI' ? [10,20,30] :
      player.position === 'PE' ? [11,21,31] :
      player.position === 'PD' ? [7,17,27] :
      [9,19,29];
    const number = preferred.find((n) => !used.has(n))
      ?? Array.from({ length: 99 }, (_, i) => i + 1).find((n) => !used.has(n))
      ?? ((index % 99) + 1);
    used.add(number);
    return { ...player, shirtNumber: number };
  });
}

function defaultPlayerSkills(player: Player) {
  const seed = hash('skills-' + player.id);
  const jitter = (shift: number) => ((seed >> shift) % 9) - 4;
  const base = player.strength;
  const clampSkill = (value: number) => clamp(Math.round(value), 20, 99);
  const goalkeeper = player.position === 'GOL';

  return {
    technique: clampSkill(base + (goalkeeper ? -18 : jitter(1))),
    passing: clampSkill(base + (goalkeeper ? -14 : jitter(4))),
    shooting: clampSkill(base + (['ATA','PE','PD','MEI'].includes(player.position) ? 4 : ['ZAG','GOL'].includes(player.position) ? -14 : -3) + jitter(7)),
    defending: clampSkill(base + (['ZAG','LD','LE','VOL'].includes(player.position) ? 5 : ['ATA','PE','PD','GOL'].includes(player.position) ? -15 : -4) + jitter(10)),
    pace: clampSkill(base + (['PE','PD','LD','LE','ATA'].includes(player.position) ? 4 : goalkeeper ? -10 : 0) + jitter(13)),
    physical: clampSkill(base + (['ZAG','VOL','ATA'].includes(player.position) ? 4 : 0) + jitter(16)),
    goalkeeping: clampSkill(goalkeeper ? base + 6 + jitter(19) : 20 + Math.abs(jitter(19))),
  };
}

function positionalSkillOverall(player: Player): number {
  const s = player.skills ?? defaultPlayerSkills(player);
  switch (player.position) {
    case 'GOL': return s.goalkeeping * 0.68 + s.passing * 0.10 + s.physical * 0.12 + s.technique * 0.10;
    case 'ZAG': return s.defending * 0.42 + s.physical * 0.22 + s.passing * 0.12 + s.technique * 0.12 + s.pace * 0.12;
    case 'LD':
    case 'LE': return s.defending * 0.28 + s.pace * 0.24 + s.passing * 0.18 + s.physical * 0.15 + s.technique * 0.15;
    case 'VOL': return s.defending * 0.28 + s.passing * 0.24 + s.physical * 0.18 + s.technique * 0.18 + s.pace * 0.12;
    case 'MC': return s.passing * 0.30 + s.technique * 0.25 + s.physical * 0.14 + s.defending * 0.13 + s.shooting * 0.10 + s.pace * 0.08;
    case 'MEI': return s.technique * 0.29 + s.passing * 0.28 + s.shooting * 0.18 + s.pace * 0.12 + s.physical * 0.08 + s.defending * 0.05;
    case 'PE':
    case 'PD': return s.pace * 0.26 + s.technique * 0.25 + s.shooting * 0.19 + s.passing * 0.16 + s.physical * 0.09 + s.defending * 0.05;
    case 'ATA': return s.shooting * 0.34 + s.physical * 0.20 + s.technique * 0.18 + s.pace * 0.15 + s.passing * 0.08 + s.defending * 0.05;
    default: return player.strength;
  }
}

function initializePlayerCareerProfile(player: Player, season = 1, roundIndex = 0): Player {
  const seed = hash(player.id + '-' + player.name);
  const personalities = ['profissional','lider','ambicioso','tranquilo','temperamental','festeiro'] as const;
  const role: PlayerSquadRole =
    player.strength >= 78 ? 'estrela' :
    player.strength >= 72 ? 'titular' :
    player.age <= 21 ? 'jovem' :
    player.strength >= 66 ? 'rotacao' : 'reserva';
  const secondaryByPosition: Partial<Record<Position, Position[]>> = {
    LD: ['LE','ZAG'], LE: ['LD','ZAG'], ZAG: ['VOL'], VOL: ['MC','ZAG'],
    MC: ['VOL','MEI'], MEI: ['MC','PE','PD'], PE: ['PD','ATA'], PD: ['PE','ATA'], ATA: ['PE','PD'],
  };
  const contractRounds = 18 + (seed % 35);
  return {
    ...player,
    potential: player.potential ?? clamp(player.strength + (player.age <= 21 ? 8 + (seed % 8) : player.age <= 25 ? 4 + (seed % 5) : 1 + (seed % 3)), player.strength, 95),
    skills: player.skills ?? defaultPlayerSkills(player),
    secondaryPositions: player.secondaryPositions ?? (secondaryByPosition[player.position] ?? []).slice(0, 1 + (seed % 2)),
    personality: player.personality ?? personalities[seed % personalities.length],
    squadRole: player.squadRole ?? role,
    marketStatus: player.marketStatus ?? 'negociavel',
    trainingFocus: player.trainingFocus ?? 'equilibrado',
    contractEndRound: player.contractEndRound ?? roundIndex + contractRounds,
    releaseClause: player.releaseClause ?? Math.round(player.value * (1.45 + (seed % 55) / 100)),
    signingBonus: player.signingBonus ?? Math.round(player.wage * (2 + (seed % 5))),
    relationship: player.relationship ?? (58 + (seed % 25)),
    playingTimeSatisfaction: player.playingTimeSatisfaction ?? (role === 'estrela' || role === 'titular' ? 72 : 78),
    socialRisk: player.socialRisk ?? (8 + (seed % 55)),
    leadership: player.leadership ?? (25 + (seed % 70)),
    promisedMinutesUntilRound: player.promisedMinutesUntilRound ?? null,
    seasonStats: player.seasonStats ?? { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, ratingSum: 0, ratedMatches: 0 },
    careerEvents: player.careerEvents ?? [],
    conflictLevel: player.conflictLevel ?? 0,
    socialStatus: player.socialStatus ?? 'estavel',
    lastSocialEventRound: player.lastSocialEventRound ?? -99,
    loanedOutUntilRound: player.loanedOutUntilRound ?? null,
    loanClubName: player.loanClubName ?? null,
  };
}

export function createCareer(coachName: string, clubId: string): Career {
  const club = getClub(clubId);
  if (!club) throw new Error('Escolha um clube disponível.');
  const roster = assignSquadNumbers(makeRoster(club).map((player) => initializePlayerCareerProfile(player, 1, 0)));
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
    market: makeCareerMarket(club).map((player) => initializePlayerCareerProfile(player, 1, 0)),
    formationId,
    lineup,
    benchIds,
    captainId: captain?.id ?? lineup[0]?.playerId ?? '',
    tactics: { mentality: 'equilibrada', pressure: 'normal', tempo: 'normal' },
    boardTrust: 66,
    fanTrust: 60,
    legalWorkloadEvents: 0,
    balance: club.balance,
    stadiumLevel: 0,
    ticketPrice: club.ticketPrice,
    stadiumUpgrades: { stands: 1, pitch: 1, roof: 0, lighting: 1, seats: 1, boxes: 0, scoreboard: 0, security: 1, turnstiles: 1, parking: 0, drainage: 0, irrigation: 0 },
    headquartersUpgrades: { board: 1, finance: 1, meeting: 1, legal: 0, technology: 0, marketing: 1, sponsors: 0, commercial: 0, store: 0, members: 0, museum: 0, press: 1, events: 0, history: 1 },
    headquartersRevenuePricing: { store: 3, members: 3, events: 3 },
    headquartersImageAcquisition: { museum: 1, press: 1, history: 1 },
    headquartersInvestments: { marketing: 3, commercial: 3 },
    administrationStaff: { board: [], finance: [], legal: [] },
    trainingCenterUpgrades: { field: 1, medical: 1, physio: 1, gym: 1, analysis: 1 },
    sponsorships: { proposals: [], contracts: [], lastMarketRound: -1, history: [] },
    playerTransferOffers: [],
    results: [],
    seasonHistory: [],
    liveMatch: null,
    lastResult: null,
    lastNews: 'A diretoria deseja uma temporada competitiva. O primeiro passo é entrar em campo.',
    newsFeed: [{
      id: 'news-start',
      roundIndex: 0,
      category: 'club',
      title: 'Nova temporada começa',
      body: 'A diretoria deseja uma temporada competitiva e acompanha de perto os primeiros passos do novo trabalho.',
    }],
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
  const technicalOverall = positionalSkillOverall(player);
  return Math.round(technicalOverall * fitnessFactor * moraleFactor * positionFitMultiplier(player.position, position) * statusFactor);
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

function recoverBetweenRounds(players: Player[], currentRound: number, physioLevel = 1, gymLevel = 1): Player[] {
  return players.map((player) => {
    const expiredInjury = player.status === 'injured'
      && player.injuryUntilRound !== null
      && currentRound > player.injuryUntilRound;
    const expiredSuspension = player.status === 'suspended'
      && player.suspendedUntilRound !== null
      && currentRound > player.suspendedUntilRound;
    const expiredLoan = player.status === 'loaned'
      && typeof player.loanedOutUntilRound === 'number'
      && currentRound > player.loanedOutUntilRound;
    const recovery = 18 + physioLevel * 2 + Math.floor(gymLevel / 2);
    return {
      ...player,
      fitness: clamp(player.fitness + recovery, 15, 100),
      ...(expiredInjury ? { status: 'available' as const, injuryUntilRound: null } : {}),
      ...(expiredSuspension ? { status: 'available' as const, suspendedUntilRound: null } : {}),
      ...(expiredLoan ? { status: 'available' as const, loanedOutUntilRound: null, loanClubName: null } : {}),
    };
  });
}

export function startMatch(career: Career): Career {
  if (career.liveMatch) return career;
  const fixture = getCurrentFixture(career);
  if (!fixture) return career;
  const club = getClub(career.clubId);
  if (!club) return career;

  const recoveredPlayers = recoverBetweenRounds(career.players, career.roundIndex, career.trainingCenterUpgrades?.physio ?? 1, career.trainingCenterUpgrades?.gym ?? 1);
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
  const fieldCapacity = trainingFieldCapacity(career.trainingCenterUpgrades?.field ?? 1);
  const overcrowding = Math.max(0, recoveredPlayers.length - fieldCapacity);
  const adjustedPlayers = overcrowding > 0
    ? recoveredPlayers.map((player) => ({ ...player, fitness: clamp(player.fitness - overcrowding * 2, 10, 100) }))
    : recoveredPlayers;
  return { ...career, players: adjustedPlayers, lineup, benchIds, liveMatch: game };
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
  const medicalLevel = career.trainingCenterUpgrades?.medical ?? 1;
  const gymLevel = career.trainingCenterUpgrades?.gym ?? 1;
  const medicalProtection = Math.max(0.35, 1 - (medicalLevel - 1) * 0.055);
  const gymProtection = Math.max(0.72, 1 - (gymLevel - 1) * 0.02);
  const risk = isUser
    ? (candidate && candidate.fitness < 45 ? 0.00125 : 0.00032) * medicalProtection * gymProtection
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

export const TRAINING_CENTER_BASE_COST: Record<TrainingCenterUpgradeKey, number> = {
  field: 180000,
  medical: 240000,
  physio: 200000,
  gym: 210000,
  analysis: 160000,
};

export function trainingCenterUpgradeCost(key: TrainingCenterUpgradeKey, level: number): number {
  return Math.round(TRAINING_CENTER_BASE_COST[key] * (1 + Math.max(0, level - 1) * 0.58));
}

export function trainingFieldCapacity(level: number): number {
  const table = [0, 20, 23, 26, 29, 32, 35, 38, 41, 45, 50];
  return table[clamp(Math.round(level), 1, 10)] ?? 20;
}

export function trainingCenterNeedScore(career: Career, key: TrainingCenterUpgradeKey): number {
  const level = career.trainingCenterUpgrades?.[key] ?? 1;
  const recentGames = career.results
    .filter((result) => result.homeClubId === career.clubId || result.awayClubId === career.clubId)
    .slice(-8).length;
  const injured = career.players.filter((player) => player.status === 'injured').length;
  const tired = career.players.filter((player) => player.fitness < 55).length;
  const squadSize = career.players.length;

  if (key === 'field') {
    const capacity = trainingFieldCapacity(level);
    if (squadSize <= capacity - 3) return 12;
    if (squadSize <= capacity) return 38;
    return clamp(65 + (squadSize - capacity) * 8, 0, 100);
  }
  if (key === 'medical') return clamp(Math.round(15 + recentGames * 5 + injured * 14 + tired * 2 - level * 4), 0, 100);
  if (key === 'physio') return clamp(Math.round(12 + injured * 16 + tired * 4 + recentGames * 3 - level * 4), 0, 100);
  if (key === 'gym') return clamp(Math.round(10 + recentGames * 4 + tired * 5 + Math.max(0, squadSize - 22) * 2 - level * 3), 0, 100);

  const complexity = Math.max(0, career.season - 1) * 7 + Math.max(0, squadSize - 20) * 2 + recentGames * 2;
  return clamp(Math.round(10 + complexity - level * 4), 0, 100);
}

export function upgradeTrainingCenterFacility(career: Career, key: TrainingCenterUpgradeKey): Career {
  const current = career.trainingCenterUpgrades?.[key] ?? 1;
  if (current >= 10) return career;
  const cost = trainingCenterUpgradeCost(key, current);
  if (career.balance < cost) return career;

  const names: Record<TrainingCenterUpgradeKey, string> = {
    field: 'Campo de treinamento',
    medical: 'Departamento médico',
    physio: 'Fisioterapia',
    gym: 'Academia',
    analysis: 'Análise de desempenho',
  };

  return addCareerNews({
    ...career,
    balance: career.balance - cost,
    trainingCenterUpgrades: {
      ...(career.trainingCenterUpgrades ?? { field: 1, medical: 1, physio: 1, gym: 1, analysis: 1 }),
      [key]: current + 1,
    },
    lastNews: names[key] + ' do CT evoluiu para o nível ' + (current + 1) + '.',
  }, 'Centro de treinamento evolui', names[key] + ' chegou ao nível ' + (current + 1) + ' após investimento de ' + formatCurrency(cost) + '.', 'club');
}

export const ADMIN_DEPARTMENT_LABELS: Record<AdministrationDepartmentKey, string> = {
  board: 'Diretoria',
  finance: 'Departamento financeiro',
  legal: 'Departamento jurídico',
};

const ADMIN_ROLES: Record<AdministrationDepartmentKey, string[]> = {
  board: ['Diretor executivo', 'Gerente administrativo', 'Analista de gestão', 'Coordenador institucional'],
  finance: ['Controller', 'Analista financeiro', 'Contador', 'Planejador financeiro'],
  legal: ['Advogado desportivo', 'Analista jurídico', 'Especialista contratual', 'Compliance'],
};

const ADMIN_NAMES = [
  'Rafael Martins', 'Bruno Azevedo', 'Caio Nogueira', 'Marcos Tavares',
  'Felipe Andrade', 'Diego Moura', 'Lucas Barreto', 'Renato Freitas',
  'André Farias', 'Thiago Campos', 'Gustavo Prado', 'Vitor Sales',
  'Eduardo Lima', 'Henrique Duarte', 'Matheus Reis', 'Daniel Rocha',
];

export function administrationStaffCapacity(career: Career): number {
  const meeting = career.headquartersUpgrades?.meeting ?? 0;
  const technology = career.headquartersUpgrades?.technology ?? 0;
  return clamp(2 + meeting + technology, 2, 10);
}

export function activeAdministrativeStaff(career: Career, department: AdministrationDepartmentKey): AdministrativeProfessional[] {
  const people = career.administrationStaff?.[department] ?? [];
  return people.filter((person) => {
    const end = typeof person.contractEndRound === 'number'
      ? person.contractEndRound
      : person.hiredRound + (person.contractRounds ?? 12);
    return career.roundIndex < end;
  });
}

function recentClubForm(career: Career): { score: number; losses: number } {
  const recent = [...career.results]
    .filter((r) => r.homeClubId === career.clubId || r.awayClubId === career.clubId)
    .sort((a, b) => b.roundIndex - a.roundIndex)
    .slice(0, 6);
  if (!recent.length) return { score: 70, losses: 0 };
  let points = 0;
  let losses = 0;
  for (const r of recent) {
    const home = r.homeClubId === career.clubId;
    const gf = home ? r.homeGoals : r.awayGoals;
    const ga = home ? r.awayGoals : r.homeGoals;
    if (gf > ga) points += 3;
    else if (gf === ga) points += 1;
    else losses += 1;
  }
  return { score: Math.round((points / (recent.length * 3)) * 100), losses };
}

export function administrationNeedScore(career: Career, department: AdministrationDepartmentKey): number {
  const club = getClub(career.clubId);
  const form = recentClubForm(career);
  const satisfaction = (career.boardTrust + career.fanTrust) / 2;
  const stabilityRelief = satisfaction >= 80 && form.score >= 65 ? 20 : satisfaction >= 68 && form.score >= 50 ? 10 : 0;
  const crisisPressure = satisfaction < 45 ? 16 : satisfaction < 60 ? 7 : 0;
  const poorFormPressure = form.losses >= 4 ? 15 : form.losses >= 2 ? 7 : 0;
  const seasonGrowth = Math.max(0, career.season - 1) * 8;

  if (department === 'board') {
    const stadiumGrowth = Object.values(career.stadiumUpgrades ?? {}).reduce((sum, level) => sum + level, 0);
    const hqGrowth = Object.values(career.headquartersUpgrades ?? {}).reduce((sum, level) => sum + level, 0);
    const commercialComplexity = (career.sponsorships?.contracts?.length ?? 0) * 4 + (career.players.length > 28 ? 5 : 0);
    const clubGrowth = Math.round((stadiumGrowth + hqGrowth) * 1.15) + commercialComplexity + Math.max(0, (club?.rating ?? 60) - 68);
    return clamp(Math.round(8 + seasonGrowth + clubGrowth + crisisPressure + poorFormPressure - stabilityRelief), 0, 100);
  }

  if (department === 'finance') {
    const initialBalance = Math.max(1, club?.balance ?? 1_000_000);
    const balanceScale = career.balance / initialBalance;
    const wageBill = career.players.reduce((sum, player) => sum + player.wage, 0);
    const sponsorContracts = career.sponsorships?.contracts?.length ?? 0;
    const sponsorEarned = (career.sponsorships?.contracts ?? []).reduce((sum, contract) => sum + contract.totalEarned, 0);
    const moneyScale =
      (balanceScale >= 2 ? 28 : balanceScale >= 1.35 ? 18 : balanceScale >= 0.8 ? 10 : 4)
      + Math.min(20, Math.round(wageBill / 75_000))
      + sponsorContracts * 4
      + Math.min(12, Math.round(sponsorEarned / 500_000));
    return clamp(Math.round(5 + seasonGrowth + moneyScale + crisisPressure - stabilityRelief), 0, 100);
  }

  const activeContracts =
    career.players.length
    + (career.sponsorships?.contracts?.length ?? 0)
    + (career.sponsorships?.proposals?.length ?? 0);
  const suspendedPlayers = career.players.filter((player) => player.status === 'suspended').length;
  const troubledPlayers = career.players.filter((player) => player.morale < 35).length;
  const legalEvents = career.legalWorkloadEvents ?? 0;
  const contractPressure = Math.min(34, Math.round(activeContracts * 0.72));
  const disciplinePressure = Math.min(30, suspendedPlayers * 8 + troubledPlayers * 4 + legalEvents * 3);
  return clamp(Math.round(4 + seasonGrowth + contractPressure + disciplinePressure + crisisPressure + poorFormPressure - stabilityRelief), 0, 100);
}

export function administrationRequiredStaff(career: Career, department: AdministrationDepartmentKey): number {
  const need = administrationNeedScore(career, department);
  if (need < 22) return 0;
  if (need < 38) return 1;
  if (need < 52) return 2;
  if (need < 65) return 3;
  if (need < 76) return 4;
  if (need < 84) return 5;
  if (need < 90) return 6;
  if (need < 95) return 7;
  return 8 + (need >= 98 ? 2 : 1);
}

function administrativeCandidate(career: Career, department: AdministrationDepartmentKey): AdministrativeProfessional {
  const current = activeAdministrativeStaff(career, department).length;
  const seed = hash(`staff-${career.id}-${department}-${current}-${career.roundIndex}`);
  const quality = clamp(52 + (seed % 37), 50, 88);
  const salary = Math.round((18_000 + quality * 720) / 1000) * 1000;
  const contractRounds = 8 + ((seed >> 3) % 13);
  const hireCost = Math.round((salary * (1.4 + quality / 115)) / 1000) * 1000;
  const fireCost = Math.round((salary * (0.7 + contractRounds / 30)) / 1000) * 1000;
  const roles = ADMIN_ROLES[department];
  return {
    id: `staff-${department}-${career.roundIndex}-${current}-${seed}`,
    name: ADMIN_NAMES[seed % ADMIN_NAMES.length]!,
    department,
    role: roles[(seed >> 4) % roles.length]!,
    quality,
    salary,
    hireCost,
    fireCost,
    hiredRound: career.roundIndex,
    contractRounds,
    contractEndRound: career.roundIndex + contractRounds,
  };
}

export function previewAdministrativeCandidate(career: Career, department: AdministrationDepartmentKey): AdministrativeProfessional {
  return administrativeCandidate(career, department);
}

export function hireAdministrativeProfessional(career: Career, department: AdministrationDepartmentKey): Career {
  const staff = career.administrationStaff ?? { board: [], finance: [], legal: [] };
  const current = activeAdministrativeStaff(career, department);
  const capacity = administrationStaffCapacity(career);
  if (current.length >= capacity || current.length >= 10) return career;

  const candidate = administrativeCandidate(career, department);
  if (career.balance < candidate.hireCost) return career;

  const next: Career = {
    ...career,
    balance: career.balance - candidate.hireCost,
    administrationStaff: {
      ...staff,
      [department]: [...current, candidate],
    },
    lastNews: `${candidate.name} foi contratado para ${ADMIN_DEPARTMENT_LABELS[department]}.`,
  };
  return addCareerNews(next, 'Novo profissional na administração', `${candidate.name}, ${candidate.role}, assinou por ${candidate.contractRounds} jogos com ${ADMIN_DEPARTMENT_LABELS[department]}.`, 'club');
}

export function fireAdministrativeProfessional(career: Career, department: AdministrationDepartmentKey, professionalId: string): Career {
  const staff = career.administrationStaff ?? { board: [], finance: [], legal: [] };
  const current = activeAdministrativeStaff(career, department);
  const professional = current.find((item) => item.id === professionalId);
  if (!professional || career.balance < professional.fireCost) return career;

  const next: Career = {
    ...career,
    balance: career.balance - professional.fireCost,
    administrationStaff: {
      ...staff,
      [department]: current.filter((item) => item.id !== professionalId),
    },
    boardTrust: clamp(career.boardTrust - (department === 'board' ? 1 : 0), 0, 100),
    lastNews: `${professional.name} deixou ${ADMIN_DEPARTMENT_LABELS[department]}.`,
  };
  return addCareerNews(next, 'Mudança na administração', `${professional.name} foi desligado de ${ADMIN_DEPARTMENT_LABELS[department]}. Rescisão de ${formatCurrency(professional.fireCost)}.`, 'club');
}

export function administrationDepartmentEfficiency(career: Career, department: AdministrationDepartmentKey): number {
  const people = activeAdministrativeStaff(career, department);
  const required = administrationRequiredStaff(career, department);
  if (required === 0 && people.length === 0) return 100;
  if (!people.length) return required === 0 ? 100 : 20;
  const averageQuality = people.reduce((sum, person) => sum + person.quality, 0) / people.length;
  const staffing = required === 0 ? 1 : clamp(people.length / Math.max(1, required), 0.35, 1.15);
  const tech = career.headquartersUpgrades?.technology ?? 0;
  const meetings = career.headquartersUpgrades?.meeting ?? 0;
  return clamp(Math.round(averageQuality * staffing + tech * 3 + meetings * 2), 10, 100);
}

const SPONSOR_POOL = [
  { name: 'Aurora Energia', category: 'Energia', prestige: 74, fanImpact: 2, boardImpact: 3 },
  { name: 'Vitta Saúde', category: 'Saúde', prestige: 70, fanImpact: 4, boardImpact: 2 },
  { name: 'Nexa Telecom', category: 'Tecnologia', prestige: 78, fanImpact: 2, boardImpact: 4 },
  { name: 'MobiPay', category: 'Financeiro', prestige: 66, fanImpact: -2, boardImpact: 4 },
  { name: 'Brava Alimentos', category: 'Alimentos', prestige: 62, fanImpact: 3, boardImpact: 2 },
  { name: 'Titan Sports', category: 'Esportes', prestige: 82, fanImpact: 5, boardImpact: 3 },
  { name: 'Orbe Logística', category: 'Logística', prestige: 61, fanImpact: 0, boardImpact: 3 },
  { name: 'Pulse Mobile', category: 'Tecnologia', prestige: 72, fanImpact: 3, boardImpact: 3 },
  { name: 'Atlas Bank', category: 'Financeiro', prestige: 84, fanImpact: -1, boardImpact: 5 },
  { name: 'VerdeMax', category: 'Varejo', prestige: 68, fanImpact: 3, boardImpact: 2 },
];

function addCareerNews(career: Career, title: string, body: string, category: 'club' | 'match' | 'sponsor' | 'market' = 'sponsor'): Career {
  const item = {
    id: `news-${career.roundIndex}-${hash(title + body + String((career.newsFeed ?? []).length))}`,
    roundIndex: career.roundIndex,
    category,
    title,
    body,
  };
  return { ...career, newsFeed: [item, ...(career.newsFeed ?? [])].slice(0, 50) };
}

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
  return clamp(Math.round(form * 0.48 + career.boardTrust * 0.20 + career.fanTrust * 0.32), 10, 100);
}

export const SPONSORSHIP_PLACEMENT_LABELS: Record<SponsorshipSlot, string> = {
  principal: 'Peito do uniforme',
  sleeve: 'Manga do uniforme',
  back: 'Costas do uniforme',
  shorts: 'Calção',
  stadium: 'Placas e LED do estádio',
  training_center: 'Centro de treinamento',
  headquarters: 'Sede do clube',
  media_wall: 'Painel de entrevistas',
  institutional: 'Parceiro institucional',
};

export const SPONSORSHIP_PLACEMENT_FACTOR: Record<SponsorshipSlot, number> = {
  principal: 1.85,
  sleeve: 0.72,
  back: 0.98,
  shorts: 0.62,
  stadium: 1.15,
  training_center: 0.76,
  headquarters: 0.58,
  media_wall: 0.68,
  institutional: 0.52,
};

function sponsorshipSlotForIndex(index: number): SponsorshipSlot {
  const slots: SponsorshipSlot[] = ['principal','sleeve','back','shorts','stadium','training_center','headquarters','media_wall','institutional'];
  return slots[index % slots.length]!;
}

export function refreshSponsorshipMarket(career: Career, force = false): Career {
  const currentRound = career.roundIndex;
  if (!force && career.sponsorships?.lastMarketRound === currentRound) return career;

  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const score = sponsorshipMarketScore(career);
  const count = score >= 88 ? 5 : score >= 75 ? 4 : score >= 58 ? 3 : score >= 38 ? 2 : 1;
  const occupied = new Set(state.contracts.map((item) => item.slot));
  const slots = (['principal','sleeve','back','shorts','stadium','training_center','headquarters','media_wall','institutional'] as SponsorshipSlot[]).filter((slot) => !occupied.has(slot));
  const seed = hash(`sponsor-${career.clubId}-${career.season}-${currentRound}`);
  const pool = [...SPONSOR_POOL].sort((a, b) => ((hash(a.name) ^ seed) >>> 0) - ((hash(b.name) ^ seed) >>> 0));
  const proposals: SponsorshipProposal[] = [];

  for (let i = 0; i < count && slots.length > 0; i += 1) {
    const brand = pool[i % pool.length]!;
    // Em mercado muito aquecido, marcas podem disputar o mesmo espaço principal.
    const slot = score >= 82 && i === 1 && slots.includes('principal')
      ? 'principal'
      : (slots[i % slots.length] ?? sponsorshipSlotForIndex(i));
    const slotFactor = SPONSORSHIP_PLACEMENT_FACTOR[slot];
    const strength = 0.72 + score / 100;
    const base = Math.round((80_000 + brand.prestige * 4_900) * slotFactor * strength);
    const durationMatches = score >= 75 ? 10 + ((seed + i) % 7) : 6 + ((seed + i) % 6);
    const signingBonus = Math.round(base * (0.72 + ((seed >> (i + 1)) % 28) / 100));
    const perMatch = Math.round(base * 0.17);
    const winBonus = Math.round(base * 0.065);
    const qualificationBonus = Math.round(base * 0.42);
    const titleBonus = Math.round(base * 0.95);
    const attendanceTarget = 9000 + ((seed + i * 977) % 13000);
    const attendanceBonus = Math.round(base * 0.05);
    const expectedValue = signingBonus + perMatch * durationMatches + winBonus * Math.round(durationMatches * 0.45);
    proposals.push({
      id: `sp-${currentRound}-${i}-${brand.name.replace(/\s+/g, '-').toLowerCase()}`,
      sponsorName: brand.name,
      category: brand.category,
      slot,
      signingBonus,
      perMatch,
      winBonus,
      qualificationBonus,
      titleBonus,
      attendanceBonus,
      attendanceTarget,
      durationMatches,
      expiresRound: currentRound + (score >= 70 ? 2 : 1),
      fanImpact: brand.fanImpact,
      boardImpact: brand.boardImpact,
      prestige: brand.prestige,
      exitFanTrustBelow: brand.prestige >= 80 ? 24 : 18,
      exclusivityCategory: brand.prestige >= 72,
      expectedValue,
      negotiationRound: 0,
      note: score >= 78
        ? 'A marca quer aproveitar a boa fase e aceita pagar acima do padrão do mercado.'
        : score <= 38
          ? 'A empresa vê potencial, mas protege seu risco com valores mais conservadores.'
          : 'Oferta calculada pelo momento esportivo, força da torcida e exposição comercial.',
    });
  }

  let next: Career = {
    ...career,
    sponsorships: {
      proposals,
      contracts: state.contracts,
      lastMarketRound: currentRound,
      history: state.history,
    },
  };

  if (proposals.length >= 4) {
    next = addCareerNews(next, 'Marcas disputam espaço no clube', `${proposals.length} empresas abriram conversas após a valorização do clube. A concorrência pode elevar os contratos.`, 'market');
  } else if (proposals.length === 1 && score < 40) {
    next = addCareerNews(next, 'Mercado esfria para o clube', 'A fase esportiva reduziu o interesse comercial e apenas uma empresa apresentou oferta nesta rodada.', 'market');
  }
  return next;
}

export function negotiateSponsorshipProposal(
  career: Career,
  proposalId: string,
  requestedSlot?: SponsorshipSlot,
  requestedMultiplier = 1.10,
): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal || proposal.negotiationRound >= 2) return career;

  const targetSlot = requestedSlot ?? proposal.slot;
  if (state.contracts.some((item) => item.slot === targetSlot)) return career;

  const safeMultiplier = clamp(requestedMultiplier, 0.82, 1.30);
  const oldFactor = SPONSORSHIP_PLACEMENT_FACTOR[proposal.slot] ?? 1;
  const newFactor = SPONSORSHIP_PLACEMENT_FACTOR[targetSlot] ?? 1;
  const placementRatio = newFactor / Math.max(0.1, oldFactor);
  const score = sponsorshipMarketScore(career);

  const requestedIncrease = Math.max(0, safeMultiplier - 1);
  const relocationPenalty = targetSlot === proposal.slot ? 0 : Math.abs(newFactor - oldFactor) * 18;
  const chance = clamp(
    58 + score * 0.31
      - proposal.prestige * 0.18
      - proposal.negotiationRound * 17
      - requestedIncrease * 115
      - relocationPenalty,
    10,
    92,
  );
  const roll = (hash(`${proposal.id}-counter-${proposal.negotiationRound}-${targetSlot}-${safeMultiplier}-${career.roundIndex}`) % 100) + 1;

  if (roll <= chance) {
    const adjusted = clamp(placementRatio * safeMultiplier, 0.72, 1.42);
    const improved: SponsorshipProposal = {
      ...proposal,
      slot: targetSlot,
      signingBonus: Math.round(proposal.signingBonus * adjusted),
      perMatch: Math.round(proposal.perMatch * adjusted),
      winBonus: Math.round(proposal.winBonus * Math.max(0.85, adjusted)),
      qualificationBonus: Math.round(proposal.qualificationBonus * Math.max(0.85, adjusted)),
      titleBonus: Math.round(proposal.titleBonus * Math.max(0.85, adjusted)),
      attendanceBonus: Math.round(proposal.attendanceBonus * Math.max(0.85, adjusted)),
      expectedValue: Math.round(proposal.expectedValue * adjusted),
      negotiationRound: proposal.negotiationRound + 1,
      note: `A empresa aceitou a contraproposta para ${SPONSORSHIP_PLACEMENT_LABELS[targetSlot]} com valores revisados.`,
    };
    let next: Career = {
      ...career,
      sponsorships: {
        ...state,
        proposals: state.proposals.map((item) => item.id === proposalId ? improved : item),
        history: [`${proposal.sponsorName} aceitou mudar para ${SPONSORSHIP_PLACEMENT_LABELS[targetSlot]} e revisar valores.`, ...state.history].slice(0, 20),
      },
    };
    return addCareerNews(next, 'Contraproposta aceita', `${proposal.sponsorName} aceitou o novo espaço em ${SPONSORSHIP_PLACEMENT_LABELS[targetSlot]} e os valores foram recalculados.`);
  }

  const next: Career = {
    ...career,
    boardTrust: clamp(career.boardTrust - 1, 0, 100),
    sponsorships: {
      ...state,
      proposals: state.proposals.filter((item) => item.id !== proposalId),
      history: [`${proposal.sponsorName} rejeitou a contraproposta e encerrou as conversas.`, ...state.history].slice(0, 20),
    },
  };
  return addCareerNews(next, 'Fornecedor rejeita contraproposta', `${proposal.sponsorName} não aceitou a mudança para ${SPONSORSHIP_PLACEMENT_LABELS[targetSlot]} nos valores pedidos e saiu da negociação.`);
}

export function acceptSponsorshipProposal(career: Career, proposalId: string): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal || state.contracts.some((item) => item.slot === proposal.slot)) return career;
  if (proposal.exclusivityCategory && state.contracts.some((item) => item.category === proposal.category)) return career;

  const contract: SponsorshipContract = {
    ...proposal,
    acceptedRound: career.roundIndex,
    matchesRemaining: proposal.durationMatches,
    totalEarned: proposal.signingBonus,
    renewalOffered: false,
  };

  let next: Career = {
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
  return addCareerNews(next, 'Novo patrocinador anunciado', `${proposal.sponsorName} fechou contrato para ${SLOT_LABELS_ENGINE[proposal.slot]} por ${proposal.durationMatches} jogos. Luvas de ${formatCurrency(proposal.signingBonus)}.`);
}

const SLOT_LABELS_ENGINE: Record<SponsorshipSlot, string> = SPONSORSHIP_PLACEMENT_LABELS;

export function declineSponsorshipProposal(career: Career, proposalId: string): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal) return career;

  // A diretoria se irrita apenas quando o clube recusa uma oferta claramente muito boa.
  const marketScore = sponsorshipMarketScore(career);
  const strongOffer = proposal.expectedValue > 900_000 && proposal.prestige >= 75;
  const boardDelta = strongOffer ? -3 : 0;
  const next: Career = {
    ...career,
    boardTrust: clamp(career.boardTrust + boardDelta, 0, 100),
    sponsorships: {
      ...state,
      proposals: state.proposals.filter((item) => item.id !== proposalId),
      history: [`Proposta de ${proposal.sponsorName} recusada.`, ...state.history].slice(0, 20),
    },
  };
  return strongOffer
    ? addCareerNews(next, 'Diretoria questiona recusa', `A diretoria considerava a oferta de ${proposal.sponsorName} acima do mercado atual (${marketScore}/100) e não gostou da decisão.`)
    : next;
}

export function renewSponsorshipContract(career: Career, contractId: string): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  const contract = state.contracts.find((item) => item.id === contractId);
  if (!contract || contract.matchesRemaining > 2) return career;

  const score = sponsorshipMarketScore(career);
  const raise = score >= 75 ? 1.22 : score >= 55 ? 1.10 : 0.94;
  const extension = score >= 70 ? 12 : 8;
  const renewalBonus = Math.round(contract.signingBonus * 0.45 * raise);
  const updated = {
    ...contract,
    perMatch: Math.round(contract.perMatch * raise),
    winBonus: Math.round(contract.winBonus * Math.max(1, raise)),
    signingBonus: renewalBonus,
    durationMatches: extension,
    matchesRemaining: extension,
    totalEarned: contract.totalEarned + renewalBonus,
    acceptedRound: career.roundIndex,
    renewalOffered: false,
  };

  let next: Career = {
    ...career,
    balance: career.balance + renewalBonus,
    boardTrust: clamp(career.boardTrust + (raise >= 1.1 ? 2 : 0), 0, 100),
    fanTrust: clamp(career.fanTrust + (contract.fanImpact > 0 ? 1 : 0), 0, 100),
    sponsorships: {
      ...state,
      contracts: state.contracts.map((item) => item.id === contractId ? updated : item),
      history: [`${contract.sponsorName} renovou por mais ${extension} jogos.`, ...state.history].slice(0, 20),
    },
  };
  return addCareerNews(next, 'Patrocinador renova contrato', `${contract.sponsorName} renovou por ${extension} jogos com valor por partida de ${formatCurrency(updated.perMatch)}.`);
}

function settleSponsorshipsAfterMatch(career: Career, won: boolean): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  if (!state.contracts.length) return refreshSponsorshipMarket(career, true);

  let sponsorIncome = 0;
  const active: SponsorshipContract[] = [];
  const history = [...state.history];
  let next = career;
  const attendance = career.lastResult?.attendance ?? 0;
  const standings = calculateStandings(career.results);
  const position = standings.findIndex((row) => row.club.id === career.clubId) + 1;

  for (const contract of state.contracts) {
    // Cláusula de imagem: marcas podem romper se a relação com a torcida entrar em crise.
    if (career.fanTrust < contract.exitFanTrustBelow) {
      history.unshift(`${contract.sponsorName} rompeu o contrato por crise de imagem.`);
      next = addCareerNews(next, 'Patrocinador rompe contrato', `${contract.sponsorName} acionou cláusula de imagem após a satisfação da torcida cair para ${career.fanTrust}/100.`);
      continue;
    }

    let payment = contract.perMatch + (won ? contract.winBonus : 0);
    if (attendance >= contract.attendanceTarget) payment += contract.attendanceBonus;
    sponsorIncome += payment;
    const remaining = Math.max(0, contract.matchesRemaining - 1);

    if (remaining > 0) {
      active.push({ ...contract, matchesRemaining: remaining, totalEarned: contract.totalEarned + payment, renewalOffered: remaining <= 2 });
    } else {
      let finalBonus = 0;
      if (position === 1) finalBonus += contract.titleBonus;
      else if (position > 0 && position <= 4) finalBonus += contract.qualificationBonus;
      sponsorIncome += finalBonus;
      history.unshift(`Contrato com ${contract.sponsorName} chegou ao fim após ${contract.durationMatches} jogos.`);
      next = addCareerNews(next, 'Contrato de patrocínio encerrado', `${contract.sponsorName} concluiu seu vínculo. Total acumulado: ${formatCurrency(contract.totalEarned + payment + finalBonus)}.`);
    }
  }

  next = {
    ...next,
    balance: next.balance + sponsorIncome,
    sponsorships: { proposals: [], contracts: active, lastMarketRound: -1, history: history.slice(0, 20) },
  };
  return refreshSponsorshipMarket(next, true);
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

function appendPlayerEvent(player: Player, event: NonNullable<Player['careerEvents']>[number]): Player {
  return { ...player, careerEvents: [event, ...(player.careerEvents ?? [])].slice(0, 40) };
}

function processSquadSocialDynamics(career: Career): Career {
  let legalDelta = 0;
  const news: string[] = [];
  const players = career.players.map((player) => {
    let next = { ...player };
    const role = player.squadRole ?? 'rotacao';
    const unhappy = (player.playingTimeSatisfaction ?? 70) < 35 || player.morale < 35;
    const personalityRisk =
      player.personality === 'festeiro' ? 20 :
      player.personality === 'temperamental' ? 15 :
      player.personality === 'ambicioso' ? 7 : 0;
    const conflictPressure = unhappy ? 20 : 0;
    const risk = clamp((player.socialRisk ?? 20) + personalityRisk + conflictPressure + (player.conflictLevel ?? 0) * 8, 0, 100);
    const roll = hash(player.id + '-social-' + career.season + '-' + career.roundIndex) % 100;
    const enoughGap = career.roundIndex - (player.lastSocialEventRound ?? -99) >= 4;

    if (enoughGap && roll < Math.max(0, risk - 58)) {
      const severe = risk >= 78 || player.personality === 'temperamental';
      next = {
        ...next,
        morale: clamp(next.morale - (severe ? 8 : 4), 0, 100),
        relationship: clamp((next.relationship ?? 60) - (severe ? 7 : 3), 0, 100),
        conflictLevel: clamp((next.conflictLevel ?? 0) + (severe ? 2 : 1), 0, 5),
        socialStatus: severe ? 'conturbada' : 'atencao',
        lastSocialEventRound: career.roundIndex,
      };
      next = appendPlayerEvent(next, {
        id: 'social-' + player.id + '-' + career.season + '-' + career.roundIndex,
        roundIndex: career.roundIndex,
        season: career.season,
        type: 'social',
        title: severe ? 'Problema fora de campo' : 'Atenção fora de campo',
        detail: severe
          ? 'Um episódio fora de campo gerou desgaste interno e mais trabalho para o clube.'
          : 'A vida pessoal do atleta começou a exigir atenção do clube.',
      });
      if (severe) legalDelta += 1;
      news.push(player.name + (severe ? ' vive momento conturbado fora de campo.' : ' exige atenção fora de campo.'));
    } else {
      const calmRecovery = !unhappy && (player.relationship ?? 60) >= 55;
      if (calmRecovery) {
        next.conflictLevel = Math.max(0, (next.conflictLevel ?? 0) - 1);
        if ((next.conflictLevel ?? 0) === 0) next.socialStatus = 'estavel';
      }
    }

    if (unhappy && (role === 'estrela' || role === 'titular')) {
      next.conflictLevel = clamp((next.conflictLevel ?? 0) + 1, 0, 5);
      next = appendPlayerEvent(next, {
        id: 'conflict-' + player.id + '-' + career.season + '-' + career.roundIndex,
        roundIndex: career.roundIndex,
        season: career.season,
        type: 'discipline',
        title: 'Cobrança por espaço',
        detail: 'O jogador demonstrou insatisfação com a utilização no time e aumentou a pressão no vestiário.',
      });
    }

    return next;
  });

  let nextCareer = { ...career, players, legalWorkloadEvents: Math.max(0, (career.legalWorkloadEvents ?? 0) + legalDelta) };
  if (news.length) {
    nextCareer = addCareerNews(nextCareer, 'Vestiário exige atenção', news.slice(0, 2).join(' '), 'club');
  }
  return nextCareer;
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
  const finalLineupIds = new Set(game.userLineup.map((slot) => slot.playerId));
  const eventPlayerIds = new Set(game.events.filter((item) => item.playerId && item.clubId === career.clubId).map((item) => item.playerId as string));
  const appearedIds = new Set([...finalLineupIds, ...eventPlayerIds]);
  const updatedPlayers = career.players.map((player) => {
    const redEvent = game.events.find((item) => item.type === 'red' && item.playerId === player.id && item.clubId === career.clubId);
    const appeared = appearedIds.has(player.id);
    const started = finalLineupIds.has(player.id);
    const goals = game.events.filter((item) => item.type === 'goal' && item.playerId === player.id && item.clubId === career.clubId).length;
    const yellows = game.events.filter((item) => item.type === 'yellow' && item.playerId === player.id && item.clubId === career.clubId).length;
    const reds = redEvent ? 1 : 0;
    const role = player.squadRole ?? 'rotacao';
    const expectedToPlay = role === 'estrela' || role === 'titular';
    const playingDelta = appeared ? (started ? 4 : 2) : expectedToPlay ? -6 : -1;
    const promiseActive = typeof player.promisedMinutesUntilRound === 'number' && player.promisedMinutesUntilRound >= career.roundIndex;
    const promiseDelta = promiseActive ? (appeared ? 5 : -8) : 0;
    const moraleDelta = (userWon ? 4 : isDraw ? 1 : -3) + (appeared ? 1 : expectedToPlay ? -2 : 0);
    const baseStats = player.seasonStats ?? { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, ratingSum: 0, ratedMatches: 0 };
    const rating = appeared
      ? clamp(6.2 + goals * 1.1 - yellows * 0.25 - reds * 1.2 + (userWon ? 0.45 : isDraw ? 0.05 : -0.35), 3.5, 10)
      : 0;
    const trainingLevel = career.trainingCenterUpgrades?.field ?? 1;
    const canDevelop = appeared && (player.potential ?? player.strength) > player.strength;
    const developmentChance = canDevelop ? Math.min(0.32, 0.035 + trainingLevel * 0.014 + (player.age <= 21 ? 0.08 : player.age <= 25 ? 0.035 : 0)) : 0;
    const seedRoll = (hash(player.id + '-' + career.season + '-' + career.roundIndex) % 1000) / 1000;
    const strengthGain = seedRoll < developmentChance ? 1 : 0;
    let nextSkills = { ...(player.skills ?? defaultPlayerSkills(player)) };
    if (strengthGain > 0) {
      const focus = player.trainingFocus ?? 'equilibrado';
      const key =
        focus === 'fisico' ? 'physical' :
        focus === 'tecnica' ? 'technique' :
        focus === 'finalizacao' ? 'shooting' :
        focus === 'passe' ? 'passing' :
        focus === 'marcacao' ? 'defending' :
        (['ATA','PE','PD'].includes(player.position) ? 'shooting' :
          ['ZAG','LD','LE','VOL'].includes(player.position) ? 'defending' :
          player.position === 'GOL' ? 'goalkeeping' : 'technique');
      nextSkills = { ...nextSkills, [key]: clamp(nextSkills[key as keyof typeof nextSkills] + 1, 20, 99) };
    }
    const skillOverall = positionalSkillOverall({ ...player, skills: nextSkills });
    const nextStrength = clamp(Math.round(skillOverall), 1, player.potential ?? 95);
    const formValueFactor = appeared ? (rating - 6) * 0.025 : -0.005;
    const ageValueFactor = player.age <= 23 ? 0.008 : player.age >= 31 ? -0.012 : 0;
    const nextValue = Math.max(50000, Math.round(player.value * (1 + formValueFactor + ageValueFactor)));

    return {
      ...player,
      strength: nextStrength,
      skills: nextSkills,
      value: nextValue,
      morale: clamp(player.morale + moraleDelta + promiseDelta, 10, 100),
      playingTimeSatisfaction: clamp((player.playingTimeSatisfaction ?? 70) + playingDelta + promiseDelta, 0, 100),
      relationship: clamp((player.relationship ?? 60) + (promiseActive ? (appeared ? 2 : -5) : 0), 0, 100),
      seasonStats: appeared ? {
        appearances: baseStats.appearances + 1,
        starts: baseStats.starts + (started ? 1 : 0),
        minutes: baseStats.minutes + (started ? 90 : 30),
        goals: baseStats.goals + goals,
        assists: baseStats.assists,
        yellowCards: baseStats.yellowCards + yellows,
        redCards: baseStats.redCards + reds,
        ratingSum: baseStats.ratingSum + rating,
        ratedMatches: baseStats.ratedMatches + 1,
      } : baseStats,
      ...(redEvent ? { status: 'suspended' as const, suspendedUntilRound: game.fixture.roundIndex + 1 } : {}),
      ...(promiseActive && player.promisedMinutesUntilRound === career.roundIndex ? { promisedMinutesUntilRound: null } : {}),
    };
  });
  const revenue = gateIncome - wageBill;
  const leagueResult = { ...result, attendance };
  const resultText = isDraw ? 'Um ponto para cada lado.' : userWon ? 'Vitória! A torcida comemora.' : 'A diretoria espera uma reação na próxima rodada.';
  const redCardsThisMatch = game.events.filter((event) => event.type === 'red' && event.clubId === career.clubId).length;
  const lowMoraleCases = updatedPlayers.filter((player) => player.morale < 30).length;
  const playersWithHistory = updatedPlayers.map((player) => {
    const stats = player.seasonStats;
    const appeared = (stats?.appearances ?? 0) > ((career.players.find((p) => p.id === player.id)?.seasonStats?.appearances) ?? 0);
    if (!appeared) return player;
    return appendPlayerEvent(player, {
      id: 'match-' + player.id + '-' + career.season + '-' + career.roundIndex,
      roundIndex: career.roundIndex,
      season: career.season,
      type: 'match',
      title: 'Partida disputada',
      detail: 'Atuou na rodada ' + (career.roundIndex + 1) + ' da temporada.',
    });
  });
  const afterMatch: Career = {
    ...career,
    players: playersWithHistory,
    results: [...career.results.filter((item) => item.roundIndex !== game.fixture.roundIndex), ...newResults],
    roundIndex: career.roundIndex + 1,
    balance: Math.max(0, career.balance + revenue),
    boardTrust: clamp(career.boardTrust + trustDelta, 0, 100),
    fanTrust: clamp(career.fanTrust + (userWon ? 3 : isDraw ? 0 : -3), 0, 100),
    legalWorkloadEvents: Math.max(0, (career.legalWorkloadEvents ?? 0) + redCardsThisMatch + (lowMoraleCases > 0 ? 1 : 0)),
    liveMatch: null,
    lastResult: leagueResult,
    lastNews: `${resultText} Bilheteria de ${formatCurrency(gateIncome)}; salários de ${formatCurrency(wageBill)}.`,
  };
  return generatePlayerTransferOffers(processSquadSocialDynamics(settleSponsorshipsAfterMatch(afterMatch, userWon)));
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
    const fallbackAdministrationStaff: Career['administrationStaff'] = { board: [], finance: [], legal: [] };
    const fallbackTrainingCenter: Career['trainingCenterUpgrades'] = { field: 1, medical: 1, physio: 1, gym: 1, analysis: 1 };
    const fallbackSponsorships: Career['sponsorships'] = { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
    const rawSponsorships = (parsed as Career).sponsorships ?? fallbackSponsorships;
    const migratedProposals = Array.isArray(rawSponsorships.proposals)
      ? rawSponsorships.proposals.map((proposal) => ({
          ...proposal,
          qualificationBonus: typeof proposal.qualificationBonus === 'number' ? proposal.qualificationBonus : Math.round((proposal.perMatch ?? 0) * 2.5),
          titleBonus: typeof proposal.titleBonus === 'number' ? proposal.titleBonus : Math.round((proposal.perMatch ?? 0) * 5.5),
          attendanceBonus: typeof proposal.attendanceBonus === 'number' ? proposal.attendanceBonus : Math.round((proposal.perMatch ?? 0) * 0.35),
          attendanceTarget: typeof proposal.attendanceTarget === 'number' ? proposal.attendanceTarget : 12000,
          exitFanTrustBelow: typeof proposal.exitFanTrustBelow === 'number' ? proposal.exitFanTrustBelow : 20,
          exclusivityCategory: typeof proposal.exclusivityCategory === 'boolean' ? proposal.exclusivityCategory : false,
          expectedValue: typeof proposal.expectedValue === 'number'
            ? proposal.expectedValue
            : (proposal.signingBonus ?? 0) + (proposal.perMatch ?? 0) * (proposal.durationMatches ?? 8),
          negotiationRound: typeof proposal.negotiationRound === 'number' ? proposal.negotiationRound : 0,
        }))
      : [];
    const migratedContracts = Array.isArray(rawSponsorships.contracts)
      ? rawSponsorships.contracts.map((contract) => ({
          ...contract,
          qualificationBonus: typeof contract.qualificationBonus === 'number' ? contract.qualificationBonus : Math.round((contract.perMatch ?? 0) * 2.5),
          titleBonus: typeof contract.titleBonus === 'number' ? contract.titleBonus : Math.round((contract.perMatch ?? 0) * 5.5),
          attendanceBonus: typeof contract.attendanceBonus === 'number' ? contract.attendanceBonus : Math.round((contract.perMatch ?? 0) * 0.35),
          attendanceTarget: typeof contract.attendanceTarget === 'number' ? contract.attendanceTarget : 12000,
          exitFanTrustBelow: typeof contract.exitFanTrustBelow === 'number' ? contract.exitFanTrustBelow : 20,
          exclusivityCategory: typeof contract.exclusivityCategory === 'boolean' ? contract.exclusivityCategory : false,
          expectedValue: typeof contract.expectedValue === 'number'
            ? contract.expectedValue
            : (contract.signingBonus ?? 0) + (contract.perMatch ?? 0) * (contract.durationMatches ?? 8),
          negotiationRound: typeof contract.negotiationRound === 'number' ? contract.negotiationRound : 0,
          renewalOffered: typeof contract.renewalOffered === 'boolean' ? contract.renewalOffered : false,
        }))
      : [];
    const fallbackNewsFeed: Career['newsFeed'] = [];
    const fallbackUpgrades: Career['stadiumUpgrades'] = {
      stands: Math.max(1, Math.min(5, (parsed.stadiumLevel ?? 0) + 1)),
      pitch: 1, roof: 0, lighting: 1, seats: 1, boxes: 0,
      scoreboard: 0, security: 1, turnstiles: 1, parking: 0, drainage: 0, irrigation: 0,
    };
    return {
      ...(parsed as Career),
      players: assignSquadNumbers((parsed.players ?? []).map((player) => initializePlayerCareerProfile(player, parsed.season ?? 1, parsed.roundIndex ?? 0))),
      market: ((parsed as Career).market ?? []).map((player) => initializePlayerCareerProfile(player, parsed.season ?? 1, parsed.roundIndex ?? 0)),
      ticketPrice: typeof (parsed as Career).ticketPrice === 'number' ? (parsed as Career).ticketPrice : (getClub(parsed.clubId)?.ticketPrice ?? 25),
      stadiumUpgrades: { ...fallbackUpgrades, ...((parsed as Career).stadiumUpgrades ?? {}) },
      headquartersUpgrades: { ...fallbackHeadquarters, ...((parsed as Career).headquartersUpgrades ?? {}) },
      headquartersRevenuePricing: { ...fallbackHeadquartersRevenuePricing, ...((parsed as Career).headquartersRevenuePricing ?? {}) },
      headquartersImageAcquisition: { ...fallbackHeadquartersImageAcquisition, ...((parsed as Career).headquartersImageAcquisition ?? {}) },
      headquartersInvestments: { ...fallbackHeadquartersInvestments, ...((parsed as Career).headquartersInvestments ?? {}) },
      trainingCenterUpgrades: { ...fallbackTrainingCenter, ...((parsed as Career).trainingCenterUpgrades ?? {}) },
      administrationStaff: {
        board: (((parsed as Career).administrationStaff?.board ?? [])).map((person) => ({
          ...person,
          contractRounds: typeof person.contractRounds === 'number' ? person.contractRounds : 12,
          contractEndRound: typeof person.contractEndRound === 'number' ? person.contractEndRound : (person.hiredRound ?? 0) + 12,
        })),
        finance: (((parsed as Career).administrationStaff?.finance ?? [])).map((person) => ({
          ...person,
          contractRounds: typeof person.contractRounds === 'number' ? person.contractRounds : 12,
          contractEndRound: typeof person.contractEndRound === 'number' ? person.contractEndRound : (person.hiredRound ?? 0) + 12,
        })),
        legal: (((parsed as Career).administrationStaff?.legal ?? [])).map((person) => ({
          ...person,
          contractRounds: typeof person.contractRounds === 'number' ? person.contractRounds : 12,
          contractEndRound: typeof person.contractEndRound === 'number' ? person.contractEndRound : (person.hiredRound ?? 0) + 12,
        })),
      },
      legalWorkloadEvents: typeof (parsed as Career).legalWorkloadEvents === 'number' ? (parsed as Career).legalWorkloadEvents : 0,
      fanTrust: typeof (parsed as Career).fanTrust === 'number' ? (parsed as Career).fanTrust : 60,
      sponsorships: {
        ...fallbackSponsorships,
        ...rawSponsorships,
        proposals: migratedProposals,
        contracts: migratedContracts,
        history: Array.isArray(rawSponsorships.history) ? rawSponsorships.history : [],
      },
      playerTransferOffers: Array.isArray((parsed as Career).playerTransferOffers) ? (parsed as Career).playerTransferOffers : [],
      newsFeed: Array.isArray((parsed as Career).newsFeed) ? (parsed as Career).newsFeed : fallbackNewsFeed,
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
    players: [...career.players, initializePlayerCareerProfile({ ...player, status: 'available', fitness: 90, morale: 70 }, career.season, career.roundIndex)],
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

export function setPlayerMarketStatus(career: Career, playerId: string, status: PlayerMarketStatus): Career {
  return {
    ...career,
    players: career.players.map((player) => player.id === playerId ? { ...player, marketStatus: status } : player),
  };
}

export function setPlayerSquadRole(career: Career, playerId: string, role: PlayerSquadRole): Career {
  return {
    ...career,
    players: career.players.map((player) => player.id === playerId ? { ...player, squadRole: role } : player),
  };
}

export function setPlayerTrainingFocus(career: Career, playerId: string, focus: PlayerTrainingFocus): Career {
  return {
    ...career,
    players: career.players.map((player) => player.id === playerId ? { ...player, trainingFocus: focus } : player),
  };
}

export function renewPlayerContract(career: Career, playerId: string, seasons = 2): Career {
  const player = career.players.find((item) => item.id === playerId);
  if (!player) return career;
  const signingCost = Math.max(player.signingBonus ?? player.wage * 3, Math.round(player.wage * (2.5 + seasons * 0.7)));
  if (career.balance < signingCost) return career;
  const newWage = Math.round(player.wage * (1.06 + seasons * 0.025));
  const extension = LEAGUE_ROUNDS * seasons;
  const currentEnd = player.contractEndRound ?? career.roundIndex + LEAGUE_ROUNDS;
  return addCareerNews({
    ...career,
    balance: career.balance - signingCost,
    players: career.players.map((item) => item.id === playerId ? {
      ...item,
      wage: newWage,
      contractEndRound: Math.max(currentEnd, career.roundIndex) + extension,
      relationship: clamp((item.relationship ?? 60) + 6, 0, 100),
      morale: clamp(item.morale + 5, 0, 100),
      careerEvents: [{
        id: 'contract-' + item.id + '-' + career.season + '-' + career.roundIndex,
        roundIndex: career.roundIndex,
        season: career.season,
        type: 'contract' as const,
        title: 'Contrato renovado',
        detail: 'Renovação por mais ' + seasons + ' temporada(s).',
      }, ...(item.careerEvents ?? [])].slice(0, 40),
    } : item),
    lastNews: player.name + ' renovou contrato com o clube.',
  }, 'Contrato renovado', player.name + ' renovou por mais ' + seasons + ' temporada(s).', 'club');
}

export function promisePlayerMinutes(career: Career, playerId: string): Career {
  const player = career.players.find((item) => item.id === playerId);
  if (!player) return career;
  return {
    ...career,
    players: career.players.map((item) => item.id === playerId ? {
      ...item,
      promisedMinutesUntilRound: career.roundIndex + 5,
      relationship: clamp((item.relationship ?? 60) + 3, 0, 100),
      careerEvents: [{
        id: 'promise-' + item.id + '-' + career.season + '-' + career.roundIndex,
        roundIndex: career.roundIndex,
        season: career.season,
        type: 'promise' as const,
        title: 'Promessa de minutos',
        detail: 'O treinador prometeu mais oportunidades nas próximas rodadas.',
      }, ...(item.careerEvents ?? [])].slice(0, 40),
    } : item),
    lastNews: 'Você prometeu mais minutos a ' + player.name + '.',
  };
}

const TRANSFER_INTEREST_CLUBS = [
  'Atlético Serrano', 'União Portuária', 'Estrela do Norte', 'Real do Vale',
  'Ferroviário Azul', 'Nacional da Serra', 'Sporting Litoral', 'Juventude Imperial',
];

function generatePlayerTransferOffers(career: Career): Career {
  const existing = (career.playerTransferOffers ?? []).filter((offer) => offer.expiresRound >= career.roundIndex);
  const offeredPlayers = new Set(existing.map((offer) => offer.playerId));
  const candidates = career.players.filter((player) =>
    player.status === 'available'
    && !offeredPlayers.has(player.id)
    && player.marketStatus !== 'inegociavel'
    && player.marketStatus !== undefined
  );

  const generated: PlayerTransferOffer[] = [];
  for (const player of candidates) {
    const seed = hash('offer-' + career.season + '-' + career.roundIndex + '-' + player.id);
    const interestRoll = seed % 100;
    const listedBoost = player.marketStatus === 'disponivel' ? 24 : player.marketStatus === 'emprestimo' ? 30 : 8;
    if (interestRoll >= 9 + listedBoost) continue;

    const prefersLoan = player.marketStatus === 'emprestimo' || (player.age <= 22 && (seed % 3 === 0));
    const type: PlayerTransferOffer['type'] = prefersLoan ? 'loan' : 'sale';
    const clubName = TRANSFER_INTEREST_CLUBS[(seed >> 5) % TRANSFER_INTEREST_CLUBS.length]!;
    const amount = type === 'sale'
      ? Math.round(player.value * (0.72 + ((seed >> 7) % 41) / 100))
      : Math.round(player.value * (0.05 + ((seed >> 7) % 8) / 100));
    const durationRounds = type === 'loan' ? 8 + ((seed >> 11) % 11) : 0;

    generated.push({
      id: 'offer-' + player.id + '-' + career.season + '-' + career.roundIndex,
      playerId: player.id,
      clubName,
      type,
      amount,
      durationRounds,
      expiresRound: career.roundIndex + 2,
    });
    if (generated.length >= 3) break;
  }

  if (!generated.length) return { ...career, playerTransferOffers: existing };

  return addCareerNews({
    ...career,
    playerTransferOffers: [...existing, ...generated],
  }, 'Mercado procura jogadores do clube', generated.length === 1
    ? 'Chegou uma nova proposta por um jogador do elenco.'
    : 'Chegaram ' + generated.length + ' novas propostas por jogadores do elenco.', 'market');
}

export function acceptPlayerTransferOffer(career: Career, offerId: string): Career {
  const offers = career.playerTransferOffers ?? [];
  const offer = offers.find((item) => item.id === offerId);
  if (!offer) return career;
  const player = career.players.find((item) => item.id === offer.playerId);
  if (!player) return career;

  const remainingOffers = offers.filter((item) => item.id !== offerId && item.playerId !== player.id);

  if (offer.type === 'sale') {
    if (career.players.length <= 18) return career;
    const players = career.players.filter((item) => item.id !== player.id);
    const available = players.filter((item) => item.status === 'available');
    const lineup = buildBestLineup(available, career.formationId);
    const benchIds = buildBench(available, lineup);
    return addCareerNews({
      ...career,
      balance: career.balance + offer.amount,
      players,
      lineup,
      benchIds,
      captainId: lineup.some((slot) => slot.playerId === career.captainId) ? career.captainId : (lineup[0]?.playerId ?? ''),
      playerTransferOffers: remainingOffers,
      lastNews: player.name + ' foi vendido ao ' + offer.clubName + ' por ' + formatCurrency(offer.amount) + '.',
    }, 'Transferência concluída', player.name + ' foi vendido ao ' + offer.clubName + ' por ' + formatCurrency(offer.amount) + '.', 'market');
  }

  const loanedPlayers = career.players.map((item) => item.id === player.id ? appendPlayerEvent({
    ...item,
    status: 'loaned' as const,
    loanedOutUntilRound: career.roundIndex + offer.durationRounds,
    loanClubName: offer.clubName,
    morale: clamp(item.morale + 2, 0, 100),
  }, {
    id: 'loan-' + item.id + '-' + career.season + '-' + career.roundIndex,
    roundIndex: career.roundIndex,
    season: career.season,
    type: 'transfer',
    title: 'Empréstimo acertado',
    detail: 'Emprestado ao ' + offer.clubName + ' por ' + offer.durationRounds + ' rodadas.',
  }) : item);

  const availableAfterLoan = loanedPlayers.filter((item) => item.status === 'available');
  const lineupAfterLoan = buildBestLineup(availableAfterLoan, career.formationId);
  const benchAfterLoan = buildBench(availableAfterLoan, lineupAfterLoan);
  return addCareerNews({
    ...career,
    balance: career.balance + offer.amount,
    players: loanedPlayers,
    lineup: lineupAfterLoan,
    benchIds: benchAfterLoan,
    captainId: lineupAfterLoan.some((slot) => slot.playerId === career.captainId) ? career.captainId : (lineupAfterLoan[0]?.playerId ?? ''),
    playerTransferOffers: remainingOffers,
    lastNews: player.name + ' foi emprestado ao ' + offer.clubName + '.',
  }, 'Jogador emprestado', player.name + ' saiu por empréstimo para o ' + offer.clubName + ' por ' + offer.durationRounds + ' rodadas.', 'market');
}

export function declinePlayerTransferOffer(career: Career, offerId: string): Career {
  const offer = (career.playerTransferOffers ?? []).find((item) => item.id === offerId);
  if (!offer) return career;
  const player = career.players.find((item) => item.id === offer.playerId);
  return {
    ...career,
    playerTransferOffers: (career.playerTransferOffers ?? []).filter((item) => item.id !== offerId),
    players: career.players.map((item) => item.id === offer.playerId && item.marketStatus === 'disponivel'
      ? { ...item, morale: clamp(item.morale - 2, 0, 100) }
      : item),
    lastNews: player ? 'Proposta por ' + player.name + ' foi recusada.' : career.lastNews,
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
