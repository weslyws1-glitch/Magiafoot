import { buildBestLineup, buildBench, CLUBS, FORMATIONS, clubsForDivision, getClub, getDivision, getFormation, makeCareerMarket, makeRoster } from './data.ts';
import type { AdministrationDepartmentKey, AdministrativeProfessional, Career, Club, CurrencyCode, FinanceState, FinanceTransaction, Fixture, FormationId, FormationSlot, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey, Intensity, LeagueResult, MatchEvent, MatchSession, MatchStats, Player, PlayerMarketStatus, PlayerSquadRole, PlayerTrainingFocus, PlayerTransferOffer, Position, SponsorshipContract, SponsorshipProposal, SponsorshipSlot, StadiumUpgradeKey, StandingRow, TrainingCenterUpgradeKey } from './types.ts';

export const POSITION_LABELS: Record<Position, string> = {
  GOL: 'GOL', ZAG: 'ZAG', LE: 'LAT', LD: 'LAT', VOL: 'VOL',
  MC: 'MEI', MEI: 'MEI', PE: 'PON', PD: 'PON', ATA: 'ATA',
};

export const EMPTY_STATS: MatchStats = {
  shots: 0, shotsOnTarget: 0, bigChances: 0, saves: 0, fouls: 0, offsides: 0, corners: 0,
  yellowCards: 0, redCards: 0, injuries: 0, penalties: 0, handballs: 0, advantages: 0,
  varReviews: 0, throwIns: 0, goalKicks: 0, freeKicks: 0, passes: 0, completedPasses: 0,
  possessionTicks: 0, xg: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const DISPLAY_CURRENCY_RATE: Record<CurrencyCode, number> = { BRL: 1, USD: 0.18, EUR: 0.155 };
let activeDisplayCurrency: CurrencyCode = 'BRL';

export function setActiveDisplayCurrency(currency: CurrencyCode) {
  activeDisplayCurrency = currency;
}

export function convertCurrency(amountInBRL: number, currency: CurrencyCode = activeDisplayCurrency): number {
  return amountInBRL * DISPLAY_CURRENCY_RATE[currency];
}

function makeFinanceState(club: Club, players: Player[]): FinanceState {
  const weeklyWages = players.reduce((sum, player) => sum + player.wage, 0);
  return {
    transferBudget: Math.round(club.balance * 0.42),
    weeklyWageBudget: Math.max(Math.round(weeklyWages * 1.18), weeklyWages + 25_000),
    debt: 0,
    seasonTransferSpend: 0,
    seasonTransferIncome: 0,
    seasonMatchdayIncome: 0,
    seasonWagesPaid: 0,
    seasonSponsorshipIncome: 0,
    ledger: [],
  };
}

function addFinanceEntry(career: Career, entry: Omit<FinanceTransaction, 'id' | 'season' | 'roundIndex' | 'date'>): Career {
  const finance = career.finance;
  const row: FinanceTransaction = {
    id: 'fin-' + career.season + '-' + career.roundIndex + '-' + Date.now() + '-' + (finance?.ledger?.length ?? 0),
    season: career.season,
    roundIndex: career.roundIndex,
    date: new Date().toISOString(),
    ...entry,
  };
  return {
    ...career,
    finance: {
      ...finance,
      ledger: [row, ...(finance?.ledger ?? [])].slice(0, 80),
    },
  };
}

const newStats = (): MatchStats => ({ ...EMPTY_STATS });
const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 29);
const gameRandom = (game: MatchSession) => {
  game.randomSeed = (Math.imul(game.randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
  return game.randomSeed / 4_294_967_296;
};

function firstLeagueSaturday(season: number): Date {
  const year = seasonYear(season);
  const start = new Date(Date.UTC(year, 2, 1));
  const offset = (6 - start.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, 2, 1 + offset));
}

export function seasonRoundDate(season: number, roundIndex: number): Date {
  const firstSaturday = firstLeagueSaturday(season);
  const date = new Date(firstSaturday);
  date.setUTCDate(firstSaturday.getUTCDate() + Math.max(0, roundIndex) * 7);
  return date;
}

function leagueFixtureDate(season: number, roundIndex: number, pairIndex: number): Date {
  const saturday = seasonRoundDate(season, roundIndex);
  const date = new Date(saturday);
  const playSunday = (roundIndex + pairIndex + season) % 2 === 1;
  if (playSunday) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function recentVenueStreak(history: Array<'H' | 'A'>, next: 'H' | 'A'): number {
  let streak = 1;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index] !== next) break;
    streak += 1;
  }
  return streak;
}

export function makeLeagueSchedule(
  season = 1,
  divisionId = 'br-3',
  userClubId?: string,
  explicitClubIds?: string[],
): Fixture[] {
  const division = getDivision(divisionId);
  const sourceClubs = explicitClubIds?.length
    ? explicitClubIds.map((id) => getClub(id)).filter((club): club is Club => Boolean(club))
    : clubsForDivision(divisionId, userClubId);

  const baseClubs = sourceClubs.map((club) => club.id);
  if (baseClubs.length < 2) return [];

  const hasBye = baseClubs.length % 2 === 1;
  const shift = baseClubs.length ? ((season - 1) * 3) % baseClubs.length : 0;
  const rotated = [...baseClubs.slice(shift), ...baseClubs.slice(0, shift)];
  const ring = season % 2 === 0 ? [...rotated].reverse() : [...rotated];
  if (hasBye) ring.push('__BYE__');

  const roundPairings: Array<Array<[string, string]>> = [];
  const firstHalfRounds = Math.max(0, ring.length - 1);

  for (let roundIndex = 0; roundIndex < firstHalfRounds; roundIndex += 1) {
    const pairs: Array<[string, string]> = [];
    for (let pairIndex = 0; pairIndex < ring.length / 2; pairIndex += 1) {
      const left = ring[pairIndex];
      const right = ring[ring.length - 1 - pairIndex];
      if (left && right && left !== '__BYE__' && right !== '__BYE__') pairs.push([left, right]);
    }
    roundPairings.push(pairs);
    const last = ring.pop();
    if (last) ring.splice(1, 0, last);
  }

  const venueHistory = new Map<string, Array<'H' | 'A'>>();
  for (const club of baseClubs) venueHistory.set(club, []);

  const firstHalf: Fixture[][] = roundPairings.map((pairs, roundIndex) => {
    const optionCount = Math.min(1 << Math.min(pairs.length, 20), 1_048_576);
    let bestMask = 0;
    let bestPenalty = Number.POSITIVE_INFINITY;

    for (let mask = 0; mask < optionCount; mask += 1) {
      let penalty = 0;
      for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
        const pair = pairs[pairIndex]!;
        const flip = ((mask >> pairIndex) & 1) === 1;
        const homeClubId = flip ? pair[1] : pair[0];
        const awayClubId = flip ? pair[0] : pair[1];

        for (const [clubId, venue] of [[homeClubId, 'H'], [awayClubId, 'A']] as const) {
          const history = venueHistory.get(clubId) ?? [];
          const streak = recentVenueStreak(history, venue);
          if (streak > 2) penalty += 1000 * (streak - 2);
          if (history[history.length - 1] === venue) penalty += 2;
          const homeCount = history.filter((item) => item === 'H').length + (venue === 'H' ? 1 : 0);
          const awayCount = history.length + 1 - homeCount;
          penalty += Math.pow(homeCount - awayCount, 2) * 0.35;
        }
      }
      penalty += (hash('schedule-' + divisionId + '-' + season + '-' + roundIndex + '-' + mask) % 1000) / 1_000_000;
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMask = mask;
      }
    }

    return pairs.map((pair, pairIndex) => {
      const flip = ((bestMask >> pairIndex) & 1) === 1;
      const homeClubId = flip ? pair[1] : pair[0];
      const awayClubId = flip ? pair[0] : pair[1];
      venueHistory.get(homeClubId)?.push('H');
      venueHistory.get(awayClubId)?.push('A');
      return {
        id: divisionId + '-liga-' + (roundIndex + 1) + '-' + (pairIndex + 1),
        roundIndex,
        homeClubId,
        awayClubId,
        competition: 'league' as const,
        scheduledDate: isoDate(leagueFixtureDate(season, roundIndex, pairIndex)),
      };
    });
  });

  const legs = division?.legs ?? 2;
  if (legs === 1) return firstHalf.flat();

  const secondHalf = [...firstHalf].reverse().map((roundFixtures, secondIndex) => {
    const roundIndex = firstHalfRounds + secondIndex;
    return roundFixtures.map((fixture, pairIndex) => ({
      id: divisionId + '-liga-' + (roundIndex + 1) + '-' + (pairIndex + 1),
      roundIndex,
      homeClubId: fixture.awayClubId,
      awayClubId: fixture.homeClubId,
      competition: 'league' as const,
      scheduledDate: isoDate(leagueFixtureDate(season, roundIndex, pairIndex)),
    }));
  });

  return [...firstHalf, ...secondHalf].flat();
}

export const LEAGUE_ROUNDS = 38;
export const LEAGUE_FIXTURES = makeLeagueSchedule(1, 'br-3');

export function getLeagueRoundCount(career: Pick<Career, 'leagueFixtures' | 'divisionId' | 'clubId' | 'leagueClubIds' | 'season'>): number {
  const fixtures = career.leagueFixtures?.length
    ? career.leagueFixtures
    : makeLeagueSchedule(career.season, career.divisionId, career.clubId, career.leagueClubIds);
  if (!fixtures.length) return 0;
  return Math.max(...fixtures.map((fixture) => fixture.roundIndex)) + 1;
}

export function getCareerDivision(career: Pick<Career, 'divisionId'>) {
  return getDivision(career.divisionId);
}

export function seasonYear(season: number): number {
  return 2026 + Math.max(0, season - 1);
}

export function fixtureDate(fixture: Fixture, season: number): Date {
  if (fixture.scheduledDate) return new Date(fixture.scheduledDate + 'T12:00:00Z');
  return seasonRoundDate(season, fixture.roundIndex);
}

