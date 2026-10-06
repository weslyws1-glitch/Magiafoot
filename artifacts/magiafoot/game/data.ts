import type { Club, FormationId, FormationOption, FormationSlot, Player, Position } from './types.ts';

export const LEAGUE_NAME = '3ª Divisão';

export const CLUBS: Club[] = [
  { id: 'aurora-vale', name: 'Aurora do Vale', city: 'Vale Sereno', initials: 'AV', rating: 73, color: '#286649', balance: 2_400_000, stadiumCapacity: 18_400, ticketPrice: 42 },
  { id: 'lobos-azuis', name: 'Lobos Azuis', city: 'Lago das Brumas', initials: 'LA', rating: 68, color: '#416b77', balance: 1_850_000, stadiumCapacity: 14_200, ticketPrice: 38 },
  { id: 'mare-prata', name: 'Maré de Prata', city: 'Costa da Lua', initials: 'MP', rating: 71, color: '#397984', balance: 2_100_000, stadiumCapacity: 20_000, ticketPrice: 40 },
  { id: 'oncas-serra', name: 'Onças da Serra', city: 'Serra do Luar', initials: 'OS', rating: 70, color: '#9d7738', balance: 1_900_000, stadiumCapacity: 15_500, ticketPrice: 36 },
  { id: 'navegantes-sul', name: 'Navegantes do Sul', city: 'Porto das Nuvens', initials: 'NS', rating: 66, color: '#587f92', balance: 1_550_000, stadiumCapacity: 13_000, ticketPrice: 34 },
  { id: 'candeia-fc', name: 'Candeia FC', city: 'Vila Candeia', initials: 'CF', rating: 69, color: '#836252', balance: 1_720_000, stadiumCapacity: 16_200, ticketPrice: 35 },
  { id: 'pedra-alta', name: 'Pedra Alta AC', city: 'Campos de Pedra', initials: 'PA', rating: 64, color: '#78736c', balance: 1_300_000, stadiumCapacity: 11_800, ticketPrice: 30 },
  { id: 'ventania-esporte', name: 'Ventania Esporte', city: 'Vale dos Ventos', initials: 'VE', rating: 67, color: '#667844', balance: 1_480_000, stadiumCapacity: 12_600, ticketPrice: 32 },
];

const ROSTER_SEED: { name: string; position: Position; age: number; skill: number }[] = [
  { name: 'Raul Venturi', position: 'GOL', age: 29, skill: 3 },
  { name: 'Nilo Serafim', position: 'GOL', age: 22, skill: -2 },
  { name: 'Ivo Cascata', position: 'GOL', age: 19, skill: -5 },
  { name: 'Caio Bravim', position: 'ZAG', age: 27, skill: 2 },
  { name: 'Léo Cedral', position: 'ZAG', age: 24, skill: 1 },
  { name: 'Davi Montês', position: 'ZAG', age: 30, skill: -1 },
  { name: 'Noá Brevil', position: 'ZAG', age: 20, skill: -4 },
  { name: 'Enzo Ricaldi', position: 'LE', age: 23, skill: 1 },
  { name: 'Juca Candeia', position: 'LE', age: 28, skill: -2 },
  { name: 'Tadeu Brumal', position: 'LD', age: 25, skill: 0 },
  { name: 'Ravi Miraluz', position: 'LD', age: 21, skill: -3 },
  { name: 'Beto Campina', position: 'VOL', age: 29, skill: 1 },
  { name: 'Natan Rios', position: 'VOL', age: 24, skill: 0 },
  { name: 'Iago Noreste', position: 'VOL', age: 20, skill: -4 },
  { name: 'Heitor Vernal', position: 'MC', age: 26, skill: 2 },
  { name: 'Cauê Mirante', position: 'MC', age: 23, skill: 1 },
  { name: 'Pietro Alvorada', position: 'MC', age: 19, skill: -3 },
  { name: 'Gael Cobalto', position: 'MEI', age: 25, skill: 3 },
  { name: 'Elian Arpoador', position: 'MEI', age: 22, skill: 0 },
  { name: 'Sávio Travessa', position: 'MEI', age: 18, skill: -4 },
  { name: 'Tomás Caleta', position: 'PE', age: 24, skill: 2 },
  { name: 'Luan Farol', position: 'PE', age: 20, skill: -1 },
  { name: 'Joél Nimba', position: 'PD', age: 27, skill: 1 },
  { name: 'Ícaro Ventori', position: 'PD', age: 21, skill: -2 },
  { name: 'Levi Pedra', position: 'ATA', age: 26, skill: 3 },
  { name: 'Túlio Dorsal', position: 'ATA', age: 23, skill: 0 },
];

