import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClubBadge, GameButton, GameHeader, Panel, PlayerRow, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { formatCurrency, getCurrentFixture, matchPhaseLabel } from '@/game/engine';
import type { MatchEvent, MatchSession } from '@/game/types';
import { useColors } from '@/hooks/useColors';

function EventIcon({ event }: { event: MatchEvent }) {
  const colors = useColors();
  const icons: Record<MatchEvent['type'], keyof typeof Feather.glyphMap> = {
    kickoff: 'play-circle', goal: 'award', shot: 'wind', save: 'shield',
    foul: 'alert-triangle', offside: 'flag', corner: 'corner-up-left',
    yellow: 'alert-circle', red: 'x-circle', medical: 'activity',
    substitution: 'repeat', halftime: 'pause-circle', second_half: 'play-circle', fulltime: 'flag',
  };
  const color = event.type === 'goal' ? colors.primary : event.type === 'red' ? colors.destructive : colors.mutedForeground;
  return <Feather name={icons[event.type]} size={15} color={color} />;
}

function ScoreSide({ clubId, home, goals, name }: { clubId: string; home: boolean; goals: number; name: string }) {
  const colors = useColors();
  return (
    <View style={[styles.scoreSide, !home && { alignItems: 'flex-end' }]}>
      <ClubBadge clubId={clubId} size={49} />
      <Text numberOfLines={1} style={[styles.scoreTeamName, { color: colors.foreground }]}>{name}</Text>
      <Text style={[styles.scoreGoals, { color: colors.foreground }]}>{goals}</Text>
    </View>
  );
}

function MatchStatsCard({ game }: { game: MatchSession }) {
  const colors = useColors();
  const stats = [
    { label: 'Finalizações', home: game.homeStats.shots, away: game.awayStats.shots },
    { label: 'Defesas', home: game.homeStats.saves, away: game.awayStats.saves },
    { label: 'Faltas', home: game.homeStats.fouls, away: game.awayStats.fouls },
    { label: 'Escanteios', home: game.homeStats.corners, away: game.awayStats.corners },
  ];
  return (
    <Panel style={styles.statsPanel}>
      <SectionLabel title="Números da partida" />
      {stats.map((item) => (
        <View key={item.label} style={styles.statsRow}>
          <Text style={[styles.statsNumber, { color: colors.foreground }]}>{item.home}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            <View style={[styles.statsTrack, { backgroundColor: colors.secondary }]}>
              <View style={[styles.statsBarHome, { backgroundColor: colors.primary, width: `${item.home + item.away ? item.home / (item.home + item.away) * 100 : 50}%` }]} />
            </View>
          </View>
          <Text style={[styles.statsNumber, { color: colors.foreground }]}>{item.away}</Text>
        </View>
      ))}
      <Text style={[styles.cardCount, { color: colors.mutedForeground }]}>
        Amarelos {game.homeStats.yellowCards}–{game.awayStats.yellowCards} · Vermelhos {game.homeStats.redCards}–{game.awayStats.redCards}
      </Text>
    </Panel>
  );
}

