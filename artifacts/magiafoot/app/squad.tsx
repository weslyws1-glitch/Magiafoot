import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { effectiveStrength, formatCurrency, getRosterGroups } from '@/game/engine';
import type { Player, PlayerMarketStatus, PlayerSquadRole, PlayerTrainingFocus, Position } from '@/game/types';

type TabKey = 'plantel' | 'contratos' | 'desempenho' | 'treino' | 'mercado';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'plantel', label: 'PLANTEL' },
  { key: 'contratos', label: 'CONTRATOS' },
  { key: 'desempenho', label: 'DESEMPENHO' },
  { key: 'treino', label: 'TREINO' },
  { key: 'mercado', label: 'MERCADO' },
];

const ROLE_LABELS: Record<PlayerSquadRole,string> = {
  estrela: 'Estrela',
  titular: 'Titular',
  rotacao: 'Rotação',
  reserva: 'Reserva',
  jovem: 'Jovem',
};

const MARKET_LABELS: Record<PlayerMarketStatus,string> = {
  inegociavel: 'Inegociável',
  disponivel: 'Disponível',
  negociavel: 'Negociável',
  emprestimo: 'Empréstimo',
};

const TRAINING_LABELS: Record<PlayerTrainingFocus,string> = {
  equilibrado: 'Equilibrado',
  fisico: 'Físico',
  tecnica: 'Técnica',
  finalizacao: 'Finalização',
  passe: 'Passe',
  marcacao: 'Marcação',
};

const PERSONALITY_LABELS: Record<string,string> = {
  profissional: 'Profissional',
  lider: 'Líder',
  ambicioso: 'Ambicioso',
  tranquilo: 'Tranquilo',
  temperamental: 'Temperamental',
  festeiro: 'Festeiro',
};

const POSITION_COLORS: Record<Player['position'], string> = {
  GOL: '#F59E0B',
  LD: '#38BDF8',
  LE: '#38BDF8',
  ZAG: '#1D4ED8',
  VOL: '#047857',
  MC: '#22C55E',
  MEI: '#86EFAC',
  PE: '#FB7185',
  PD: '#FB7185',
  ATA: '#B91C1C',
};

const POSITION_BADGE_COLORS: Record<Position,{ background: string; text: string; border: string }> = {
  GOL: { background: '#F59E0B', text: '#101010', border: '#FDBA2D' },
  LD: { background: '#38BDF8', text: '#07131A', border: '#7DD3FC' },
  LE: { background: '#38BDF8', text: '#07131A', border: '#7DD3FC' },
  ZAG: { background: '#1D4ED8', text: '#F8FAFC', border: '#3B82F6' },
  VOL: { background: '#047857', text: '#F0FDF4', border: '#10B981' },
  MC: { background: '#22C55E', text: '#052E16', border: '#4ADE80' },
  MEI: { background: '#86EFAC', text: '#052E16', border: '#BBF7D0' },
  PE: { background: '#FB7185', text: '#3F0712', border: '#FDA4AF' },
  PD: { background: '#FB7185', text: '#3F0712', border: '#FDA4AF' },
  ATA: { background: '#B91C1C', text: '#FFF7ED', border: '#EF4444' },
};

function averageRating(player: Player) {
  const stats = player.seasonStats;
  if (!stats || !stats.ratedMatches) return '—';
  return (stats.ratingSum / stats.ratedMatches).toFixed(2);
}

function contractRemaining(player: Player, roundIndex: number) {
  return Math.max(0, (player.contractEndRound ?? roundIndex + 20) - roundIndex);
}

function satisfactionText(value: number) {
  if (value >= 82) return 'Muito satisfeito';
  if (value >= 65) return 'Satisfeito';
  if (value >= 45) return 'Neutro';
  if (value >= 28) return 'Insatisfeito';
  return 'Muito insatisfeito';
}