export const FORMATIONS: FormationOption[] = [
  {
    id: '4-3-3',
    label: '4–3–3',
    slots: [
      { id: 'GOL-1', position: 'GOL', x: 50, y: 89 },
      { id: 'LE-1', position: 'LE', x: 16, y: 72 },
      { id: 'ZAG-1', position: 'ZAG', x: 39, y: 75 },
      { id: 'ZAG-2', position: 'ZAG', x: 61, y: 75 },
      { id: 'LD-1', position: 'LD', x: 84, y: 72 },
      { id: 'MC-1', position: 'MC', x: 25, y: 53 },
      { id: 'VOL-1', position: 'VOL', x: 50, y: 58 },
      { id: 'MEI-1', position: 'MEI', x: 75, y: 53 },
      { id: 'PE-1', position: 'PE', x: 17, y: 28 },
      { id: 'ATA-1', position: 'ATA', x: 50, y: 22 },
      { id: 'PD-1', position: 'PD', x: 83, y: 28 },
    ],
  },
  {
    id: '4-4-2',
    label: '4–4–2',
    slots: [
      { id: 'GOL-1', position: 'GOL', x: 50, y: 89 },
      { id: 'LE-1', position: 'LE', x: 16, y: 72 },
      { id: 'ZAG-1', position: 'ZAG', x: 39, y: 75 },
      { id: 'ZAG-2', position: 'ZAG', x: 61, y: 75 },
      { id: 'LD-1', position: 'LD', x: 84, y: 72 },
      { id: 'PE-1', position: 'PE', x: 15, y: 53 },
      { id: 'VOL-1', position: 'VOL', x: 38, y: 58 },
      { id: 'MC-1', position: 'MC', x: 62, y: 58 },
      { id: 'PD-1', position: 'PD', x: 85, y: 53 },
      { id: 'ATA-1', position: 'ATA', x: 36, y: 27 },
      { id: 'ATA-2', position: 'ATA', x: 64, y: 27 },
    ],
  },
  {
    id: '3-5-2',
    label: '3–5–2',
    slots: [
      { id: 'GOL-1', position: 'GOL', x: 50, y: 89 },
      { id: 'ZAG-1', position: 'ZAG', x: 25, y: 75 },
      { id: 'ZAG-2', position: 'ZAG', x: 50, y: 78 },
      { id: 'ZAG-3', position: 'ZAG', x: 75, y: 75 },
      { id: 'PE-1', position: 'PE', x: 14, y: 53 },
      { id: 'VOL-1', position: 'VOL', x: 32, y: 58 },
      { id: 'MC-1', position: 'MC', x: 50, y: 54 },
      { id: 'MEI-1', position: 'MEI', x: 68, y: 58 },
      { id: 'PD-1', position: 'PD', x: 86, y: 53 },
      { id: 'ATA-1', position: 'ATA', x: 36, y: 27 },
      { id: 'ATA-2', position: 'ATA', x: 64, y: 27 },
    ],
  },
  {
    id: '4-2-3-1',
    label: '4–2–3–1',
    slots: [
      { id: 'GOL-1', position: 'GOL', x: 50, y: 89 },
      { id: 'LE-1', position: 'LE', x: 16, y: 72 },
      { id: 'ZAG-1', position: 'ZAG', x: 39, y: 75 },
      { id: 'ZAG-2', position: 'ZAG', x: 61, y: 75 },
      { id: 'LD-1', position: 'LD', x: 84, y: 72 },
      { id: 'VOL-1', position: 'VOL', x: 37, y: 58 },
      { id: 'MC-1', position: 'MC', x: 63, y: 58 },
      { id: 'PE-1', position: 'PE', x: 19, y: 41 },
      { id: 'MEI-1', position: 'MEI', x: 50, y: 39 },
      { id: 'PD-1', position: 'PD', x: 81, y: 41 },
      { id: 'ATA-1', position: 'ATA', x: 50, y: 22 },
    ],
  },
];