export default function MatchScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    career, startCurrentMatch, advanceCurrentMatch, makeSubstitution, closeCurrentMatch,
  } = useCareer();
  const [stepSize, setStepSize] = useState<1 | 5>(5);
  const [autoRunning, setAutoRunning] = useState(true);
  const [showSubs, setShowSubs] = useState(false);
  const [outgoingId, setOutgoingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const game = career?.liveMatch ?? null;

  useEffect(() => {
    if (!game || !autoRunning) return;
    const live = game.phase === 'first_half' || game.phase === 'second_half';
    if (!live) return;

    const timer = setInterval(() => {
      advanceCurrentMatch(1);
    }, 900);

    return () => clearInterval(timer);
  }, [game?.phase, game?.minute, autoRunning, advanceCurrentMatch]);

  if (!career) {
    return <><GameHeader title="Partida" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira antes de entrar em campo.</Text><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }
  if (!game) {
    const fixture = getCurrentFixture(career);
    const home = fixture ? getClub(fixture.homeClubId) : undefined;
    const away = fixture ? getClub(fixture.awayClubId) : undefined;
    return (
      <>
        <GameHeader title="Próxima partida" eyebrow={fixture ? `3ª DIVISÃO · RODADA ${career.roundIndex + 1}` : 'TEMPORADA ENCERRADA'} />
        <Screen>
          <Panel style={styles.previewPanel}>
            {fixture && home && away ? (
              <>
                <View style={styles.previewTeams}>
                  <View style={styles.previewClub}><ClubBadge clubId={home.id} size={54} /><Text style={[styles.previewName, { color: colors.foreground }]}>{home.name}</Text><Text style={[styles.homeAway, { color: colors.mutedForeground }]}>{home.id === career.clubId ? 'CASA' : 'FORA'}</Text></View>
                  <Text style={[styles.previewVs, { color: colors.mutedForeground }]}>×</Text>
                  <View style={styles.previewClub}><ClubBadge clubId={away.id} size={54} /><Text style={[styles.previewName, { color: colors.foreground }]}>{away.name}</Text><Text style={[styles.homeAway, { color: colors.mutedForeground }]}>{away.id === career.clubId ? 'CASA' : 'FORA'}</Text></View>
                </View>
                <Text style={[styles.previewLine, { color: colors.mutedForeground }]}>Partida completa · 90 minutos · escalação {career.formationId}</Text>
                <GameButton label="Preparar partida" icon="play" onPress={startCurrentMatch} />
              </>
            ) : (
              <>
                <Text style={[styles.finishedTitle, { color: colors.foreground }]}>Fim da temporada</Text>
                <Text style={[styles.finishedText, { color: colors.mutedForeground }]}>Confira como terminou a Liga Prisma.</Text>
                <GameButton label="Ver classificação" icon="award" onPress={() => router.push('/league')} />
              </>
            )}
          </Panel>
        </Screen>
      </>
    );
  }
  const home = getClub(game.fixture.homeClubId);
  const away = getClub(game.fixture.awayClubId);
  if (!home || !away) return null;
  const isFinal = game.phase === 'finished';
  const isLive = game.phase === 'first_half' || game.phase === 'second_half';

  const substitutions = game.substitutionsUsed;
  const activeSlots = game.userLineup.filter((slot) => !slot.sentOff);
  const outgoing = outgoingId ? career.players.find((player) => player.id === outgoingId) : undefined;
  const incomingPlayers = game.userBenchIds.map((id) => career.players.find((player) => player.id === id)).filter((player) => player?.status === 'available');
  const primaryLabel = game.phase === 'pregame'
    ? 'Apito inicial'
    : game.phase === 'halftime'
      ? 'Começar segundo tempo'
      : isFinal
        ? 'Atualizar classificação'
        : `Avançar ${stepSize} ${stepSize === 1 ? 'minuto' : 'minutos'}`;

  const progress = Math.min(100, (game.minute / 90) * 100);
  const clock = game.phase === 'halftime' ? 'INTERVALO' : isFinal ? 'FIM DE JOGO' : game.phase === 'pregame' ? 'PRÉ-JOGO' : `${game.minute}′`;

  const handlePrimary = () => {
    if (isFinal) {
      closeCurrentMatch();
      router.replace('/');
    } else {
      advanceCurrentMatch(stepSize);
    }
  };

  const handleSub = (incomingId: string) => {
    if (!outgoingId) return;
    const success = makeSubstitution(outgoingId, incomingId);
    setNotice(success ? 'Substituição realizada. O jogo continua.' : substitutions >= 5 ? 'Limite de cinco substituições atingido.' : 'Escolha um titular e um reserva disponível.');
    setOutgoingId(null);
    if (success) setShowSubs(false);
  };

  return (
    <>
      <GameHeader title="Partida" eyebrow={`3ª DIVISÃO · RODADA ${game.fixture.roundIndex + 1}`} right={<Text style={[styles.clockTag, { color: colors.primary }]}>{clock}</Text>} />
      <Screen>
        <Panel style={styles.scorePanel}>
          <View style={styles.scoreTop}>
            <View style={[styles.liveBadge, { backgroundColor: game.phase === 'finished' ? colors.secondary : colors.accent }]}>
              <View style={[styles.liveBadgeDot, { backgroundColor: game.phase === 'finished' ? colors.mutedForeground : colors.primary }]} />
              <Text style={[styles.liveBadgeText, { color: game.phase === 'finished' ? colors.mutedForeground : colors.accentForeground }]}>{matchPhaseLabel(game.phase).toUpperCase()}</Text>
            </View>
            <Text style={[styles.roundLabel, { color: colors.mutedForeground }]}>RODADA {game.fixture.roundIndex + 1}</Text>
          </View>
          <View style={styles.scoreBoard}>
            <ScoreSide clubId={home.id} home name={home.name} goals={game.homeGoals} />
            <View style={styles.scoreCenter}>
              <Text style={[styles.scoreColon, { color: colors.mutedForeground }]}>:</Text>
              <Text style={[styles.scoreClock, { color: colors.primary }]}>{clock}</Text>
            </View>
            <ScoreSide clubId={away.id} home={false} name={away.name} goals={game.awayGoals} />
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} /></View>
          {isLive ? (
            <View style={styles.stepLine}>
              <Pressable
                onPress={() => setAutoRunning((value) => !value)}
                style={[styles.autoChip, { backgroundColor: autoRunning ? colors.accent : colors.secondary }]}
              >
                <Feather name={autoRunning ? 'pause' : 'play'} size={14} color={autoRunning ? colors.accentForeground : colors.foreground} />
                <Text style={[styles.autoChipText, { color: autoRunning ? colors.accentForeground : colors.foreground }]}>
                  {autoRunning ? 'PAUSAR' : 'CONTINUAR'}
                </Text>
              </Pressable>
              <Text style={[styles.autoHint, { color: colors.mutedForeground }]}>Relógio automático · 1 min a cada 0,9 s</Text>
            </View>
          ) : null}
          {!isLive || !autoRunning ? (
            <GameButton label={primaryLabel} icon={isFinal ? 'flag' : game.phase === 'halftime' ? 'play' : 'fast-forward'} onPress={handlePrimary} />
          ) : null}
          {isLive || game.phase === 'halftime' ? (
            <GameButton label={`Substituições · ${substitutions}/5`} icon="repeat" variant="outline" onPress={() => { setShowSubs((value) => !value); setOutgoingId(null); }} />
          ) : null}
          {isLive ? <GameButton label="Mudar formação e instruções" icon="layout" variant="outline" onPress={() => router.push('/tactics')} /> : null}
        </Panel>

        {showSubs || game.phase === 'halftime' ? (
          <Panel style={styles.subPanel}>
            <SectionLabel title={outgoing ? `Sai: ${outgoing.name}` : 'Escolha quem sai'} action={<Pressable onPress={() => { setShowSubs(false); setOutgoingId(null); }}><Text style={[styles.closeSub, { color: colors.primary }]}>Fechar</Text></Pressable>} />
            {!outgoing ? (
              <View style={styles.choiceList}>
                {activeSlots.map((slot) => {
                  const player = career.players.find((item) => item.id === slot.playerId);
                  if (!player) return null;
                  return <Pressable key={slot.id} onPress={() => setOutgoingId(player.id)}><PlayerRow player={player} trailing={<Feather name="arrow-right" size={15} color={colors.mutedForeground} />} /></Pressable>;
                })}
              </View>
            ) : (
              <View style={styles.choiceList}>
                {incomingPlayers.map((player) => player ? (
                  <Pressable key={player.id} onPress={() => handleSub(player.id)}><PlayerRow player={player} trailing={<Feather name="log-in" size={15} color={colors.primary} />} /></Pressable>
                ) : null)}
                {!incomingPlayers.length ? <Text style={[styles.noBench, { color: colors.mutedForeground }]}>Não há reservas disponíveis.</Text> : null}
                <GameButton label="Voltar à lista de titulares" icon="arrow-left" variant="outline" compact onPress={() => setOutgoingId(null)} />
              </View>
            )}
            {substitutions >= 5 ? <Text style={[styles.noBench, { color: colors.destructive }]}>Todas as cinco substituições foram usadas.</Text> : null}
          </Panel>
        ) : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}

        <MatchStatsCard game={game} />

        <Panel style={styles.eventsPanel}>
          <SectionLabel title="Relato da partida" action={<Text style={[styles.eventCount, { color: colors.mutedForeground }]}>{game.events.length} eventos</Text>} />
          {game.events.length ? (
            game.events.slice(-18).reverse().map((event) => (
              <View key={event.id} style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.eventIcon, { backgroundColor: colors.secondary }]}><EventIcon event={event} /></View>
                <Text style={[styles.eventText, { color: colors.foreground }]}>{event.text}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noEvents, { color: colors.mutedForeground }]}>O relato aparece conforme a partida avança.</Text>
          )}
        </Panel>

        {isFinal ? (
          <Panel style={styles.resultPanel}>
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>90 minutos jogados.</Text>
            <Text style={[styles.resultText, { color: colors.mutedForeground }]}>
              {game.homeGoals === game.awayGoals ? 'Empate no apito final.' : (game.homeGoals > game.awayGoals) === (home.id === career.clubId) ? 'Vitória para o seu clube.' : 'A próxima rodada é uma nova chance.'}
            </Text>
            <Text style={[styles.resultText, { color: colors.mutedForeground }]}>Caixa atual: {formatCurrency(career.balance)}</Text>
          </Panel>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  clockTag: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  scorePanel: { gap: 14, backgroundColor: '#0b2117', borderColor: '#2c503d' },
  scoreTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveBadge: { minHeight: 25, borderRadius: 12, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  liveBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  roundLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  scoreBoard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  scoreSide: { flex: 1, alignItems: 'flex-start', gap: 5 },
  scoreTeamName: { fontSize: 10, fontWeight: '800', maxWidth: '100%' },
  scoreGoals: { fontSize: 38, fontWeight: '900', letterSpacing: -1.4 },
  scoreCenter: { alignItems: 'center', minWidth: 27 },
  scoreColon: { fontSize: 19, fontWeight: '900' },
  scoreClock: { fontSize: 12, fontWeight: '900', marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  stepLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -2 },
  stepLabel: { fontSize: 10, fontWeight: '700', marginRight: 2 },
  stepChip: { paddingHorizontal: 12, minHeight: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepChipText: { fontSize: 10, fontWeight: '800' },
  autoChip: { minHeight: 34, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  autoChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  autoHint: { flex: 1, fontSize: 9, lineHeight: 13 },
  subPanel: { gap: 9 },
  closeSub: { fontSize: 10, fontWeight: '800' },
  choiceList: { gap: 1 },
  noBench: { fontSize: 11, lineHeight: 17, paddingVertical: 7 },
  notice: { fontSize: 10, fontWeight: '700' },
  statsPanel: { gap: 12, backgroundColor: '#0b2117', borderColor: '#2c503d' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statsNumber: { width: 22, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  statsLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center', marginBottom: 5 },
  statsTrack: { height: 5, borderRadius: 4, overflow: 'hidden' },
  statsBarHome: { height: '100%', borderRadius: 4 },
  cardCount: { fontSize: 9, textAlign: 'center', paddingTop: 1 },
  eventsPanel: { gap: 8, backgroundColor: '#0b2117', borderColor: '#2c503d' },
  eventCount: { fontSize: 9, fontWeight: '700' },
  eventRow: { minHeight: 43, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 9 },
  eventIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eventText: { flex: 1, fontSize: 10, lineHeight: 15, fontWeight: '500' },
  noEvents: { fontSize: 11, lineHeight: 16, paddingVertical: 9 },
  resultPanel: { gap: 7 },
  resultTitle: { fontSize: 15, fontWeight: '900' },
  resultText: { fontSize: 11, lineHeight: 16 },
  previewPanel: { gap: 16, minHeight: 290, justifyContent: 'center', backgroundColor: '#0b2117', borderColor: '#2c503d' },
  previewTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8 },
  previewClub: { flex: 1, alignItems: 'center', gap: 7 },
  previewName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  homeAway: { fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  previewVs: { fontSize: 25, fontWeight: '900' },
  previewLine: { textAlign: 'center', fontSize: 10, lineHeight: 15 },
  finishedTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  finishedText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
