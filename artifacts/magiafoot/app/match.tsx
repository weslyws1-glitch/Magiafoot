import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
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
  const recentEvents = [...game.events].slice(-6).reverse();

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
        <View style={styles.liveTopCard}>
          <View style={styles.liveTopBar}>
            <Text style={styles.liveCompetition}>3ª DIVISÃO · RODADA {game.fixture.roundIndex + 1}</Text>
            <View style={styles.liveProgress}>
              <View style={[styles.liveProgressFill, { width: ((game.minute / 90) * 100 + '%') as any }]} />
            </View>
            <Text style={styles.livePeriod}>{clock} · {game.phase === 'second_half' ? '2º tempo' : '1º tempo'}</Text>
          </View>

          <View style={styles.featuredMatch}>
            <View style={styles.featuredTeam}>
              <Text numberOfLines={1} style={styles.featuredTeamName}>{home.name}</Text>
              <Text style={styles.featuredScore}>{game.homeGoals}</Text>
            </View>

            <View style={styles.featuredCenter}>
              <Text style={styles.featuredClock}>{clock}</Text>
              <Text style={styles.featuredVs}>×</Text>
              <Text style={styles.featuredStatus}>{autoRunning ? speed + 'x' : 'PAUSADO'}</Text>
            </View>

            <View style={[styles.featuredTeam, { alignItems: 'flex-end' }]}>
              <Text numberOfLines={1} style={[styles.featuredTeamName, { textAlign: 'right' }]}>{away.name}</Text>
              <Text style={styles.featuredScore}>{game.awayGoals}</Text>
            </View>
          </View>

          <View style={styles.featuredStats}>
            <Text style={styles.featuredStat}>Finalizações {game.homeStats.shots} - {game.awayStats.shots}</Text>
            <Text style={styles.featuredStat}>Escanteios {game.homeStats.corners} - {game.awayStats.corners}</Text>
            <Text style={styles.featuredStat}>Faltas {game.homeStats.fouls} - {game.awayStats.fouls}</Text>
          </View>
        </View>

        <Panel style={styles.commentaryPanel}>
          <View style={styles.commentaryHeader}>
            <Text style={styles.commentaryTitle}>LANCES DA PARTIDA</Text>
            <Text style={styles.commentaryClock}>{game.minute}′</Text>
          </View>
          {recentEvents.length ? recentEvents.map((event) => (
            <View key={event.id} style={styles.commentaryRow}>
              <Text style={styles.commentaryMinute}>{event.minute}′</Text>
              <Text style={styles.commentarySymbol}>{eventSymbol(event)}</Text>
              <Text style={styles.commentaryText}>{event.text}</Text>
            </View>
          )) : <Text style={styles.commentaryEmpty}>Aguardando o apito inicial…</Text>}
        </Panel>

        <Panel style={styles.allMatchesPanel}>
          <View style={styles.allMatchesHeader}>
            <Text style={styles.allMatchesTitle}>TODOS OS JOGOS DA RODADA</Text>
            <Text style={styles.allMatchesClock}>{clock}</Text>
          </View>

          {roundMatches.map((item) => (
            <View key={item.fixture.id} style={[styles.allMatchRow, item.isUser && styles.allMatchRowUser]}>
              <Text numberOfLines={1} style={styles.allMatchClub}>{item.home?.name ?? 'Casa'}</Text>
              <Text style={styles.allMatchScore}>{item.homeGoals}</Text>
              <Text style={styles.allMatchDash}>×</Text>
              <Text style={styles.allMatchScore}>{item.awayGoals}</Text>
              <Text numberOfLines={1} style={[styles.allMatchClub, { textAlign: 'right' }]}>{item.away?.name ?? 'Fora'}</Text>
            </View>
          ))}
        </Panel>

        <View style={styles.liveControls}>
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
        </View>

        {isFinal ? (
          <>
            <GameButton label="ENCERRAR E ATUALIZAR CLASSIFICAÇÃO" icon="flag" onPress={handleMain} />
            <Panel style={styles.finalPanel}>
            <Text style={styles.finalTitle}>Fim de jogo</Text>
            <Text style={styles.finalText}>{home.name} {game.homeGoals} × {game.awayGoals} {away.name}</Text>
            <Text style={styles.finalText}>Caixa atual: {formatCurrency(career.balance)}</Text>
          </Panel>
          </>
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

  liveTopCard: { borderWidth: 1, borderColor: '#315f3f', backgroundColor: '#163a25', overflow: 'hidden' },
  liveTopBar: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, backgroundColor: '#0d2618' },
  liveCompetition: { flex: 1, color: '#dce8df', fontSize: 8, fontWeight: '900' },
  liveProgress: { width: 74, height: 8, borderWidth: 1, borderColor: '#94b46d', backgroundColor: '#e5eadb' },
  liveProgressFill: { height: '100%', backgroundColor: '#78a438' },
  livePeriod: { color: '#dce8df', fontSize: 8, fontWeight: '800' },

  featuredMatch: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#1d4a2d' },
  featuredTeam: { flex: 1, minWidth: 0 },
  featuredTeamName: { color: '#f4f6d7', fontSize: 12, fontWeight: '900' },
  featuredScore: { color: '#ffffff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  featuredCenter: { width: 74, alignItems: 'center' },
  featuredClock: { color: '#ffe66a', fontSize: 18, fontWeight: '900' },
  featuredVs: { color: '#dce8df', fontSize: 11, fontWeight: '900', marginTop: 1 },
  featuredStatus: { color: '#b9c8be', fontSize: 7, fontWeight: '800', marginTop: 3 },

  featuredStats: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#14351f', paddingHorizontal: 8 },
  featuredStat: { color: '#cfddcf', fontSize: 7, fontWeight: '800' },

  allMatchesPanel: { padding: 0, overflow: 'hidden', backgroundColor: '#153426', borderColor: '#315f3f' },
  allMatchesHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#0d2618' },
  allMatchesTitle: { color: '#dce8df', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  allMatchesClock: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  allMatchRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  allMatchRowUser: { backgroundColor: '#225034' },
  allMatchClub: { flex: 1, minWidth: 0, color: '#eef5ef', fontSize: 9, fontWeight: '800' },
  allMatchScore: { width: 20, textAlign: 'center', color: '#ffffff', fontSize: 11, fontWeight: '900' },
  allMatchDash: { color: '#8ea595', fontSize: 9, fontWeight: '900' },

  commentaryPanel: { padding: 0, overflow: 'hidden', backgroundColor: '#0b2117', borderColor: '#315f3f', maxHeight: 210 },
  commentaryHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#14351f' },
  commentaryTitle: { color: '#dce8df', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  commentaryClock: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  commentaryRow: { minHeight: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  commentaryMinute: { width: 24, color: '#ffe66a', fontSize: 8, fontWeight: '900' },
  commentarySymbol: { width: 18, color: '#ffffff', fontSize: 9, textAlign: 'center' },
  commentaryText: { flex: 1, color: '#dce8df', fontSize: 7.5, lineHeight: 10 },
  commentaryEmpty: { color: '#8fa696', fontSize: 9, padding: 12 },

  liveControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  subPanel: { gap: 4 },
  finalPanel: { alignItems: 'center', gap: 6 },
  finalTitle: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  finalText: { color: '#9fb2a5', fontSize: 11 },
});