const MARKET_SEED: { name: string; position: Position; age: number; skill: number }[] = [
  { name: 'Zélio Cambraia', position: 'ZAG', age: 21, skill: -2 },
  { name: 'Ravi Noral', position: 'MC', age: 23, skill: 1 },
  { name: 'Milo Arandú', position: 'ATA', age: 20, skill: 0 },
  { name: 'Breno Pontal', position: 'GOL', age: 27, skill: -1 },
  { name: 'Téo Maré', position: 'PE', age: 22, skill: 2 },
  { name: 'Nuno Vereda', position: 'VOL', age: 26, skill: 0 },
  { name: 'Luca Serejo', position: 'LD', age: 24, skill: 1 },
  { name: 'Jairo Lumiar', position: 'MEI', age: 28, skill: 3 },
  { name: 'Ciro Montano', position: 'ZAG', age: 25, skill: 0 },
  { name: 'Dênis Leme', position: 'PD', age: 19, skill: -1 },
  { name: 'Omar Estival', position: 'LE', age: 30, skill: -2 },
  { name: 'Ítalo Brisamar', position: 'MC', age: 18, skill: -3 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);

function makePlayer(
  source: { name: string; position: Position; age: number; skill: number },
  id: string,
  baseRating: number,
  offset: number,
): Player {
  const variation = ((hash(id) + offset * 17) % 7) - 3;
  const strength = clamp(baseRating + source.skill + variation, 43, 88);
  const ageCurve = Math.max(0.45, 1 - Math.abs(source.age - 24) * 0.025);
  return {
    id,
    name: source.name,
    position: source.position,
    age: source.age,
    strength,
    fitness: 76 + ((hash(source.name) + offset) % 25),
    morale: 62 + ((hash(id) + offset) % 30),
    status: 'available',
    injuryUntilRound: null,
    suspendedUntilRound: null,
    value: Math.round(strength * strength * 220 * ageCurve / 10_000) * 10_000,
    wage: Math.round((strength * 130 + Math.max(0, source.age - 29) * 300) / 100) * 100,
  };
}

export function makeRoster(club: Club): Player[] {
  return ROSTER_SEED.map((player, index) => makePlayer(player, `${club.id}-p${index + 1}`, club.rating, index));
}

export function makeMarketPlayers(club: Club): Player[] {
  return MARKET_SEED.map((player, index) => makePlayer(player, `market-${club.id}-${index + 1}`, club.rating - 1, index + 51));
}

function positionMatchScore(player: Player, target: Position): number {
  if (player.position === target) return 16;
  const families: Record<Position, string> = {
    GOL: 'goal', ZAG: 'back', LE: 'back', LD: 'back',
    VOL: 'mid', MC: 'mid', MEI: 'mid', PE: 'wing', PD: 'wing', ATA: 'attack',
  };
  return families[player.position] === families[target] ? 4 : -12;
}

export function buildBestLineup(players: Player[], formationId: FormationId): FormationSlot[] {
  const formation = FORMATIONS.find((item) => item.id === formationId) ?? FORMATIONS[0];
  const available = players.filter((player) => player.status === 'available').sort((a, b) => b.strength - a.strength);
  const used = new Set<string>();
  return formation.slots.map((slot) => {
    const player = available
      .filter((item) => !used.has(item.id))
      .sort((a, b) => (b.strength + positionMatchScore(b, slot.position)) - (a.strength + positionMatchScore(a, slot.position)))[0];
    if (!player) throw new Error('Elenco insuficiente para montar os onze titulares.');
    used.add(player.id);
    return { ...slot, playerId: player.id };
  });
}

export function buildBench(players: Player[], lineup: FormationSlot[], count = 7): string[] {
  const starters = new Set(lineup.map((slot) => slot.playerId));
  return players
    .filter((player) => player.status === 'available' && !starters.has(player.id))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, count)
    .map((player) => player.id);
}

export function makeCareerMarket(club: Club): Player[] {
  return makeMarketPlayers(club);
}

export function getClub(id: string): Club | undefined {
  return CLUBS.find((club) => club.id === id);
}

export function getFormation(id: FormationId): FormationOption {
  return FORMATIONS.find((formation) => formation.id === id) ?? FORMATIONS[0];
}
