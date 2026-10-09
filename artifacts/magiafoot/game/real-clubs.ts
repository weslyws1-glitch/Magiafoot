import type { Club } from './types.ts';

export interface DivisionDefinition {
  id: string;
  country: string;
  countryCode: string;
  name: string;
  shortName: string;
  level: number;
  format: 'double_round_robin' | 'single_round_robin' | 'regional_groups';
  legs: 1 | 2;
  promotionPlaces: number;
  relegationPlaces: number;
  note: string;
}

export const DIVISIONS: DivisionDefinition[] = [
  { id: 'br-a', country: 'Brasil', countryCode: 'BR', name: 'Série A', shortName: 'Brasileirão Série A', level: 1, format: 'double_round_robin', legs: 2, promotionPlaces: 0, relegationPlaces: 4, note: '20 clubes · pontos corridos · turno e returno' },
  { id: 'br-b', country: 'Brasil', countryCode: 'BR', name: 'Série B', shortName: 'Brasileirão Série B', level: 2, format: 'double_round_robin', legs: 2, promotionPlaces: 4, relegationPlaces: 4, note: '20 clubes · 38 rodadas · acesso com playoff entre 3º e 6º em 2026' },
  { id: 'br-c', country: 'Brasil', countryCode: 'BR', name: 'Série C', shortName: 'Brasileirão Série C', level: 3, format: 'single_round_robin', legs: 1, promotionPlaces: 4, relegationPlaces: 2, note: '20 clubes · 19 rodadas na 1ª fase · quadrangulares de acesso' },
  { id: 'br-d', country: 'Brasil', countryCode: 'BR', name: 'Série D', shortName: 'Brasileirão Série D', level: 4, format: 'regional_groups', legs: 2, promotionPlaces: 6, relegationPlaces: 0, note: '96 clubes · 16 grupos regionalizados de 6 · mata-mata nacional' },
  { id: 'br-3', country: 'Brasil', countryCode: 'BR', name: '3ª Divisão clássica', shortName: '3ª Divisão clássica', level: 3, format: 'double_round_robin', legs: 2, promotionPlaces: 0, relegationPlaces: 0, note: 'Divisão legada do MagiaFoot para preservar carreiras antigas' },
];

type ClubSeed = {
  id: string;
  name: string;
  state: string;
  city?: string;
  initials?: string;
  rating?: number;
  color?: string;
  group?: string;
};

const PALETTE = ['#9d2f3f','#315c8c','#2f7056','#7f622f','#5e4785','#8b3e2f','#3e6d66','#6f4a35','#4f637a','#7a4f68'];

function stableHash(value: string) {
  return [...value].reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 19);
}

function initialsFrom(name: string) {
  const cleaned = name.replace(/[-.]/g, ' ').split(/\s+/).filter(Boolean);
  if (cleaned.length === 1) return cleaned[0]!.slice(0, 3).toUpperCase();
  return (cleaned[0]![0] + cleaned[cleaned.length - 1]![0]).toUpperCase();
}

function financeFor(level: number, rating: number) {
  const base = level === 1 ? 20_000_000 : level === 2 ? 8_000_000 : level === 3 ? 3_500_000 : 1_500_000;
  return Math.round(base * (0.72 + (rating - 58) / 55));
}

function capacityFor(level: number, rating: number, id: string) {
  const base = level === 1 ? 28_000 : level === 2 ? 16_000 : level === 3 ? 11_000 : 6_000;
  return Math.round((base + (rating - 60) * (level === 1 ? 1000 : level === 2 ? 600 : 350) + (stableHash(id) % 5000)) / 100) * 100;
}

function ticketFor(level: number, rating: number) {
  return Math.max(22, Math.round((level === 1 ? 58 : level === 2 ? 42 : level === 3 ? 32 : 26) + (rating - 68) * 0.7));
}

function makeClubs(seeds: ClubSeed[], divisionId: string, divisionName: string, level: number): Club[] {
  return seeds.map((seed, index) => {
    const rating = seed.rating ?? Math.max(56, (level === 1 ? 76 : level === 2 ? 70 : level === 3 ? 65 : 60) + ((stableHash(seed.id) % 7) - 3));
    return {
      id: seed.id,
      name: seed.name,
      country: 'Brasil',
      countryCode: 'BR',
      divisionId,
      divisionName,
      divisionLevel: level,
      nativeCurrency: 'BRL',
      badgeUrl: null,
      city: seed.city ?? seed.state,
      initials: seed.initials ?? initialsFrom(seed.name),
      rating,
      color: seed.color ?? PALETTE[(stableHash(seed.id) + index) % PALETTE.length]!,
      balance: financeFor(level, rating),
      stadiumCapacity: capacityFor(level, rating, seed.id),
      ticketPrice: ticketFor(level, rating),
      selectable: true,
      stateCode: seed.state,
      competitionGroup: seed.group ?? null,
      prestige: Math.max(35, Math.min(95, rating + (level === 1 ? 8 : level === 2 ? 3 : 0))),
      fanBase: Math.max(25, Math.min(100, rating + ((stableHash(seed.name) % 13) - 4))),
    };
  });
}

