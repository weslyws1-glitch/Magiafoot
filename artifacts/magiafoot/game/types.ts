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

export type PlayerStatus = 'available' | 'injured' | 'suspended' | 'loaned';
export type FormationId = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
export type MatchPhase = 'pregame' | 'first_half' | 'halftime' | 'second_half' | 'finished';
export type Mentality = 'cautelosa' | 'equilibrada' | 'ofensiva';
export type Intensity = 'baixa' | 'normal' | 'alta';
export type StadiumUpgradeKey = 'stands' | 'pitch' | 'roof' | 'lighting' | 'seats' | 'boxes' | 'scoreboard' | 'security' | 'turnstiles' | 'parking' | 'drainage' | 'irrigation';
export type HeadquartersUpgradeKey = 'board' | 'finance' | 'meeting' | 'legal' | 'technology' | 'marketing' | 'sponsors' | 'commercial' | 'store' | 'members' | 'museum' | 'press' | 'events' | 'history';
export type HeadquartersRevenueKey = 'store' | 'members' | 'events';
export type HeadquartersImageKey = 'museum' | 'press' | 'history';
export type HeadquartersInvestmentKey = 'marketing' | 'commercial';
export type AdministrationDepartmentKey = 'board' | 'finance' | 'legal';
export type TrainingCenterUpgradeKey = 'field' | 'medical' | 'physio' | 'gym' | 'analysis';
export type PlayerPersonality = 'profissional' | 'lider' | 'ambicioso' | 'tranquilo' | 'temperamental' | 'festeiro';
export type PlayerSquadRole = 'estrela' | 'titular' | 'rotacao' | 'reserva' | 'jovem';
export type PlayerMarketStatus = 'inegociavel' | 'disponivel' | 'negociavel' | 'emprestimo';
export type PlayerTrainingFocus = 'equilibrado' | 'fisico' | 'tecnica' | 'finalizacao' | 'passe' | 'marcacao';

export interface PlayerSeasonStats {
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  ratingSum: number;
  ratedMatches: number;
}

export interface PlayerCareerEvent {
  id: string;
  roundIndex: number;
  season: number;
  type: 'match' | 'contract' | 'social' | 'discipline' | 'transfer' | 'promise';
  title: string;
  detail: string;
}

export interface PlayerTransferOffer {
  id: string;
  playerId: string;
  clubName: string;
  type: 'sale' | 'loan';
  amount: number;
  durationRounds: number;
  expiresRound: number;
}

export interface PlayerSkills {
  technique: number;
  passing: number;
  shooting: number;
  defending: number;
  pace: number;
  physical: number;
  goalkeeping: number;
}

export interface AdministrativeProfessional {
  id: string;
  name: string;
  department: AdministrationDepartmentKey;
  role: string;
  quality: number;
  salary: number;
  hireCost: number;
  fireCost: number;
  hiredRound: number;
  contractRounds: number;
  contractEndRound: number;
}

export type AdministrationStaff = Record<AdministrationDepartmentKey, AdministrativeProfessional[]>;
export type SponsorshipSlot = 'principal' | 'sleeve' | 'back' | 'shorts' | 'stadium' | 'training_center' | 'headquarters' | 'media_wall' | 'institutional';

export interface CareerNewsItem {
  id: string;
  roundIndex: number;
  category: 'club' | 'match' | 'sponsor' | 'market';
  title: string;
  body: string;
}

export interface SponsorshipProposal {
  id: string;
  sponsorName: string;
  category: string;
  slot: SponsorshipSlot;
  signingBonus: number;
  perMatch: number;
  winBonus: number;
  durationMatches: number;
  expiresRound: number;
  fanImpact: number;
  boardImpact: number;
  prestige: number;
  note: string;
  qualificationBonus: number;
  titleBonus: number;
  attendanceBonus: number;
  attendanceTarget: number;
  exitFanTrustBelow: number;
  exclusivityCategory: boolean;
  expectedValue: number;
  negotiationRound: number;
}

export interface SponsorshipContract extends SponsorshipProposal {
  acceptedRound: number;
  matchesRemaining: number;
  totalEarned: number;
  renewalOffered?: boolean;
}

export interface SponsorshipState {
  proposals: SponsorshipProposal[];
  contracts: SponsorshipContract[];
  lastMarketRound: number;
  history: string[];
}

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
  shirtNumber?: number;
  potential?: number;
  skills?: PlayerSkills;
  secondaryPositions?: Position[];
  personality?: PlayerPersonality;
  squadRole?: PlayerSquadRole;
  marketStatus?: PlayerMarketStatus;
  trainingFocus?: PlayerTrainingFocus;
  contractEndRound?: number;
  releaseClause?: number;
  signingBonus?: number;
  relationship?: number;
  playingTimeSatisfaction?: number;
  socialRisk?: number;
  leadership?: number;
  promisedMinutesUntilRound?: number | null;
  seasonStats?: PlayerSeasonStats;
  careerEvents?: PlayerCareerEvent[];
  conflictLevel?: number;
  socialStatus?: 'estavel' | 'atencao' | 'conturbada';
  lastSocialEventRound?: number;
  loanedOutUntilRound?: number | null;
  loanClubName?: string | null;
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
  fanTrust: number;
  legalWorkloadEvents: number;
  balance: number;
  stadiumLevel: number;
  ticketPrice: number;
  stadiumUpgrades: Record<StadiumUpgradeKey, number>;
  headquartersUpgrades: Record<HeadquartersUpgradeKey, number>;
  headquartersRevenuePricing: Record<HeadquartersRevenueKey, number>;
  headquartersImageAcquisition: Record<HeadquartersImageKey, number>;
  headquartersInvestments: Record<HeadquartersInvestmentKey, number>;
  administrationStaff: AdministrationStaff;
  trainingCenterUpgrades: Record<TrainingCenterUpgradeKey, number>;
  sponsorships: SponsorshipState;
  playerTransferOffers: PlayerTransferOffer[];
  results: LeagueResult[];
  liveMatch: MatchSession | null;
  lastResult: LeagueResult | null;
  lastNews: string;
  newsFeed: CareerNewsItem[];
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