export function formatFixtureDate(fixture: Fixture, season: number): string {
  return fixtureDate(fixture, season).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export function cupMidweekDate(season: number, leagueRoundIndex: number, slotSeed = 0): Date {
  const weekend = seasonRoundDate(season, leagueRoundIndex);
  const date = new Date(weekend);
  date.setUTCDate(weekend.getUTCDate() - (slotSeed % 2 === 0 ? 3 : 2));
  return date;
}

function balanceClubVenueSequence(
  schedule: Fixture[],
  clubId: string,
  startRound = 0,
  completedVenues: Array<'H' | 'A'> = [],
  protectedFixtureId?: string,
): Fixture[] {
  const pattern: Array<'H' | 'A'> = ['H','A','A','H','A','H','H','A'];
  const offset = hash('venue-' + clubId) % pattern.length;
  const venues: Array<'H' | 'A'> = [...completedVenues];
  const nextSchedule = schedule.map((fixture) => ({ ...fixture }));

  const totalRounds = nextSchedule.length ? Math.max(...nextSchedule.map((fixture) => fixture.roundIndex)) + 1 : 0;
  for (let roundIndex = startRound; roundIndex < totalRounds; roundIndex += 1) {
    const fixtureIndex = nextSchedule.findIndex((fixture) =>
      fixture.roundIndex === roundIndex
      && (fixture.homeClubId === clubId || fixture.awayClubId === clubId)
    );
    if (fixtureIndex < 0) continue;

    const fixture = nextSchedule[fixtureIndex]!;
    const currentVenue: 'H' | 'A' = fixture.homeClubId === clubId ? 'H' : 'A';
    let desired = pattern[(roundIndex + offset) % pattern.length]!;
    const last = venues[venues.length - 1];
    const previous = venues[venues.length - 2];

    if (last === desired && previous === desired) desired = desired === 'H' ? 'A' : 'H';
    if (last === desired && roundIndex % 3 === 0) desired = desired === 'H' ? 'A' : 'H';

    if (fixture.id !== protectedFixtureId && currentVenue !== desired) {
      nextSchedule[fixtureIndex] = {
        ...fixture,
        homeClubId: fixture.awayClubId,
        awayClubId: fixture.homeClubId,
      };
      venues.push(desired);
    } else {
      venues.push(currentVenue);
    }
  }

  return nextSchedule;
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
  const jitter = (shift: number) => ((seed >>> shift) % 9) - 4;
  const base = player.strength;
  const clampSkill = (value: number) => clamp(Math.round(value), 20, 99);
  const goalkeeper = player.position === 'GOL';

  const goalkeeping = clampSkill(goalkeeper ? base + 6 + jitter(19) : 20 + Math.abs(jitter(19)));
  return {
    technique: clampSkill(base + (goalkeeper ? -18 : jitter(1))),
    passing: clampSkill(base + (goalkeeper ? -14 : jitter(4))),
    shooting: clampSkill(base + (['ATA','PE','PD','MEI'].includes(player.position) ? 4 : ['ZAG','GOL'].includes(player.position) ? -14 : -3) + jitter(7)),
    defending: clampSkill(base + (['ZAG','LD','LE','VOL'].includes(player.position) ? 5 : ['ATA','PE','PD','GOL'].includes(player.position) ? -15 : -4) + jitter(10)),
    pace: clampSkill(base + (['PE','PD','LD','LE','ATA'].includes(player.position) ? 4 : goalkeeper ? -10 : 0) + jitter(13)),
    physical: clampSkill(base + (['ZAG','VOL','ATA'].includes(player.position) ? 4 : 0) + jitter(16)),
    goalkeeping,
    dribbling: clampSkill(base + (['PE','PD','MEI','ATA'].includes(player.position) ? 4 : goalkeeper ? -18 : -3) + jitter(2)),
    crossing: clampSkill(base + (['PE','PD','LD','LE'].includes(player.position) ? 5 : goalkeeper ? -18 : -5) + jitter(5)),
    heading: clampSkill(base + (['ATA','ZAG'].includes(player.position) ? 5 : goalkeeper ? -15 : -2) + jitter(8)),
    positioning: clampSkill(base + (['ZAG','VOL','ATA','GOL'].includes(player.position) ? 4 : 0) + jitter(11)),
    vision: clampSkill(base + (['MEI','MC','VOL'].includes(player.position) ? 5 : goalkeeper ? -12 : -2) + jitter(14)),
    setPieces: clampSkill(base + (['MEI','MC','PE','PD'].includes(player.position) ? 3 : goalkeeper ? -15 : -6) + jitter(17)),
    penalties: clampSkill(base + (['ATA','MEI','PD','PE'].includes(player.position) ? 4 : goalkeeper ? -12 : -4) + jitter(20)),
    tackling: clampSkill(base + (['ZAG','VOL','LD','LE'].includes(player.position) ? 5 : ['ATA','PE','PD'].includes(player.position) ? -10 : -2) + jitter(3)),
    composure: clampSkill(base + (['ATA','MEI','GOL'].includes(player.position) ? 3 : 0) + jitter(6)),
    decisions: clampSkill(base + (['MC','MEI','VOL','GOL'].includes(player.position) ? 3 : 0) + jitter(9)),
    goalkeepingReflexes: clampSkill(goalkeeper ? goalkeeping + jitter(12) : 20),
    goalkeepingRushing: clampSkill(goalkeeper ? goalkeeping + jitter(15) : 20),
    goalkeepingHandling: clampSkill(goalkeeper ? goalkeeping + jitter(18) : 20),
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
    skills: { ...defaultPlayerSkills(player), ...(player.skills ?? {}) },
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
    injuryDaysRemaining: player.injuryDaysRemaining ?? 0,
    injuryName: player.injuryName ?? null,
    suspensionReason: player.suspensionReason ?? null,
  };
}

export function createCareer(coachName: string, clubId: string, currency: CurrencyCode = 'BRL'): Career {
  activeDisplayCurrency = currency;
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
  const leagueClubIds = clubsForDivision(club.divisionId, club.id).map((item) => item.id);
  return {
    schemaVersion: 1,
    id: `carreira-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coachName: coachName.trim(),
    clubId,
    divisionId: club.divisionId,
    currency,
    season: 1,
    roundIndex: 0,
    players: roster,
    market: makeCareerMarket(club).map((player) => initializePlayerCareerProfile(player, 1, 0)),
    formationId,
    lineup,
    benchIds,
    captainId: captain?.id ?? lineup[0]?.playerId ?? '',
    tactics: { mentality: 'equilibrada', pressure: 'normal', tempo: 'normal' },
    setPieceTakers: {
      penalties: lineup.find((slot) => slot.position === 'ATA')?.playerId ?? lineup[0]?.playerId ?? null,
      freeKicks: lineup.find((slot) => slot.position === 'MEI')?.playerId ?? lineup[0]?.playerId ?? null,
      leftCorners: lineup.find((slot) => slot.position === 'PE')?.playerId ?? lineup.find((slot) => slot.position === 'MEI')?.playerId ?? null,
      rightCorners: lineup.find((slot) => slot.position === 'PD')?.playerId ?? lineup.find((slot) => slot.position === 'MEI')?.playerId ?? null,
    },
    boardTrust: 66,
    fanTrust: 60,
    legalWorkloadEvents: 0,
    balance: club.balance,
    finance: makeFinanceState(club, roster),
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
    leagueClubIds,
    leagueFixtures: balanceClubVenueSequence(makeLeagueSchedule(1, club.divisionId, clubId, leagueClubIds), clubId),
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
  if (career.liveMatch && career.liveMatch.phase !== 'pregame') return career;
  const targetIndex = career.lineup.findIndex((slot) => slot.id === slotId);
  const targetPlayer = career.players.find((player) => player.id === playerId);
  if (targetIndex < 0 || !targetPlayer || targetPlayer.status !== 'available') return career;

  const lineup = career.lineup.map((slot) => ({ ...slot }));
  const currentSlotIndex = lineup.findIndex((slot) => slot.playerId === playerId);
  const outgoingId = lineup[targetIndex]?.playerId;
  if (!outgoingId || outgoingId === playerId) return career;

  if (currentSlotIndex >= 0) {
    const currentSlot = lineup[currentSlotIndex];
    const targetSlot = lineup[targetIndex];
    if (!currentSlot || !targetSlot) return career;
    lineup[currentSlotIndex] = { ...currentSlot, playerId: outgoingId };
    lineup[targetIndex] = { ...targetSlot, playerId };
    return { ...career, lineup, captainId: career.captainId === outgoingId ? playerId : career.captainId };
  }

  const benchIndex = career.benchIds.indexOf(playerId);
  lineup[targetIndex] = { ...lineup[targetIndex]!, playerId };

  const benchIds = [...career.benchIds];
  if (benchIndex >= 0) {
    benchIds[benchIndex] = outgoingId;
  }

  const newCaptain = career.captainId === outgoingId ? playerId : career.captainId;
  const liveMatch = career.liveMatch?.phase === 'pregame'
    ? {
        ...career.liveMatch,
        userLineup: lineup.map((slot) => ({ ...slot })),
        userBenchIds: [...benchIds],
        startedPlayerIds: lineup.map((slot) => slot.playerId),
        appearedPlayerIds: lineup.map((slot) => slot.playerId),
      }
    : career.liveMatch;
  return { ...career, lineup, benchIds, captainId: newCaptain, liveMatch };
}

export function replaceBenchPlayer(career: Career, outgoingBenchId: string, incomingId: string): Career {
  if (career.liveMatch && career.liveMatch.phase !== 'pregame') return career;
  const benchIndex = career.benchIds.indexOf(outgoingBenchId);
  if (benchIndex < 0) return career;

  const incoming = career.players.find((player) => player.id === incomingId);
  if (!incoming || incoming.status !== 'available') return career;
  if (career.lineup.some((slot) => slot.playerId === incomingId)) return career;
  if (career.benchIds.includes(incomingId)) return career;

  const benchIds = [...career.benchIds];
  benchIds[benchIndex] = incomingId;
  const liveMatch = career.liveMatch?.phase === 'pregame'
    ? { ...career.liveMatch, userBenchIds: [...benchIds] }
    : career.liveMatch;
  return { ...career, benchIds, liveMatch };
}

export function changeFormation(career: Career, formationId: FormationId): Career {
  const formation = getFormation(formationId);
  const availablePlayers = career.players.filter((player) => player.status === 'available');
  const lineup = buildBestLineup(availablePlayers, formationId);
  const benchIds = buildBench(availablePlayers, lineup);
  const captainId = lineup.some((slot) => slot.playerId === career.captainId)
    ? career.captainId
    : lineup[0]?.playerId ?? '';
  const liveMatch = career.liveMatch?.phase === 'pregame'
    ? {
        ...career.liveMatch,
        userLineup: lineup.map((slot) => ({ ...slot })),
        userBenchIds: [...benchIds],
        startedPlayerIds: lineup.map((slot) => slot.playerId),
        appearedPlayerIds: lineup.map((slot) => slot.playerId),
      }
    : career.liveMatch;
  return {
    ...career,
    formationId: formation.id,
    lineup,
    benchIds,
    captainId,
    liveMatch,
  };
}

export function updateTactics(career: Career, tactics: Career['tactics']): Career {
  return { ...career, tactics: { ...tactics } };
}

export function setSetPieceTaker(
  career: Career,
  role: keyof Career['setPieceTakers'],
  playerId: string,
): Career {
  const player = career.players.find((item) => item.id === playerId);
  if (!player || player.status !== 'available') return career;
  return {
    ...career,
    setPieceTakers: {
      ...(career.setPieceTakers ?? { penalties: null, freeKicks: null, leftCorners: null, rightCorners: null }),
      [role]: playerId,
    },
  };
}

export function setCaptain(career: Career, playerId: string): Career {
  return career.lineup.some((slot) => slot.playerId === playerId) ? { ...career, captainId: playerId } : career;
}

export function getCurrentFixture(career: Career): Fixture | undefined {
  const schedule = Array.isArray(career.leagueFixtures) && career.leagueFixtures.length
    ? career.leagueFixtures
    : makeLeagueSchedule(career.season, career.divisionId, career.clubId, career.leagueClubIds);
  return schedule.find((fixture) => fixture.roundIndex === career.roundIndex
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
    const injuryDaysRemaining = player.status === 'injured' && !expiredInjury
      ? Math.max(1, (player.injuryDaysRemaining ?? 7) - 7)
      : 0;
    return {
      ...player,
      fitness: clamp(player.fitness + recovery, 15, 100),
      injuryDaysRemaining,
      ...(expiredInjury ? { status: 'available' as const, injuryUntilRound: null, injuryName: null, injuryDaysRemaining: 0 } : {}),
      ...(expiredSuspension ? { status: 'available' as const, suspendedUntilRound: null, suspensionReason: null } : {}),
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
  const eligiblePlayers = recoveredPlayers.filter((player) => player.status === 'available');
  const eligibleIds = new Set(eligiblePlayers.map((player) => player.id));
  // Não bloqueie o apito inicial por um atleta machucado/suspenso que ficou
  // convocado na rodada anterior: atualize apenas as vagas indisponíveis.
  const chosenLineup = career.lineup.map((slot) => ({ ...slot }));
  const startingIds = chosenLineup.map((slot) => slot.playerId);
  const validLineup = startingIds.length === 11
    && new Set(startingIds).size === 11
    && startingIds.every((id) => eligibleIds.has(id));
  const lineup = validLineup ? chosenLineup : buildBestLineup(eligiblePlayers, career.formationId);
  if (lineup.length !== 11 || new Set(lineup.map((slot) => slot.playerId)).size !== 11) return career;
  const playingIds = new Set(lineup.map((slot) => slot.playerId));
  // O banco não pode travar o começo da partida.
  const benchIds = [
    ...career.benchIds.filter((id) => eligibleIds.has(id) && !playingIds.has(id)),
    ...buildBench(eligiblePlayers, lineup).filter((id) => !playingIds.has(id)),
  ].filter((id, index, ids) => ids.indexOf(id) === index).slice(0, 7);
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
    substitutionWindowsUsed: 0,
    lastSubstitutionMinute: null,
    substitutedOutIds: [],
    startedPlayerIds: lineup.map((slot) => slot.playerId),
    appearedPlayerIds: lineup.map((slot) => slot.playerId),
    yellowCardCounts: {},
    pausedForTactics: false,
    requiredSubstitutionPlayerId: null,
    pausedForVar: false,
    pendingVar: null,
    firstHalfAddedTime: 0,
    secondHalfAddedTime: 0,
    referee: { name: '', strictness: 50, advantage: 50, varSensitivity: 50 },
    events: [],
    randomSeed: (hash(`${career.clubId}-${career.roundIndex}-${career.season}`) + 19) >>> 0,
  };
  game.referee = makeMatchReferee(game);
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

function makeMatchReferee(game: MatchSession) {
  const names = ['Rafael Monteiro','Bruno Azevedo','Caio Nogueira','Diego Valença','Henrique Paes','Lucas Ferraz'];
  const seed = hash(game.fixture.id + '-ref-' + game.randomSeed);
  return {
    name: names[seed % names.length]!,
    strictness: 42 + (seed % 36),
    advantage: 35 + ((seed >>> 5) % 46),
    varSensitivity: 45 + ((seed >>> 9) % 41),
  };
}

function getOtherClub(game: MatchSession, clubId: string): string {
  return clubId === game.fixture.homeClubId ? game.fixture.awayClubId : game.fixture.homeClubId;
}

function addStoppage(game: MatchSession, minutes: number) {
  const amount = clamp(Math.round(minutes), 0, 8);
  if (amount <= 0) return;
  if (game.phase === 'first_half') game.firstHalfAddedTime = clamp(game.firstHalfAddedTime + amount, 0, 9);
  if (game.phase === 'second_half') game.secondHalfAddedTime = clamp(game.secondHalfAddedTime + amount, 0, 12);
}

function activeUserPlayerById(career: Career, game: MatchSession, playerId: string | null | undefined): Player | undefined {
  if (!playerId) return undefined;
  const onField = game.userLineup.some((slot) => slot.playerId === playerId && !slot.sentOff);
  if (!onField) return undefined;
  return career.players.find((player) => player.id === playerId && player.status === 'available');
}

function bestSetPieceTaker(career: Career, game: MatchSession, kind: 'penalties' | 'freeKicks' | 'leftCorners' | 'rightCorners'): Player | undefined {
  const preferredId = career.setPieceTakers?.[kind] ?? null;
  const preferred = activeUserPlayerById(career, game, preferredId);
  if (preferred) return preferred;

  const candidates = currentGamePlayers(career, game).map((item) => item.player);
  const skillKey = kind === 'penalties' ? 'penalties' : kind === 'freeKicks' ? 'setPieces' : 'crossing';
  return candidates.sort((a, b) => {
    const aSkill = a.skills?.[skillKey] ?? a.strength;
    const bSkill = b.skills?.[skillKey] ?? b.strength;
    return bSkill - aSkill;
  })[0];
}

function userGoalkeeper(career: Career, game: MatchSession): Player | undefined {
  const slot = game.userLineup.find((item) => item.position === 'GOL' && !item.sentOff);
  return slot ? career.players.find((player) => player.id === slot.playerId) : undefined;
}

function sendOffUserPlayer(career: Career, game: MatchSession, playerId: string, reason: string): Career {
  const player = career.players.find((item) => item.id === playerId);
  if (!player) return career;

  game.userLineup = game.userLineup.map((slot) => slot.playerId === playerId
    ? { ...slot, sentOff: true, offReason: 'red' as const }
    : slot);

  return {
    ...career,
    players: career.players.map((item) => item.id === playerId
      ? {
          ...item,
          status: 'suspended' as const,
          suspendedUntilRound: game.fixture.roundIndex + 1,
          suspensionReason: reason,
        }
      : item),
  };
}

function queueVar(
  game: MatchSession,
  review: NonNullable<MatchSession['pendingVar']>,
) {
  game.pendingVar = review;
  game.pausedForVar = true;
  if (review.clubId) statLine(game, review.clubId).varReviews += 1;
  addStoppage(game, 2);
  addEvent(game, 'var_start', `VAR: ${review.headline}. O jogo está paralisado para revisão.`, review.clubId, review.playerId);
}

function scoreGoal(game: MatchSession, clubId: string) {
  if (clubId === game.fixture.homeClubId) game.homeGoals += 1;
  else game.awayGoals += 1;
}

function removeGoal(game: MatchSession, clubId: string) {
  if (clubId === game.fixture.homeClubId) game.homeGoals = Math.max(0, game.homeGoals - 1);
  else game.awayGoals = Math.max(0, game.awayGoals - 1);
}

function takePenalty(career: Career, game: MatchSession, clubId: string): Career {
  const stats = statLine(game, clubId);
  stats.penalties += 1;
  stats.shots += 1;
  stats.bigChances += 1;
  stats.xg += 0.76;

  const isUser = clubId === career.clubId;
  const taker = isUser ? bestSetPieceTaker(career, game, 'penalties') : undefined;
  const takerQuality = isUser
    ? ((taker?.skills?.penalties ?? taker?.strength ?? 66) * 0.65 + (taker?.skills?.composure ?? taker?.strength ?? 66) * 0.35)
    : (getClub(clubId)?.rating ?? 64) + 5;
  const keeper = clubId === career.clubId ? undefined : userGoalkeeper(career, game);
  const keeperQuality = keeper
    ? ((keeper.skills?.goalkeepingReflexes ?? keeper.strength) * 0.65 + (keeper.skills?.goalkeepingHandling ?? keeper.strength) * 0.35)
    : (getClub(getOtherClub(game, clubId))?.rating ?? 64);
  const goalChance = clamp(0.74 + (takerQuality - keeperQuality) * 0.004, 0.56, 0.91);
  const takerName = taker?.name ?? 'O cobrador';

  addEvent(game, 'penalty', `${game.minute}′ PÊNALTI! ${takerName} prepara a cobrança.`, clubId, taker?.id);

  const doubleTouch = gameRandom(game) < 0.012;
  let scored = gameRandom(game) < goalChance;
  if (doubleTouch) {
    addEvent(game, 'penalty', `${game.minute}′ O cobrador toca acidentalmente duas vezes na bola. Se entrar, a cobrança será repetida.`, clubId, taker?.id);
    if (scored) scored = gameRandom(game) < goalChance;
  }

  if (scored) {
    stats.shotsOnTarget += 1;
    scoreGoal(game, clubId);
    addEvent(game, 'goal', `${game.minute}′ GOL DE PÊNALTI! ${takerName} desloca o goleiro e marca.`, clubId, taker?.id);
  } else if (gameRandom(game) < 0.72) {
    stats.shotsOnTarget += 1;
    statLine(game, getOtherClub(game, clubId)).saves += 1;
    addEvent(game, 'save', `${game.minute}′ DEFENDEU! O goleiro acerta o canto e salva o pênalti.`, clubId, taker?.id);
  } else {
    addEvent(game, 'post', `${game.minute}′ NA TRAVE! A cobrança explode na madeira.`, clubId, taker?.id);
  }
  return career;
}

export function resolveVarReview(career: Career): Career {
  const existing = career.liveMatch;
  if (!existing || !existing.pendingVar) return career;

  const game: MatchSession = {
    ...existing,
    homeStats: { ...existing.homeStats },
    awayStats: { ...existing.awayStats },
    userLineup: existing.userLineup.map((slot) => ({ ...slot })),
    userBenchIds: [...existing.userBenchIds],
    yellowCardCounts: { ...(existing.yellowCardCounts ?? {}) },
    substitutedOutIds: [...(existing.substitutedOutIds ?? [])],
    appearedPlayerIds: [...(existing.appearedPlayerIds ?? [])],
    events: [...existing.events],
  };
  const review = game.pendingVar;
  let next: Career = { ...career, liveMatch: game };

  if (review.decision === 'overturned') {
    if (review.reverseGoalForClubId) removeGoal(game, review.reverseGoalForClubId);
    if (review.reason === 'second_yellow' && review.clubId && review.playerId) {
      const stats = statLine(game, review.clubId);
      stats.yellowCards = Math.max(0, stats.yellowCards - 1);
      game.yellowCardCounts = {
        ...(game.yellowCardCounts ?? {}),
        [review.playerId]: Math.max(1, (game.yellowCardCounts?.[review.playerId] ?? 2) - 1),
      };
    }
    addEvent(game, 'var_overturn', `DECISÃO ALTERADA! ${review.detail}`, review.clubId, review.playerId);
  } else {
    if ((review.reason === 'red_card' || review.reason === 'second_yellow') && review.clubId === career.clubId && review.playerId) {
      next = sendOffUserPlayer(next, game, review.playerId, review.reason === 'second_yellow' ? 'Expulso por segundo cartão amarelo' : 'Expulsão direta');
      statLine(game, career.clubId).redCards += 1;
      addEvent(game, review.reason === 'second_yellow' ? 'second_yellow' : 'red',
        review.reason === 'second_yellow'
          ? `${game.minute}′ Segundo amarelo confirmado pelo VAR. Expulso!`
          : `${game.minute}′ Cartão vermelho confirmado pelo VAR.`,
        career.clubId, review.playerId);
    }
    addEvent(game, 'var_end', `VAR confirma a decisão: ${review.detail}`, review.clubId, review.playerId);
    if (review.reason === 'penalty' && review.awardPenaltyToClubId) {
      next = takePenalty(next, game, review.awardPenaltyToClubId);
    }
  }

  game.pendingVar = null;
  game.pausedForVar = false;
  return { ...next, liveMatch: game };
}

function maybeInjurePlayer(career: Career, game: MatchSession, clubId: string): Career {
  const stats = statLine(game, clubId);
  const isUser = clubId === career.clubId;
  const candidate = isUser ? activeClubPlayer(career, game) : undefined;
  const medicalLevel = career.trainingCenterUpgrades?.medical ?? 1;
  const gymLevel = career.trainingCenterUpgrades?.gym ?? 1;
  const medicalProtection = Math.max(0.42, 1 - (medicalLevel - 1) * 0.052);
  const gymProtection = Math.max(0.74, 1 - (gymLevel - 1) * 0.018);
  const risk = isUser
    ? (candidate && candidate.fitness < 45 ? 0.0017 : 0.00048) * medicalProtection * gymProtection
    : 0.00028;
  if (gameRandom(game) >= risk) return career;

  stats.injuries += 1;
  addStoppage(game, 2 + Math.floor(gameRandom(game) * 2));

  if (!isUser || !candidate) {
    addEvent(game, 'medical', `${game.minute}′ Atendimento médico. O jogador adversário recebe cuidados e a partida é retomada.`, clubId);
    return career;
  }

  const severityRoll = gameRandom(game);
  const injury =
    severityRoll < 0.38 ? { name: 'Contusão leve', min: 4, max: 8, fitness: 8 } :
    severityRoll < 0.68 ? { name: 'Entorse', min: 8, max: 18, fitness: 14 } :
    severityRoll < 0.90 ? { name: 'Lesão muscular', min: 18, max: 35, fitness: 20 } :
    { name: 'Lesão ligamentar', min: 35, max: 70, fitness: 28 };
  const rawDays = injury.min + Math.floor(gameRandom(game) * (injury.max - injury.min + 1));
  const days = Math.max(3, Math.round(rawDays * medicalProtection));
  const roundsOut = Math.max(1, Math.ceil(days / 7));

  const players = career.players.map((player) => player.id === candidate.id
    ? {
        ...player,
        status: 'injured' as const,
        injuryUntilRound: game.fixture.roundIndex + roundsOut,
        injuryDaysRemaining: days,
        injuryName: injury.name,
        fitness: Math.max(5, player.fitness - injury.fitness),
      }
    : player);

  addEvent(game, 'medical', `${game.minute}′ ${candidate.name} cai no gramado. O departamento médico entra imediatamente.`, clubId, candidate.id);
  addEvent(game, 'injury_forced_sub', `${candidate.name} sofreu ${injury.name.toLowerCase()} e ficará aproximadamente ${days} dias fora. A troca é obrigatória.`, clubId, candidate.id);

  const canOpenWindow = game.phase === 'halftime'
    || game.lastSubstitutionMinute === game.minute
    || game.substitutionWindowsUsed < 3;
  const canSubstitute = game.substitutionsUsed < 5
    && canOpenWindow
    && game.userBenchIds.some((id) => players.some((player) => player.id === id && player.status === 'available'));

  if (canSubstitute) {
    game.requiredSubstitutionPlayerId = candidate.id;
    game.pausedForTactics = true;
  } else {
    game.userLineup = game.userLineup.map((slot) => slot.playerId === candidate.id
      ? { ...slot, sentOff: true, offReason: 'injury' as const }
      : slot);
    game.substitutedOutIds = [...new Set([...(game.substitutedOutIds ?? []), candidate.id])];
    addEvent(game, 'injury_forced_sub', `Sem substituição disponível. ${getClub(clubId)?.name} seguirá com um jogador a menos.`, clubId, candidate.id);
  }

  return { ...career, players, liveMatch: { ...game } };
}

function maybeGoalVar(game: MatchSession, clubId: string, playerId?: string) {
  if (game.pausedForVar || gameRandom(game) > 0.14) return;
  const overturned = gameRandom(game) < 0.27;
  queueVar(game, {
    id: `var-goal-${game.minute}-${game.events.length}`,
    reason: 'goal',
    clubId,
    playerId,
    decision: overturned ? 'overturned' : 'confirmed',
    headline: gameRandom(game) < 0.55 ? 'checagem de possível impedimento' : 'checagem da origem do gol',
    detail: overturned ? 'gol anulado após a revisão' : 'gol legal, sem infração no lance',
    reverseGoalForClubId: clubId,
  });
}

function maybePenaltySituation(career: Career, game: MatchSession, attackingClubId: string): Career {
  if (game.pausedForVar) return career;
  const defenderId = getOtherClub(game, attackingClubId);
  const attackStats = statLine(game, attackingClubId);
  const defenseStats = statLine(game, defenderId);
  const isHandball = gameRandom(game) < 0.42;
  if (isHandball) {
    defenseStats.handballs += 1;
    addEvent(game, 'handball', `${game.minute}′ A bola toca no braço dentro da área. O árbitro aponta para a marca!`, defenderId);
  } else {
    defenseStats.fouls += 1;
    addEvent(game, 'foul', `${game.minute}′ Contato dentro da área. Pênalti marcado!`, defenderId);
  }

  const useVar = gameRandom(game) < (0.48 + game.referee.varSensitivity / 220);
  if (useVar) {
    const overturned = gameRandom(game) < 0.22;
    queueVar(game, {
      id: `var-pen-${game.minute}-${game.events.length}`,
      reason: 'penalty',
      clubId: attackingClubId,
      decision: overturned ? 'overturned' : 'confirmed',
      headline: 'possível pênalti',
      detail: overturned ? 'o contato não foi suficiente e o pênalti foi cancelado' : 'pênalti confirmado após a revisão',
      awardPenaltyToClubId: attackingClubId,
    });
    return career;
  }

  attackStats.penalties += 0;
  return takePenalty(career, game, attackingClubId);
}

function bookUserPlayer(career: Career, game: MatchSession, offender: Player): Career {
  const stats = statLine(game, career.clubId);
  const current = game.yellowCardCounts?.[offender.id] ?? 0;
  const nextCount = current + 1;
  game.yellowCardCounts = { ...(game.yellowCardCounts ?? {}), [offender.id]: nextCount };
  stats.yellowCards += 1;

  if (nextCount < 2) {
    addEvent(game, 'yellow', `${game.minute}′ Cartão amarelo para ${offender.name}.`, career.clubId, offender.id);
    return career;
  }

  const shouldReview = gameRandom(game) < (0.18 + game.referee.varSensitivity / 500);
  if (shouldReview) {
    queueVar(game, {
      id: `var-2yellow-${game.minute}-${offender.id}`,
      reason: 'second_yellow',
      clubId: career.clubId,
      playerId: offender.id,
      decision: gameRandom(game) < 0.16 ? 'overturned' : 'confirmed',
      headline: 'revisão do segundo cartão amarelo',
      detail: 'segundo amarelo e expulsão',
    });
    return career;
  }

  stats.redCards += 1;
  addEvent(game, 'second_yellow', `${game.minute}′ SEGUNDO AMARELO! ${offender.name} está expulso e cumprirá suspensão na próxima partida.`, career.clubId, offender.id);
  return sendOffUserPlayer(career, game, offender.id, 'Expulso por segundo cartão amarelo');
}

function maybeDiscipline(career: Career, game: MatchSession, clubId: string): Career {
  const stats = statLine(game, clubId);
  const foulChance = 0.050 + game.referee.strictness * 0.00036;
  if (gameRandom(game) >= foulChance) return career;

  stats.fouls += 1;
  const userOffender = clubId === career.clubId ? activeClubPlayer(career, game) : undefined;
  const severity = gameRandom(game);
  const advantage = severity < 0.67 && gameRandom(game) < game.referee.advantage / 120;

  if (advantage) {
    stats.advantages += 1;
    addEvent(game, 'advantage', `${game.minute}′ Houve falta, mas o árbitro dá vantagem e manda seguir.`, clubId, userOffender?.id);
    return career;
  }

  stats.freeKicks += 1;
  addEvent(game, 'foul', `${game.minute}′ Falta marcada para ${getClub(getOtherClub(game, clubId))?.name}. ${game.referee.name} interrompe o jogo.`, clubId, userOffender?.id);

  if (severity > 0.965) {
    if (clubId === career.clubId && userOffender) {
      const useVar = gameRandom(game) < 0.65;
      if (useVar) {
        queueVar(game, {
          id: `var-red-${game.minute}-${userOffender.id}`,
          reason: 'red_card',
          clubId,
          playerId: userOffender.id,
          decision: gameRandom(game) < 0.13 ? 'overturned' : 'confirmed',
          headline: 'possível cartão vermelho direto',
          detail: 'entrada grave analisada pelo VAR',
        });
        return career;
      }
      stats.redCards += 1;
      addEvent(game, 'red', `${game.minute}′ VERMELHO DIRETO! ${userOffender.name} é expulso.`, clubId, userOffender.id);
      return sendOffUserPlayer(career, game, userOffender.id, 'Expulsão direta');
    }
    stats.redCards += 1;
    addEvent(game, 'red', `${game.minute}′ Cartão vermelho direto para ${getClub(clubId)?.name}.`, clubId);
    return career;
  }

  const cardChance = clamp(0.12 + game.referee.strictness * 0.004 + (severity > 0.82 ? 0.34 : 0), 0.10, 0.72);
  if (gameRandom(game) < cardChance) {
    if (clubId === career.clubId && userOffender) return bookUserPlayer(career, game, userOffender);
    stats.yellowCards += 1;
    addEvent(game, 'yellow', `${game.minute}′ Cartão amarelo para ${getClub(clubId)?.name}.`, clubId);
  }

  return career;
}

function maybeSetPiece(career: Career, game: MatchSession, clubId: string): Career {
  const stats = statLine(game, clubId);
  const roll = gameRandom(game);

  if (roll < 0.018) {
    stats.offsides += 1;
    addEvent(game, 'offside', `${game.minute}′ Impedimento! A jogada é interrompida pela arbitragem.`, clubId);
    return career;
  }

  if (roll < 0.036) {
    stats.throwIns += 1;
    addEvent(game, 'throw_in', `${game.minute}′ Lateral para ${getClub(clubId)?.name} no campo de ataque.`, clubId);
    return career;
  }

  if (roll < 0.050) {
    stats.goalKicks += 1;
    addEvent(game, 'goal_kick', `${game.minute}′ Tiro de meta. O goleiro organiza a saída curta.`, clubId);
    return career;
  }

  if (roll < 0.063) {
    stats.corners += 1;
    addEvent(game, 'corner', `${game.minute}′ Escanteio para ${getClub(clubId)?.name}. Bola fechada na área.`, clubId);
    if (gameRandom(game) < 0.13) {
      stats.shots += 1;
      stats.xg += 0.10;
      const scorer = clubId === career.clubId ? bestSetPieceTaker(career, game, 'leftCorners') : undefined;
      if (gameRandom(game) < 0.12) {
        stats.shotsOnTarget += 1;
        scoreGoal(game, clubId);
        addEvent(game, 'goal', `${game.minute}′ GOL DE BOLA PARADA! A cobrança encontra a cabeça do atacante!`, clubId, scorer?.id);
        maybeGoalVar(game, clubId, scorer?.id);
      } else {
        addEvent(game, 'shot', `${game.minute}′ Cabeçada após o escanteio passa perto do gol.`, clubId, scorer?.id);
      }
    }
  }

  return career;
}

function maybeKeeperEightSeconds(game: MatchSession, clubId: string) {
  if (gameRandom(game) >= 0.0026) return;
  const opponentId = getOtherClub(game, clubId);
  statLine(game, opponentId).corners += 1;
  addEvent(game, 'keeper_8s', `${game.minute}′ O goleiro segura a bola por mais de 8 segundos. O árbitro faz a contagem e marca escanteio para o adversário.`, clubId);
  addStoppage(game, 1);
}

function simulateChance(career: Career, game: MatchSession, clubId: string): Career {
  const otherClubId = getOtherClub(game, clubId);
  const attackPower = teamPower(career, game, clubId) * attackModifier(career, game, clubId);
  const defensePower = teamPower(career, game, otherClubId);
  const difference = clamp(attackPower - defensePower, -20, 20);
  const stats = statLine(game, clubId);

  if (gameRandom(game) < 0.0075) {
    career = maybePenaltySituation(career, game, clubId);
    if (game.pausedForVar) return career;
  }

  const shotChance = clamp(0.078 + difference * 0.0018 + (clubId === career.clubId && career.tactics.tempo === 'alta' ? 0.022 : 0), 0.04, 0.16);
  if (gameRandom(game) >= shotChance) return career;

  stats.shots += 1;
  const player = clubId === career.clubId ? activeClubPlayer(career, game) : undefined;
  const finisher = player?.name ?? 'O atacante';
  const shooting = player?.skills?.shooting ?? player?.strength ?? (getClub(clubId)?.rating ?? 64);
  const composure = player?.skills?.composure ?? player?.strength ?? (getClub(clubId)?.rating ?? 64);
  const bigChance = gameRandom(game) < clamp(0.18 + difference * 0.006, 0.08, 0.38);
  const shotXg = bigChance ? 0.30 + gameRandom(game) * 0.24 : 0.035 + gameRandom(game) * 0.13;
  stats.xg += shotXg;
  if (bigChance) stats.bigChances += 1;

  const targetChance = clamp(0.38 + (shooting + composure - 130) * 0.004, 0.24, 0.72);
  const onTarget = gameRandom(game) < targetChance;
  if (!onTarget) {
    if (gameRandom(game) < 0.12) addEvent(game, 'post', `${game.minute}′ NA TRAVE! ${finisher} quase abre o placar.`, clubId, player?.id);
    else addEvent(game, 'shot', `${game.minute}′ ${finisher} finaliza, mas a bola sai por pouco.`, clubId, player?.id);
    return career;
  }

  stats.shotsOnTarget += 1;
  const goalChance = clamp(shotXg * 0.74 + (difference + shooting - 65) * 0.0022, 0.045, bigChance ? 0.58 : 0.28);
  if (gameRandom(game) < goalChance) {
    scoreGoal(game, clubId);
    addEvent(game, 'goal', `${game.minute}′ GOOOL! ${finisher} finaliza com categoria para ${getClub(clubId)?.name}!`, clubId, player?.id);
    if (player) {
      career = {
        ...career,
        players: career.players.map((item) => item.id === player.id ? { ...item, morale: clamp(item.morale + 3, 0, 100) } : item),
      };
    }
    maybeGoalVar(game, clubId, player?.id);
    return career;
  }

  statLine(game, otherClubId).saves += 1;
  addEvent(game, 'save', `${game.minute}′ DEFESA! ${finisher} acerta o alvo, mas o goleiro salva.`, clubId, player?.id);
  if (gameRandom(game) < 0.36) {
    stats.corners += 1;
    addEvent(game, 'corner', `${game.minute}′ O goleiro espalma para escanteio.`, clubId);
  }
  return career;
}

function simulatePossessionMinute(career: Career, game: MatchSession) {
  const homePower = teamPower(career, game, game.fixture.homeClubId) * attackModifier(career, game, game.fixture.homeClubId);
  const awayPower = teamPower(career, game, game.fixture.awayClubId) * attackModifier(career, game, game.fixture.awayClubId);
  const homeShare = clamp(0.50 + (homePower - awayPower) * 0.009, 0.30, 0.70);
  const clubId = gameRandom(game) < homeShare ? game.fixture.homeClubId : game.fixture.awayClubId;
  const stats = statLine(game, clubId);
  stats.possessionTicks += 1;
  const passes = 5 + Math.floor(gameRandom(game) * 10);
  const clubRating = clubId === career.clubId ? teamPower(career, game, clubId) : (getClub(clubId)?.rating ?? 64);
  const accuracy = clamp(0.67 + (clubRating - 60) * 0.004, 0.62, 0.90);
  stats.passes += passes;
  stats.completedPasses += Math.round(passes * accuracy);
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

  simulatePossessionMinute(career, game);

  const userClubId = career.clubId;
  const opponentId = getOtherClub(game, userClubId);

  career = maybeInjurePlayer(career, game, userClubId);
  if (game.requiredSubstitutionPlayerId) return career;
  career = maybeInjurePlayer(career, game, opponentId);

  career = maybeDiscipline(career, game, game.fixture.homeClubId);
  if (game.pausedForVar) return career;
  career = maybeDiscipline(career, game, game.fixture.awayClubId);
  if (game.pausedForVar) return career;

  career = maybeSetPiece(career, game, game.fixture.homeClubId);
  if (game.pausedForVar) return career;
  career = maybeSetPiece(career, game, game.fixture.awayClubId);
  if (game.pausedForVar) return career;

  career = simulateChance(career, game, game.fixture.homeClubId);
  if (game.pausedForVar) return career;
  career = simulateChance(career, game, game.fixture.awayClubId);
  if (game.pausedForVar) return career;

  maybeKeeperEightSeconds(game, game.fixture.homeClubId);
  maybeKeeperEightSeconds(game, game.fixture.awayClubId);

  if (game.minute === 45 && game.phase === 'first_half') {
    const baseAdded = 1 + Math.floor(gameRandom(game) * 4);
    game.firstHalfAddedTime = clamp(Math.max(game.firstHalfAddedTime, baseAdded), 1, 9);
    addEvent(game, 'stoppage_time', `O quarto árbitro indica +${game.firstHalfAddedTime} de acréscimos no primeiro tempo.`);
  }
  if (game.phase === 'first_half' && game.minute >= 45 + game.firstHalfAddedTime) {
    game.phase = 'halftime';
    addEvent(game, 'halftime', `Intervalo! ${game.homeGoals} × ${game.awayGoals}. Hora dos ajustes.`);
    return career;
  }

  if (game.minute === 90 && game.phase === 'second_half') {
    const baseAdded = 2 + Math.floor(gameRandom(game) * 5);
    game.secondHalfAddedTime = clamp(Math.max(game.secondHalfAddedTime, baseAdded), 2, 12);
    addEvent(game, 'stoppage_time', `Teremos +${game.secondHalfAddedTime} de acréscimos.`);
  }
  if (game.phase === 'second_half' && game.minute >= 90 + game.secondHalfAddedTime) {
    game.phase = 'finished';
    addEvent(game, 'fulltime', `FIM DE JOGO! ${getClub(game.fixture.homeClubId)?.name} ${game.homeGoals} × ${game.awayGoals} ${getClub(game.fixture.awayClubId)?.name}.`);
  }

  return career;
}

export function advanceMatch(career: Career, minutes = 5): Career {
  const existing = career.liveMatch;
  if (!existing || existing.phase === 'finished' || existing.pausedForTactics || existing.pausedForVar || existing.requiredSubstitutionPlayerId) return career;

  const game: MatchSession = {
    ...existing,
    homeStats: { ...existing.homeStats },
    awayStats: { ...existing.awayStats },
    userLineup: existing.userLineup.map((slot) => ({ ...slot })),
    userBenchIds: [...existing.userBenchIds],
    yellowCardCounts: { ...(existing.yellowCardCounts ?? {}) },
    substitutedOutIds: [...(existing.substitutedOutIds ?? [])],
    startedPlayerIds: [...(existing.startedPlayerIds ?? existing.userLineup.map((slot) => slot.playerId))],
    appearedPlayerIds: [...(existing.appearedPlayerIds ?? existing.userLineup.map((slot) => slot.playerId))],
    events: [...existing.events],
  };
  let next: Career = { ...career, liveMatch: game };

  if (game.phase === 'pregame') {
    // Salves anteriores podem carregar reservas indisponíveis. Refaça apenas
    // as posições inválidas, para que o apito não fique preso em zero minutos.
    const eligiblePlayers = career.players.filter((player) => player.status === 'available');
    const eligibleIds = new Set(eligiblePlayers.map((player) => player.id));
    const starters = game.userLineup.map((slot) => slot.playerId);
    const validStarters = game.userLineup.length === 11
      && new Set(starters).size === 11
      && starters.every((id) => eligibleIds.has(id));
    if (!validStarters) {
      const repaired = buildBestLineup(eligiblePlayers, career.formationId);
      if (repaired.length !== 11 || new Set(repaired.map((slot) => slot.playerId)).size !== 11) return career;
      game.userLineup = repaired;
    }
    const activeIds = new Set(game.userLineup.map((slot) => slot.playerId));
    game.userBenchIds = [
      ...game.userBenchIds.filter((id) => eligibleIds.has(id) && !activeIds.has(id)),
      ...buildBench(eligiblePlayers, game.userLineup).filter((id) => !activeIds.has(id)),
    ].filter((id, index, ids) => ids.indexOf(id) === index).slice(0, 7);
    game.phase = 'first_half';
    addEvent(game, 'kickoff', `Bola rolando! ${game.referee.name} autoriza o início da partida.`, career.clubId);
    return { ...next, lineup: game.userLineup.map((slot) => ({ ...slot })), benchIds: [...game.userBenchIds] };
  }

  if (game.phase === 'halftime') {
    game.phase = 'second_half';
    addEvent(game, 'second_half', 'As equipes voltam. Começa o segundo tempo!', career.clubId);
    return next;
  }

  const safeMinutes = clamp(Math.floor(minutes), 1, 5);
  const cap = game.phase === 'first_half'
    ? 45 + Math.max(0, game.firstHalfAddedTime)
    : 90 + Math.max(0, game.secondHalfAddedTime);
  const endMinute = Math.min(cap || (game.phase === 'first_half' ? 45 : 90), game.minute + safeMinutes);

  while (
    game.minute < endMinute
    && game.phase !== 'finished'
    && !game.pausedForVar
    && !game.requiredSubstitutionPlayerId
    && !game.pausedForTactics
  ) {
    next = simulateMinute(next, game);
  }
  return { ...next, liveMatch: game };
}

export function setMatchTacticsPaused(career: Career, paused: boolean): Career {
  const game = career.liveMatch;
  if (!game || game.phase === 'finished') return career;
  if (!paused && game.requiredSubstitutionPlayerId) return career;
  return {
    ...career,
    liveMatch: {
      ...game,
      pausedForTactics: paused,
    },
  };
}

export function substitutePlayer(career: Career, outgoingId: string, incomingId: string): Career {
  const game = career.liveMatch;
  if (!game || game.phase === 'finished' || game.substitutionsUsed >= 5) return career;
  if (!game.userBenchIds.includes(incomingId)) return career;
  if ((game.substitutedOutIds ?? []).includes(incomingId)) return career;

  const isHalfTime = game.phase === 'halftime';
  const sameWindow = game.lastSubstitutionMinute === game.minute;
  const windowsNeeded = isHalfTime || sameWindow ? 0 : 1;
  if (game.substitutionWindowsUsed + windowsNeeded > 3) return career;

  const index = game.userLineup.findIndex((slot) => slot.playerId === outgoingId && !slot.sentOff);
  if (index < 0) return career;

  const incoming = career.players.find((player) => player.id === incomingId);
  if (!incoming || incoming.status !== 'available') return career;

  const appearedPlayerIds = new Set(game.appearedPlayerIds ?? game.userLineup.map((slot) => slot.playerId));
  appearedPlayerIds.add(incomingId);

  const gameCopy: MatchSession = {
    ...game,
    userLineup: game.userLineup.map((slot, slotIndex) => slotIndex === index
      ? { ...slot, playerId: incomingId, sentOff: false, offReason: undefined }
      : { ...slot }),
    userBenchIds: game.userBenchIds.filter((id) => id !== incomingId),
    substitutionsUsed: game.substitutionsUsed + 1,
    substitutionWindowsUsed: game.substitutionWindowsUsed + windowsNeeded,
    lastSubstitutionMinute: isHalfTime ? game.lastSubstitutionMinute : game.minute,
    substitutedOutIds: [...new Set([...(game.substitutedOutIds ?? []), outgoingId])],
    startedPlayerIds: [...(game.startedPlayerIds ?? game.userLineup.map((slot) => slot.playerId))],
    appearedPlayerIds: [...appearedPlayerIds],
    requiredSubstitutionPlayerId: game.requiredSubstitutionPlayerId === outgoingId ? null : game.requiredSubstitutionPlayerId,
    events: [...game.events],
  };

  const outgoing = career.players.find((player) => player.id === outgoingId);
  addEvent(gameCopy, 'substitution',
    `${incoming.name} entra no lugar de ${outgoing?.name ?? 'um companheiro'}. ${outgoing?.name ?? 'O jogador substituído'} não pode retornar. Substituições: ${gameCopy.substitutionsUsed}/5 · janelas: ${gameCopy.substitutionWindowsUsed}/3.`,
    career.clubId, incomingId);
  if (!isHalfTime) addStoppage(gameCopy, 1);

  return {
    ...career,
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

  let next: Career = {
    ...career,
    balance: career.balance - cost,
    trainingCenterUpgrades: {
      ...(career.trainingCenterUpgrades ?? { field: 1, medical: 1, physio: 1, gym: 1, analysis: 1 }),
      [key]: current + 1,
    },
    lastNews: names[key] + ' do CT evoluiu para o nível ' + (current + 1) + '.',
  };
  next = addFinanceEntry(next, { category: 'infrastructure', description: 'Melhoria do CT - ' + names[key], amount: -cost });
  return addCareerNews(next, 'Centro de treinamento evolui', names[key] + ' chegou ao nível ' + (current + 1) + ' após investimento de ' + formatCurrency(cost, career.currency) + '.', 'club');
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
  const contractRounds = 8 + ((seed >>> 3) % 13);
  const hireCost = Math.round((salary * (1.4 + quality / 115)) / 1000) * 1000;
  const fireCost = Math.round((salary * (0.7 + contractRounds / 30)) / 1000) * 1000;
  const roles = ADMIN_ROLES[department];
  return {
    id: `staff-${department}-${career.roundIndex}-${current}-${seed}`,
    name: ADMIN_NAMES[seed % ADMIN_NAMES.length]!,
    department,
    role: roles[(seed >>> 4) % roles.length]!,
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

  let next: Career = {
    ...career,
    balance: career.balance - candidate.hireCost,
    administrationStaff: {
      ...staff,
      [department]: [...current, candidate],
    },
    lastNews: `${candidate.name} foi contratado para ${ADMIN_DEPARTMENT_LABELS[department]}.`,
  };
  next = addFinanceEntry(next, { category: 'staff', description: 'Contratação administrativa - ' + candidate.name, amount: -candidate.hireCost });
  return addCareerNews(next, 'Novo profissional na administração', `${candidate.name}, ${candidate.role}, assinou por ${candidate.contractRounds} jogos com ${ADMIN_DEPARTMENT_LABELS[department]}.`, 'club');
}

export function fireAdministrativeProfessional(career: Career, department: AdministrationDepartmentKey, professionalId: string): Career {
  const staff = career.administrationStaff ?? { board: [], finance: [], legal: [] };
  const current = activeAdministrativeStaff(career, department);
  const professional = current.find((item) => item.id === professionalId);
  if (!professional || career.balance < professional.fireCost) return career;

  let next: Career = {
    ...career,
    balance: career.balance - professional.fireCost,
    administrationStaff: {
      ...staff,
      [department]: current.filter((item) => item.id !== professionalId),
    },
    boardTrust: clamp(career.boardTrust - (department === 'board' ? 1 : 0), 0, 100),
    lastNews: `${professional.name} deixou ${ADMIN_DEPARTMENT_LABELS[department]}.`,
  };
  next = addFinanceEntry(next, { category: 'staff', description: 'Rescisão administrativa - ' + professional.name, amount: -professional.fireCost });
  return addCareerNews(next, 'Mudança na administração', `${professional.name} foi desligado de ${ADMIN_DEPARTMENT_LABELS[department]}. Rescisão de ${formatCurrency(professional.fireCost, career.currency)}.`, 'club');
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
    visualKey: category === 'match' ? 'match' as const : category === 'market' ? 'market' as const : category === 'sponsor' ? 'sponsor' as const : 'club' as const,
    featuredClubId: career.clubId,
  };
  return { ...career, newsFeed: [item, ...(career.newsFeed ?? [])].slice(0, 50) };
}

function addRoundJournal(career: Career, roundResults: LeagueResult[]): Career {
  const standings = calculateStandings(career.results, career.leagueClubIds);
  const leader = standings[0]?.club;
  const userResult = roundResults.find((result) => result.homeClubId === career.clubId || result.awayClubId === career.clubId);
  let next = career;

  if (userResult) {
    const userHome = userResult.homeClubId === career.clubId;
    const gf = userHome ? userResult.homeGoals : userResult.awayGoals;
    const ga = userHome ? userResult.awayGoals : userResult.homeGoals;
    const opponentId = userHome ? userResult.awayClubId : userResult.homeClubId;
    const opponent = getClub(opponentId);
    const club = getClub(career.clubId);
    const position = standings.findIndex((row) => row.club.id === career.clubId) + 1;
    const title = gf > ga
      ? (club?.name ?? 'Seu clube') + ' vence e ganha força na tabela'
      : gf === ga
        ? (club?.name ?? 'Seu clube') + ' soma ponto em duelo equilibrado'
        : (club?.name ?? 'Seu clube') + ' tropeça e liga alerta para a sequência';
    const body = (club?.name ?? 'O clube') + ' fez ' + gf + ' x ' + ga + ' contra ' + (opponent?.name ?? 'o adversário') + ' e aparece em ' + position + 'º lugar após a rodada.';
    next = addCareerNews(next, title, body, 'match');
  }

  const highlight = roundResults
    .filter((result) => result.homeClubId !== career.clubId && result.awayClubId !== career.clubId)
    .map((result) => ({ result, goals: result.homeGoals + result.awayGoals, diff: Math.abs(result.homeGoals - result.awayGoals) }))
    .sort((a, b) => b.diff - a.diff || b.goals - a.goals)[0];

  if (highlight && (highlight.diff >= 3 || highlight.goals >= 5)) {
    const home = getClub(highlight.result.homeClubId);
    const away = getClub(highlight.result.awayClubId);
    next = addCareerNews(
      next,
      'Rodada tem resultado que chama atenção',
      (home?.name ?? 'Mandante') + ' ' + highlight.result.homeGoals + ' x ' + highlight.result.awayGoals + ' ' + (away?.name ?? 'Visitante') + ' foi um dos placares de maior destaque da rodada.',
      'match',
    );
  }

  if (leader && career.roundIndex % 3 === 0) {
    const item = {
      id: 'news-leader-' + career.season + '-' + career.roundIndex + '-' + leader.id,
      roundIndex: career.roundIndex,
      category: 'match' as const,
      title: leader.name + ' aparece no topo da competição',
      body: 'A disputa pela liderança esquenta. ' + leader.name + ' fecha a rodada na primeira posição da ' + (getDivision(career.divisionId)?.name ?? 'liga') + '.',
      visualKey: 'competition' as const,
      featuredClubId: leader.id,
    };
    next = { ...next, newsFeed: [item, ...(next.newsFeed ?? [])].slice(0, 50) };
  }

  return next;
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
    const signingBonus = Math.round(base * (0.72 + ((seed >>> (i + 1)) % 28) / 100));
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
    finance: {
      ...career.finance,
      seasonSponsorshipIncome: (career.finance?.seasonSponsorshipIncome ?? 0) + proposal.signingBonus,
    },
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
  next = addFinanceEntry(next, { category: 'sponsorship', description: 'Luvas de patrocínio - ' + proposal.sponsorName, amount: proposal.signingBonus });
  return addCareerNews(next, 'Novo patrocinador anunciado', `${proposal.sponsorName} fechou contrato para ${SLOT_LABELS_ENGINE[proposal.slot]} por ${proposal.durationMatches} jogos. Luvas de ${formatCurrency(proposal.signingBonus, career.currency)}.`);
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
    finance: {
      ...career.finance,
      seasonSponsorshipIncome: (career.finance?.seasonSponsorshipIncome ?? 0) + renewalBonus,
    },
    boardTrust: clamp(career.boardTrust + (raise >= 1.1 ? 2 : 0), 0, 100),
    fanTrust: clamp(career.fanTrust + (contract.fanImpact > 0 ? 1 : 0), 0, 100),
    sponsorships: {
      ...state,
      contracts: state.contracts.map((item) => item.id === contractId ? updated : item),
      history: [`${contract.sponsorName} renovou por mais ${extension} jogos.`, ...state.history].slice(0, 20),
    },
  };
  next = addFinanceEntry(next, { category: 'sponsorship', description: 'Bônus de renovação - ' + contract.sponsorName, amount: renewalBonus });
  return addCareerNews(next, 'Patrocinador renova contrato', `${contract.sponsorName} renovou por ${extension} jogos com valor por partida de ${formatCurrency(updated.perMatch, career.currency)}.`);
}

function settleSponsorshipsAfterMatch(career: Career, won: boolean): Career {
  const state = career.sponsorships ?? { proposals: [], contracts: [], lastMarketRound: -1, history: [] };
  if (!state.contracts.length) return refreshSponsorshipMarket(career, true);

  let sponsorIncome = 0;
  const active: SponsorshipContract[] = [];
  const history = [...state.history];
  let next = career;
  const attendance = career.lastResult?.attendance ?? 0;
  const standings = calculateCareerStandings(career);
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
      next = addCareerNews(next, 'Contrato de patrocínio encerrado', `${contract.sponsorName} concluiu seu vínculo. Total acumulado: ${formatCurrency(contract.totalEarned + payment + finalBonus, career.currency)}.`);
    }
  }

  next = {
    ...next,
    balance: next.balance + sponsorIncome,
    finance: {
      ...next.finance,
      seasonSponsorshipIncome: (next.finance?.seasonSponsorshipIncome ?? 0) + sponsorIncome,
    },
    sponsorships: { proposals: [], contracts: active, lastMarketRound: -1, history: history.slice(0, 20) },
  };
  if (sponsorIncome > 0) {
    next = addFinanceEntry(next, { category: 'sponsorship', description: 'Receitas de patrocínio da rodada', amount: sponsorIncome });
  }
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

function advanceToNextSeason(career: Career): Career {
  const standings = calculateCareerStandings(career);
  const seasonRounds = Math.max(1, getLeagueRoundCount(career));
  const userRow = standings.find((row) => row.club.id === career.clubId);
  const champion = standings[0];
  const completedSeason = career.season;
  const completedYear = seasonYear(completedSeason);

  const players = career.players.map((player) => {
    const remainingContract = Math.max(0, (player.contractEndRound ?? seasonRounds) - seasonRounds);
    const remainingLoan = typeof player.loanedOutUntilRound === 'number'
      ? Math.max(0, player.loanedOutUntilRound - seasonRounds)
      : 0;
    const loanContinues = player.status === 'loaned' && remainingLoan > 0;
    return {
      ...player,
      age: player.age + 1,
      fitness: clamp(Math.max(player.fitness, 88), 0, 100),
      morale: clamp(player.morale + 2, 10, 100),
      status: loanContinues ? 'loaned' as const : 'available' as const,
      injuryUntilRound: null,
      suspendedUntilRound: null,
      loanedOutUntilRound: loanContinues ? remainingLoan : null,
      loanClubName: loanContinues ? player.loanClubName ?? null : null,
      contractEndRound: remainingContract,
      promisedMinutesUntilRound: null,
      lastSocialEventRound: (player.lastSocialEventRound ?? -99) - seasonRounds,
      seasonStats: { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, ratingSum: 0, ratedMatches: 0 },
    };
  });

  const available = players.filter((player) => player.status === 'available');
  const lineup = buildBestLineup(available, career.formationId);
  const benchIds = buildBench(available, lineup);
  const nextCaptain = lineup.some((slot) => slot.playerId === career.captainId)
    ? career.captainId
    : lineup[0]?.playerId ?? '';

  const shiftStaff = (people: AdministrativeProfessional[]) => people
    .filter((person) => person.contractEndRound > seasonRounds)
    .map((person) => ({
      ...person,
      hiredRound: Math.max(0, person.hiredRound - seasonRounds),
      contractEndRound: person.contractEndRound - seasonRounds,
    }));

  const historyEntry = {
    season: completedSeason,
    year: completedYear,
    finalPosition: userRow ? standings.findIndex((row) => row.club.id === career.clubId) + 1 : career.leagueClubIds.length,
    points: userRow?.points ?? 0,
    wins: userRow?.wins ?? 0,
    draws: userRow?.draws ?? 0,
    losses: userRow?.losses ?? 0,
    championClubId: champion?.club.id ?? '',
  };

  const club = getClub(career.clubId);
  // A divisão da carreira acompanha o acesso ou rebaixamento ao fim da temporada.
  // A Série D usa grupos regionais: apenas o líder do grupo sobe nesta simulação.
  const brazilianTiers = ['br-a', 'br-b', 'br-c', 'br-d'] as const;
  const tierIndex = brazilianTiers.indexOf(career.divisionId as typeof brazilianTiers[number]);
  const division = getDivision(career.divisionId);
  const promotedSlots = career.divisionId === 'br-d' ? 1 : (division?.promotionPlaces ?? 0);
  const relegatedSlots = division?.relegationPlaces ?? 0;
  const position = historyEntry.finalPosition;
  const totalClubs = standings.length;
  let nextDivisionId = career.divisionId;
  if (tierIndex > 0 && promotedSlots > 0 && position <= promotedSlots) {
    nextDivisionId = brazilianTiers[tierIndex - 1]!;
  } else if (tierIndex >= 0 && tierIndex < brazilianTiers.length - 1 && relegatedSlots > 0 && position > totalClubs - relegatedSlots) {
    nextDivisionId = brazilianTiers[tierIndex + 1]!;
  }

  let nextLeagueClubIds = career.leagueClubIds;
  if (nextDivisionId !== career.divisionId) {
    const candidates = clubsForDivision(nextDivisionId).filter((candidate) => candidate.id !== career.clubId);
    // Para a Série D, o time entra em um grupo regional com clubes próximos.
    const regionalGroup = nextDivisionId === 'br-d'
      ? (candidates.find((candidate) => candidate.stateCode === club?.stateCode)?.competitionGroup ?? candidates[0]?.competitionGroup)
      : null;
    const rivals = regionalGroup
      ? candidates.filter((candidate) => candidate.competitionGroup === regionalGroup)
      : candidates;
    const participants = nextDivisionId === 'br-d' ? 6 : 20;
    nextLeagueClubIds = [career.clubId, ...rivals.slice(0, participants - 1).map((candidate) => candidate.id)];
  }
  const divisionChange = nextDivisionId !== career.divisionId
    ? (tierIndex > brazilianTiers.indexOf(nextDivisionId as typeof brazilianTiers[number]) ? 'Acesso' : 'Rebaixamento') + ' para ' + (getDivision(nextDivisionId)?.name ?? nextDivisionId)
    : null;

  let next: Career = {
    ...career,
    divisionId: nextDivisionId,
    leagueClubIds: nextLeagueClubIds,
    season: completedSeason + 1,
    roundIndex: 0,
    players,
    market: club ? makeCareerMarket(club).map((player) => initializePlayerCareerProfile(player, completedSeason + 1, 0)) : career.market,
    lineup,
    benchIds,
    captainId: nextCaptain,
    results: [],
    leagueFixtures: balanceClubVenueSequence(
      makeLeagueSchedule(completedSeason + 1, nextDivisionId, career.clubId, nextLeagueClubIds),
      career.clubId,
    ),
    seasonHistory: [...(career.seasonHistory ?? []), historyEntry],
    liveMatch: null,
    playerTransferOffers: [],
    administrationStaff: {
      board: shiftStaff(career.administrationStaff?.board ?? []),
      finance: shiftStaff(career.administrationStaff?.finance ?? []),
      legal: shiftStaff(career.administrationStaff?.legal ?? []),
    },
    sponsorships: {
      ...career.sponsorships,
      proposals: [],
      lastMarketRound: -1,
    },
    finance: {
      ...career.finance,
      seasonTransferSpend: 0,
      seasonTransferIncome: 0,
      seasonMatchdayIncome: 0,
      seasonWagesPaid: 0,
      seasonSponsorshipIncome: 0,
    },
    legalWorkloadEvents: Math.max(0, Math.floor((career.legalWorkloadEvents ?? 0) * 0.35)),
    lastNews: 'A temporada ' + completedYear + ' terminou. A temporada ' + (completedYear + 1) + ' começou com um novo calendário de ' + seasonRounds + ' rodadas.',
  };

  if (divisionChange) {
    next = addCareerNews(next, 'Mudança de divisão', divisionChange + '! A próxima temporada será disputada em uma nova divisão.', 'club');
  }
  next = addCareerNews(
    next,
    'Nova temporada iniciada',
    'Temporada ' + (completedYear + 1) + ': calendário renovado, elenco reapresentado e ' + seasonRounds + ' rodadas pela frente.',
    'club',
  );
  next = addCareerNews(
    next,
    'Fim da temporada ' + completedYear,
    'O clube terminou em ' + historyEntry.finalPosition + 'º lugar com ' + historyEntry.points + ' pontos. Campeão: ' + (champion?.club.name ?? '—') + '.',
    'match',
  );
  return next;
}

export function finalizeMatch(career: Career): Career {
  const game = career.liveMatch;
  if (!game || game.phase !== 'finished') return career;
  const roundFixtures = (career.leagueFixtures?.length ? career.leagueFixtures : makeLeagueSchedule(career.season, career.divisionId, career.clubId, career.leagueClubIds)).filter((fixture) => fixture.roundIndex === game.fixture.roundIndex);
  const newResults: LeagueResult[] = roundFixtures.map((fixture) => {
    const isUserMatch = fixture.id === game.fixture.id;
    const home = getClub(fixture.homeClubId);
    const away = getClub(fixture.awayClubId);
    if (!home || !away) throw new Error('Partida da liga sem clube válido.');
    const seed = hash(`${fixture.id}-${career.season}`);
    if (isUserMatch) {
      // O placar da simulação já segue mandante/visitante,
      // independentemente de o clube do usuário jogar em casa ou fora.
      return {
        ...fixture,
        homeGoals: game.homeGoals,
        awayGoals: game.awayGoals,
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
  const startedIds = new Set(game.startedPlayerIds ?? game.userLineup.map((slot) => slot.playerId));
  const eventPlayerIds = new Set(game.events.filter((item) => item.playerId && item.clubId === career.clubId).map((item) => item.playerId as string));
  const appearedIds = new Set([...(game.appearedPlayerIds ?? []), ...finalLineupIds, ...eventPlayerIds]);
  const updatedPlayers = career.players.map((player) => {
    const redEvent = game.events.find((item) => (item.type === 'red' || item.type === 'second_yellow') && item.playerId === player.id && item.clubId === career.clubId);
    const appeared = appearedIds.has(player.id);
    const started = startedIds.has(player.id);
    const scoredGoals = game.events.filter((item) => item.type === 'goal' && item.playerId === player.id && item.clubId === career.clubId).length;
    const overturnedGoals = game.events.filter((item) => item.type === 'var_overturn' && item.playerId === player.id && item.clubId === career.clubId).length;
    const goals = Math.max(0, scoredGoals - overturnedGoals);
    const yellows = game.events.filter((item) => (item.type === 'yellow' || item.type === 'second_yellow') && item.playerId === player.id && item.clubId === career.clubId).length;
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
      ...(redEvent ? {
        status: 'suspended' as const,
        suspendedUntilRound: game.fixture.roundIndex + 1,
        suspensionReason: player.suspensionReason ?? (redEvent.type === 'second_yellow' ? 'Expulso por segundo cartão amarelo' : 'Expulsão direta'),
      } : {}),
      ...(promiseActive && player.promisedMinutesUntilRound === career.roundIndex ? { promisedMinutesUntilRound: null } : {}),
    };
  });
  const revenue = gateIncome - wageBill;
  const leagueResult = { ...result, attendance };
  const resultText = isDraw ? 'Um ponto para cada lado.' : userWon ? 'Vitória! A torcida comemora.' : 'A diretoria espera uma reação na próxima rodada.';
  const redCardsThisMatch = game.events.filter((event) => (event.type === 'red' || event.type === 'second_yellow') && event.clubId === career.clubId).length;
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
  let afterMatch: Career = {
    ...career,
    players: playersWithHistory,
    results: [...career.results.filter((item) => item.roundIndex !== game.fixture.roundIndex), ...newResults],
    roundIndex: career.roundIndex + 1,
    balance: Math.max(0, career.balance + revenue),
    finance: {
      ...career.finance,
      seasonMatchdayIncome: (career.finance?.seasonMatchdayIncome ?? 0) + gateIncome,
      seasonWagesPaid: (career.finance?.seasonWagesPaid ?? 0) + wageBill,
    },
    boardTrust: clamp(career.boardTrust + trustDelta, 0, 100),
    fanTrust: clamp(career.fanTrust + (userWon ? 3 : isDraw ? 0 : -3), 0, 100),
    legalWorkloadEvents: Math.max(0, (career.legalWorkloadEvents ?? 0) + redCardsThisMatch + (lowMoraleCases > 0 ? 1 : 0)),
    liveMatch: null,
    lastResult: leagueResult,
    lastNews: `${resultText} Bilheteria de ${formatCurrency(gateIncome, career.currency)}; salários de ${formatCurrency(wageBill, career.currency)}.`,
  };
  if (gateIncome > 0) afterMatch = addFinanceEntry(afterMatch, { category: 'matchday', description: 'Bilheteria da rodada ' + (career.roundIndex + 1), amount: gateIncome });
  afterMatch = addFinanceEntry(afterMatch, { category: 'wages', description: 'Folha semanal do elenco', amount: -wageBill });
  afterMatch = addRoundJournal(afterMatch, newResults);
  const settled = processSquadSocialDynamics(settleSponsorshipsAfterMatch(afterMatch, userWon));
  if (settled.roundIndex >= getLeagueRoundCount(settled)) return advanceToNextSeason(settled);
  return generatePlayerTransferOffers(settled);
}

export function calculateStandings(results: LeagueResult[], clubIds?: string[]): StandingRow[] {
  const ids = clubIds?.length
    ? clubIds
    : Array.from(new Set(results.flatMap((result) => [result.homeClubId, result.awayClubId])));
  const base = ids.length ? ids.map((id) => getClub(id)).filter((club): club is Club => Boolean(club)) : CLUBS;
  const rows = base.map((club) => ({
    club, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
  for (const result of results) {
    const home = rows.find((row) => row.club.id === result.homeClubId);
    const away = rows.find((row) => row.club.id === result.awayClubId);
    if (!home || !away) continue;
    home.played += 1; away.played += 1;
    home.goalsFor += result.homeGoals; home.goalsAgainst += result.awayGoals;
    away.goalsFor += result.awayGoals; away.goalsAgainst += result.homeGoals;
    if (result.homeGoals > result.awayGoals) { home.wins += 1; home.points += 3; away.losses += 1; }
    else if (result.homeGoals < result.awayGoals) { away.wins += 1; away.points += 3; home.losses += 1; }
    else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }
  }
  return rows.sort((a, b) =>
    b.points - a.points
    || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    || b.goalsFor - a.goalsFor
    || a.club.name.localeCompare(b.club.name, 'pt-BR')
  );
}

export function calculateCareerStandings(career: Pick<Career, 'results' | 'leagueClubIds'>): StandingRow[] {
  return calculateStandings(career.results, career.leagueClubIds);
}

export function getCurrentLeaguePosition(career: Career): number {
  return calculateCareerStandings(career).findIndex((row) => row.club.id === career.clubId) + 1;
}

function migrateLeagueScheduleForCareer(parsed: Partial<Career>): Fixture[] {
  const season = parsed.season ?? 1;
  const currentRound = parsed.roundIndex ?? 0;
  const clubId = parsed.clubId;
  const parsedClub = clubId ? getClub(clubId) : undefined;
  const divisionId = (parsed as Career).divisionId ?? parsedClub?.divisionId ?? 'br-3';
  const leagueClubIds = Array.isArray((parsed as Career).leagueClubIds) && (parsed as Career).leagueClubIds.length
    ? (parsed as Career).leagueClubIds
    : (clubId ? clubsForDivision(divisionId, clubId).map((club) => club.id) : []);
  const generated = makeLeagueSchedule(season, divisionId, clubId, leagueClubIds);
  const generatedById = new Map(generated.map((fixture) => [fixture.id, fixture]));
  const saved = Array.isArray((parsed as Career).leagueFixtures) && (parsed as Career).leagueFixtures.length
    ? (parsed as Career).leagueFixtures
    : generated;

  let schedule = saved.map((fixture) => {
    const fallback = generatedById.get(fixture.id);
    return {
      ...fallback,
      ...fixture,
      competition: fixture.competition ?? 'league' as const,
      scheduledDate: fixture.scheduledDate ?? fallback?.scheduledDate,
    };
  });

  const resultById = new Map((parsed.results ?? []).map((result) => [result.id, result]));
  schedule = schedule.map((fixture) => {
    const result = resultById.get(fixture.id);
    if (!result) return fixture;
    return {
      ...fixture,
      homeClubId: result.homeClubId,
      awayClubId: result.awayClubId,
    };
  });

  const liveFixture = (parsed as Career).liveMatch?.fixture;
  if (liveFixture) {
    schedule = schedule.map((fixture) => fixture.id === liveFixture.id
      ? {
          ...fixture,
          homeClubId: liveFixture.homeClubId,
          awayClubId: liveFixture.awayClubId,
        }
      : fixture);
  }

  if (!clubId) return schedule;

  const completedVenues = (parsed.results ?? [])
    .filter((result) => result.homeClubId === clubId || result.awayClubId === clubId)
    .sort((a, b) => a.roundIndex - b.roundIndex)
    .map((result) => result.homeClubId === clubId ? 'H' as const : 'A' as const);

  return balanceClubVenueSequence(
    schedule,
    clubId,
    currentRound,
    completedVenues,
    liveFixture?.id,
  );
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
    const parsedClub = getClub(parsed.clubId)!;
    const parsedWeeklyWages = (parsed.players ?? []).reduce((sum, player) => sum + (player.wage ?? 0), 0);
    const fallbackFinance: Career['finance'] = {
      transferBudget: Math.round((typeof parsed.balance === 'number' ? parsed.balance : parsedClub.balance) * 0.42),
      weeklyWageBudget: Math.max(Math.round(parsedWeeklyWages * 1.18), parsedWeeklyWages + 25_000),
      debt: 0,
      seasonTransferSpend: 0,
      seasonTransferIncome: 0,
      seasonMatchdayIncome: 0,
      seasonWagesPaid: 0,
      seasonSponsorshipIncome: 0,
      ledger: [],
    };
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
    const migratedLeagueFixtures = migrateLeagueScheduleForCareer(parsed);
    const rawLiveMatch = (parsed as Career).liveMatch;
    const migratedLiveMatch: Career['liveMatch'] = rawLiveMatch ? {
      ...rawLiveMatch,
      homeStats: { ...EMPTY_STATS, ...(rawLiveMatch.homeStats ?? {}) },
      awayStats: { ...EMPTY_STATS, ...(rawLiveMatch.awayStats ?? {}) },
      substitutedOutIds: Array.isArray(rawLiveMatch.substitutedOutIds) ? rawLiveMatch.substitutedOutIds : [],
      startedPlayerIds: Array.isArray(rawLiveMatch.startedPlayerIds) ? rawLiveMatch.startedPlayerIds : rawLiveMatch.userLineup.map((slot) => slot.playerId),
      appearedPlayerIds: Array.isArray(rawLiveMatch.appearedPlayerIds) ? rawLiveMatch.appearedPlayerIds : rawLiveMatch.userLineup.map((slot) => slot.playerId),
      substitutionWindowsUsed: typeof rawLiveMatch.substitutionWindowsUsed === 'number' ? rawLiveMatch.substitutionWindowsUsed : 0,
      lastSubstitutionMinute: typeof rawLiveMatch.lastSubstitutionMinute === 'number' ? rawLiveMatch.lastSubstitutionMinute : null,
      yellowCardCounts: rawLiveMatch.yellowCardCounts ?? {},
      pausedForTactics: false,
      requiredSubstitutionPlayerId: rawLiveMatch.requiredSubstitutionPlayerId ?? null,
      pausedForVar: false,
      pendingVar: null,
      firstHalfAddedTime: typeof rawLiveMatch.firstHalfAddedTime === 'number' ? rawLiveMatch.firstHalfAddedTime : 0,
      secondHalfAddedTime: typeof rawLiveMatch.secondHalfAddedTime === 'number' ? rawLiveMatch.secondHalfAddedTime : 0,
      referee: rawLiveMatch.referee ?? { name: 'Árbitro da partida', strictness: 55, advantage: 50, varSensitivity: 55 },
    } : null;
    const fallbackNewsFeed: Career['newsFeed'] = [];
    const fallbackUpgrades: Career['stadiumUpgrades'] = {
      stands: Math.max(1, Math.min(5, (parsed.stadiumLevel ?? 0) + 1)),
      pitch: 1, roof: 0, lighting: 1, seats: 1, boxes: 0,
      scoreboard: 0, security: 1, turnstiles: 1, parking: 0, drainage: 0, irrigation: 0,
    };
    const parsedCurrency: CurrencyCode = (parsed as Career).currency ?? 'BRL';
    activeDisplayCurrency = parsedCurrency;
    return {
      ...(parsed as Career),
      divisionId: (parsed as Career).divisionId ?? parsedClub.divisionId,
      currency: parsedCurrency,
      finance: { ...fallbackFinance, ...((parsed as Career).finance ?? {}), ledger: Array.isArray((parsed as Career).finance?.ledger) ? (parsed as Career).finance.ledger : [] },
      leagueClubIds: Array.isArray((parsed as Career).leagueClubIds) && (parsed as Career).leagueClubIds.length
        ? (parsed as Career).leagueClubIds
        : clubsForDivision((parsed as Career).divisionId ?? parsedClub.divisionId, parsed.clubId).map((club) => club.id),
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
      setPieceTakers: (parsed as Career).setPieceTakers ?? { penalties: null, freeKicks: null, leftCorners: null, rightCorners: null },
      sponsorships: {
        ...fallbackSponsorships,
        ...rawSponsorships,
        proposals: migratedProposals,
        contracts: migratedContracts,
        history: Array.isArray(rawSponsorships.history) ? rawSponsorships.history : [],
      },
      playerTransferOffers: Array.isArray((parsed as Career).playerTransferOffers) ? (parsed as Career).playerTransferOffers : [],
      seasonHistory: Array.isArray((parsed as Career).seasonHistory) ? (parsed as Career).seasonHistory : [],
      leagueFixtures: migratedLeagueFixtures,
      liveMatch: migratedLiveMatch,
      newsFeed: Array.isArray((parsed as Career).newsFeed) ? (parsed as Career).newsFeed : fallbackNewsFeed,
    };
  } catch {
    return null;
  }
}

export function formatCurrency(amount: number, currency: CurrencyCode = activeDisplayCurrency): string {
  return convertCurrency(amount, currency).toLocaleString('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
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

export type TransferNegotiationResult = 'completed' | 'club_rejected' | 'player_rejected' | 'budget' | 'squad_full' | 'not_found';

export function negotiateTransferPurchase(
  career: Career,
  playerId: string,
  transferBid: number,
  weeklyWage: number,
  signingBonus: number,
): { career: Career; result: TransferNegotiationResult; counterOffer?: number; wageDemand?: number } {
  const player = career.market.find((item) => item.id === playerId);
  if (!player) return { career, result: 'not_found' };
  if (career.players.length >= 65) return { career, result: 'squad_full' };

  const seller = player.currentClubId ? getClub(player.currentClubId) : undefined;
  const seed = hash('negotiation-' + career.id + '-' + player.id + '-' + career.roundIndex);
  const sellerPremium = seller
    ? 0.94 + Math.min(0.16, Math.max(0, seller.rating - (getClub(career.clubId)?.rating ?? 65)) * 0.008) + (seed % 7) / 100
    : 0.90 + (seed % 8) / 100;
  const minimumFee = Math.round(player.value * sellerPremium);
  const wageFactor = 0.97 + ((seed >>> 5) % 12) / 100;
  const minimumWage = Math.round(player.wage * wageFactor / 100) * 100;
  const minimumBonus = Math.max(player.wage * 2, Math.round((player.signingBonus ?? player.wage * 3) * 0.75));

  const fee = Math.max(0, Math.round(transferBid));
  const wage = Math.max(0, Math.round(weeklyWage / 100) * 100);
  const bonus = Math.max(0, Math.round(signingBonus));

  if (fee < minimumFee) {
    return {
      career,
      result: 'club_rejected',
      counterOffer: Math.round(Math.max(minimumFee, fee * 1.08) / 1000) * 1000,
    };
  }

  if (wage < minimumWage || bonus < minimumBonus) {
    return {
      career,
      result: 'player_rejected',
      wageDemand: Math.round(Math.max(minimumWage, wage * 1.05) / 100) * 100,
    };
  }

  const currentWages = career.players.reduce((sum, item) => sum + item.wage, 0);
  const transferBudget = career.finance?.transferBudget ?? career.balance;
  const wageBudget = career.finance?.weeklyWageBudget ?? Number.POSITIVE_INFINITY;
  const totalCashCost = fee + bonus;
  if (
    transferBudget < fee
    || career.balance < totalCashCost
    || currentWages + wage > wageBudget
  ) {
    return { career, result: 'budget' };
  }

  const signedPlayer = initializePlayerCareerProfile({
    ...player,
    wage,
    signingBonus: bonus,
    status: 'available',
    fitness: 90,
    morale: 72,
    currentClubId: career.clubId,
  }, career.season, career.roundIndex);

  let next: Career = {
    ...career,
    balance: career.balance - totalCashCost,
    finance: {
      ...career.finance,
      transferBudget: Math.max(0, transferBudget - fee),
      seasonTransferSpend: (career.finance?.seasonTransferSpend ?? 0) + fee,
    },
    players: [...career.players, signedPlayer],
    market: career.market.filter((item) => item.id !== playerId),
    lastNews: player.name + ' assinou com ' + getClubName(career.clubId) + ' após negociação com ' + (seller?.name ?? 'o clube vendedor') + '.',
  };
  next = addFinanceEntry(next, { category: 'transfer_out', description: 'Transferência - ' + player.name, amount: -fee });
  next = addFinanceEntry(next, { category: 'other', description: 'Luvas - ' + player.name, amount: -bonus });
  next = addCareerNews(
    next,
    'Reforço confirmado',
    player.name + ' chega de ' + (seller?.name ?? 'outro clube') + ' por ' + formatCurrency(fee, career.currency) + ', salário de ' + formatCurrency(wage, career.currency) + '/semana.',
    'market',
  );
  return { career: next, result: 'completed' };
}

export function addTransferPlayer(career: Career, playerId: string): Career {
  const player = career.market.find((item) => item.id === playerId);
  const finance = career.finance;
  const currentWages = career.players.reduce((sum, item) => sum + item.wage, 0);
  const canAffordTransfer = (finance?.transferBudget ?? career.balance) >= (player?.value ?? Number.POSITIVE_INFINITY);
  const canAffordWage = player ? currentWages + player.wage <= (finance?.weeklyWageBudget ?? Number.POSITIVE_INFINITY) : false;
  if (!player || career.balance < player.value || !canAffordTransfer || !canAffordWage || career.players.length >= 65) return career;

  let next: Career = {
    ...career,
    balance: career.balance - player.value,
    finance: {
      ...finance,
      transferBudget: Math.max(0, (finance?.transferBudget ?? career.balance) - player.value),
      seasonTransferSpend: (finance?.seasonTransferSpend ?? 0) + player.value,
    },
    players: [...career.players, initializePlayerCareerProfile({ ...player, status: 'available', fitness: 90, morale: 70, currentClubId: career.clubId }, career.season, career.roundIndex)],
    market: career.market.filter((item) => item.id !== playerId),
    lastNews: `${player.name} assinou com ${getClubName(career.clubId)} por ${formatCurrency(player.value, career.currency)}.`,
  };
  next = addFinanceEntry(next, { category: 'transfer_out', description: 'Compra de ' + player.name, amount: -player.value });
  return next;
}

export function sellPlayer(career: Career, playerId: string): Career {
  if (career.players.length <= 18 || career.lineup.some((slot) => slot.playerId === playerId) || career.benchIds.includes(playerId)) return career;
  const player = career.players.find((item) => item.id === playerId);
  if (!player) return career;
  const saleValue = Math.round(player.value * 0.75);
  const reinvestment = Math.round(saleValue * 0.82);
  let next: Career = {
    ...career,
    balance: career.balance + saleValue,
    finance: {
      ...career.finance,
      transferBudget: (career.finance?.transferBudget ?? 0) + reinvestment,
      seasonTransferIncome: (career.finance?.seasonTransferIncome ?? 0) + saleValue,
    },
    players: career.players.filter((item) => item.id !== playerId),
    lastNews: `${player.name} foi negociado por ${formatCurrency(saleValue, career.currency)}. A diretoria liberou ${formatCurrency(reinvestment, career.currency)} para reinvestimento.`,
  };
  next = addFinanceEntry(next, { category: 'transfer_in', description: 'Venda de ' + player.name, amount: saleValue });
  return next;
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
  const newWage = Math.round(player.wage * (1.06 + seasons * 0.025));
  const currentWages = career.players.reduce((sum, item) => sum + item.wage, 0);
  const projectedWages = currentWages - player.wage + newWage;
  if (career.balance < signingCost || projectedWages > (career.finance?.weeklyWageBudget ?? Number.POSITIVE_INFINITY)) return career;
  const seasonRounds = Math.max(1, getLeagueRoundCount(career));
  const extension = seasonRounds * seasons;
  const currentEnd = player.contractEndRound ?? career.roundIndex + seasonRounds;
  let nextRenewal: Career = {
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
  };
  nextRenewal = addFinanceEntry(nextRenewal, { category: 'other', description: 'Luvas de renovação - ' + player.name, amount: -signingCost });
  return addCareerNews(nextRenewal, 'Contrato renovado', player.name + ' renovou por mais ' + seasons + ' temporada(s).', 'club');
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

function transferInterestClubs(career: Career): Club[] {
  const current = getClub(career.clubId);
  return CLUBS
    .filter((club) => club.selectable !== false && club.id !== career.clubId)
    .sort((a, b) => {
      const da = Math.abs(a.rating - (current?.rating ?? 68));
      const db = Math.abs(b.rating - (current?.rating ?? 68));
      return da - db || a.name.localeCompare(b.name, 'pt-BR');
    });
}

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
    const interested = transferInterestClubs(career);
    // Hash é um unsigned uint32: deslocamento aritmético (>>) cria índices negativos.
    const clubName = interested.length ? interested[(seed >>> 5) % interested.length]!.name : 'Clube interessado';
    const amount = type === 'sale'
      ? Math.round(player.value * (0.72 + ((seed >>> 7) % 41) / 100))
      : Math.round(player.value * (0.05 + ((seed >>> 7) % 8) / 100));
    const durationRounds = type === 'loan' ? 8 + ((seed >>> 11) % 11) : 0;

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
    const reinvestment = Math.round(offer.amount * 0.82);
    let nextSale: Career = {
      ...career,
      balance: career.balance + offer.amount,
      finance: {
        ...career.finance,
        transferBudget: (career.finance?.transferBudget ?? 0) + reinvestment,
        seasonTransferIncome: (career.finance?.seasonTransferIncome ?? 0) + offer.amount,
      },
      players,
      lineup,
      benchIds,
      captainId: lineup.some((slot) => slot.playerId === career.captainId) ? career.captainId : (lineup[0]?.playerId ?? ''),
      playerTransferOffers: remainingOffers,
      lastNews: player.name + ' foi vendido ao ' + offer.clubName + ' por ' + formatCurrency(offer.amount, career.currency) + '.',
    };
    nextSale = addFinanceEntry(nextSale, { category: 'transfer_in', description: 'Venda de ' + player.name + ' para ' + offer.clubName, amount: offer.amount });
    return addCareerNews(nextSale, 'Transferência concluída', player.name + ' foi vendido ao ' + offer.clubName + ' por ' + formatCurrency(offer.amount, career.currency) + '.', 'market');
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
  let nextLoan: Career = {
    ...career,
    balance: career.balance + offer.amount,
    finance: {
      ...career.finance,
      seasonTransferIncome: (career.finance?.seasonTransferIncome ?? 0) + offer.amount,
    },
    players: loanedPlayers,
    lineup: lineupAfterLoan,
    benchIds: benchAfterLoan,
    captainId: lineupAfterLoan.some((slot) => slot.playerId === career.captainId) ? career.captainId : (lineupAfterLoan[0]?.playerId ?? ''),
    playerTransferOffers: remainingOffers,
    lastNews: player.name + ' foi emprestado ao ' + offer.clubName + '.',
  };
  nextLoan = addFinanceEntry(nextLoan, { category: 'transfer_in', description: 'Taxa de empréstimo - ' + player.name, amount: offer.amount });
  return addCareerNews(nextLoan, 'Jogador emprestado', player.name + ' saiu por empréstimo para o ' + offer.clubName + ' por ' + offer.durationRounds + ' rodadas.', 'market');
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
  let next: Career = {
    ...career,
    balance: career.balance - cost,
    headquartersUpgrades: { ...career.headquartersUpgrades, [key]: current + 1 },
    lastNews: `A sede recebeu investimento em ${names[key]}. Estrutura agora no nível ${current + 1}.`,
  };
  next = addFinanceEntry(next, { category: 'infrastructure', description: 'Melhoria da sede - ' + names[key], amount: -cost });
  return next;
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
  let next: Career = {
    ...career,
    balance: career.balance - cost,
    stadiumLevel: nextStadiumLevel,
    stadiumUpgrades: upgrades,
    lastNews: `O estádio recebeu uma melhoria em ${names[key]}. Estrutura agora no nível ${current + 1}.`,
  };
  next = addFinanceEntry(next, { category: 'infrastructure', description: 'Melhoria do estádio - ' + names[key], amount: -cost });
  return next;
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
