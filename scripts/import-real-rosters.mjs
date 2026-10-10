/**
 * Importa elencos reais de 2026 da ESPN e gera base estática para MagiaFoot.
 * Executar: node --experimental-strip-types scripts/import-real-rosters.mjs
 */
import fs from 'node:fs/promises';
import { REAL_BRAZIL_CLUBS } from '../artifacts/magiafoot/game/real-clubs.ts';
import { SOUTH_AMERICA_CLUBS } from '../artifacts/magiafoot/game/international-clubs.ts';
const CLUBS=[...REAL_BRAZIL_CLUBS,...SOUTH_AMERICA_CLUBS];
const ROOT=new URL('../artifacts/magiafoot/game/',import.meta.url);
const LEAGUES={
 BR:['bra.1','bra.2','bra.copa_do_brazil'],AR:['arg.1','arg.copa'],
 UY:['uru.1'],CL:['chi.1'],CO:['col.1'],PY:['par.1'],PE:['per.1'],
 EC:['ecu.1'],BO:['bol.1'],VE:['ven.1'],
};
const MANUAL={
 'nacional-am':'Nacional de Manaus','gama':'SE Gama','sousa':'Sousa EC',
 'betim':'Betim FC','piaui':'Piauí Teresina','portuguesa-sp':'Portuguesa',
 'belgrano':'Belgrano (Córdoba)','estudiantes-rc':'Estudiantes de Río Cuarto',
 'sarmiento':'Sarmiento (Junín)','co-alianza-valledupar':'Alianza FC',
 'ec-ldu-quito':'Liga de Quito','ec-manta':'Manta F.C.',
};
const ALIASES={
 'athletico paranaense':'athletico pr','atletico mineiro':'atletico mg',
 'america mineiro':'america mg','atletico paranaense':'athletico pr',
 'red bull bragantino':'bragantino','rb bragantino':'bragantino',
 'sport recife':'sport','sport club recife':'sport',
 'gremio novorizontino':'novorizontino','athletic club':'athletic',
 'barra sc':'barra fc','barra':'barra fc',
 'sao bernardo fc':'sao bernardo','sao joseense':'independente sao joseense',
 'xv de piracicaba':'xv piracicaba','ferroviaria':'ferroviaria sp',
 'estudiantes lp':'estudiantes de la plata','gimnasia lp':'gimnasia la plata',
 'newells':'newells old boys','union sf':'union de santa fe',
 'velez':'velez sarsfield','torque':'montevideo city torque',
 'nacional montevideo':'nacional','penarol':'penarol',
};
function clean(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/&/g,' e ').replace(/[^a-z0-9]+/g,' ').trim()
  .replace(/^(club |clube |deportivo |sociedade esportiva )/,'')
  .replace(/\b(futebol clube|esporte clube|football club|futbol club)\b/g,'')
  .replace(/\s+/g,' ').trim();
}
function norm(value){const s=clean(value);return ALIASES[s]||s;}
function score(a,b){
 const x=norm(a),y=norm(b);if(x===y)return 1;
 const pairs=z=>{const out=new Set();for(let i=0;i<z.length-1;i++)out.add(z.slice(i,i+2));return out;};
 const xx=pairs(x),yy=pairs(y),common=[...xx].filter(t=>yy.has(t)).length;
 let result=2*common/Math.max(1,xx.size+yy.size);
 if((x.includes(y)&&y.length>5)||(y.includes(x)&&x.length>5))result=Math.max(result,.86);
 const aa=new Set(x.split(' ')),bb=new Set(y.split(' '));
 const overlap=[...aa].filter(w=>bb.has(w)).length;
 return Math.max(result,overlap/Math.max(aa.size,bb.size)*.93);
}
async function json(url){
 for(let tries=0;tries<3;tries++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   return await response.json();
  }catch(error){
   if(tries===2)throw error;
   await new Promise(resolve=>setTimeout(resolve,400*(tries+1)));
  }
 }
}
const pools={};
for(const [country,leagues] of Object.entries(LEAGUES)){
 const teams=[],ids=new Set();
 for(const league of leagues){
  try{
   const data=await json('https://site.api.espn.com/apis/site/v2/sports/soccer/'+league+'/teams?limit=500');
   for(const record of data.sports?.[0]?.leagues?.[0]?.teams||[]){
    const team=record.team;
    if(!team?.id||!team?.displayName||ids.has(team.id))continue;
    ids.add(team.id);
    teams.push({teamId:team.id,name:team.displayName,league});
   }
  }catch(error){console.warn('[Elencos ESPN] Liga indisponível',league,error.message);}
 }
 pools[country]=teams;
}
const matches={},omitted=[];
for(const club of CLUBS){
 const teams=pools[club.countryCode]||[];
 let best=null;
 if(MANUAL[club.id]){
  const exact=teams.find(t=>t.name.toLowerCase()===MANUAL[club.id].toLowerCase());
  if(exact)best={...exact,similarity:1};
 }
 if(!best){
  const ranked=teams.map(t=>({...t,similarity:Math.max(score(club.name,t.name),score(club.id,t.name))}))
   .sort((a,b)=>b.similarity-a.similarity);
  if(ranked[0]?.similarity>=.82 &&
     (!ranked[1] || ranked[0].similarity-ranked[1].similarity>=.05||ranked[0].similarity===1))
    best=ranked[0];
 }
 if(best)matches[club.id]=best;
 else omitted.push({id:club.id,reason:'Clube não identificado com confiança na ESPN'});
}
const seen={};
for(const [id,t] of Object.entries(matches))(seen[t.teamId]??=[]).push({id,score:t.similarity});
for(const duplicates of Object.values(seen)){
 duplicates.sort((a,b)=>b.score-a.score);
 for(const item of duplicates.slice(1)){
  delete matches[item.id];
  omitted.push({id:item.id,reason:'Clube homônimo de outro estado'});
 }
}
// Busca adicional da ESPN para clubes das Séries C/D que não participaram
// da Copa do Brasil, ou cujo nome mudou. Exige associação inequívoca.
const searchCandidates=CLUBS.filter(club=>club.countryCode==='BR'&&!matches[club.id]);
const usedTeamIds=new Set(Object.values(matches).map(team=>String(team.teamId)));
let searchCursor=0;
async function searchWorker(){
 while(searchCursor<searchCandidates.length){
  const club=searchCandidates[searchCursor++];
  try{
   const data=await json('https://site.api.espn.com/apis/search/v2?query='+
     encodeURIComponent(club.name)+'&sport=soccer&limit=50');
   const candidates=(data.results||[]).filter(group=>group.type==='team')
     .flatMap(group=>group.contents||[])
     .filter(team=>team.uid?.startsWith('s:600~t:'))
     .filter(team=>!/\b(u17|u20|s20|u-17|u-20|junior)\b/i.test(team.displayName||''))
     .map(team=>({
       teamId:team.uid.match(/t:(\d+)/)?.[1],
       name:team.displayName,
       league:'bra.copa_do_brazil',
       similarity:Math.max(score(club.name,team.displayName),score(club.id,team.displayName)),
       subtitle:team.subtitle||'',
     }))
     .filter(team=>team.teamId&&!usedTeamIds.has(team.teamId))
     .sort((a,b)=>b.similarity-a.similarity);
   const best=candidates[0],second=candidates[1];
   if(best?.similarity>=.83 &&
      (!second||best.similarity-second.similarity>=.06||best.similarity===1)){
     matches[club.id]=best;
     usedTeamIds.add(best.teamId);
   }
  }catch(error){
   console.warn('[Elencos ESPN] Busca indisponível:',club.id,error.message);
  }
 }
}
await Promise.all(Array.from({length:8},()=>searchWorker()));
const countries={Brazil:'BR',Argentina:'AR',Uruguay:'UY',Chile:'CL',
 Colombia:'CO',Paraguay:'PY',Peru:'PE',Ecuador:'EC',Bolivia:'BO',
 Venezuela:'VE',Portugal:'PT',Spain:'ES',France:'FR',England:'GB',
 Germany:'DE',Italy:'IT',Japan:'JP'};
