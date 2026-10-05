export interface Team {
  id: string;
  name: string;
  shortName: string;
  city: string;
  competitionIds: string[];
}

export interface Competition {
  id: string;
  name: string;
  region: string;
  format: string;
  teamCount: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  competitionId: string;
  dayOffset: number;
  kickoff: string;
}

export const teams: Team[] = [
  { id: 'palmeiras', name: 'Palmeiras', shortName: 'PAL', city: 'São Paulo, SP', competitionIds: ['brasileirao', 'libertadores', 'copa-brasil'] },
  { id: 'flamengo', name: 'Flamengo', shortName: 'FLA', city: 'Rio de Janeiro, RJ', competitionIds: ['brasileirao', 'libertadores', 'copa-brasil'] },
  { id: 'botafogo', name: 'Botafogo', shortName: 'BOT', city: 'Rio de Janeiro, RJ', competitionIds: ['brasileirao', 'libertadores', 'copa-brasil'] },
  { id: 'fluminense', name: 'Fluminense', shortName: 'FLU', city: 'Rio de Janeiro, RJ', competitionIds: ['brasileirao', 'libertadores', 'copa-brasil'] },
  { id: 'sao-paulo', name: 'São Paulo', shortName: 'SAO', city: 'São Paulo, SP', competitionIds: ['brasileirao', 'libertadores', 'copa-brasil'] },
  { id: 'corinthians', name: 'Corinthians', shortName: 'COR', city: 'São Paulo, SP', competitionIds: ['brasileirao', 'copa-brasil'] },
  { id: 'santos', name: 'Santos', shortName: 'SAN', city: 'Santos, SP', competitionIds: ['brasileirao', 'copa-brasil'] },
  { id: 'gremio', name: 'Grêmio', shortName: 'GRE', city: 'Porto Alegre, RS', competitionIds: ['brasileirao', 'copa-brasil'] },
  { id: 'internacional', name: 'Internacional', shortName: 'INT', city: 'Porto Alegre, RS', competitionIds: ['brasileirao', 'copa-brasil'] },
  { id: 'cruzeiro', name: 'Cruzeiro', shortName: 'CRU', city: 'Belo Horizonte, MG', competitionIds: ['brasileirao', 'copa-brasil'] },
  { id: 'atletico-mg', name: 'Atlético Mineiro', shortName: 'CAM', city: 'Belo Horizonte, MG', competitionIds: ['brasileirao', 'libertadores', 'copa-brasil'] },
  { id: 'barcelona', name: 'Barcelona', shortName: 'BAR', city: 'Barcelona, Espanha', competitionIds: ['champions'] },
  { id: 'real-madrid', name: 'Real Madrid', shortName: 'RMA', city: 'Madrid, Espanha', competitionIds: ['champions'] },
  { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', city: 'Liverpool, Inglaterra', competitionIds: ['champions'] },
  { id: 'bayern', name: 'Bayern de Munique', shortName: 'BAY', city: 'Munique, Alemanha', competitionIds: ['champions'] },
];

export const competitions: Competition[] = [
  { id: 'brasileirao', name: 'Brasileirão', region: 'Brasil', format: 'Pontos corridos', teamCount: '20 clubes' },
  { id: 'libertadores', name: 'Libertadores', region: 'América do Sul', format: 'Mata-mata', teamCount: 'Clubes sul-americanos' },
  { id: 'copa-brasil', name: 'Copa do Brasil', region: 'Brasil', format: 'Mata-mata', teamCount: 'Clubes brasileiros' },
  { id: 'champions', name: 'Champions League', region: 'Europa', format: 'Fase de liga', teamCount: 'Clubes europeus' },
];

export const matches: Match[] = [
  { id: 'match-1', homeTeamId: 'palmeiras', awayTeamId: 'flamengo', competitionId: 'brasileirao', dayOffset: 0, kickoff: '19:30' },
  { id: 'match-2', homeTeamId: 'gremio', awayTeamId: 'internacional', competitionId: 'brasileirao', dayOffset: 0, kickoff: '21:00' },
  { id: 'match-3', homeTeamId: 'sao-paulo', awayTeamId: 'botafogo', competitionId: 'libertadores', dayOffset: 1, kickoff: '20:00' },
  { id: 'match-4', homeTeamId: 'fluminense', awayTeamId: 'corinthians', competitionId: 'copa-brasil', dayOffset: 1, kickoff: '21:30' },
  { id: 'match-5', homeTeamId: 'barcelona', awayTeamId: 'bayern', competitionId: 'champions', dayOffset: 2, kickoff: '16:00' },
  { id: 'match-6', homeTeamId: 'cruzeiro', awayTeamId: 'atletico-mg', competitionId: 'brasileirao', dayOffset: 3, kickoff: '20:30' },
  { id: 'match-7', homeTeamId: 'liverpool', awayTeamId: 'real-madrid', competitionId: 'champions', dayOffset: 4, kickoff: '16:00' },
  { id: 'match-8', homeTeamId: 'santos', awayTeamId: 'palmeiras', competitionId: 'copa-brasil', dayOffset: 5, kickoff: '18:30' },
];

export function getTeam(id: string): Team | undefined {
  return teams.find((team) => team.id === id);
}

export function getCompetition(id: string): Competition | undefined {
  return competitions.find((competition) => competition.id === id);
}

export function getMatchDate(dayOffset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date;
}

export function formatMatchDate(dayOffset: number): string {
  if (dayOffset === 0) return 'Hoje';
  if (dayOffset === 1) return 'Amanhã';
  return getMatchDate(dayOffset).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}
