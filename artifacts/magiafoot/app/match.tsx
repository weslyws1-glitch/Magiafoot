import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, PlayerRow, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { effectiveStrength, formatCurrency, getCurrentFixture, LEAGUE_FIXTURES, matchPhaseLabel } from '@/game/engine';
import type { MatchEvent } from '@/game/types';
import { useColors } from '@/hooks/useColors';

function eventSymbol(event: MatchEvent) {
  if (event.type === 'goal') return '⚽';
  if (event.type === 'yellow') return '🟨';
  if (event.type === 'red') return '🟥';
  if (event.type === 'substitution') return '↔';
  if (event.type === 'medical') return '+';
  if (event.type === 'halftime') return 'Ⅱ';
  if (event.type === 'fulltime') return '■';
  return '•';
}

function hashText(value: string) {
  return [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 29);
}

function cpuLiveScore(fixtureId: string, season: number, minute: number, homeRating: number, awayRating: number) {
  let seed = hashText(fixtureId + '-' + season) >>> 0;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let homeGoals = 0;
  let awayGoals = 0;
  const safeMinute = Math.max(0, Math.min(90, minute));
  for (let m = 1; m <= safeMinute; m += 1) {
    const homeChance = Math.max(0.004, Math.min(0.026, 0.012 + (homeRating - awayRating) * 0.00045));
    const awayChance = Math.max(0.004, Math.min(0.024, 0.010 + (awayRating - homeRating) * 0.00042));
    if (roll() < homeChance) homeGoals += 1;
    if (roll() < awayChance) awayGoals += 1;
  }
  return { homeGoals, awayGoals };
}