const clubById=Object.fromEntries(CLUBS.map(c=>[c.id,c]));
const jobs=Object.entries(matches),rosters={};
let cursor=0;
async function worker(){
 while(cursor<jobs.length){
  const [clubId,team]=jobs[cursor++];
  try{
   const data=await json('https://site.api.espn.com/apis/site/v2/sports/soccer/'+team.league+'/teams/'+team.teamId+'/roster');
   const unique=new Set(),players=[];
   for(const athlete of data.athletes||[]){
    const id=String(athlete.id||'');
    const name=String(athlete.displayName||athlete.fullName||'').trim().replace(/\s+/g,' ').slice(0,90);
    const role=String(athlete.position?.abbreviation||'').toUpperCase();
    if(!id||!name||!['G','D','M','F'].includes(role)||unique.has(id))continue;
    unique.add(id);
    const age=Number(athlete.age),shirt=Number(athlete.jersey);
    players.push([name,role,
      Number.isFinite(age)&&age>=15&&age<=45?age:23,
      Number.isInteger(shirt)&&shirt>=1&&shirt<=99?shirt:0,
      countries[athlete.citizenship]||clubById[clubId].countryCode]);
   }
   if(data.season?.year===2026&&players.length>=5)rosters[clubId]=players.slice(0,60);
   else omitted.push({id:clubId,reason:'Elenco 2026 com menos de 5 atletas confirmados',total:players.length});
  }catch(error){omitted.push({id:clubId,reason:'Consulta indisponível: '+error.message});}
 }
}
await Promise.all(Array.from({length:12},()=>worker()));
const ids=Object.keys(rosters).sort();
if(ids.length<200)throw Error('Dados insuficientes: somente '+ids.length+' clubes. Snapshot antigo mantido.');
const sorted=Object.fromEntries(ids.map(id=>[id,rosters[id]]));
const today=new Date().toISOString().slice(0,10);
const output=[
 '// Arquivo gerado automaticamente em '+today+'.',
 '// Fonte: ESPN Soccer, temporada 2026. Posições G/D/M/F adaptadas pelo MagiaFoot.',
 '// Apenas nomes de jogadores retornados pela fonte, não há atletas inventados nesta base.',
 "export type RealRosterRecord = [name: string, role: 'G' | 'D' | 'M' | 'F', age: number, shirt: number, countryCode: string];",
 'export const REAL_ROSTERS_2026: Record<string, RealRosterRecord[]> = '+JSON.stringify(sorted)+';',
 '',
].join('\n');
const report={
 source:'ESPN Soccer',season:2026,generatedAt:new Date().toISOString(),
 clubsTotal:CLUBS.length,clubsWithRealData:ids.length,
 realPlayers:ids.reduce((sum,id)=>sum+sorted[id].length,0),
 byDivision:Object.fromEntries([...new Set(CLUBS.map(c=>c.divisionId))].map(div=>[
 div,{total:CLUBS.filter(c=>c.divisionId===div).length,
 covered:CLUBS.filter(c=>c.divisionId===div&&rosters[c.id]).length}])),
 omitted:omitted.filter(item=>!rosters[item.id]),
};
await fs.writeFile(new URL('real-rosters-2026.ts',ROOT),output);
await fs.writeFile(new URL('real-rosters-2026-report.json',ROOT),JSON.stringify(report,null,2));
console.log('ELENCOS 2026:',report.clubsWithRealData,'/',report.clubsTotal,
 'clubes,',report.realPlayers,'jogadores reais');