function PlayerRow({ player, careerRound, onPress }: { player: Player; careerRound: number; onPress: () => void }) {
  const stats = player.seasonStats;
  return (
    <Pressable onPress={onPress} style={styles.playerRow}>
      <View style={[styles.positionBadge,{ backgroundColor: POSITION_BADGE_COLORS[player.position].background, borderColor: POSITION_BADGE_COLORS[player.position].border }]}>
        <Text style={[styles.positionText,{ color: POSITION_BADGE_COLORS[player.position].text }]}>{player.position}</Text>
      </View>
      <View style={styles.playerMain}>
        <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.playerSub} numberOfLines={1}>
          {ROLE_LABELS[player.squadRole ?? 'rotacao']} · {player.age} anos · {player.status === 'available' ? 'Disponível' : player.status === 'injured' ? 'Lesionado' : 'Suspenso'}
        </Text>
      </View>
      <View style={styles.rowStat}><Text style={styles.rowStatValue}>{effectiveStrength(player)}</Text><Text style={styles.rowStatLabel}>FOR</Text></View>
      <View style={styles.rowStat}><Text style={styles.rowStatValue}>{stats?.goals ?? 0}</Text><Text style={styles.rowStatLabel}>G</Text></View>
      <View style={styles.chevron}><Feather name="chevron-right" size={17} color="#789080" /></View>
    </Pressable>
  );
}

