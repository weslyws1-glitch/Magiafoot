import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';
import type { SponsorshipSlot } from '@/game/types';

const SLOT_LABELS: Record<SponsorshipSlot, string> = {
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

const PLACEMENT_OPTIONS: SponsorshipSlot[] = [
  'principal',
  'sleeve',
  'back',
  'shorts',
  'stadium',
  'training_center',
  'headquarters',
  'media_wall',
  'institutional',
];

const COUNTER_VALUES = [0.90, 1.00, 1.10, 1.20, 1.30];

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
  const { career, refreshSponsors, acceptSponsor, declineSponsor, negotiateSponsor, renewSponsor } = useCareer();
  const [counterSlots, setCounterSlots] = useState<Record<string, SponsorshipSlot>>({});
  const [counterValues, setCounterValues] = useState<Record<string, number>>({});

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
  const uniformMain = contracts.find((item) => item.slot === 'principal');
  const uniformSleeve = contracts.find((item) => item.slot === 'sleeve');
  const uniformBack = contracts.find((item) => item.slot === 'back');
  const uniformShorts = contracts.find((item) => item.slot === 'shorts');

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

        <SectionLabel title="Uniforme e exposição atual" />
        <Panel style={styles.uniformPanel}>
          <Text style={styles.uniformIntro}>As marcas contratadas aparecem no uniforme conforme o espaço negociado. Patrocínios estruturais ficam listados ao lado.</Text>

          <View style={styles.uniformArea}>
            <View style={styles.shirtWrap}>
              <View style={[styles.sleeveLeft, { backgroundColor: club.color }]} />
              <View style={[styles.sleeveRight, { backgroundColor: club.color }]} />
              <View style={[styles.shirtBody, { backgroundColor: club.color }]}>
                <View style={styles.clubBadge}><Text style={styles.clubBadgeText}>{club.initials}</Text></View>
                <View style={styles.chestSponsor}>
                  <Text style={styles.chestSponsorText} numberOfLines={1}>{uniformMain?.sponsorName ?? 'ESPAÇO LIVRE'}</Text>
                </View>
                <View style={styles.backSponsor}>
                  <Text style={styles.smallSponsorText} numberOfLines={1}>{uniformBack?.sponsorName ?? 'COSTAS LIVRE'}</Text>
                </View>
                <View style={styles.sleeveSponsor}>
                  <Text style={styles.tinySponsorText} numberOfLines={1}>{uniformSleeve?.sponsorName ?? 'MANGA'}</Text>
                </View>
              </View>
              <View style={[styles.shorts, { backgroundColor: club.color }]}>
                <Text style={styles.shortsSponsorText} numberOfLines={1}>{uniformShorts?.sponsorName ?? 'CALÇÃO LIVRE'}</Text>
              </View>
            </View>

            <View style={styles.exposureList}>
              {(['stadium','training_center','headquarters','media_wall','institutional'] as SponsorshipSlot[]).map((slot) => {
                const deal = contracts.find((item) => item.slot === slot);
                return (
                  <View key={slot} style={styles.exposureRow}>
                    <Text style={styles.exposureLabel}>{SLOT_LABELS[slot]}</Text>
                    <Text style={deal ? styles.exposureBrand : styles.exposureEmpty}>{deal?.sponsorName ?? 'Livre'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Panel>

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

                <View style={styles.locationBanner}>
                  <Feather name={proposal.slot === 'stadium' || proposal.slot === 'training_center' || proposal.slot === 'headquarters' || proposal.slot === 'media_wall' ? 'home' : 'tag'} size={14} color="#79ef91" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabel}>LOCAL SOLICITADO PELA MARCA</Text>
                    <Text style={styles.locationValue}>{SLOT_LABELS[proposal.slot]}</Text>
                  </View>
                </View>

                <View style={styles.offerGrid}>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>LUVAS</Text><Text style={styles.offerValue}>{formatCurrency(proposal.signingBonus)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>POR JOGO</Text><Text style={styles.offerValue}>{formatCurrency(proposal.perMatch)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>BÔNUS VITÓRIA</Text><Text style={styles.offerValue}>{formatCurrency(proposal.winBonus)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>DURAÇÃO</Text><Text style={styles.offerValue}>{proposal.durationMatches} jogos</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>BÔNUS G4</Text><Text style={styles.offerValue}>{formatCurrency(proposal.qualificationBonus)}</Text></View>
                  <View style={styles.offerItem}><Text style={styles.offerLabel}>BÔNUS TÍTULO</Text><Text style={styles.offerValue}>{formatCurrency(proposal.titleBonus)}</Text></View>
                </View>

                <View style={styles.clauseBox}>
                  <Text style={styles.clauseTitle}>CLÁUSULAS</Text>
                  <Text style={styles.clauseText}>• Público de {proposal.attendanceTarget.toLocaleString('pt-BR')}+: bônus de {formatCurrency(proposal.attendanceBonus)}</Text>
                  <Text style={styles.clauseText}>• Cláusula de imagem: saída se torcida cair abaixo de {proposal.exitFanTrustBelow}/100</Text>
                  <Text style={styles.clauseText}>• {proposal.exclusivityCategory ? 'Exclusividade por categoria ativa' : 'Sem exclusividade por categoria'}</Text>
                  <Text style={styles.clauseText}>• Valor estimado do acordo: {formatCurrency(proposal.expectedValue)}</Text>
                </View>

                <View style={styles.impactRow}>
                  <Text style={styles.impactLabel}>Impacto torcida: <Text style={proposal.fanImpact >= 0 ? styles.positive : styles.negative}>{proposal.fanImpact >= 0 ? '+' : ''}{proposal.fanImpact}</Text></Text>
                  <Text style={styles.impactLabel}>Diretoria: <Text style={proposal.boardImpact >= 0 ? styles.positive : styles.negative}>{proposal.boardImpact >= 0 ? '+' : ''}{proposal.boardImpact}</Text></Text>
                </View>

                <Text style={styles.expiry}>Proposta válida até a rodada {proposal.expiresRound + 1}</Text>

                <View style={styles.counterBox}>
                  <Text style={styles.counterTitle}>CONTRAPROPOSTA DO CLUBE</Text>
                  <Text style={styles.counterHint}>Escolha outro local e quanto você quer pedir em relação à oferta atual. A empresa pode aceitar ou abandonar a negociação.</Text>

                  <Text style={styles.counterLabel}>LOCAL DE EXPOSIÇÃO</Text>
                  <View style={styles.chipWrap}>
                    {PLACEMENT_OPTIONS.map((slot) => {
                      const selectedSlot = counterSlots[proposal.id] ?? proposal.slot;
                      const occupied = contracts.some((item) => item.slot === slot);
                      return (
                        <Pressable
                          key={slot}
                          disabled={occupied}
                          onPress={() => setCounterSlots((current) => ({ ...current, [proposal.id]: slot }))}
                          style={[styles.placeChip, selectedSlot === slot && styles.placeChipActive, occupied && styles.placeChipDisabled]}
                        >
                          <Text style={[styles.placeChipText, selectedSlot === slot && styles.placeChipTextActive]}>{SLOT_LABELS[slot]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.counterLabel}>VALOR PEDIDO</Text>
                  <View style={styles.valueRow}>
                    {COUNTER_VALUES.map((value) => {
                      const selectedValue = counterValues[proposal.id] ?? 1.10;
                      return (
                        <Pressable
                          key={value}
                          onPress={() => setCounterValues((current) => ({ ...current, [proposal.id]: value }))}
                          style={[styles.valueChip, selectedValue === value && styles.valueChipActive]}
                        >
                          <Text style={[styles.valueChipText, selectedValue === value && styles.valueChipTextActive]}>{Math.round(value * 100)}%</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.counterPreview}>
                    <Text style={styles.counterPreviewText}>
                      Novo pedido: {SLOT_LABELS[counterSlots[proposal.id] ?? proposal.slot]} · cerca de {Math.round((counterValues[proposal.id] ?? 1.10) * 100)}% dos valores atuais
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable style={styles.declineButton} onPress={() => declineSponsor(proposal.id)}>
                    <Text style={styles.declineText}>RECUSAR</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.negotiateButton, proposal.negotiationRound >= 2 && styles.negotiateDisabled]}
                    disabled={proposal.negotiationRound >= 2}
                    onPress={() => negotiateSponsor(
                      proposal.id,
                      counterSlots[proposal.id] ?? proposal.slot,
                      counterValues[proposal.id] ?? 1.10,
                    )}
                  >
                    <Text style={styles.negotiateText}>{proposal.negotiationRound >= 2 ? 'LIMITE' : 'REENVIAR PROPOSTA'}</Text>
                  </Pressable>
                  <Pressable style={styles.acceptButton} onPress={() => acceptSponsor(proposal.id)}>
                    <Text style={styles.acceptText}>ACEITAR</Text>
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
                  <View style={styles.contractClauses}>
                    <Text style={styles.contractClause}>Vitória: +{formatCurrency(contract.winBonus)}</Text>
                    <Text style={styles.contractClause}>G4: +{formatCurrency(contract.qualificationBonus)}</Text>
                    <Text style={styles.contractClause}>Título: +{formatCurrency(contract.titleBonus)}</Text>
                  </View>
                  {contract.matchesRemaining <= 2 ? (
                    <Pressable style={styles.renewButton} onPress={() => renewSponsor(contract.id)}>
                      <Feather name="refresh-cw" size={14} color="#07150d" />
                      <Text style={styles.renewText}>NEGOCIAR RENOVAÇÃO</Text>
                    </Pressable>
                  ) : null}
                </Panel>
              );
            })}
          </View>
        )}

        <SectionLabel title="Histórico comercial" />
        <Panel style={styles.historyPanel}>
          {(career.sponsorships?.history ?? []).length === 0 ? (
            <Text style={styles.emptyText}>Nenhum movimento comercial registrado ainda.</Text>
          ) : (career.sponsorships?.history ?? []).slice(0, 8).map((item, index) => (
            <View key={item + index} style={styles.historyRow}>
              <View style={styles.historyDot} />
              <Text style={styles.historyText}>{item}</Text>
            </View>
          ))}
        </Panel>

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
  uniformPanel:{gap:12,backgroundColor:'#101f19',borderColor:'#355846'},
  uniformIntro:{color:'#a8baae',fontSize:8.5,lineHeight:13},
  uniformArea:{flexDirection:'row',gap:12,alignItems:'flex-start',flexWrap:'wrap'},
  shirtWrap:{width:150,alignItems:'center',paddingTop:8},
  shirtBody:{width:92,height:118,borderRadius:14,borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:2,borderColor:'#dce8df',alignItems:'center',position:'relative',paddingTop:13},
  sleeveLeft:{position:'absolute',left:8,top:16,width:38,height:46,borderRadius:12,borderWidth:2,borderColor:'#dce8df',transform:[{rotate:'18deg'}]},
  sleeveRight:{position:'absolute',right:8,top:16,width:38,height:46,borderRadius:12,borderWidth:2,borderColor:'#dce8df',transform:[{rotate:'-18deg'}]},
  clubBadge:{position:'absolute',left:10,top:11,width:20,height:20,borderRadius:10,backgroundColor:'#f5f7f5',alignItems:'center',justifyContent:'center'},
  clubBadgeText:{color:'#10251a',fontSize:6,fontWeight:'900'},
  chestSponsor:{position:'absolute',top:48,left:10,right:10,minHeight:22,borderRadius:5,backgroundColor:'rgba(0,0,0,0.28)',alignItems:'center',justifyContent:'center',paddingHorizontal:4},
  chestSponsorText:{color:'#fff',fontSize:7.5,fontWeight:'900'},
  backSponsor:{position:'absolute',bottom:13,left:15,right:15,minHeight:17,borderRadius:4,backgroundColor:'rgba(0,0,0,0.22)',alignItems:'center',justifyContent:'center',paddingHorizontal:3},
  smallSponsorText:{color:'#fff',fontSize:6,fontWeight:'900'},
  sleeveSponsor:{position:'absolute',right:-35,top:28,width:42,height:15,borderRadius:4,backgroundColor:'rgba(0,0,0,0.38)',alignItems:'center',justifyContent:'center',paddingHorizontal:2},
  tinySponsorText:{color:'#fff',fontSize:5,fontWeight:'900'},
  shorts:{width:80,height:38,marginTop:5,borderRadius:8,borderTopLeftRadius:3,borderTopRightRadius:3,borderWidth:2,borderColor:'#dce8df',alignItems:'center',justifyContent:'center',paddingHorizontal:4},
  shortsSponsorText:{color:'#fff',fontSize:5.5,fontWeight:'900'},
  exposureList:{flex:1,minWidth:155,gap:6},
  exposureRow:{minHeight:38,borderRadius:8,paddingHorizontal:8,paddingVertical:6,backgroundColor:'#0a1811',borderWidth:1,borderColor:'#273f31',justifyContent:'center'},
  exposureLabel:{color:'#788d7e',fontSize:6.5,fontWeight:'900'},
  exposureBrand:{color:'#79ef91',fontSize:8.5,fontWeight:'900',marginTop:2},
  exposureEmpty:{color:'#66786c',fontSize:8,fontWeight:'800',marginTop:2},
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
  locationBanner:{flexDirection:'row',alignItems:'center',gap:8,padding:9,borderRadius:9,backgroundColor:'#132a1e',borderWidth:1,borderColor:'#355846'},
  locationLabel:{color:'#7f9587',fontSize:6.5,fontWeight:'900',letterSpacing:0.6},
  locationValue:{color:'#f5f7f5',fontSize:9.5,fontWeight:'900',marginTop:2},
  offerGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},
  offerItem:{width:'48.5%',minHeight:53,borderRadius:8,padding:7,justifyContent:'center',backgroundColor:'#0a1811',borderWidth:1,borderColor:'#273f31'},
  offerLabel:{color:'#72887a',fontSize:6.3,fontWeight:'900'},
  offerValue:{color:'#f5f7f5',fontSize:9.5,fontWeight:'900',marginTop:3},
  impactRow:{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
  impactLabel:{color:'#a5b6aa',fontSize:7.5,fontWeight:'800'},
  positive:{color:'#79ef91',fontWeight:'900'},
  negative:{color:'#f09d9d',fontWeight:'900'},
  expiry:{color:'#d8c27c',fontSize:7.5,fontWeight:'800'},
  counterBox:{gap:8,padding:9,borderRadius:9,backgroundColor:'#0b1711',borderWidth:1,borderColor:'#2a4032'},
  counterTitle:{color:'#79ef91',fontSize:7.5,fontWeight:'900',letterSpacing:0.8},
  counterHint:{color:'#9fb0a5',fontSize:7.5,lineHeight:11.5},
  counterLabel:{color:'#788d7e',fontSize:6.5,fontWeight:'900',marginTop:2},
  chipWrap:{flexDirection:'row',flexWrap:'wrap',gap:5},
  placeChip:{paddingHorizontal:7,paddingVertical:6,borderRadius:7,backgroundColor:'#15241b',borderWidth:1,borderColor:'#30483a'},
  placeChipActive:{backgroundColor:'#234a34',borderColor:'#79ef91'},
  placeChipDisabled:{opacity:0.32},
  placeChipText:{color:'#aab8ae',fontSize:6.5,fontWeight:'800'},
  placeChipTextActive:{color:'#f5f7f5'},
  valueRow:{flexDirection:'row',gap:5,flexWrap:'wrap'},
  valueChip:{minWidth:45,minHeight:32,borderRadius:7,alignItems:'center',justifyContent:'center',backgroundColor:'#15241b',borderWidth:1,borderColor:'#30483a'},
  valueChipActive:{backgroundColor:'#79ef91',borderColor:'#79ef91'},
  valueChipText:{color:'#b2c0b6',fontSize:7,fontWeight:'900'},
  valueChipTextActive:{color:'#07150d'},
  counterPreview:{padding:7,borderRadius:7,backgroundColor:'#13251b'},
  counterPreviewText:{color:'#d4dfd7',fontSize:7.2,lineHeight:11,fontWeight:'800'},
  actions:{flexDirection:'row',gap:6},
  declineButton:{flex:0.28,minHeight:40,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#2a1a1a',borderWidth:1,borderColor:'#624141'},
  declineText:{color:'#efb2b2',fontSize:7.5,fontWeight:'900'},
  negotiateButton:{flex:0.36,minHeight:40,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#1a3327',borderWidth:1,borderColor:'#426a52'},
  negotiateDisabled:{opacity:0.45},
  negotiateText:{color:'#d8e5dc',fontSize:7.2,fontWeight:'900'},
  acceptButton:{flex:0.36,minHeight:40,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#79ef91'},
  acceptText:{color:'#07150d',fontSize:7.5,fontWeight:'900'},
  clauseBox:{gap:4,padding:8,borderRadius:8,backgroundColor:'#0b1711',borderWidth:1,borderColor:'#2a4032'},
  clauseTitle:{color:'#79ef91',fontSize:7,fontWeight:'900',letterSpacing:0.8},
  clauseText:{color:'#a7b6ac',fontSize:7.3,lineHeight:11.5},

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
  contractClauses:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  contractClause:{color:'#c3d0c7',fontSize:7.2,fontWeight:'800'},
  renewButton:{minHeight:36,borderRadius:8,backgroundColor:'#79ef91',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  renewText:{color:'#07150d',fontSize:7.5,fontWeight:'900'},
  historyPanel:{gap:8,backgroundColor:'#0f2118',borderColor:'#2d4938'},
  historyRow:{flexDirection:'row',alignItems:'flex-start',gap:8},
  historyDot:{width:6,height:6,borderRadius:3,backgroundColor:'#79ef91',marginTop:3},
  historyText:{flex:1,color:'#aab9af',fontSize:8.1,lineHeight:12.3},
  timeline:{gap:10,backgroundColor:'#0f2118',borderColor:'#2d4938'},
  timelineItem:{flexDirection:'row',alignItems:'flex-start',gap:8},
  dot:{width:7,height:7,borderRadius:4,backgroundColor:'#79ef91',marginTop:3},
  timelineText:{flex:1,color:'#aab9af',fontSize:8.3,lineHeight:12.5},
});