export default function MatchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, startCurrentMatch, advanceCurrentMatch, makeSubstitution, closeCurrentMatch } = useCareer();
  const [autoRunning, setAutoRunning] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [showSubs, setShowSubs] = useState(false);
  const [outgoingId, setOutgoingId] = useState<string | null>(null);
  const game = career?.liveMatch ?? null;

  useEffect(() => {
    if (!game || !autoRunning) return;
    if (game.phase !== 'first_half' && game.phase !== 'second_half') return;
    const intervalMs = speed === 1 ? 900 : speed === 2 ? 450 : 300;
    const timer = setInterval(() => advanceCurrentMatch(1), intervalMs);
    return () => clearInterval(timer);
  }, [game?.phase, game?.minute, autoRunning, speed, advanceCurrentMatch]);

  if (!career) {
    return <><GameHeader title="Partida" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira antes de entrar em campo.</Text></Screen></>;
  }

  if (!game) {
    const fixture = getCurrentFixture(career);
    const home = fixture ? getClub(fixture.homeClubId) : undefined;
    const away = fixture ? getClub(fixture.awayClubId) : undefined;
    return (
      <>
        <GameHeader title="Próxima partida" eyebrow={fixture ? '3ª DIVISÃO · RODADA ' + (career.roundIndex + 1) : 'TEMPORADA ENCERRADA'} />
        <Screen>
          <Panel style={styles.preGame}>
            {fixture && home && away ? (
              <>
                <Text style={styles.preGameTitle}>{home.name}</Text>
                <Text style={styles.preGameVs}>×</Text>
                <Text style={styles.preGameTitle}>{away.name}</Text>
                <Text style={styles.preGameMeta}>Escalação {career.formationId} · partida completa de 90 minutos</Text>
                <GameButton label="ENTRAR EM CAMPO" icon="play" onPress={startCurrentMatch} />
              </>
            ) : (
              <>
                <Text style={styles.preGameTitle}>Temporada encerrada</Text>
                <GameButton label="VER CLASSIFICAÇÃO" icon="award" onPress={() => router.push('/league')} />
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

  const isLive = game.phase === 'first_half' || game.phase === 'second_half';
  const isFinal = game.phase === 'finished';
  const clock = game.phase === 'halftime' ? 'INTERVALO' : isFinal ? 'FIM' : game.phase === 'pregame' ? '0′' : game.minute + '′';
  const activeSlots = game.userLineup.filter((slot) => !slot.sentOff);
  const outgoing = outgoingId ? career.players.find((player) => player.id === outgoingId) : undefined;
  const incomingPlayers = game.userBenchIds
    .map((id) => career.players.find((player) => player.id === id))
    .filter((player) => player?.status === 'available');
  const recentEvents = [...game.events].slice(-10).reverse();

  const roundMatches = LEAGUE_FIXTURES
    .filter((fixture) => fixture.roundIndex === game.fixture.roundIndex)
    .map((fixture) => {
      const fixtureHome = getClub(fixture.homeClubId);
      const fixtureAway = getClub(fixture.awayClubId);
      const isUser = fixture.id === game.fixture.id;
      const live = isUser
        ? { homeGoals: game.homeGoals, awayGoals: game.awayGoals }
        : cpuLiveScore(
            fixture.id,
            career.season,
            game.phase === 'halftime' ? 45 : game.minute,
            fixtureHome?.rating ?? 64,
            fixtureAway?.rating ?? 64,
          );
      return { fixture, home: fixtureHome, away: fixtureAway, ...live, isUser };
    });

  const fieldPlayers = useMemo(() => activeSlots.map((slot) => {
    const player = career.players.find((p) => p.id === slot.playerId);
    return player ? { slot, player } : null;
  }).filter(Boolean) as Array<{ slot: typeof activeSlots[number]; player: typeof career.players[number] }>, [activeSlots, career.players]);

  const handleMain = () => {
    if (isFinal) {
      closeCurrentMatch();
      router.replace('/');
      return;
    }
    advanceCurrentMatch(1);
  };

  const substitute = (incomingId: string) => {
    if (!outgoingId) return;
    const success = makeSubstitution(outgoingId, incomingId);
    if (success) {
      setOutgoingId(null);
      setShowSubs(false);
    }
  };

  if (game.phase === 'halftime') {
    return (
      <>
        <GameHeader
          title="Intervalo"
          eyebrow={'3ª DIVISÃO · RODADA ' + (game.fixture.roundIndex + 1)}
          back={false}
          right={<Text style={styles.headerClock}>45′</Text>}
        />
        <Screen>
          <Panel style={styles.halftimeHero}>
            <Text style={styles.halftimeKicker}>INTERVALO</Text>
            <Text style={styles.halftimeScore}>{home.name} {game.homeGoals} × {game.awayGoals} {away.name}</Text>
            <Text style={styles.halftimeText}>Confira todos os jogos da rodada antes do segundo tempo.</Text>
          </Panel>

          <Panel style={styles.roundBoard}>
            <View style={styles.roundBoardHeader}>
              <Text style={styles.roundBoardTitle}>PLACAR DA RODADA</Text>
              <Text style={styles.roundBoardMinute}>45′</Text>
            </View>
            {roundMatches.map((item) => (
              <View key={item.fixture.id} style={[styles.roundGameRow, item.isUser && styles.roundGameRowUser]}>
                <Text numberOfLines={1} style={styles.roundClub}>{item.home?.name ?? 'Casa'}</Text>
                <Text style={styles.roundScore}>{item.homeGoals} - {item.awayGoals}</Text>
                <Text numberOfLines={1} style={[styles.roundClub, { textAlign: 'right' }]}>{item.away?.name ?? 'Fora'}</Text>
              </View>
            ))}
          </Panel>

          <View style={styles.halftimeActions}>
            <GameButton label="AJUSTAR TÁTICA" icon="layout" variant="outline" onPress={() => router.push('/tactics')} />
            <GameButton label="COMEÇAR 2º TEMPO" icon="play" onPress={() => advanceCurrentMatch(1)} />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <GameHeader
        title="Partida"
        eyebrow={'3ª DIVISÃO · RODADA ' + (game.fixture.roundIndex + 1)}
        back={false}
        right={<Text style={styles.headerClock}>{clock}</Text>}
      />
      <Screen>
        <View style={styles.matchShell}>
          <View style={styles.pitchWrap}>
            <View style={styles.pitch}>
              <View style={styles.pitchBorder} />
              <View style={styles.halfLine} />
              <View style={styles.centerCircle} />
              <View style={styles.centerDot} />
              <View style={styles.boxTop} />
              <View style={styles.boxBottom} />
              {fieldPlayers.map(({ slot, player }) => (
                <View
                  key={slot.id}
                  style={[
                    styles.pitchPlayer,
                    {
                      left: slot.x + '%',
                      top: slot.y + '%',
                      transform: [{ translateX: -24 }, { translateY: -19 }],
                    },
                  ]}
                >
                  <View style={styles.shirt}>
                    <Text style={styles.shirtRating}>{effectiveStrength(player, slot.position)}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.pitchName}>{player.name.split(' ')[0]}</Text>
                </View>
              ))}
            </View>

            <View style={styles.pitchControls}>
              <Pressable onPress={() => setAutoRunning((v) => !v)} style={styles.controlButton}>
                <Feather name={autoRunning ? 'pause' : 'play'} size={14} color="#07150d" />
                <Text style={styles.controlButtonText}>{autoRunning ? 'PAUSAR' : 'CONTINUAR'}</Text>
              </Pressable>
              <View style={styles.speedGroup}>
                {[1, 2, 3].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setSpeed(value as 1 | 2 | 3)}
                    style={[styles.speedButton, speed === value && styles.speedButtonActive]}
                  >
                    <Text style={[styles.speedText, speed === value && styles.speedTextActive]}>{value}x</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => router.push('/tactics')} style={styles.controlDark}>
                <Text style={styles.controlDarkText}>TÁTICA</Text>
              </Pressable>
              <Pressable onPress={() => setShowSubs((v) => !v)} style={styles.controlDark}>
                <Text style={styles.controlDarkText}>SUB {game.substitutionsUsed}/5</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sidePanel}>
            <View style={styles.scoreRow}>
              <View style={styles.teamBlock}>
                <Text numberOfLines={1} style={styles.teamName}>{home.name}</Text>
                <Text style={styles.score}>{game.homeGoals}</Text>
              </View>
              <View style={styles.clockBlock}>
                <Text style={styles.clock}>{clock}</Text>
                <Text style={styles.phase}>{matchPhaseLabel(game.phase).toUpperCase()}</Text>
              </View>
              <View style={[styles.teamBlock, { alignItems: 'flex-end' }]}>
                <Text numberOfLines={1} style={[styles.teamName, { textAlign: 'right' }]}>{away.name}</Text>
                <Text style={styles.score}>{game.awayGoals}</Text>
              </View>
            </View>

            <View style={styles.liveRoundHeader}>
              <Text style={styles.liveRoundTitle}>OUTROS JOGOS</Text>
              <Text style={styles.liveRoundMinute}>{game.minute}′</Text>
            </View>
            <View style={styles.liveRoundList}>
              {roundMatches.map((item) => (
                <View key={item.fixture.id} style={[styles.liveRoundRow, item.isUser && styles.liveRoundRowUser]}>
                  <Text numberOfLines={1} style={styles.liveRoundClub}>{item.home?.name ?? 'Casa'}</Text>
                  <Text style={styles.liveRoundScore}>{item.homeGoals}-{item.awayGoals}</Text>
                  <Text numberOfLines={1} style={[styles.liveRoundClub, { textAlign: 'right' }]}>{item.away?.name ?? 'Fora'}</Text>
                </View>
              ))}
            </View>

            <View style={styles.eventHeader}>
              <Text style={styles.eventHeaderText}>LANCES</Text>
              <Text style={styles.eventHeaderMinute}>{game.minute}′</Text>
            </View>
            <View style={styles.eventList}>
              {recentEvents.length ? recentEvents.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventMinute}>{event.minute}′</Text>
                  <Text style={styles.eventSymbol}>{eventSymbol(event)}</Text>
                  <Text numberOfLines={2} style={styles.eventText}>{event.text}</Text>
                </View>
              )) : <Text style={styles.noEvent}>Aguardando o apito inicial…</Text>}
            </View>

            <View style={styles.compactStats}>
              <Text style={styles.statLine}>Finalizações  {game.homeStats.shots} - {game.awayStats.shots}</Text>
              <Text style={styles.statLine}>Escanteios  {game.homeStats.corners} - {game.awayStats.corners}</Text>
              <Text style={styles.statLine}>Faltas  {game.homeStats.fouls} - {game.awayStats.fouls}</Text>
            </View>
          </View>
        </View>

        {showSubs ? (
          <Panel style={styles.subPanel}>
            <SectionLabel title={outgoing ? 'Entra no lugar de ' + outgoing.name : 'Escolha quem sai'} />
            {!outgoing ? activeSlots.map((slot) => {
              const player = career.players.find((p) => p.id === slot.playerId);
              return player ? <Pressable key={slot.id} onPress={() => setOutgoingId(player.id)}><PlayerRow player={player} /></Pressable> : null;
            }) : incomingPlayers.map((player) => player ? <Pressable key={player.id} onPress={() => substitute(player.id)}><PlayerRow player={player} /></Pressable> : null)}
            {outgoing ? <GameButton label="VOLTAR" variant="outline" compact onPress={() => setOutgoingId(null)} /> : null}
          </Panel>
        ) : null}

        {!isLive || !autoRunning ? (
          <GameButton
            label={isFinal ? 'ENCERRAR E ATUALIZAR CLASSIFICAÇÃO' : game.phase === 'halftime' ? 'COMEÇAR 2º TEMPO' : game.phase === 'pregame' ? 'APITO INICIAL' : 'AVANÇAR 1 MINUTO'}
            icon={isFinal ? 'flag' : 'play'}
            onPress={handleMain}
          />
        ) : null}

        {isFinal ? (
          <Panel style={styles.finalPanel}>
            <Text style={styles.finalTitle}>Fim de jogo</Text>
            <Text style={styles.finalText}>{home.name} {game.homeGoals} × {game.awayGoals} {away.name}</Text>
            <Text style={styles.finalText}>Caixa atual: {formatCurrency(career.balance)}</Text>
          </Panel>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerClock: { color: '#79ef91', fontSize: 16, fontWeight: '900' },
  preGame: { alignItems: 'center', gap: 12, backgroundColor: '#153426', borderColor: '#356a4a', paddingVertical: 28 },
  preGameTitle: { color: '#f5f7f5', fontSize: 20, fontWeight: '900' },
  preGameVs: { color: '#79ef91', fontSize: 25, fontWeight: '900' },
  preGameMeta: { color: '#9fb2a5', fontSize: 10, textAlign: 'center' },

  matchShell: { flexDirection: 'row', gap: 6, minHeight: 500 },
  pitchWrap: { flex: 1.35, minWidth: 0 },
  pitch: {
    flex: 1, minHeight: 440, position: 'relative', overflow: 'hidden',
    borderWidth: 2, borderColor: '#a8c97f', backgroundColor: '#477b28',
  },
  pitchBorder: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.7)' },
  halfLine: { position: 'absolute', left: 10, right: 10, top: '50%', height: 1, backgroundColor: 'rgba(255,255,255,.7)' },
  centerCircle: { position: 'absolute', width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderColor: 'rgba(255,255,255,.7)', left: '50%', top: '50%', transform: [{ translateX: -37 }, { translateY: -37 }] },
  centerDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.8)', left: '50%', top: '50%', transform: [{ translateX: -2 }, { translateY: -2 }] },
  boxTop: { position: 'absolute', top: 10, left: '28%', right: '28%', height: 54, borderWidth: 1, borderColor: 'rgba(255,255,255,.7)' },
  boxBottom: { position: 'absolute', bottom: 10, left: '28%', right: '28%', height: 54, borderWidth: 1, borderColor: 'rgba(255,255,255,.7)' },
  pitchPlayer: { position: 'absolute', width: 48, alignItems: 'center' },
  shirt: { width: 28, height: 27, borderRadius: 7, backgroundColor: '#c9d97b', borderWidth: 1, borderColor: '#e7efb2', alignItems: 'center', justifyContent: 'center' },
  shirtRating: { color: '#22351a', fontSize: 8, fontWeight: '900' },
  pitchName: { color: '#ffffff', fontSize: 7, fontWeight: '800', marginTop: 2, textShadowColor: 'rgba(0,0,0,.75)', textShadowRadius: 2 },
  pitchControls: { flexDirection: 'row', gap: 4, marginTop: 5, alignItems: 'center' },
  controlButton: { flex: 1.2, minHeight: 34, borderRadius: 7, backgroundColor: '#79ef91', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  controlButtonText: { color: '#07150d', fontSize: 8, fontWeight: '900' },
  speedGroup: { flexDirection: 'row', gap: 3 },
  speedButton: { minWidth: 31, minHeight: 34, borderRadius: 7, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#173326', alignItems: 'center', justifyContent: 'center' },
  speedButtonActive: { backgroundColor: '#ffe66a', borderColor: '#ffe66a' },
  speedText: { color: '#dce8df', fontSize: 8, fontWeight: '900' },
  speedTextActive: { color: '#263411' },
  controlDark: { flex: 1, minHeight: 34, borderRadius: 7, backgroundColor: '#173326', borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center' },
  controlDarkText: { color: '#dce8df', fontSize: 8, fontWeight: '900' },

  sidePanel: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#5e7c2d', backgroundColor: '#6c8e29', overflow: 'hidden' },
  scoreRow: { minHeight: 96, flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#78952e', gap: 5 },
  teamBlock: { flex: 1, minWidth: 0 },
  teamName: { color: '#fff6a3', fontSize: 9, fontWeight: '900' },
  score: { color: '#ffffff', fontSize: 25, fontWeight: '900', marginTop: 3 },
  clockBlock: { width: 56, alignItems: 'center' },
  clock: { color: '#ffe66a', fontSize: 19, fontWeight: '900' },
  phase: { color: '#e4efad', fontSize: 6, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  eventHeader: { minHeight: 32, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#5f7e24' },
  eventHeaderText: { color: '#f3f7cc', fontSize: 8, fontWeight: '900' },
  eventHeaderMinute: { color: '#ffe66a', fontSize: 11, fontWeight: '900' },
  eventList: { flex: 1, padding: 7, gap: 2 },
  eventRow: { minHeight: 29, flexDirection: 'row', alignItems: 'flex-start', gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.15)' },
  eventMinute: { width: 22, color: '#ffe66a', fontSize: 8, fontWeight: '900' },
  eventSymbol: { width: 17, color: '#ffffff', fontSize: 9, textAlign: 'center' },
  eventText: { flex: 1, color: '#eef5c8', fontSize: 7, lineHeight: 10 },
  noEvent: { color: '#e4efad', fontSize: 8 },
  compactStats: { padding: 8, gap: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.18)', backgroundColor: '#5f7e24' },
  statLine: { color: '#edf3c9', fontSize: 7, fontWeight: '700' },

  liveRoundHeader: { minHeight: 28, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#526f20', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.16)' },
  liveRoundTitle: { color: '#f3f7cc', fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  liveRoundMinute: { color: '#ffe66a', fontSize: 9, fontWeight: '900' },
  liveRoundList: { backgroundColor: '#688827', paddingVertical: 3 },
  liveRoundRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4 },
  liveRoundRowUser: { backgroundColor: 'rgba(255,230,106,.13)' },
  liveRoundClub: { flex: 1, minWidth: 0, color: '#eef5c8', fontSize: 6.5, fontWeight: '700' },
  liveRoundScore: { width: 28, textAlign: 'center', color: '#fff6a3', fontSize: 8, fontWeight: '900' },

  halftimeHero: { alignItems: 'center', gap: 7, paddingVertical: 22, backgroundColor: '#153426', borderColor: '#356a4a' },
  halftimeKicker: { color: '#79ef91', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  halftimeScore: { color: '#f5f7f5', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  halftimeText: { color: '#9fb2a5', fontSize: 10, textAlign: 'center' },
  roundBoard: { padding: 0, overflow: 'hidden', backgroundColor: '#6c8e29', borderColor: '#5e7c2d' },
  roundBoardHeader: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#526f20' },
  roundBoardTitle: { color: '#f3f7cc', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  roundBoardMinute: { color: '#ffe66a', fontSize: 13, fontWeight: '900' },
  roundGameRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,.16)' },
  roundGameRowUser: { backgroundColor: 'rgba(255,230,106,.16)' },
  roundClub: { flex: 1, minWidth: 0, color: '#f3f7cc', fontSize: 11, fontWeight: '800' },
  roundScore: { width: 52, textAlign: 'center', color: '#ffffff', fontSize: 15, fontWeight: '900' },
  halftimeActions: { gap: 8 },

  subPanel: { gap: 4 },
  finalPanel: { alignItems: 'center', gap: 6 },
  finalTitle: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  finalText: { color: '#9fb2a5', fontSize: 11 },
});