const SERIE_A: ClubSeed[] = [
  { id:'athletico-pr', name:'Athletico Paranaense', state:'PR', city:'Curitiba', initials:'CAP', rating:78, color:'#c91d2e' },
  { id:'atletico-mg', name:'Atlético Mineiro', state:'MG', city:'Belo Horizonte', initials:'CAM', rating:82, color:'#292929' },
  { id:'bahia', name:'Bahia', state:'BA', city:'Salvador', initials:'BAH', rating:79, color:'#1e5aa8' },
  { id:'botafogo-rj', name:'Botafogo', state:'RJ', city:'Rio de Janeiro', initials:'BOT', rating:82, color:'#262626' },
  { id:'chapecoense', name:'Chapecoense', state:'SC', city:'Chapecó', initials:'CHA', rating:71, color:'#23864b' },
  { id:'corinthians', name:'Corinthians', state:'SP', city:'São Paulo', initials:'COR', rating:81, color:'#2a2a2a' },
  { id:'coritiba', name:'Coritiba', state:'PR', city:'Curitiba', initials:'CFC', rating:73, color:'#16834e' },
  { id:'cruzeiro', name:'Cruzeiro', state:'MG', city:'Belo Horizonte', initials:'CRU', rating:83, color:'#2356a1' },
  { id:'flamengo', name:'Flamengo', state:'RJ', city:'Rio de Janeiro', initials:'FLA', rating:86, color:'#d1222f' },
  { id:'fluminense', name:'Fluminense', state:'RJ', city:'Rio de Janeiro', initials:'FLU', rating:81, color:'#7c213b' },
  { id:'gremio', name:'Grêmio', state:'RS', city:'Porto Alegre', initials:'GRE', rating:79, color:'#2f8fcb' },
  { id:'internacional', name:'Internacional', state:'RS', city:'Porto Alegre', initials:'INT', rating:79, color:'#d62d38' },
  { id:'mirassol', name:'Mirassol', state:'SP', city:'Mirassol', initials:'MIR', rating:76, color:'#e0b423' },
  { id:'palmeiras', name:'Palmeiras', state:'SP', city:'São Paulo', initials:'PAL', rating:85, color:'#19713c' },
  { id:'bragantino', name:'Red Bull Bragantino', state:'SP', city:'Bragança Paulista', initials:'RBB', rating:77, color:'#d83d45' },
  { id:'remo', name:'Remo', state:'PA', city:'Belém', initials:'REM', rating:72, color:'#244b86' },
  { id:'santos', name:'Santos', state:'SP', city:'Santos', initials:'SAN', rating:78, color:'#303030' },
  { id:'sao-paulo', name:'São Paulo', state:'SP', city:'São Paulo', initials:'SAO', rating:82, color:'#c92f36' },
  { id:'vasco', name:'Vasco da Gama', state:'RJ', city:'Rio de Janeiro', initials:'VAS', rating:78, color:'#292929' },
  { id:'vitoria-ba', name:'Vitória', state:'BA', city:'Salvador', initials:'VIT', rating:74, color:'#d02c36' },
];

