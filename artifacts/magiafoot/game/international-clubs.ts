import type { Club } from './types.ts';
import type { DivisionDefinition } from './real-clubs.ts';

type IntlSeed = {
  id: string;
  name: string;
  city?: string;
  initials?: string;
  rating?: number;
  group?: string;
};

type IntlLeague = {
  division: DivisionDefinition;
  nativeCurrency: string;
  baseBalance: number;
  baseCapacity: number;
  clubs: IntlSeed[];
};

const COLORS = ['#b72f3d','#275f9c','#2b7a4b','#d0a625','#512e7a','#b84a2f','#1f6d74','#744f31','#464d5f','#7f2f65'];

function hashText(value: string) {
  return [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);
}

function autoInitials(name: string) {
  const parts = name.replace(/[.-]/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function makeLeagueClubs(league: IntlLeague): Club[] {
  const { division } = league;
  return league.clubs.map((seed, index) => {
    const rating = seed.rating ?? 68 + ((hashText(seed.id) % 9) - 4);
    return {
      id: seed.id,
      name: seed.name,
      country: division.country,
      countryCode: division.countryCode,
      divisionId: division.id,
      divisionName: division.name,
      divisionLevel: division.level,
      nativeCurrency: league.nativeCurrency,
      badgeUrl: null,
      selectable: true,
      stateCode: null,
      competitionGroup: seed.group ?? null,
      confederation: 'CONMEBOL',
      prestige: Math.max(40, Math.min(95, rating + 7)),
      fanBase: Math.max(35, Math.min(100, rating + ((hashText(seed.name) % 15) - 3))),
      city: seed.city ?? division.country,
      initials: seed.initials ?? autoInitials(seed.name),
      rating,
      color: COLORS[(hashText(seed.id) + index) % COLORS.length]!,
      balance: Math.round(league.baseBalance * (0.72 + (rating - 62) / 45)),
      stadiumCapacity: Math.round((league.baseCapacity + (rating - 65) * 900 + (hashText(seed.id) % 4500)) / 100) * 100,
      ticketPrice: Math.max(25, Math.round(44 + (rating - 68) * 1.4)),
    };
  });
}

const ARGENTINA: IntlLeague = {
  division: { id:'ar-1', country:'Argentina', countryCode:'AR', name:'Liga Profesional', shortName:'Liga Profesional Argentina', level:1, format:'regional_groups', legs:1, promotionPlaces:0, relegationPlaces:2, note:'30 clubes · duas zonas de 15 · fase inicial e mata-mata' },
  nativeCurrency:'ARS', baseBalance:16_000_000, baseCapacity:24_000,
  clubs:[
    ['aldosivi','Aldosivi','B'],['argentinos','Argentinos Juniors','B'],['atletico-tucuman','Atlético Tucumán','B'],['banfield','Banfield','B'],['barracas-central','Barracas Central','B'],['belgrano','Belgrano','B'],
    ['boca-juniors','Boca Juniors','A',86],['central-cordoba','Central Córdoba','A'],['defensa-justicia','Defensa y Justicia','A'],['deportivo-riestra','Deportivo Riestra','A'],['estudiantes-lp','Estudiantes','A',79],
    ['estudiantes-rc','Estudiantes (RC)','B'],['gimnasia-lp','Gimnasia La Plata','B'],['gimnasia-mendoza','Gimnasia Mendoza','A'],['huracan','Huracán','B'],['independiente','Independiente','A',80],
    ['independiente-rivadavia','Independiente Rivadavia','B'],['instituto','Instituto','A'],['lanus','Lanús','A',79],['newells','Newell’s Old Boys','A'],['platense','Platense','A'],
    ['racing-club','Racing Club','B',82],['river-plate','River Plate','B',86],['rosario-central','Rosario Central','B',80],['san-lorenzo','San Lorenzo','A',79],['sarmiento','Sarmiento','B'],
    ['talleres','Talleres','A',80],['tigre','Tigre','B'],['union-sf','Unión','A'],['velez','Vélez Sarsfield','A',80],
  ].map(([id,name,group,rating]) => ({ id:id as string, name:name as string, group:group as string, rating:rating as number | undefined })),
};

const URUGUAY: IntlLeague = {
  division:{ id:'uy-1',country:'Uruguai',countryCode:'UY',name:'Primera División',shortName:'Primera División Uruguaia',level:1,format:'single_round_robin',legs:1,promotionPlaces:0,relegationPlaces:3,note:'16 clubes · Apertura com 15 rodadas; temporada uruguaia possui etapas adicionais' },
  nativeCurrency:'UYU',baseBalance:7_000_000,baseCapacity:12_000,
  clubs:['Albion','Boston River','Central Español','Cerro','Cerro Largo','Danubio','Defensor Sporting','Deportivo Maldonado','Juventud','Liverpool','Montevideo City Torque','Montevideo Wanderers','Nacional','Peñarol','Progreso','Racing'].map((name)=>({id:'uy-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:name==='Nacional'||name==='Peñarol'?79:undefined})),
};

const CHILE: IntlLeague = {
  division:{id:'cl-1',country:'Chile',countryCode:'CL',name:'Liga de Primera',shortName:'Campeonato Chileno',level:1,format:'double_round_robin',legs:2,promotionPlaces:0,relegationPlaces:2,note:'16 clubes · 30 rodadas · turno e returno'},
  nativeCurrency:'CLP',baseBalance:8_000_000,baseCapacity:15_000,
  clubs:['Colo Colo','Universidad Católica','Universidad de Chile','Everton','Palestino','Deportes Limache','Ñublense','Deportes Concepción','Huachipato','Deportes La Serena','Coquimbo Unido','Audax Italiano',"O'Higgins",'Cobresal','Universidad de Concepción','Unión La Calera'].map((name)=>({id:'cl-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:name==='Colo Colo'?80:name.includes('Universidad')?77:undefined})),
};

const COLOMBIA: IntlLeague = {
  division:{id:'co-1',country:'Colômbia',countryCode:'CO',name:'Liga BetPlay',shortName:'Liga BetPlay',level:1,format:'single_round_robin',legs:1,promotionPlaces:0,relegationPlaces:2,note:'20 clubes · fase todos contra todos; fase final conectada em evolução futura'},
  nativeCurrency:'COP',baseBalance:9_000_000,baseCapacity:18_000,
  clubs:['América de Cali','Deportivo Cali','Atlético Nacional','Atlético Bucaramanga','Millonarios','Independiente Santa Fe','Independiente Medellín','Deportes Tolima','Cúcuta Deportivo','Llaneros','Águilas Doradas','Once Caldas','Internacional de Bogotá','Boyacá Chicó','Fortaleza','Alianza Valledupar','Junior','Deportivo Pasto','Deportivo Pereira','Jaguares'].map((name)=>({id:'co-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:['Atlético Nacional','Millonarios','Junior'].includes(name)?79:undefined})),
};

const ECUADOR: IntlLeague = {
  division:{id:'ec-1',country:'Equador',countryCode:'EC',name:'LigaPro Serie A',shortName:'LigaPro',level:1,format:'double_round_robin',legs:2,promotionPlaces:0,relegationPlaces:2,note:'16 clubes · fase inicial de 30 rodadas; fase final conectada em evolução futura'},
  nativeCurrency:'USD',baseBalance:8_000_000,baseCapacity:16_000,
  clubs:['Aucas','Barcelona SC','Delfín','Deportivo Cuenca','Emelec','Guayaquil City','Independiente del Valle','LDU Quito','Leones','Libertad','Macará','Manta','Mushuc Runa','Orense','Técnico Universitario','Universidad Católica'].map((name)=>({id:'ec-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:name==='Independiente del Valle'?82:['LDU Quito','Barcelona SC','Emelec'].includes(name)?79:undefined})),
};

const PARAGUAY: IntlLeague = {
  division:{id:'py-1',country:'Paraguai',countryCode:'PY',name:'Copa de Primera',shortName:'Primera División Paraguai',level:1,format:'double_round_robin',legs:2,promotionPlaces:0,relegationPlaces:2,note:'12 clubes · Apertura com 22 rodadas em turno e returno'},
  nativeCurrency:'PYG',baseBalance:6_500_000,baseCapacity:13_000,
  clubs:['Cerro Porteño','Sportivo Trinidense','Guaraní','Libertad','Nacional','Olimpia','Sportivo Luqueño','Sportivo Ameliano','Recoleta','Sportivo 2 de Mayo','Rubio Ñu','Sportivo San Lorenzo'].map((name)=>({id:'py-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:['Cerro Porteño','Olimpia','Libertad'].includes(name)?78:undefined})),
};

const PERU: IntlLeague = {
  division:{id:'pe-1',country:'Peru',countryCode:'PE',name:'Liga 1',shortName:'Liga 1 Peru',level:1,format:'single_round_robin',legs:1,promotionPlaces:0,relegationPlaces:3,note:'18 clubes · Torneo Apertura em turno único; Clausura e finais em evolução futura'},
  nativeCurrency:'PEN',baseBalance:7_000_000,baseCapacity:14_000,
  clubs:['ADT','Alianza Atlético','Alianza Lima','Atlético Grau','Cienciano','Comerciantes Unidos','Cusco FC','Deportivo Garcilaso','Deportivo Moquegua','FC Cajamarca','Juan Pablo II College','Los Chankas','Melgar','Sport Boys','Sport Huancayo','Sporting Cristal','Universitario','UTC Cajamarca'].map((name)=>({id:'pe-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:['Alianza Lima','Sporting Cristal','Universitario'].includes(name)?78:undefined})),
};

const BOLIVIA: IntlLeague = {
  division:{id:'bo-1',country:'Bolívia',countryCode:'BO',name:'División Profesional',shortName:'Liga Boliviana',level:1,format:'double_round_robin',legs:2,promotionPlaces:0,relegationPlaces:2,note:'16 clubes · 30 rodadas · todos contra todos em ida e volta'},
  nativeCurrency:'BOB',baseBalance:5_500_000,baseCapacity:13_000,
  clubs:['Always Ready','Bolívar','The Strongest','Real Potosí','Oriente Petrolero','Aurora','Guabirá','Blooming','Nacional Potosí','Independiente Petrolero','CDT Real Oruro','ABB','San Antonio Bulo Bulo','Universitario de Vinto','Real Tomayapo','Gualberto Villarroel'].map((name)=>({id:'bo-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:['Bolívar','The Strongest','Always Ready'].includes(name)?77:undefined})),
};

const VENEZUELA: IntlLeague = {
  division:{id:'ve-1',country:'Venezuela',countryCode:'VE',name:'Liga FUTVE',shortName:'Liga FUTVE',level:1,format:'single_round_robin',legs:1,promotionPlaces:0,relegationPlaces:2,note:'14 clubes · fase regular do torneio curto; fase final em evolução futura'},
  nativeCurrency:'VES',baseBalance:5_000_000,baseCapacity:12_000,
  clubs:['Academia Puerto Cabello','Anzoátegui','Carabobo','Caracas','Deportivo La Guaira','Deportivo Táchira','Estudiantes de Mérida','Metropolitanos','Monagas','Portuguesa','Rayo Zuliano','Trujillanos','Universidad Central','Zamora'].map((name)=>({id:'ve-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),name,rating:['Caracas','Deportivo Táchira'].includes(name)?76:undefined})),
};

const LEAGUES=[ARGENTINA,URUGUAY,CHILE,COLOMBIA,ECUADOR,PARAGUAY,PERU,BOLIVIA,VENEZUELA];

export const INTERNATIONAL_DIVISIONS: DivisionDefinition[] = LEAGUES.map((league)=>league.division);
export const SOUTH_AMERICA_CLUBS: Club[] = LEAGUES.flatMap(makeLeagueClubs);

export function getInternationalDivision(id:string) {
  return INTERNATIONAL_DIVISIONS.find((division)=>division.id===id);
}
