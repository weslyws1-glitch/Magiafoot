export type Position =
  | 'GOL'
  | 'ZAG'
  | 'LE'
  | 'LD'
  | 'VOL'
  | 'MC'
  | 'MEI'
  | 'PE'
  | 'PD'
  | 'ATA';

export type PlayerStatus = 'available' | 'injured' | 'suspended';
export type FormationId = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
export type MatchPhase = 'pregame' | 'first_half' | 'halftime' | 'second_half' | 'finished';
export type Mentality = 'cautelosa' | 'equilibrada' | 'ofensiva';
export type Intensity = 'baixa' | 'normal' | 'alta';
export type StadiumUpgradeKey = 'stands' | 'pitch' | 'roof' | 'lighting' | 'seats' | 'boxes' | 'scoreboard' | 'security' | 'turnstiles' | 'parking' | 'drainage' | 'irrigation';
export type HeadquartersUpgradeKey = 'board' | 'finance' | 'meeting' | 'legal' | 'technology' | 'marketing' | 'sponsors' | 'commercial' | 'store' | 'members' | 'museum' | 'press' | 'events' | 'history';
export type HeadquartersRevenueKey = 'store' | 'members' | 'events';

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  strength: number;
  fitness: number;
  morale: number;
  status: PlayerStatus;
  injuryUntilRound: number | null;
  suspendedUntilRound: number | null;
  value: number;
  wage: number;
}

export interface Club {
  id: string;
  name: string;
  city: string;
  initials: string;
  rating: number;
  color: string;
  balance: number;
  stadiumCapacity: number;
  ticketPrice: number;
}

export interface FormationSlot {
  id: string;
  position: Position;
  x: number;
  y: number;
  playerId: string;
  sentOff?: boolean;
  offReason?: 'red' | 'injury';
}

export interface FormationOption {
  id: FormationId;
  label: string;
  slots: Omit<FormationSlot, 'playerId' | 'sentOff' | 'offReason'>[];
}

export interface Tactics {
  mentality: Mentality;
  pressure: Intensity;
  tempo: Intensity;
}

export interface Fixture {
  id: string;
  roundIndex: number;
  homeClubId: string;
  awayClubId: string;
}

export interface LeagueResult extends Fixture {
  homeGoals: number;
  awayGoals: number;
  attendance: number;
}

export interface MatchStats {
  shots: number;
  saves: number;
  fouls: number;
  offsides: number;
  corners: number;
  yellowCards: number;
  redCards: number;
  injuries: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type:
    | 'kickoff'
    | 'goal'
    | 'shot'
    | 'save'
    | 'foul'
    | 'offside'
    | 'corner'
    | 'yellow'
    | 'red'
    | 'medical'
    | 'substitution'
    | 'halftime'
    | 'second_half'
    | 'fulltime';
  clubId?: string;
  playerId?: string;
  text: string;
}

export interface MatchSession {
  fixture: Fixture;
  userClubId: string;
  phase: MatchPhase;
  minute: number;
  homeGoals: number;
  awayGoals: number;
  homeStats: MatchStats;
  awayStats: MatchStats;
  userLineup: FormationSlot[];
  userBenchIds: string[];
  substitutionsUsed: number;
  events: MatchEvent[];
  randomSeed: number;
}

export interface Career {
  schemaVersion: 1;
  id: string;
  coachName: string;
  clubId: string;
  season: number;
  roundIndex: number;
  players: Player[];
  market: Player[];
  formationId: FormationId;
  lineup: FormationSlot[];
  benchIds: string[];
  captainId: string;
  tactics: Tactics;
  boardTrust: number;
  balance: number;
  stadiumLevel: number;
  ticketPrice: number;
  stadiumUpgrades: Record<StadiumUpgradeKey, number>;
  headquartersUpgrades: Record<HeadquartersUpgradeKey, number>;
  headquartersRevenuePricing: Record<HeadquartersRevenueKey, number>;
  results: LeagueResult[];
  liveMatch: MatchSession | null;
  lastResult: LeagueResult | null;
  lastNews: string;
  createdAt: string;
}

export interface StandingRow {
  club: Club;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}