const SERIE_B: ClubSeed[] = [
  { id:'america-mg', name:'América Mineiro', state:'MG', city:'Belo Horizonte', initials:'AME', rating:72, color:'#2b8b52' },
  { id:'athletic-mg', name:'Athletic Club', state:'MG', city:'São João del-Rei', initials:'ATH', rating:68 },
  { id:'atletico-go', name:'Atlético Goianiense', state:'GO', city:'Goiânia', initials:'ACG', rating:71, color:'#d72e35' },
  { id:'avai', name:'Avaí', state:'SC', city:'Florianópolis', initials:'AVA', rating:69, color:'#3078b8' },
  { id:'botafogo-sp', name:'Botafogo-SP', state:'SP', city:'Ribeirão Preto', initials:'BSP', rating:67 },
  { id:'ceara', name:'Ceará', state:'CE', city:'Fortaleza', initials:'CEA', rating:73, color:'#2b2b2b' },
  { id:'crb', name:'CRB', state:'AL', city:'Maceió', initials:'CRB', rating:68, color:'#cc2732' },
  { id:'criciuma', name:'Criciúma', state:'SC', city:'Criciúma', initials:'CRI', rating:71, color:'#d6a420' },
  { id:'cuiaba', name:'Cuiabá', state:'MT', city:'Cuiabá', initials:'CUI', rating:70, color:'#d2ad1f' },
  { id:'fortaleza', name:'Fortaleza', state:'CE', city:'Fortaleza', initials:'FOR', rating:75, color:'#325a9c' },
  { id:'goias', name:'Goiás', state:'GO', city:'Goiânia', initials:'GOI', rating:72, color:'#23814c' },
  { id:'juventude', name:'Juventude', state:'RS', city:'Caxias do Sul', initials:'JUV', rating:73, color:'#318050' },
  { id:'londrina', name:'Londrina', state:'PR', city:'Londrina', initials:'LEC', rating:67, color:'#377ab2' },
  { id:'nautico', name:'Náutico', state:'PE', city:'Recife', initials:'NAU', rating:68, color:'#d43a3f' },
  { id:'novorizontino', name:'Novorizontino', state:'SP', city:'Novo Horizonte', initials:'NOV', rating:73, color:'#e4bd25' },
  { id:'operario-pr', name:'Operário-PR', state:'PR', city:'Ponta Grossa', initials:'OPE', rating:69, color:'#282828' },
  { id:'ponte-preta', name:'Ponte Preta', state:'SP', city:'Campinas', initials:'PON', rating:68, color:'#303030' },
  { id:'sao-bernardo', name:'São Bernardo', state:'SP', city:'São Bernardo do Campo', initials:'SBE', rating:68, color:'#d4b72a' },
  { id:'sport', name:'Sport', state:'PE', city:'Recife', initials:'SPT', rating:73, color:'#cb2935' },
  { id:'vila-nova', name:'Vila Nova', state:'GO', city:'Goiânia', initials:'VIL', rating:70, color:'#cf3036' },
];

const SERIE_C: ClubSeed[] = [
  { id:'amazonas', name:'Amazonas', state:'AM', city:'Manaus', initials:'AMA', rating:67 },
  { id:'anapolis', name:'Anápolis', state:'GO', city:'Anápolis', initials:'ANA', rating:63 },
  { id:'barra-sc', name:'Barra-SC', state:'SC', city:'Itajaí', initials:'BAR', rating:64 },
  { id:'botafogo-pb', name:'Botafogo-PB', state:'PB', city:'João Pessoa', initials:'BPF', rating:67 },
  { id:'brusque', name:'Brusque', state:'SC', city:'Brusque', initials:'BRU', rating:67 },
  { id:'caxias', name:'Caxias', state:'RS', city:'Caxias do Sul', initials:'CAX', rating:65 },
  { id:'confianca', name:'Confiança', state:'SE', city:'Aracaju', initials:'CON', rating:63 },
  { id:'ferroviaria', name:'Ferroviária', state:'SP', city:'Araraquara', initials:'FER', rating:67 },
  { id:'figueirense', name:'Figueirense', state:'SC', city:'Florianópolis', initials:'FIG', rating:65 },
  { id:'floresta', name:'Floresta', state:'CE', city:'Fortaleza', initials:'FLO', rating:66 },
  { id:'guarani', name:'Guarani', state:'SP', city:'Campinas', initials:'GUA', rating:68 },
  { id:'inter-limeira', name:'Inter de Limeira', state:'SP', city:'Limeira', initials:'INT', rating:66 },
  { id:'itabaiana', name:'Itabaiana', state:'SE', city:'Itabaiana', initials:'ITA', rating:62 },
  { id:'ituano', name:'Ituano', state:'SP', city:'Itu', initials:'ITU', rating:65 },
  { id:'maranhao', name:'Maranhão', state:'MA', city:'São Luís', initials:'MAC', rating:63 },
  { id:'maringa', name:'Maringá', state:'PR', city:'Maringá', initials:'MAR', rating:67 },
  { id:'paysandu', name:'Paysandu', state:'PA', city:'Belém', initials:'PAY', rating:68 },
  { id:'santa-cruz', name:'Santa Cruz', state:'PE', city:'Recife', initials:'SAN', rating:68 },
  { id:'volta-redonda', name:'Volta Redonda', state:'RJ', city:'Volta Redonda', initials:'VRE', rating:65 },
  { id:'ypiranga-rs', name:'Ypiranga-RS', state:'RS', city:'Erechim', initials:'YPI', rating:65 },
];