export default function SquadScreen() {
  const router = useRouter();
  const {
    career, chooseCaptain, transferPlayer, renewPlayer, updatePlayerMarketStatus,
    updatePlayerSquadRole, updatePlayerTrainingFocus, promiseMinutes,
    acceptPlayerOffer, declinePlayerOffer,
  } = useCareer();
  const [tab, setTab] = useState<TabKey>('plantel');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!career) {
    return <><GameHeader title="Elenco" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  const groups = getRosterGroups(career);
  const ordered = useMemo(() => {
    const order = ['GOL','LD','ZAG','LE','VOL','MC','MEI','PE','PD','ATA'];
    return [...career.players].sort((a,b) => order.indexOf(a.position) - order.indexOf(b.position) || b.strength - a.strength);
  }, [career.players]);
  const selected = career.players.find((player) => player.id === selectedId) ?? null;
  const totalWages = career.players.reduce((sum, player) => sum + player.wage, 0);
  const avgMorale = Math.round(career.players.reduce((sum,p) => sum + p.morale,0) / Math.max(1,career.players.length));
  const avgSatisfaction = Math.round(career.players.reduce((sum,p) => sum + (p.playingTimeSatisfaction ?? 70),0) / Math.max(1,career.players.length));
  const unhappy = career.players.filter((p) => (p.playingTimeSatisfaction ?? 70) < 40 || p.morale < 40).length;
  const expiring = career.players.filter((p) => contractRemaining(p,career.roundIndex) <= 10).length;
  const conflictAverage = Math.round(career.players.reduce((sum,p) => sum + (p.conflictLevel ?? 0) * 20,0) / Math.max(1,career.players.length));
  const unity = Math.max(0,Math.min(100,Math.round((avgMorale + avgSatisfaction) / 2 - conflictAverage * 0.35)));
  const discipline = Math.max(0,Math.min(100,100 - Math.round(career.players.reduce((sum,p) => sum + (p.socialRisk ?? 20),0) / Math.max(1,career.players.length) * 0.6) - conflictAverage * 0.25));
  const leaders = [...career.players].sort((a,b) => (b.leadership ?? 50) - (a.leadership ?? 50)).slice(0,3);

  const visible = ordered.filter((player) => {
    if (tab === 'contratos') return contractRemaining(player,career.roundIndex) <= 18;
    if (tab === 'desempenho') return (player.seasonStats?.appearances ?? 0) > 0;
    if (tab === 'treino') return true;
    if (tab === 'mercado') return true;
    return true;
  });

  return (
    <>
      <GameHeader title="Elenco" eyebrow={career.players.length + ' JOGADORES'} />
      <Screen>
        <Panel style={styles.environmentPanel}>
          <View style={styles.environmentTop}>
            <View>
              <Text style={styles.kicker}>AMBIENTE DO ELENCO</Text>
              <Text style={styles.environmentTitle}>{avgMorale >= 75 && avgSatisfaction >= 70 ? 'Vestiário em boa fase' : unhappy >= 4 ? 'Vestiário sob pressão' : 'Ambiente controlado'}</Text>
            </View>
            <Text style={styles.environmentScore}>{Math.round((avgMorale + avgSatisfaction) / 2)}/100</Text>
          </View>
          <View style={styles.environmentMetrics}>
            <View style={styles.environmentMetric}><Text style={styles.metricLabel}>MORAL</Text><Text style={styles.metricValue}>{avgMorale}</Text></View>
            <View style={styles.environmentMetric}><Text style={styles.metricLabel}>SATISFAÇÃO</Text><Text style={styles.metricValue}>{avgSatisfaction}</Text></View>
            <View style={styles.environmentMetric}><Text style={styles.metricLabel}>UNIÃO</Text><Text style={styles.metricValue}>{unity}</Text></View>
            <View style={styles.environmentMetric}><Text style={styles.metricLabel}>DISCIPLINA</Text><Text style={styles.metricValue}>{discipline}</Text></View>
            <View style={styles.environmentMetric}><Text style={styles.metricLabel}>INSATISFEITOS</Text><Text style={styles.metricValue}>{unhappy}</Text></View>
            <View style={styles.environmentMetric}><Text style={styles.metricLabel}>CONTRATOS CURTOS</Text><Text style={styles.metricValue}>{expiring}</Text></View>
          </View>
        </Panel>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab,tab === item.key && styles.tabActive]}>
              <Text style={[styles.tabText,tab === item.key && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'plantel' ? (
          <>
            <View style={styles.summary}>
              <Panel style={styles.summaryMetric}><Text style={styles.metricLabel}>TITULARES</Text><Text style={styles.bigValue}>{groups.starters.length}</Text></Panel>
              <Panel style={styles.summaryMetric}><Text style={styles.metricLabel}>RESERVAS</Text><Text style={styles.bigValue}>{groups.bench.length + groups.reserves.length}</Text></Panel>
              <Panel style={styles.summaryMetric}><Text style={styles.metricLabel}>FOLHA/SEM</Text><Text style={styles.moneyValue}>{formatCurrency(totalWages)}</Text></Panel>
            </View>
            <Panel style={styles.leadersPanel}>
              <Text style={styles.kicker}>LIDERANÇAS DO VESTIÁRIO</Text>
              <Text style={styles.leadersText}>{leaders.map((p) => p.name).join(' · ')}</Text>
            </Panel>
          </>
        ) : null}

        {tab === 'contratos' ? <SectionLabel title="Contratos que exigem atenção" /> : null}
        {tab === 'desempenho' ? <SectionLabel title="Desempenho na temporada" /> : null}
        {tab === 'treino' ? <SectionLabel title="Treino individual" /> : null}
        {tab === 'mercado' ? <SectionLabel title="Situação no mercado" /> : null}

        {tab === 'mercado' && (career.playerTransferOffers ?? []).length > 0 ? (
          <View style={styles.offerList}>
            {(career.playerTransferOffers ?? []).map((offer) => {
              const player = career.players.find((item) => item.id === offer.playerId);
              if (!player) return null;
              return (
                <Panel key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerKicker}>{offer.type === 'loan' ? 'PROPOSTA DE EMPRÉSTIMO' : 'PROPOSTA DE COMPRA'}</Text>
                      <Text style={styles.offerPlayer}>{player.name}</Text>
                      <Text style={styles.offerClub}>{offer.clubName}</Text>
                    </View>
                    <Text style={styles.offerAmount}>{formatCurrency(offer.amount)}</Text>
                  </View>
                  <Text style={styles.offerInfo}>
                    {offer.type === 'loan'
                      ? 'Empréstimo por ' + offer.durationRounds + ' rodadas. O atleta retorna automaticamente ao fim do período.'
                      : 'Transferência definitiva. A proposta expira na rodada ' + (offer.expiresRound + 1) + '.'}
                  </Text>
                  <View style={styles.offerActions}>
                    <Pressable style={styles.offerDecline} onPress={() => declinePlayerOffer(offer.id)}>
                      <Text style={styles.offerDeclineText}>RECUSAR</Text>
                    </Pressable>
                    <Pressable style={styles.offerAccept} onPress={() => acceptPlayerOffer(offer.id)}>
                      <Text style={styles.offerAcceptText}>ACEITAR</Text>
                    </Pressable>
                  </View>
                </Panel>
              );
            })}
          </View>
        ) : tab === 'mercado' ? (
          <Panel style={styles.noOffersPanel}>
            <Feather name="inbox" size={22} color="#789080" />
            <Text style={styles.noOffersTitle}>Nenhuma proposta no momento</Text>
            <Text style={styles.noOffersText}>Marque jogadores como disponíveis ou para empréstimo para aumentar o interesse do mercado.</Text>
          </Panel>
        ) : null}

        {tab === 'plantel' ? (
          <Panel style={styles.tablePanel}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th,styles.colPos]}>POS</Text>
              <Text style={[styles.th,styles.colNum]}>N.</Text>
              <Text style={[styles.th,styles.colName]}>NOME</Text>
              <Text style={[styles.th,styles.colCond]}>CND</Text>
              <Text style={[styles.th,styles.colQuality]}>QUAL.</Text>
              <Text style={[styles.th,styles.colMorale]}>MOR.</Text>
            </View>
            {visible.map((player) => {
              const condition = Math.round(player.fitness);
              const quality = effectiveStrength(player);
              return (
                <Pressable key={player.id} onPress={() => setSelectedId(player.id)} style={styles.tableRow}>
                  <View style={styles.colPos}>
                    <View style={[styles.compactPositionBadge,{ backgroundColor: POSITION_BADGE_COLORS[player.position].background, borderColor: POSITION_BADGE_COLORS[player.position].border }]}>
                      <Text style={[styles.posCell,{ color: POSITION_BADGE_COLORS[player.position].text }]}>{player.position}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cell,styles.colNum]}>{player.shirtNumber ?? '—'}</Text>
                  <View style={styles.colName}>
                    <Text numberOfLines={1} style={styles.nameCell}>{player.name}</Text>
                    <Text numberOfLines={1} style={styles.nameSub}>{ROLE_LABELS[player.squadRole ?? 'rotacao']}</Text>
                  </View>
                  <View style={styles.colCond}>
                    <View style={styles.conditionTrack}>
                      <View style={[styles.conditionFill,{ width:(Math.max(8,Math.min(100,condition)) + '%') as any }]} />
                    </View>
                    <Text style={styles.miniCell}>{condition}</Text>
                  </View>
                  <Text style={[styles.qualityCell,styles.colQuality]}>{quality}</Text>
                  <Text style={[styles.moraleCell,styles.colMorale]}>{player.morale}</Text>
                </Pressable>
              );
            })}
          </Panel>
        ) : (
          <Panel style={styles.listPanel}>
            {visible.map((player) => (
              <Pressable key={player.id} onPress={() => setSelectedId(player.id)} style={styles.playerRow}>
                <View style={[styles.positionBadge,{ backgroundColor: POSITION_BADGE_COLORS[player.position].background, borderColor: POSITION_BADGE_COLORS[player.position].border }]}>
                  <Text style={[styles.positionText,{ color: POSITION_BADGE_COLORS[player.position].text }]}>{player.position}</Text>
                </View>
                <View style={styles.playerMain}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerSub}>
                    {tab === 'contratos'
                      ? contractRemaining(player,career.roundIndex) + ' jogos restantes · ' + formatCurrency(player.wage) + '/sem'
                      : tab === 'desempenho'
                        ? (player.seasonStats?.appearances ?? 0) + ' J · ' + (player.seasonStats?.goals ?? 0) + ' G · Nota ' + averageRating(player)
                        : tab === 'treino'
                          ? 'Foco: ' + TRAINING_LABELS[player.trainingFocus ?? 'equilibrado'] + ' · Potencial ' + (player.potential ?? player.strength)
                          : MARKET_LABELS[player.marketStatus ?? 'negociavel'] + ' · ' + formatCurrency(player.value)}
                  </Text>
                </View>
                <View style={styles.rowStat}><Text style={styles.rowStatValue}>{effectiveStrength(player)}</Text><Text style={styles.rowStatLabel}>FOR</Text></View>
                <Feather name="chevron-right" size={17} color="#789080" />
              </Pressable>
            ))}
          </Panel>
        )}

        <GameButton label="ORGANIZAR ESCALAÇÃO" icon="layout" onPress={() => router.push('/tactics')} />
      </Screen>

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selected ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.playerAvatar,{ backgroundColor: POSITION_BADGE_COLORS[selected.position].background, borderColor: POSITION_BADGE_COLORS[selected.position].border }]}>
                    <Text style={[styles.playerAvatarText,{ color: POSITION_BADGE_COLORS[selected.position].text }]}>{selected.position}</Text>
                  </View>
                  <View style={styles.modalIdentity}>
                    <Text style={styles.modalName}>{selected.name}</Text>
                    <Text style={styles.modalMeta}>{selected.age} anos · {ROLE_LABELS[selected.squadRole ?? 'rotacao']} · {PERSONALITY_LABELS[selected.personality ?? 'tranquilo']}{selected.status === 'loaned' ? ' · Emprestado' : ''}</Text>
                  </View>
                  <Pressable style={styles.closeButton} onPress={() => setSelectedId(null)}><Feather name="x" size={20} color="#f5f7f5" /></Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                  <View style={styles.profileMetrics}>
                    <View style={styles.profileMetric}><Text style={styles.profileValue}>{selected.strength}</Text><Text style={styles.profileLabel}>FORÇA</Text></View>
                    <View style={styles.profileMetric}><Text style={styles.profileValue}>{selected.potential ?? selected.strength}</Text><Text style={styles.profileLabel}>POTENCIAL</Text></View>
                    <View style={styles.profileMetric}><Text style={styles.profileValue}>{selected.fitness}</Text><Text style={styles.profileLabel}>FÍSICO</Text></View>
                    <View style={styles.profileMetric}><Text style={styles.profileValue}>{selected.morale}</Text><Text style={styles.profileLabel}>MORAL</Text></View>
                  </View>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>CONTRATO</Text>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Salário semanal</Text><Text style={styles.detailValue}>{formatCurrency(selected.wage)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Tempo restante</Text><Text style={styles.detailValue}>{contractRemaining(selected,career.roundIndex)} jogos</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Multa rescisória</Text><Text style={styles.detailValue}>{formatCurrency(selected.releaseClause ?? selected.value * 1.5)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Valor de mercado</Text><Text style={styles.detailValue}>{formatCurrency(selected.value)}</Text></View>
                    <Pressable style={styles.primaryButton} onPress={() => renewPlayer(selected.id,2)}>
                      <Text style={styles.primaryButtonText}>RENOVAR +2 TEMPORADAS</Text>
                    </Pressable>
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>IMPORTÂNCIA NO ELENCO</Text>
                    <View style={styles.choiceWrap}>
                      {(Object.keys(ROLE_LABELS) as PlayerSquadRole[]).map((role) => (
                        <Pressable key={role} onPress={() => updatePlayerSquadRole(selected.id,role)} style={[styles.choice,(selected.squadRole ?? 'rotacao') === role && styles.choiceActive]}>
                          <Text style={[styles.choiceText,(selected.squadRole ?? 'rotacao') === role && styles.choiceTextActive]}>{ROLE_LABELS[role]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Satisfação com minutos</Text><Text style={styles.detailValue}>{selected.playingTimeSatisfaction ?? 70}/100</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Relação com treinador</Text><Text style={styles.detailValue}>{selected.relationship ?? 60}/100</Text></View>
                    <Pressable style={styles.secondaryButton} onPress={() => promiseMinutes(selected.id)}>
                      <Text style={styles.secondaryButtonText}>PROMETER MAIS MINUTOS</Text>
                    </Pressable>
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>DESEMPENHO</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.seasonStats?.appearances ?? 0}</Text><Text style={styles.statLabel}>JOGOS</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.seasonStats?.minutes ?? 0}</Text><Text style={styles.statLabel}>MIN</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.seasonStats?.goals ?? 0}</Text><Text style={styles.statLabel}>GOLS</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{averageRating(selected)}</Text><Text style={styles.statLabel}>NOTA</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.seasonStats?.yellowCards ?? 0}</Text><Text style={styles.statLabel}>AMAR.</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.seasonStats?.redCards ?? 0}</Text><Text style={styles.statLabel}>VERM.</Text></View>
                    </View>
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>ATRIBUTOS TÉCNICOS</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.skills?.technique ?? selected.strength}</Text><Text style={styles.statLabel}>TÉCNICA</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.skills?.passing ?? selected.strength}</Text><Text style={styles.statLabel}>PASSE</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.skills?.shooting ?? selected.strength}</Text><Text style={styles.statLabel}>FINAL.</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.skills?.defending ?? selected.strength}</Text><Text style={styles.statLabel}>MARCAÇÃO</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.skills?.pace ?? selected.strength}</Text><Text style={styles.statLabel}>VELOC.</Text></View>
                      <View style={styles.statBox}><Text style={styles.statNumber}>{selected.skills?.physical ?? selected.strength}</Text><Text style={styles.statLabel}>FÍSICO</Text></View>
                    </View>
                    {selected.position === 'GOL' ? (
                      <View style={styles.detailRow}><Text style={styles.detailKey}>Defesa de goleiro</Text><Text style={styles.detailValue}>{selected.skills?.goalkeeping ?? selected.strength}</Text></View>
                    ) : null}
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>TREINO INDIVIDUAL</Text>
                    <View style={styles.choiceWrap}>
                      {(Object.keys(TRAINING_LABELS) as PlayerTrainingFocus[]).map((focus) => (
                        <Pressable key={focus} onPress={() => updatePlayerTrainingFocus(selected.id,focus)} style={[styles.choice,(selected.trainingFocus ?? 'equilibrado') === focus && styles.choiceActive]}>
                          <Text style={[styles.choiceText,(selected.trainingFocus ?? 'equilibrado') === focus && styles.choiceTextActive]}>{TRAINING_LABELS[focus]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.helperText}>O foco escolhido direciona a evolução real do atributo correspondente. Jogadores jovens e abaixo do potencial evoluem com mais facilidade.</Text>
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>PERSONALIDADE E VESTIÁRIO</Text>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Personalidade</Text><Text style={styles.detailValue}>{PERSONALITY_LABELS[selected.personality ?? 'tranquilo']}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Liderança</Text><Text style={styles.detailValue}>{selected.leadership ?? 50}/100</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Risco social</Text><Text style={styles.detailValue}>{selected.socialRisk ?? 20}/100</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Vida social</Text><Text style={styles.detailValue}>{selected.socialStatus === 'conturbada' ? 'Conturbada' : selected.socialStatus === 'atencao' ? 'Atenção' : 'Estável'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Conflito interno</Text><Text style={styles.detailValue}>{(selected.conflictLevel ?? 0) * 20}/100</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailKey}>Posições secundárias</Text><Text style={styles.detailValue}>{selected.secondaryPositions?.join(', ') || 'Nenhuma'}</Text></View>
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>HISTÓRICO DO JOGADOR</Text>
                    {(selected.careerEvents ?? []).length > 0 ? (
                      (selected.careerEvents ?? []).slice(0,8).map((event) => (
                        <View key={event.id} style={styles.historyItem}>
                          <View style={styles.historyDot} />
                          <View style={styles.historyBody}>
                            <Text style={styles.historyTitle}>{event.title}</Text>
                            <Text style={styles.historyMeta}>Temporada {event.season} · Rodada {event.roundIndex + 1}</Text>
                            <Text style={styles.historyText}>{event.detail}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.helperText}>Ainda não há acontecimentos registrados nesta carreira.</Text>
                    )}
                  </Panel>

                  <Panel style={styles.detailPanel}>
                    <Text style={styles.sectionTitle}>MERCADO</Text>
                    <View style={styles.choiceWrap}>
                      {(Object.keys(MARKET_LABELS) as PlayerMarketStatus[]).map((status) => (
                        <Pressable key={status} onPress={() => updatePlayerMarketStatus(selected.id,status)} style={[styles.choice,(selected.marketStatus ?? 'negociavel') === status && styles.choiceActive]}>
                          <Text style={[styles.choiceText,(selected.marketStatus ?? 'negociavel') === status && styles.choiceTextActive]}>{MARKET_LABELS[status]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      onPress={() => chooseCaptain(selected.id)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>{selected.id === career.captainId ? '★ CAPITÃO ATUAL' : 'DEFINIR COMO CAPITÃO'}</Text>
                    </Pressable>
                    {selected.status === 'loaned' ? (
                      <View style={styles.loanInfoBox}>
                        <Text style={styles.loanInfoTitle}>EMPRESTADO AO {selected.loanClubName ?? 'OUTRO CLUBE'}</Text>
                        <Text style={styles.loanInfoText}>Retorno previsto em {Math.max(0,(selected.loanedOutUntilRound ?? career.roundIndex) - career.roundIndex)} rodadas.</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => transferPlayer(selected.id)}
                        style={styles.dangerButton}
                      >
                        <Text style={styles.dangerButtonText}>NEGOCIAR SAÍDA IMEDIATA</Text>
                      </Pressable>
                    )}
                  </Panel>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles=StyleSheet.create({
  environmentPanel:{gap:12,backgroundColor:'#153426',borderColor:'#2c503d'},
  environmentTop:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10},
  kicker:{color:'#79ef91',fontSize:7,fontWeight:'900',letterSpacing:0.8},
  environmentTitle:{color:'#f5f7f5',fontSize:16,fontWeight:'900',marginTop:3},
  environmentScore:{color:'#79ef91',fontSize:15,fontWeight:'900'},
  environmentMetrics:{flexDirection:'row',flexWrap:'wrap',gap:7},
  environmentMetric:{width:'31.8%',padding:9,borderRadius:8,backgroundColor:'#0c2117'},
  metricLabel:{color:'#83998b',fontSize:6.5,fontWeight:'900',letterSpacing:0.5},
  metricValue:{color:'#f5f7f5',fontSize:14,fontWeight:'900',marginTop:2},
  tabs:{gap:7,paddingVertical:2},
  tab:{paddingHorizontal:12,paddingVertical:9,borderRadius:8,backgroundColor:'#10251a',borderWidth:1,borderColor:'#294536'},
  tabActive:{backgroundColor:'#79ef91',borderColor:'#79ef91'},
  tabText:{color:'#9db0a3',fontSize:7.5,fontWeight:'900'},
  tabTextActive:{color:'#07150d'},
  summary:{flexDirection:'row',gap:8},
  summaryMetric:{flex:1,minHeight:78,justifyContent:'center',gap:4,backgroundColor:'#10291d',borderColor:'#2c503d'},
  bigValue:{color:'#f5f7f5',fontSize:22,fontWeight:'900'},
  moneyValue:{color:'#f5f7f5',fontSize:10,fontWeight:'900'},
  leadersPanel:{gap:5,backgroundColor:'#10291d',borderColor:'#2c503d'},
  leadersText:{color:'#dfe8e2',fontSize:9,fontWeight:'800'},
  listPanel:{padding:0,overflow:'hidden'},
  tablePanel:{padding:0,overflow:'hidden'},
  tableHeader:{minHeight:38,paddingHorizontal:6,flexDirection:'row',alignItems:'center',backgroundColor:'#0b1d14',borderBottomWidth:1,borderBottomColor:'#2c503d'},
  tableRow:{minHeight:54,paddingHorizontal:6,flexDirection:'row',alignItems:'center',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#214231'},
  th:{color:'#79ef91',fontSize:6.5,fontWeight:'900',letterSpacing:0.4},
  cell:{color:'#dfe8e2',fontSize:8,fontWeight:'800',textAlign:'center'},
  colPos:{width:40,alignItems:'flex-start',justifyContent:'center'},
  compactPositionBadge:{width:34,height:28,borderRadius:6,alignItems:'center',justifyContent:'center',borderWidth:1},
  colNum:{width:28,textAlign:'center'},
  colName:{flex:1,minWidth:0,paddingRight:5},
  colCond:{width:60,alignItems:'center'},
  colQuality:{width:42,textAlign:'center'},
  colMorale:{width:42,textAlign:'center'},
  posCell:{fontSize:8,fontWeight:'900'},
  nameCell:{color:'#f6f8f6',fontSize:8.5,fontWeight:'900'},
  nameSub:{color:'#718579',fontSize:5.8,marginTop:2},
  conditionTrack:{width:46,height:7,borderRadius:99,backgroundColor:'#1d2c23',overflow:'hidden',borderWidth:1,borderColor:'#31493a'},
  conditionFill:{height:'100%',backgroundColor:'#79ef91'},
  miniCell:{color:'#8da092',fontSize:5.8,fontWeight:'900',marginTop:2},
  qualityCell:{color:'#79ef91',fontSize:9,fontWeight:'900'},
  moraleCell:{color:'#f1d36c',fontSize:9,fontWeight:'900'},
  playerRow:{minHeight:64,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:9,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#214231'},
  positionBadge:{width:38,height:38,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#153426',borderWidth:1,borderColor:'#355846'},
  positionText:{fontSize:8,fontWeight:'900'},
  playerMain:{flex:1,minWidth:0},
  playerName:{color:'#f6f8f6',fontSize:11,fontWeight:'900'},
  playerSub:{color:'#84998b',fontSize:7.3,marginTop:3},
  rowStat:{alignItems:'center',minWidth:28},
  rowStatValue:{color:'#f5f7f5',fontSize:11,fontWeight:'900'},
  rowStatLabel:{color:'#6f8476',fontSize:5.8,fontWeight:'900'},
  chevron:{width:20,alignItems:'flex-end'},
  modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.74)'},
  modalSheet:{height:'92%',backgroundColor:'#091910',borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:1,borderColor:'#345642'},
  modalHeader:{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#294536'},
  playerAvatar:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#153426',borderWidth:1,borderColor:'#397452'},
  playerAvatarText:{fontSize:11,fontWeight:'900'},
  modalIdentity:{flex:1,minWidth:0},
  modalName:{color:'#f5f7f5',fontSize:18,fontWeight:'900'},
  modalMeta:{color:'#91a697',fontSize:8,marginTop:3},
  closeButton:{width:40,height:40,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'#142c20'},
  modalContent:{padding:12,gap:10,paddingBottom:30},
  profileMetrics:{flexDirection:'row',gap:6},
  profileMetric:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:9,backgroundColor:'#10291d',borderWidth:1,borderColor:'#2c503d'},
  profileValue:{color:'#f5f7f5',fontSize:16,fontWeight:'900'},
  profileLabel:{color:'#7f9486',fontSize:6,fontWeight:'900',marginTop:2},
  detailPanel:{gap:9,backgroundColor:'#10291d',borderColor:'#2c503d'},
  sectionTitle:{color:'#79ef91',fontSize:7,fontWeight:'900',letterSpacing:0.8},
  detailRow:{flexDirection:'row',justifyContent:'space-between',gap:10,paddingVertical:4,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#254232'},
  detailKey:{color:'#8fa394',fontSize:8,flex:1},
  detailValue:{color:'#f3f7f4',fontSize:8,fontWeight:'900',textAlign:'right'},
  primaryButton:{minHeight:40,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#79ef91'},
  primaryButtonText:{color:'#07150d',fontSize:8,fontWeight:'900'},
  secondaryButton:{minHeight:38,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#173629',borderWidth:1,borderColor:'#356247'},
  secondaryButtonText:{color:'#dff8e5',fontSize:7.5,fontWeight:'900'},
  dangerButton:{minHeight:38,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#341919',borderWidth:1,borderColor:'#713737'},
  dangerButtonText:{color:'#f1aaaa',fontSize:7.5,fontWeight:'900'},
  choiceWrap:{flexDirection:'row',flexWrap:'wrap',gap:6},
  choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:7,backgroundColor:'#0b1d14',borderWidth:1,borderColor:'#2e4b39'},
  choiceActive:{backgroundColor:'#79ef91',borderColor:'#79ef91'},
  choiceText:{color:'#a4b5aa',fontSize:6.8,fontWeight:'900'},
  choiceTextActive:{color:'#07150d'},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},
  statBox:{width:'31.5%',alignItems:'center',paddingVertical:9,borderRadius:8,backgroundColor:'#0b2117'},
  statNumber:{color:'#f5f7f5',fontSize:13,fontWeight:'900'},
  statLabel:{color:'#7f9486',fontSize:6,fontWeight:'900',marginTop:2},
  helperText:{color:'#8fa394',fontSize:7.5,lineHeight:11.5},
  historyItem:{flexDirection:'row',gap:8,paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#254232'},
  historyDot:{width:7,height:7,borderRadius:99,backgroundColor:'#79ef91',marginTop:4},
  historyBody:{flex:1,minWidth:0},
  historyTitle:{color:'#f5f7f5',fontSize:8,fontWeight:'900'},
  historyMeta:{color:'#75907f',fontSize:6.3,fontWeight:'800',marginTop:2},
  historyText:{color:'#9db0a3',fontSize:7.2,lineHeight:10.8,marginTop:2},
  offerList:{gap:8},
  offerCard:{gap:9,backgroundColor:'#10291d',borderColor:'#2c503d'},
  offerTop:{flexDirection:'row',alignItems:'flex-start',gap:10},
  offerKicker:{color:'#79ef91',fontSize:6.3,fontWeight:'900',letterSpacing:0.6},
  offerPlayer:{color:'#f5f7f5',fontSize:11,fontWeight:'900',marginTop:2},
  offerClub:{color:'#8fa394',fontSize:7.5,fontWeight:'800',marginTop:2},
  offerAmount:{color:'#79ef91',fontSize:10,fontWeight:'900'},
  offerInfo:{color:'#95a89b',fontSize:7.2,lineHeight:11},
  offerActions:{flexDirection:'row',gap:7},
  offerDecline:{flex:1,minHeight:36,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#2d1818',borderWidth:1,borderColor:'#633535'},
  offerDeclineText:{color:'#efaaaa',fontSize:7.2,fontWeight:'900'},
  offerAccept:{flex:1,minHeight:36,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#79ef91'},
  offerAcceptText:{color:'#07150d',fontSize:7.2,fontWeight:'900'},
  noOffersPanel:{alignItems:'center',gap:7,paddingVertical:18,backgroundColor:'#10291d',borderColor:'#2c503d'},
  noOffersTitle:{color:'#f5f7f5',fontSize:10,fontWeight:'900'},
  noOffersText:{color:'#879b8d',fontSize:7.2,lineHeight:11,textAlign:'center'},
  loanInfoBox:{padding:9,borderRadius:8,backgroundColor:'#142b20',borderWidth:1,borderColor:'#356247'},
  loanInfoTitle:{color:'#79ef91',fontSize:7.2,fontWeight:'900'},
  loanInfoText:{color:'#9db0a3',fontSize:7.2,marginTop:3},
});