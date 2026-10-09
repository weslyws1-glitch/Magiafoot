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
export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export interface FinanceTransaction {
  id: string;
  season: number;
  roundIndex: number;
  date: string;
  category: 'matchday' | 'wages' | 'transfer_in' | 'transfer_out' | 'sponsorship' | 'infrastructure' | 'staff' | 'commercial' | 'other';
  description: string;
  amount: number;
}

export interface FinanceState {
  transferBudget: number;
  weeklyWageBudget: number;
  debt: number;
  seasonTransferSpend: number;
  seasonTransferIncome: number;
  seasonMatchdayIncome: number;
  seasonWagesPaid: number;
  seasonSponsorshipIncome: number;
  ledger: FinanceTransaction[];
}

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
  dribbling: number;
  crossing: number;
  heading: number;
  positioning: number;
  vision: number;
  setPieces: number;
  penalties: number;
  tackling: number;
  composure: number;
  decisions: number;
  goalkeepingReflexes: number;
  goalkeepingRushing: number;
  goalkeepingHandling: number;
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
  injuryDaysRemaining?: number;
  injuryName?: string | null;
  suspensionReason?: string | null;
  value: number;
  wage: number;
  nationality?: string;
  nationalityCode?: string;
  currentClubId?: string | null;
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
  country: string;
  countryCode: string;
  divisionId: string;
  divisionName: string;
  divisionLevel: number;
  nativeCurrency: CurrencyCode;
  badgeUrl?: string | null;
  selectable?: boolean;
  stateCode?: string | null;
  competitionGroup?: string | null;
  prestige?: number;
  fanBase?: number;
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
  competition?: 'league' | 'cup';
  scheduledDate?: string;
}

export interface LeagueResult extends Fixture {
  homeGoals: number;
  awayGoals: number;
  attendance: number;
}

export interface SeasonHistoryEntry {
  season: number;
  year: number;
  finalPosition: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  championClubId: string;
}

export interface MatchStats {
  shots: number;
  shotsOnTarget: number;
  bigChances: number;
  saves: number;
  fouls: number;
  offsides: number;
  corners: number;
  yellowCards: number;
  redCards: number;
  injuries: number;
  penalties: number;
  handballs: number;
  advantages: number;
  varReviews: number;
  throwIns: number;
  goalKicks: number;
  freeKicks: number;
  passes: number;
  completedPasses: number;
  possessionTicks: number;
  xg: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type:
    | 'kickoff'
    | 'goal'
    | 'shot'
    | 'save'
    | 'post'
    | 'foul'
    | 'advantage'
    | 'free_kick'
    | 'penalty'
    | 'handball'
    | 'offside'
    | 'corner'
    | 'throw_in'
    | 'goal_kick'
    | 'keeper_8s'
    | 'yellow'
    | 'second_yellow'
    | 'red'
    | 'medical'
    | 'injury_forced_sub'
    | 'substitution'
    | 'var_start'
    | 'var_end'
    | 'var_overturn'
    | 'stoppage_time'
    | 'halftime'
    | 'second_half'
    | 'fulltime';
  clubId?: string;
  playerId?: string;
  text: string;
}

export interface PendingVarReview {
  id: string;
  reason: 'goal' | 'penalty' | 'red_card' | 'second_yellow' | 'corner';
  clubId?: string;
  playerId?: string;
  decision: 'confirmed' | 'overturned';
  headline: string;
  detail: string;
  reverseGoalForClubId?: string;
  awardPenaltyToClubId?: string;
}

export interface MatchReferee {
  name: string;
  strictness: number;
  advantage: number;
  varSensitivity: number;
}

export interface SetPieceTakers {
  penalties: string | null;
  freeKicks: string | null;
  leftCorners: string | null;
  rightCorners: string | null;
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
  substitutionWindowsUsed: number;
  lastSubstitutionMinute: number | null;
  substitutedOutIds: string[];
  startedPlayerIds: string[];
  appearedPlayerIds: string[];
  yellowCardCounts: Record<string, number>;
  pausedForTactics: boolean;
  requiredSubstitutionPlayerId: string | null;
  pausedForVar: boolean;
  pendingVar: PendingVarReview | null;
  firstHalfAddedTime: number;
  secondHalfAddedTime: number;
  referee: MatchReferee;
  events: MatchEvent[];
  randomSeed: number;
}

export interface Career {
  schemaVersion: 1;
  id: string;
  coachName: string;
  clubId: string;
  divisionId: string;
  currency: CurrencyCode;
  season: number;
  roundIndex: number;
  players: Player[];
  market: Player[];
  formationId: FormationId;
  lineup: FormationSlot[];
  benchIds: string[];
  captainId: string;
  tactics: Tactics;
  setPieceTakers: SetPieceTakers;
  boardTrust: number;
  fanTrust: number;
  legalWorkloadEvents: number;
  balance: number;
  finance: FinanceState;
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
  leagueClubIds: string[];
  leagueFixtures: Fixture[];
  seasonHistory: SeasonHistoryEntry[];
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