const SERIE_D_GROUPS: Record<string, Array<[string,string,string]>> = {
  A1: [['nacional-am','Nacional-AM','AM'],['manaus','Manaus','AM'],['manauara','Manauara','AM'],['gas-rr','GAS-RR','RR'],['monte-roraima','Monte Roraima','RR'],['sao-raimundo-rr','São Raimundo-RR','RR']],
  A2: [['independencia-ac','Independência-AC','AC'],['galvez','Galvez','AC'],['humaita','Humaitá','AC'],['porto-velho','Porto Velho','RO'],['guapore','Guaporé','RO'],['araguaina','Araguaína','TO']],
  A3: [['gama','Gama','DF'],['brasiliense','Brasiliense','DF'],['luverdense','Luverdense','MT'],['primavera-mt','Primavera-MT','MT'],['inhumas','Inhumas','GO'],['aparecidense','Aparecidense','GO']],
  A4: [['capital-df','Capital-DF','DF'],['ceilandia','Ceilândia','DF'],['mixto','Mixto','MT'],['operario-mt','Operário-MT','MT'],['uniao-mt','União-MT','MT'],['goiatuba','Goiatuba','GO']],
  A5: [['trem','Trem','AP'],['oratorio','Oratório','AP'],['tuna-luso','Tuna Luso','PA'],['aguia-maraba','Águia de Marabá','PA'],['tocantinopolis','Tocantinópolis','TO'],['imperatriz','Imperatriz','MA']],
  A6: [['sampaio-correa-ma','Sampaio Corrêa-MA','MA'],['moto-club','Moto Club','MA'],['iape','IAPE','MA'],['maracana-ce','Maracanã','CE'],['iguatu','Iguatu','CE'],['parnahyba','Parnahyba','PI']],
  A7: [['ferroviario-ce','Ferroviário','CE'],['tirol','Tirol','CE'],['atletico-ce','Atlético-CE','CE'],['altos','Altos','PI'],['piaui','Piauí','PI'],['fluminense-pi','Fluminense-PI','PI']],
  A8: [['abc','ABC','RN'],['america-rn','América-RN','RN'],['laguna-rn','Laguna-RN','RN'],['sousa','Sousa','PB'],['maguary','Maguary','PE'],['central-pe','Central','PE']],
  A9: [['retro','Retrô','PE'],['decisao','Decisão','PE'],['serra-branca-pb','Serra Branca-PB','PB'],['treze','Treze','PB'],['lagarto','Lagarto','SE'],['sergipe','Sergipe','SE']],
  A10:[['asa','ASA','AL'],['csa','CSA','AL'],['cse','CSE','AL'],['jacuipense','Jacuipense','BA'],['atletico-ba','Atlético-BA','BA'],['juazeirense','Juazeirense','BA']],
  A11:[['uberlandia','Uberlândia','MG'],['betim','Betim','MG'],['crac','CRAC','GO'],['abecat','ABECAT','GO'],['operario-ms','Operário-MS','MS'],['ivinhema','Ivinhema','MS']],
  A12:[['porto-ba','Porto-BA','BA'],['rio-branco-es','Rio Branco-ES','ES'],['vitoria-es','Vitória-ES','ES'],['real-noroeste','Real Noroeste','ES'],['tombense','Tombense','MG'],['democrata-gv','Democrata GV','MG']],
  A13:[['madureira','Madureira','RJ'],['portuguesa-rj','Portuguesa-RJ','RJ'],['america-rj','America-RJ','RJ'],['portuguesa-sp','Portuguesa-SP','SP'],['agua-santa','Água Santa','SP'],['pouso-alegre','Pouso Alegre','MG']],
  A14:[['nova-iguacu','Nova Iguaçu','RJ'],['sampaio-correa-rj','Sampaio Corrêa-RJ','RJ'],['marica','Maricá','RJ'],['xv-piracicaba','XV de Piracicaba','SP'],['noroeste','Noroeste','SP'],['velo-clube','Velo Clube','SP']],
  A15:[['cianorte','Cianorte','PR'],['fc-cascavel','FC Cascavel','PR'],['santa-catarina','Santa Catarina','SC'],['joinville','Joinville','SC'],['guarany-bage','Guarany de Bagé','RS'],['sao-luiz-rs','São Luiz-RS','RS']],
  A16:[['blumenau','Blumenau','SC'],['marcilio-dias','Marcílio Dias','SC'],['sao-joseense','São Joseense','PR'],['azuriz','Azuriz','PR'],['sao-jose-rs','São José-RS','RS'],['brasil-pelotas','Brasil-RS','RS']],
};

const SERIE_D: ClubSeed[] = Object.entries(SERIE_D_GROUPS).flatMap(([group, clubs]) =>
  clubs.map(([id,name,state]) => ({ id, name, state, group, rating: name === 'Uberlândia' ? 65 : name === 'ASA' ? 64 : undefined }))
);

export const REAL_BRAZIL_CLUBS: Club[] = [
  ...makeClubs(SERIE_A, 'br-a', 'Série A', 1),
  ...makeClubs(SERIE_B, 'br-b', 'Série B', 2),
  ...makeClubs(SERIE_C, 'br-c', 'Série C', 3),
  ...makeClubs(SERIE_D, 'br-d', 'Série D', 4),
];

export function getDivisionDefinition(id: string): DivisionDefinition | undefined {
  return DIVISIONS.find((division) => division.id === id);
}
