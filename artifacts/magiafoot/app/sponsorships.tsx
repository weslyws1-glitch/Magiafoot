import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

const SLOT_LABELS = {
  principal: 'Patrocinador principal',
  sleeve: 'Manga',
  back: 'Costas',
  institutional: 'Parceiro institucional',
} as const;

function formScore(career: NonNullable<ReturnType<typeof useCareer>['career']>) {
  const recent = [...career.results]
    .filter((r) => r.homeClubId === career.clubId || r.awayClubId === career.clubId)
    .sort((a, b) => b.roundIndex - a.roundIndex)
    .slice(0, 5);
  if (!recent.length) return 50;
  let pts = 0;
  recent.forEach((r) => {
    const home = r.homeClubId === career.clubId;
    const gf = home ? r.homeGoals : r.awayGoals;
    const ga = home ? r.awayGoals : r.homeGoals;
    pts += gf > ga ? 3 : gf === ga ? 1 : 0;
  });
  return Math.round((pts / (recent.length * 3)) * 100);
}

export default function SponsorshipsScreen() {
  const colors = useColors();
  const { career, refreshSponsors, acceptSponsor, declineSponsor } = useCareer();

  useEffect(() => {
    if (career) refreshSponsors(false);
  }, [career?.roundIndex]);

  if (!career) {
    return <><GameHeader title="Patrocínios" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar os patrocínios.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const form = formScore(career);
  const marketHeat = Math.round(form * 0.45 + career.boardTrust * 0.2 + career.fanTrust * 0.2 + (career.headquartersInvestments?.commercial ?? 3) * 5);
  const marketLabel = marketHeat >= 80 ? 'MUITO AQUECIDO' : marketHeat >= 65 ? 'AQUECIDO' : marketHeat >= 45 ? 'NORMAL' : marketHeat >= 30 ? 'FRIO' : 'MUITO FRIO';
  const proposals = career.sponsorships?.proposals ?? [];
  const contracts = career.sponsorships?.contracts ?? [];

  return (
    <>
      <GameHeader title="Patrocínios" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.marketHero}>
          <View style={styles.marketTop}>
            <View style={styles.marketIcon}><Feather name="briefcase" size={26} color="#79ef91" /></View>
            <View style={styles.marketBody}>
              <Text style={styles.kicker}>MERCADO DE PATROCÍNIOS</Text>
              <Text style={styles.title}>{marketLabel}</Text>
              <Text style={styles.sub}>As marcas acompanham resultados, torcida, diretoria e força comercial antes de fazer propostas.</Text>
            </View>
          </View>
          <View style={styles.heatTrack}><View style={[styles.heatFill, { width: (Math.min(100, marketHeat) + '%') as any }]} /></View>
        </Panel>

        <View style={styles.metrics}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>FASE DO TIME</Text><Text style={styles.metricValue}>{form}/100</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>TORCIDA</Text><Text style={styles.metricValue}>{career.fanTrust}/100</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>DIRETORIA</Text><Text style={styles.metricValue}>{career.boardTrust}/100</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>PROPOSTAS</Text><Text style={styles.metricValue}>{proposals.length}</Text></Panel>
        </View>

        <SectionLabel title="Propostas recebidas" />
        {proposals.length === 0 ? (
          <Panel style={styles.empty}>
            <Feather name="inbox" size={28} color="#789080" />
            <Text style={styles.emptyTitle}>Nenhuma proposta no momento</Text>
            <Text style={styles.emptyText}>Melhore resultados e força comercial. Novas marcas podem aparecer após as próximas partidas.</Text>
          </Panel>
        ) : (
          <View style={styles.list}>
            {proposals.map((proposal) => (
              <Panel key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHead}>
                  <View style={styles.brandMark}><Text style={styles.brandInitial}>{proposal.sponsorName.slice(0, 1)}</Text></View>
                  <View style={styles.brandBody}>
                    <Text style={styles.brandName}>{proposal.sponsorName}</Text>
                    <Text style={styles.brandMeta}>{proposal.category} · {SLOT_LABELS[proposal.slot]}</Text>
                  </View>
                  <View style={styles.prestigeBadge}><Text style={styles.prestigeText}>REP {proposal.prestige}</Text></View>
                </View>

                <Text style={styles.note}>{proposal.note}</Text>

                <View style={styles.offerGrid}>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>LUVAS</Text><Text style={styles.offerValue}>{formatCurrency(proposal.signingBonus)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>POR JOGO</Text><Text style={styles.offerValue}>{formatCurrency(proposal.perMatch)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>BÔNUS VITÓRIA</Text><Text style={styles.offerValue}>{formatCurrency(proposal.winBonus)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>DURAÇÃO</Text><Text style={styles.offerValue}>{proposal.durationMatches} jogos</Text></View>
                </View>

                <View style={styles.impactRow}>
                  <Text style={styles.impactLabel}>Impacto torcida: <Text style={proposal.fanImpact >= 0 ? styles.positive : styles.negative}>{proposal.fanImpact >= 0 ? '+' : ''}{proposal.fanImpact}</Text></Text>
                  <Text style={styles.impactLabel}>Diretoria: <Text style={proposal.boardImpact >= 0 ? styles.positive : styles.negative}>{proposal.boardImpact >= 0 ? '+' : ''}{proposal.boardImpact}</Text></Text>
                </View>

                <Text style={styles.expiry}>Proposta válida até a rodada {proposal.expiresRound + 1}</Text>

                <View style={styles.actions}>
                  <Pressable style={styles.declineButton} onPress={() => declineSponsor(proposal.id)}>
                    <Text style={styles.declineText}>RECUSAR</Text>
                  </Pressable>
                  <Pressable style={styles.acceptButton} onPress={() => acceptSponsor(proposal.id)}>
                    <Text style={styles.acceptText}>ACEITAR PROPOSTA</Text>
                  </Pressable>
                </View>
              </Panel>
            ))}
          </View>
        )}

        <SectionLabel title="Contratos ativos" />
        {contracts.length === 0 ? (
          <Panel style={styles.emptySmall}><Text style={styles.emptyText}>O clube ainda não possui contratos ativos.</Text></Panel>
        ) : (
          <View style={styles.list}>
            {contracts.map((contract) => {
              const pct = Math.max(0, Math.round((contract.matchesRemaining / contract.durationMatches) * 100));
              return (
                <Panel key={contract.id} style={styles.contractCard}>
                  <View style={styles.contractTop}>
                    <View>
                      <Text style={styles.contractName}>{contract.sponsorName}</Text>
                      <Text style={styles.contractSlot}>{SLOT_LABELS[contract.slot]}</Text>
                    </View>
                    <Text style={styles.contractRemaining}>{contract.matchesRemaining} jogos restantes</Text>
                  </View>
                  <View style={styles.contractTrack}><View style={[styles.contractFill, { width: (pct + '%') as any }]} /></View>
                  <View style={styles.contractFinance}>
                    <Text style={styles.contractMoney}>+{formatCurrency(contract.perMatch)} / jogo</Text>
                    <Text style={styles.contractEarned}>Total recebido: {formatCurrency(contract.totalEarned)}</Text>
                  </View>
                </Panel>
              );
            })}
          </View>
        )}

        <SectionLabel title="Como o mercado reage" />
        <Panel style={styles.timeline}>
          <View style={styles.timelineItem}><View style={styles.dot} /><Text style={styles.timelineText}>Vitórias e sequência positiva aquecem o mercado e atraem mais empresas.</Text></View>
          <View style={styles.timelineItem}><View style={styles.dot} /><Text style={styles.timelineText}>Derrotas seguidas reduzem concorrência e fazem as propostas ficarem mais conservadoras.</Text></View>
          <View style={styles.timelineItem}><View style={styles.dot} /><Text style={styles.timelineText}>Marketing e departamento comercial aumentam quantidade e valor das propostas.</Text></View>
          <View style={styles.timelineItem}><View style={styles.dot} /><Text style={styles.timelineText}>Ao aceitar uma marca, a escolha afeta diretamente a satisfação da torcida e da diretoria.</Text></View>
          <View style={styles.timelineItem}><View style={styles.dot} /><Text style={styles.timelineText}>Os contratos pagam por partida, podem ter bônus por vitória e terminam automaticamente pelo número de jogos.</Text></View>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  marketHero:{gap:13,backgroundColor:'#101f19',borderColor:'#355846'},
  marketTop:{flexDirection:'row',alignItems:'center',gap:12},
  marketIcon:{width:56,height:56,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#183426',borderWidth:1,borderColor:'#4a765d'},
  marketBody:{flex:1,minWidth:0},
  kicker:{color:'#8fab99',fontSize:7.5,fontWeight:'900',letterSpacing:1},
  title:{color:'#79ef91',fontSize:19,fontWeight:'900',marginTop:3},
  sub:{color:'#a8baae',fontSize:8.5,lineHeight:13,marginTop:3},
  heatTrack:{height:8,borderRadius:99,backgroundColor:'#07140d',overflow:'hidden'},
  heatFill:{height:'100%',backgroundColor:'#79ef91'},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},
  metric:{width:'48.5%',minHeight:88,justifyContent:'center',gap:5},
  metricLabel:{color:'#84998b',fontSize:7.5,fontWeight:'900'},
  metricValue:{color:'#f5f7f5',fontSize:18,fontWeight:'900'},
  list:{gap:9},
  empty:{alignItems:'center',gap:8,paddingVertical:24,backgroundColor:'#10251a',borderColor:'#2e4c3a'},
  emptySmall:{alignItems:'center',paddingVertical:16},
  emptyTitle:{color:'#f5f7f5',fontSize:12,fontWeight:'900'},
  emptyText:{color:'#91a496',fontSize:8.5,lineHeight:13,textAlign:'center'},
  proposalCard:{gap:11,backgroundColor:'#101f19',borderColor:'#355846'},
  proposalHead:{flexDirection:'row',alignItems:'center',gap:9},
  brandMark:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#1a3928',borderWidth:1,borderColor:'#4a765d'},
  brandInitial:{color:'#79ef91',fontSize:18,fontWeight:'900'},
  brandBody:{flex:1,minWidth:0},
  brandName:{color:'#f5f7f5',fontSize:13,fontWeight:'900'},
  brandMeta:{color:'#84998b',fontSize:7.5,fontWeight:'800',marginTop:2},
  prestigeBadge:{paddingHorizontal:7,paddingVertical:5,borderRadius:7,backgroundColor:'#172a20'},
  prestigeText:{color:'#cfe1d3',fontSize:6.5,fontWeight:'900'},
  note:{color:'#a8baae',fontSize:8.3,lineHeight:12.5},
  offerGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},
  offerItem:{width:'48.5%',minHeight:53,borderRadius:8,padding:7,justifyContent:'center',backgroundColor:'#0a1811',borderWidth:1,borderColor:'#273f31'},
  offerLabel:{color:'#72887a',fontSize:6.3,fontWeight:'900'},
  offerValue:{color:'#f5f7f5',fontSize:9.5,fontWeight:'900',marginTop:3},
  impactRow:{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
  impactLabel:{color:'#a5b6aa',fontSize:7.5,fontWeight:'800'},
  positive:{color:'#79ef91',fontWeight:'900'},
  negative:{color:'#f09d9d',fontWeight:'900'},
  expiry:{color:'#d8c27c',fontSize:7.5,fontWeight:'800'},
  actions:{flexDirection:'row',gap:8},
  declineButton:{flex:0.38,minHeight:40,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#2a1a1a',borderWidth:1,borderColor:'#624141'},
  declineText:{color:'#efb2b2',fontSize:8,fontWeight:'900'},
  acceptButton:{flex:0.62,minHeight:40,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#79ef91'},
  acceptText:{color:'#07150d',fontSize:8,fontWeight:'900'},
  contractCard:{gap:9,backgroundColor:'#12271c',borderColor:'#31513f'},
  contractTop:{flexDirection:'row',justifyContent:'space-between',gap:8},
  contractName:{color:'#f5f7f5',fontSize:12,fontWeight:'900'},
  contractSlot:{color:'#8da092',fontSize:7.5,fontWeight:'800',marginTop:2},
  contractRemaining:{color:'#79ef91',fontSize:8,fontWeight:'900'},
  contractTrack:{height:6,borderRadius:99,backgroundColor:'#08150e',overflow:'hidden'},
  contractFill:{height:'100%',backgroundColor:'#79ef91'},
  contractFinance:{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
  contractMoney:{color:'#79ef91',fontSize:8.5,fontWeight:'900'},
  contractEarned:{color:'#a8baae',fontSize:7.5,fontWeight:'800'},
  timeline:{gap:10,backgroundColor:'#0f2118',borderColor:'#2d4938'},
  timelineItem:{flexDirection:'row',alignItems:'flex-start',gap:8},
  dot:{width:7,height:7,borderRadius:4,backgroundColor:'#79ef91',marginTop:3},
  timelineText:{flex:1,color:'#aab9af',fontSize:8.3,lineHeight:12.5},
});