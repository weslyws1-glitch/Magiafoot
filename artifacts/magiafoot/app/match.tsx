import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { formatCurrency, getCareerDivision, getCurrentFixture, LEAGUE_FIXTURES } from '@/game/engine';
import type { MatchEvent, MatchSession } from '@/game/types';
import { useColors } from '@/hooks/useColors';

function eventSymbol(event: MatchEvent) {
  if (event.type === 'goal') return '⚽';
  if (event.type === 'penalty') return '●';
  if (event.type === 'yellow') return '🟨';
  if (event.type === 'second_yellow') return '🟨🟥';
  if (event.type === 'red') return '🟥';
  if (event.type === 'var_start' || event.type === 'var_end' || event.type === 'var_overturn') return 'VAR';
  if (event.type === 'substitution' || event.type === 'injury_forced_sub') return '↔';
  if (event.type === 'medical') return '+';
  if (event.type === 'offside') return '🚩';
  if (event.type === 'corner') return '⌜';
  if (event.type === 'save') return '🧤';
  if (event.type === 'post') return '▌';
  if (event.type === 'stoppage_time') return '+';
  if (event.type === 'halftime') return 'Ⅱ';
  if (event.type === 'fulltime') return '■';
  return '•';
}

function momentTitle(event?: MatchEvent) {
  if (!event) return 'JOGO EM ANDAMENTO';
  const labels: Partial<Record<MatchEvent['type'], string>> = {
    goal: 'GOL!',
    penalty: 'PÊNALTI',
    save: 'DEFESAÇA',
    post: 'NA TRAVE',
    offside: 'IMPEDIMENTO',
    corner: 'ESCANTEIO',
    foul: 'FALTA',
    advantage: 'VANTAGEM',
    free_kick: 'BOLA PARADA',
    handball: 'MÃO NA BOLA',
    yellow: 'CARTÃO AMARELO',
    second_yellow: 'SEGUNDO AMARELO',
    red: 'EXPULSÃO',
    medical: 'ATENDIMENTO MÉDICO',
    injury_forced_sub: 'LESÃO',
    substitution: 'SUBSTITUIÇÃO',
    var_start: 'VAR EM ANÁLISE',
    var_end: 'DECISÃO DO VAR',
    var_overturn: 'DECISÃO ALTERADA',
    keeper_8s: '8 SEGUNDOS',
    stoppage_time: 'ACRÉSCIMOS',
    halftime: 'INTERVALO',
    fulltime: 'FIM DE JOGO',
  };
  return labels[event.type] ?? 'LANCE DA PARTIDA';
}

function clockLabel(game: MatchSession) {
  if (game.phase === 'halftime') return 'INTERVALO';
  if (game.phase === 'finished') return 'FIM';
  if (game.phase === 'pregame') return '0′';
  if (game.minute > 90) return `90+${game.minute - 90}′`;
  if (game.phase === 'first_half' && game.minute > 45) return `45+${game.minute - 45}′`;
  return game.minute + '′';
}

function possession(statsA: MatchSession['homeStats'], statsB: MatchSession['awayStats']) {
  const total = statsA.possessionTicks + statsB.possessionTicks;
  if (!total) return [50, 50] as const;
  const a = Math.round((statsA.possessionTicks / total) * 100);
  return [a, 100 - a] as const;
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

function tacticalShare(left: number, right: number, fallback = 50) {
  const total = Math.max(0, left) + Math.max(0, right);
  if (total <= 0.0001) return fallback;
  return Math.max(8, Math.min(92, Math.round((left / total) * 100)));
}

function broadcastReading(
  homeName: string,
  awayName: string,
  homePossession: number,
  awayPossession: number,
  homeXg: number,
  awayXg: number,
  homeShotsOnTarget: number,
  awayShotsOnTarget: number,
) {
  const possessionDiff = homePossession - awayPossession;
  const xgDiff = homeXg - awayXg;
  const targetDiff = homeShotsOnTarget - awayShotsOnTarget;

  if (Math.abs(xgDiff) >= 0.55) {
    const leader = xgDiff > 0 ? homeName : awayName;
    const trailer = xgDiff > 0 ? awayName : homeName;
    return `${leader} criou as chances mais perigosas. ${trailer} precisa proteger melhor a área e reduzir os espaços entre as linhas.`;
  }
  if (Math.abs(possessionDiff) >= 16 && Math.abs(xgDiff) < 0.30) {
    const leader = possessionDiff > 0 ? homeName : awayName;
    return `${leader} controla mais a bola, mas ainda transforma pouco essa posse em chances claras. É uma posse mais territorial do que agressiva.`;
  }
  if (Math.abs(targetDiff) >= 3) {
    const leader = targetDiff > 0 ? homeName : awayName;
    return `${leader} chega com mais frequência ao gol e obriga o adversário a defender mais baixo. O volume ofensivo está fazendo diferença.`;
  }
  return 'Jogo equilibrado: nenhuma equipe conseguiu impor domínio claro. A próxima sequência de pressão pode mudar o roteiro da partida.';
}

function TacticalBar({
  label, leftLabel, rightLabel, leftShare,
}: {
  label: string; leftLabel: string; rightLabel: string; leftShare: number;
}) {
  const safe = Math.max(6, Math.min(94, leftShare));
  return (
    <View style={styles.tacticalMetric}>
      <View style={styles.tacticalMetricHeader}>
        <Text style={styles.tacticalSideValue}>{leftLabel}</Text>
        <Text style={styles.tacticalMetricLabel}>{label}</Text>
        <Text style={[styles.tacticalSideValue,{ textAlign:'right' }]}>{rightLabel}</Text>
      </View>
      <View style={styles.dualBar}>
        <View style={[styles.dualBarLeft,{ width:(safe + '%') as any }]} />
        <View style={[styles.dualBarRight,{ width:((100-safe) + '%') as any }]} />
      </View>
    </View>
  );
}

function EventDiagram({ event, minute = 0, homeColor = '#60a5fa', awayColor = '#ef4444' }: { event?: MatchEvent; minute?: number; homeColor?: string; awayColor?: string }) {
  const showOffside = event?.type === 'offside' || (event?.type === 'var_start' && event.text.toLowerCase().includes('impedimento'));
  const showPenalty = event?.type === 'penalty' || (event?.type === 'var_start' && event.text.toLowerCase().includes('pênalti'));
  const showCorner = event?.type === 'corner' || event?.type === 'keeper_8s';
  const showGoalArea = ['goal','save','post','shot','penalty'].includes(event?.type ?? '');

  return (
    <View style={styles.diagramPitch}>
      <View style={styles.diagramHalfLine} />
      {Array.from({ length: 22 }, (_, index) => {
        const isHome = index < 11;
        const player = index % 11;
        const column = player === 0 ? 8 : player <= 4 ? 25 : player <= 8 ? 46 : 66;
        const lane = player === 0 ? 50 : ((player - 1) % 4 + 1) * 20;
        const drift = Math.sin(minute * 0.29 + index * 1.8) * 5;
        const progress = isHome ? column + drift : 100 - column - drift;
        return <View key={'player-' + index} style={{ position: 'absolute', left: `${Math.max(3, Math.min(94, progress))}%` as any, top: `${Math.max(5, Math.min(90, lane + Math.cos(minute * 0.33 + index) * 5))}%` as any, width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#fff', backgroundColor: isHome ? homeColor : awayColor, zIndex: 3 }} />;
      })}
      <View style={styles.diagramCircle} />
      <View style={{ position: 'absolute', left: `${Math.max(6, Math.min(92, 50 + Math.sin(minute * 0.31) * 34))}%` as any, top: `${Math.max(8, Math.min(90, 50 + Math.cos(minute * 0.41) * 30))}%` as any, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffffff', zIndex: 5 }} />
      <View style={styles.diagramLeftBox} />
      <View style={styles.diagramRightBox} />
      <View style={styles.diagramLeftGoal} />
      <View style={styles.diagramRightGoal} />
      {showOffside ? <View style={styles.offsideLine}><Text style={styles.offsideLabel}>LINHA</Text></View> : null}
      {showPenalty ? <View style={styles.penaltySpot}><Text style={styles.ballGlyph}>●</Text></View> : null}
      {showCorner ? <View style={styles.cornerMarker}><Text style={styles.ballGlyph}>●</Text></View> : null}
      {showGoalArea ? (
        <>
          <View style={styles.shotOrigin}><Text style={styles.ballGlyph}>●</Text></View>
          <Text style={styles.shotArrow}>→</Text>
        </>
      ) : null}
      {!showOffside && !showPenalty && !showCorner && !showGoalArea ? (
        <View style={styles.centerBall}><Text style={styles.ballGlyph}>●</Text></View>
      ) : null}
    </View>
  );
}

export default function MatchScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    career, startCurrentMatch, advanceCurrentMatch, closeCurrentMatch, manualSave,
    pauseMatchForTactics, resolveVAR,
  } = useCareer();
  const [autoRunning, setAutoRunning] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [infoTab, setInfoTab] = useState<'timeline' | 'stats'>('timeline');
  const [showRoundLive, setShowRoundLive] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const game = career?.liveMatch ?? null;

  useEffect(() => {
    if (!savingResult || !career || career.liveMatch) return;
    let active = true;
    manualSave().then((saved) => {
      if (!active) return;
      if (saved) { setResultSaved(true); setSavingResult(false); }
      else setSavingResult(false);
    }).catch(() => { if (active) setSavingResult(false); });
    return () => { active = false; };
  }, [savingResult, career, manualSave, router]);

  useEffect(() => {
    if (!game || !autoRunning || game.pausedForTactics || game.pausedForVar || game.requiredSubstitutionPlayerId) return;
    if (game.phase !== 'first_half' && game.phase !== 'second_half') return;
    const intervalMs = speed === 1 ? 900 : speed === 2 ? 260 : 75;
    const timer = setInterval(() => advanceCurrentMatch(1), intervalMs);
    return () => clearInterval(timer);
  }, [
    game?.phase, game?.minute, game?.pausedForTactics, game?.pausedForVar,
    game?.requiredSubstitutionPlayerId, autoRunning, speed, advanceCurrentMatch,
  ]);

  if (!career) {
    return <><GameHeader title="Partida" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira antes de entrar em campo.</Text></Screen></>;
  }

  if (!game) {
    const fixture = getCurrentFixture(career);
    const home = fixture ? getClub(fixture.homeClubId) : undefined;
    const away = fixture ? getClub(fixture.awayClubId) : undefined;
    return (
      <>
        <GameHeader title="Próxima partida" eyebrow={fixture ? (getCareerDivision(career)?.name ?? 'DIVISÃO').toUpperCase() + ' · RODADA ' + (career.roundIndex + 1) : 'TEMPORADA ENCERRADA'} />
        <Screen>
          <Panel style={styles.preGame}>
            {fixture && home && away ? (
              <>
                <Text style={styles.preGameTitle}>{home.name}</Text>
                <Text style={styles.preGameVs}>×</Text>
                <Text style={styles.preGameTitle}>{away.name}</Text>
                <Text style={styles.preGameMeta}>Escalação {career.formationId} · arbitragem, VAR e regras completas</Text>
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

  const divisionName = getCareerDivision(career)?.name ?? 'DIVISÃO';
  const clock = clockLabel(game);
  const isFinal = game.phase === 'finished';
  const latestEvent = game.events.length ? game.events[game.events.length - 1] : undefined;
  const recentEvents = [...game.events].slice(-8).reverse();
  const [homePossession, awayPossession] = possession(game.homeStats, game.awayStats);
  const homePassAccuracy = game.homeStats.passes ? Math.round(game.homeStats.completedPasses / game.homeStats.passes * 100) : 0;
  const awayPassAccuracy = game.awayStats.passes ? Math.round(game.awayStats.completedPasses / game.awayStats.passes * 100) : 0;
  const xgShare = tacticalShare(game.homeStats.xg, game.awayStats.xg);
  const targetShare = tacticalShare(game.homeStats.shotsOnTarget + game.homeStats.bigChances * 0.7, game.awayStats.shotsOnTarget + game.awayStats.bigChances * 0.7);
  const pressureShare = Math.max(12, Math.min(88, 50 + (game.homeStats.shotsOnTarget - game.awayStats.shotsOnTarget) * 7 + (game.homeStats.corners - game.awayStats.corners) * 2));
  const broadcastText = broadcastReading(
    home.name, away.name, homePossession, awayPossession,
    game.homeStats.xg, game.awayStats.xg,
    game.homeStats.shotsOnTarget, game.awayStats.shotsOnTarget,
  );

  const injuredRequired = game.requiredSubstitutionPlayerId
    ? career.players.find((player) => player.id === game.requiredSubstitutionPlayerId)
    : undefined;
  const unavailableStarters = game.phase === 'pregame'
    ? game.userLineup
        .map((slot) => career.players.find((player) => player.id === slot.playerId))
        .filter((player) => !player || player.status !== 'available')
    : [];
  const unavailableBench = game.phase === 'pregame'
    ? game.userBenchIds
        .map((id) => career.players.find((player) => player.id === id))
        .filter((player) => !player || player.status !== 'available')
    : [];

  const roundMatches = (career.leagueFixtures?.length ? career.leagueFixtures : LEAGUE_FIXTURES)
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

  const openTactics = () => {
    pauseMatchForTactics();
    router.push('/tactics');
  };

  const handleMain = async () => {
    if (isFinal) {
      if (savingResult) return;
      if (resultSaved) { router.replace('/'); return; }
      setSavingResult(true);
      closeCurrentMatch();
      // A tela só retorna à carreira depois da confirmação do salvamento.
      return;
    }
    advanceCurrentMatch(1);
  };

  if (game.phase === 'halftime') {
    return (
      <>
        <GameHeader
          title="Intervalo"
          eyebrow={divisionName.toUpperCase() + ' · RODADA ' + (game.fixture.roundIndex + 1)}
          back={false}
          right={<Text style={styles.headerClock}>{clock}</Text>}
        />
        <Screen>
          <Panel style={styles.halftimeHero}>
            <Text style={styles.halftimeKicker}>INTERVALO</Text>
            <Text style={styles.halftimeScore}>{home.name} {game.homeGoals} × {game.awayGoals} {away.name}</Text>
            <Text style={styles.halftimeText}>Resumo do primeiro tempo e leitura tática da transmissão</Text>
          </Panel>

          <Panel style={styles.matchIntelligence}>
            <Text style={styles.panelKicker}>LEITURA DO 1º TEMPO</Text>
            <Text style={styles.broadcastLead}>{broadcastText}</Text>
            <View style={styles.tacticalBars}>
              <TacticalBar label="POSSE" leftLabel={homePossession + '%'} rightLabel={awayPossession + '%'} leftShare={homePossession} />
              <TacticalBar label="PERIGO (xG)" leftLabel={game.homeStats.xg.toFixed(2)} rightLabel={game.awayStats.xg.toFixed(2)} leftShare={xgShare} />
              <TacticalBar label="PRESSÃO" leftLabel={home.initials} rightLabel={away.initials} leftShare={pressureShare} />
            </View>
            <View style={styles.metricGrid}>
              <Metric label="Finalizações" left={game.homeStats.shots} right={game.awayStats.shots} />
              <Metric label="No alvo" left={game.homeStats.shotsOnTarget} right={game.awayStats.shotsOnTarget} />
              <Metric label="Grandes chances" left={game.homeStats.bigChances} right={game.awayStats.bigChances} />
              <Metric label="Escanteios" left={game.homeStats.corners} right={game.awayStats.corners} />
            </View>
          </Panel>

          <Panel style={styles.roundBoard}>
            <View style={styles.roundBoardHeader}>
              <Text style={styles.roundBoardTitle}>PLACAR DA RODADA</Text>
              <Text style={styles.roundBoardMinute}>INT</Text>
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
            <GameButton label="AJUSTAR TÁTICA" icon="layout" variant="outline" onPress={openTactics} />
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
        eyebrow={divisionName.toUpperCase() + ' · RODADA ' + (game.fixture.roundIndex + 1)}
        back={false}
        right={<Text style={styles.headerClock}>{clock}</Text>}
      />
      <Screen>
        <View style={styles.liveTopCard}>
          <View style={styles.liveTopBar}>
            <Text style={styles.liveCompetition}>{divisionName.toUpperCase()} · RODADA {game.fixture.roundIndex + 1}</Text>
            <Text style={styles.refereeMini}>Árbitro: {game.referee.name}</Text>
          </View>

          <Text style={{ color: '#a8c7b2', fontSize: 10, textAlign: 'center', paddingTop: 5 }}>LOCAL: {home.city} · MANDO: {home.name}</Text>
          <View style={styles.featuredMatch}>
            <View style={styles.featuredTeam}>
              <Text numberOfLines={1} style={styles.featuredTeamName}>{home.name}</Text>
              <Text style={styles.featuredScore}>{game.homeGoals}</Text>
            </View>
            <View style={styles.featuredCenter}>
              <Text style={styles.featuredClock}>{isFinal ? 'FIM DE JOGO' : clock}</Text>
              <Text style={styles.featuredVs}>×</Text>
              <Text style={styles.featuredStatus}>
                {game.pausedForVar ? 'VAR' : game.requiredSubstitutionPlayerId ? 'LESÃO' : game.pausedForTactics ? 'TÁTICA' : autoRunning ? speed + 'x' : 'PAUSADO'}
              </Text>
            </View>
            <View style={[styles.featuredTeam, { alignItems: 'flex-end' }]}>
              <Text numberOfLines={1} style={[styles.featuredTeamName, { textAlign: 'right' }]}>{away.name}</Text>
              <Text style={styles.featuredScore}>{game.awayGoals}</Text>
            </View>
          </View>

          <View style={styles.featuredActions}>
            <Pressable onPress={() => setShowRoundLive((value) => !value)} style={[styles.roundLiveButton, showRoundLive && styles.roundLiveButtonActive]}>
              <View style={styles.liveDot} />
              <Text style={[styles.roundLiveButtonText, showRoundLive && styles.roundLiveButtonTextActive]}>RODADA AO VIVO</Text>
              <Feather name={showRoundLive ? 'chevron-up' : 'chevron-down'} size={13} color={showRoundLive ? '#07150d' : '#79ef91'} />
            </Pressable>
          </View>
        </View>

        <View style={styles.liveControls}>
          <Pressable
            disabled={game.phase === 'pregame' || game.pausedForVar || Boolean(game.requiredSubstitutionPlayerId)}
            onPress={() => setAutoRunning((value) => !value)}
            style={[styles.controlButton, (game.pausedForVar || game.requiredSubstitutionPlayerId) && styles.controlDisabled]}
          >
            <Feather name={autoRunning ? 'pause' : 'play'} size={14} color="#07150d" />
            <Text style={styles.controlButtonText}>{game.phase === 'pregame' ? 'PRONTO' : autoRunning ? 'PAUSAR' : 'CONTINUAR'}</Text>
          </Pressable>

          <View style={styles.speedGroup}>
            {[1, 2, 3].map((value) => (
              <Pressable
                key={value}
                disabled={game.pausedForVar || Boolean(game.requiredSubstitutionPlayerId)}
                onPress={() => setSpeed(value as 1 | 2 | 3)}
                style={[styles.speedButton, speed === value && styles.speedButtonActive]}
              >
                <Text style={[styles.speedText, speed === value && styles.speedTextActive]}>{value}x</Text>
              </Pressable>
            ))}
          </View>

          <Pressable disabled={game.pausedForVar} onPress={openTactics} style={[styles.controlDark, game.pausedForVar && styles.controlDisabled]}>
            <Text style={styles.controlDarkText}>TÁTICA</Text>
          </Pressable>
        </View>

        {showRoundLive ? (
          <Panel style={styles.roundLivePanel}>
            <View style={styles.roundLiveHeader}>
              <Text style={styles.roundLiveTitle}>PLACARES EM TEMPO REAL</Text>
              <Text style={styles.roundLiveClock}>{clock}</Text>
            </View>
            {roundMatches.map((item) => (
              <View key={item.fixture.id} style={[styles.roundLiveRow, item.isUser && styles.roundLiveRowUser]}>
                <Text numberOfLines={1} style={styles.roundLiveClub}>{item.home?.name ?? 'Casa'}</Text>
                <Text style={styles.roundLiveScore}>{item.homeGoals} - {item.awayGoals}</Text>
                <Text numberOfLines={1} style={[styles.roundLiveClub,{ textAlign:'right' }]}>{item.away?.name ?? 'Fora'}</Text>
              </View>
            ))}
            <Text style={styles.roundLiveNote}>A partida continua normalmente enquanto esta aba está aberta.</Text>
          </Panel>
        ) : null}

        {game.pausedForVar && game.pendingVar ? (
          <Panel style={styles.varPanel}>
            <View style={styles.varBadge}><Text style={styles.varBadgeText}>VAR</Text></View>
            <Text style={styles.varTitle}>JOGO PARALISADO</Text>
            <Text style={styles.varHeadline}>{game.pendingVar.headline.toUpperCase()}</Text>
            <Text style={styles.varText}>A cabine está revisando o lance. O relógio não avança até a decisão.</Text>
            <GameButton label="VER DECISÃO DO VAR" icon="monitor" onPress={resolveVAR} />
          </Panel>
        ) : null}

        {injuredRequired ? (
          <Panel style={styles.injuryPanel}>
            <View style={styles.alertRow}>
              <View style={styles.medicalIcon}><Feather name="activity" size={20} color="#ffffff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.injuryKicker}>SUBSTITUIÇÃO OBRIGATÓRIA</Text>
                <Text style={styles.injuryName}>{injuredRequired.name}</Text>
                <Text style={styles.injuryText}>{injuredRequired.injuryName ?? 'Lesão'} · aproximadamente {injuredRequired.injuryDaysRemaining ?? 0} dias fora</Text>
              </View>
            </View>
            <GameButton label="FAZER A TROCA" icon="repeat" onPress={openTactics} />
          </Panel>
        ) : null}

        {game.phase === 'pregame' && (unavailableStarters.length > 0 || unavailableBench.length > 0) ? (
          <Panel style={styles.selectionWarning}>
            <Text style={styles.warningTitle}>AJUSTE O TIME ANTES DO JOGO</Text>
            {unavailableStarters.map((player, index) => (
              <Text key={player?.id ?? index} style={styles.warningText}>
                • {player?.name ?? 'Jogador'} — {player?.status === 'injured' ? `${player.injuryName ?? 'lesionado'} (${player.injuryDaysRemaining ?? 0} dias)` : player?.status === 'suspended' ? `suspenso: ${player.suspensionReason ?? 'cumpre suspensão'}` : 'indisponível'}
              </Text>
            ))}
            {unavailableBench.length ? <Text style={styles.warningNote}>Há também {unavailableBench.length} jogador(es) indisponível(is) no banco.</Text> : null}
            <GameButton label="IR PARA TÁTICAS" icon="layout" onPress={openTactics} />
          </Panel>
        ) : null}

        <Panel style={styles.momentPanel}>
          <View style={styles.momentHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelKicker}>MOMENTO DO JOGO</Text>
              <Text style={styles.momentHeadline}>{momentTitle(latestEvent)}</Text>
              <Text style={styles.momentDescription}>{latestEvent?.text ?? 'A partida se desenvolve no meio-campo.'}</Text>
            </View>
            <Text style={styles.momentMinute}>{clock}</Text>
          </View>
          <EventDiagram event={latestEvent} minute={game.minute} homeColor={home.color} awayColor={away.color} />

          <View style={styles.tacticalBars}>
            <TacticalBar label="CONTROLE" leftLabel={homePossession + '%'} rightLabel={awayPossession + '%'} leftShare={homePossession} />
            <TacticalBar label="PERIGO" leftLabel={game.homeStats.xg.toFixed(2)} rightLabel={game.awayStats.xg.toFixed(2)} leftShare={xgShare} />
            <TacticalBar label="PRESSÃO" leftLabel={home.initials} rightLabel={away.initials} leftShare={pressureShare} />
          </View>
        </Panel>

        <Panel style={styles.liveInfoPanel}>
          <View style={styles.infoTabs}>
            <Pressable onPress={() => setInfoTab('timeline')} style={[styles.infoTab, infoTab === 'timeline' && styles.infoTabActive]}>
              <Feather name="list" size={12} color={infoTab === 'timeline' ? '#07150d' : '#9fb2a5'} />
              <Text style={[styles.infoTabText, infoTab === 'timeline' && styles.infoTabTextActive]}>LINHA DO TEMPO</Text>
            </Pressable>
            <Pressable onPress={() => setInfoTab('stats')} style={[styles.infoTab, infoTab === 'stats' && styles.infoTabActive]}>
              <Feather name="bar-chart-2" size={12} color={infoTab === 'stats' ? '#07150d' : '#9fb2a5'} />
              <Text style={[styles.infoTabText, infoTab === 'stats' && styles.infoTabTextActive]}>ESTATÍSTICAS</Text>
            </Pressable>
          </View>

          {infoTab === 'timeline' ? (
            <View style={styles.tabContent}>
              <View style={styles.commentaryHeader}>
                <Text style={styles.commentaryTitle}>LANCES DA PARTIDA</Text>
                <Text style={styles.commentaryClock}>{clock}</Text>
              </View>
              {recentEvents.length ? recentEvents.map((event) => (
                <View key={event.id} style={[styles.commentaryRow, event.type.startsWith('var_') && styles.varEventRow]}>
                  <Text style={styles.commentaryMinute}>{event.minute > 90 ? '90+' + (event.minute - 90) : event.minute > 45 && game.phase === 'first_half' ? '45+' + (event.minute - 45) : event.minute}′</Text>
                  <Text style={styles.commentarySymbol}>{eventSymbol(event)}</Text>
                  <Text style={styles.commentaryText}>{event.text}</Text>
                </View>
              )) : <Text style={styles.commentaryEmpty}>Aguardando o apito inicial…</Text>}
            </View>
          ) : (
            <View style={[styles.tabContent, styles.statsTabContent]}>
              <View style={styles.statsHeader}>
                <View>
                  <Text style={styles.commentaryTitle}>NÚMEROS AO VIVO</Text>
                  <Text style={styles.statsSubtitle}>Comparativo da partida</Text>
                </View>
                <View style={styles.statsTeams}>
                  <Text style={styles.statsTeamName}>{home.initials}</Text>
                  <Text style={styles.statsVersus}>×</Text>
                  <Text style={styles.statsTeamName}>{away.initials}</Text>
                </View>
              </View>

              <View style={styles.statsCompactGrid}>
                <StatTile label="POSSE" left={homePossession + '%'} right={awayPossession + '%'} />
                <StatTile label="xG" left={game.homeStats.xg.toFixed(2)} right={game.awayStats.xg.toFixed(2)} />
                <StatTile label="FINALIZAÇÕES" left={game.homeStats.shots} right={game.awayStats.shots} />
                <StatTile label="NO ALVO" left={game.homeStats.shotsOnTarget} right={game.awayStats.shotsOnTarget} />
                <StatTile label="GRANDES CHANCES" left={game.homeStats.bigChances} right={game.awayStats.bigChances} />
                <StatTile label="ESCANTEIOS" left={game.homeStats.corners} right={game.awayStats.corners} />
                <StatTile label="FALTAS" left={game.homeStats.fouls} right={game.awayStats.fouls} />
                <StatTile label="IMPEDIMENTOS" left={game.homeStats.offsides} right={game.awayStats.offsides} />
                <StatTile label="PASSES CERTOS" left={homePassAccuracy + '%'} right={awayPassAccuracy + '%'} />
                <StatTile label="VAR" left={game.homeStats.varReviews} right={game.awayStats.varReviews} />
              </View>

              <View style={styles.disciplineStrip}>
                <View style={styles.disciplineTeam}>
                  <Text style={styles.disciplineClub}>{home.initials}</Text>
                  <Text style={styles.disciplineCards}>🟨 {game.homeStats.yellowCards}   🟥 {game.homeStats.redCards}</Text>
                </View>
                <View style={styles.disciplineCenter}>
                  <Text style={styles.disciplineLabel}>DISCIPLINA</Text>
                </View>
                <View style={[styles.disciplineTeam,{ alignItems:'flex-end' }]}>
                  <Text style={styles.disciplineClub}>{away.initials}</Text>
                  <Text style={styles.disciplineCards}>🟨 {game.awayStats.yellowCards}   🟥 {game.awayStats.redCards}</Text>
                </View>
              </View>
            </View>
          )}
        </Panel>





        {game.phase === 'pregame' && unavailableStarters.length === 0 && unavailableBench.length === 0 ? (
          <GameButton label="APITO INICIAL" icon="play" onPress={() => advanceCurrentMatch(1)} />
        ) : null}

        {isFinal ? (
          <>
            <GameButton label={savingResult ? "SALVANDO RESULTADO..." : resultSaved ? "VOLTAR À CARREIRA" : "FIM DE JOGO · SALVAR RESULTADO"} icon="flag" onPress={handleMain} />
            <Panel style={styles.finalPanel}>
              <Text style={styles.finalTitle}>Fim de jogo</Text>
              <Text style={styles.finalText}>{home.name} {game.homeGoals} × {game.awayGoals} {away.name}</Text>
              <Text style={styles.finalText}>xG: {game.homeStats.xg.toFixed(2)} × {game.awayStats.xg.toFixed(2)} · Posse: {homePossession}% × {awayPossession}%</Text>
              <Text style={styles.finalText}>Caixa atual: {formatCurrency(career.balance)}</Text>
            </Panel>
          </>
        ) : null}
      </Screen>
    </>
  );
}

function StatTile({ label, left, right }: { label: string; left: number | string; right: number | string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <View style={styles.statTileValues}>
        <Text style={styles.statTileValue}>{left}</Text>
        <View style={styles.statTileDivider} />
        <Text style={[styles.statTileValue,{ textAlign:'right' }]}>{right}</Text>
      </View>
    </View>
  );
}

function Metric({ label, left, right }: { label: string; left: number | string; right: number | string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricValue}>{left}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { textAlign: 'right' }]}>{right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerClock: { color: '#79ef91', fontSize: 16, fontWeight: '900' },
  preGame: { alignItems: 'center', gap: 12, backgroundColor: '#153426', borderColor: '#356a4a', paddingVertical: 28 },
  preGameTitle: { color: '#f5f7f5', fontSize: 20, fontWeight: '900' },
  preGameVs: { color: '#79ef91', fontSize: 25, fontWeight: '900' },
  preGameMeta: { color: '#9fb2a5', fontSize: 10, textAlign: 'center' },

  liveTopCard: { borderWidth: 1, borderColor: '#315f3f', backgroundColor: '#163a25', overflow: 'hidden', borderRadius: 14 },
  liveTopBar: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, backgroundColor: '#0d2618' },
  liveCompetition: { color: '#dce8df', fontSize: 8, fontWeight: '900' },
  refereeMini: { color: '#83998c', fontSize: 6.5, fontWeight: '800' },
  featuredMatch: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#1d4a2d' },
  featuredTeam: { flex: 1, minWidth: 0 },
  featuredTeamName: { color: '#f4f6d7', fontSize: 12, fontWeight: '900' },
  featuredScore: { color: '#ffffff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  featuredCenter: { width: 76, alignItems: 'center' },
  featuredClock: { color: '#ffe66a', fontSize: 18, fontWeight: '900' },
  featuredVs: { color: '#dce8df', fontSize: 11, fontWeight: '900', marginTop: 1 },
  featuredStatus: { color: '#b9c8be', fontSize: 7, fontWeight: '900', marginTop: 3 },
  featuredActions: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#14351f', paddingHorizontal: 8 },
  roundLiveButton: { minHeight: 28, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#315f3f', backgroundColor: '#0d2618', flexDirection: 'row', alignItems: 'center', gap: 6 },
  roundLiveButtonActive: { backgroundColor: '#79ef91', borderColor: '#79ef91' },
  roundLiveButtonText: { color: '#79ef91', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  roundLiveButtonTextActive: { color: '#07150d' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef5b5b' },
  roundLivePanel: { padding: 0, overflow: 'hidden', backgroundColor: '#10291d', borderColor: '#315f3f' },
  roundLiveHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#0d2618' },
  roundLiveTitle: { color: '#dce8df', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },
  roundLiveClock: { color: '#ffe66a', fontSize: 9, fontWeight: '900' },
  roundLiveRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  roundLiveRowUser: { backgroundColor: '#225034' },
  roundLiveClub: { flex: 1, minWidth: 0, color: '#edf4ef', fontSize: 8.2, fontWeight: '800' },
  roundLiveScore: { width: 44, textAlign: 'center', color: '#ffffff', fontSize: 10, fontWeight: '900' },
  roundLiveNote: { color: '#789080', fontSize: 6.5, textAlign: 'center', paddingVertical: 7 },

  varPanel: { alignItems: 'center', gap: 8, backgroundColor: '#101820', borderColor: '#5fb5ff', borderWidth: 2 },
  varBadge: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 7, backgroundColor: '#e8f5ff' },
  varBadgeText: { color: '#06111a', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  varTitle: { color: '#6fc1ff', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  varHeadline: { color: '#ffffff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  varText: { color: '#aab9c6', fontSize: 9, lineHeight: 13, textAlign: 'center' },

  injuryPanel: { gap: 10, backgroundColor: '#351919', borderColor: '#b85c5c' },
  alertRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  medicalIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#9f3b3b', alignItems: 'center', justifyContent: 'center' },
  injuryKicker: { color: '#ff9696', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  injuryName: { color: '#ffffff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  injuryText: { color: '#d8adad', fontSize: 8, marginTop: 2 },

  selectionWarning: { gap: 7, backgroundColor: '#302511', borderColor: '#9e7c32' },
  warningTitle: { color: '#ffe38a', fontSize: 11, fontWeight: '900' },
  warningText: { color: '#f4e7c2', fontSize: 8.5, lineHeight: 12 },
  warningNote: { color: '#bda976', fontSize: 7.5 },

  momentPanel: { gap: 9, backgroundColor: '#0d2618', borderColor: '#315f3f' },
  momentHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  panelKicker: { color: '#79ef91', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  momentHeadline: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginTop: 2 },
  momentDescription: { color: '#a9bbb0', fontSize: 8, lineHeight: 11, marginTop: 3 },
  momentMinute: { color: '#ffe66a', fontSize: 14, fontWeight: '900' },
  diagramPitch: { height: 132, position: 'relative', overflow: 'hidden', borderRadius: 9, borderWidth: 2, borderColor: '#9cc88d', backgroundColor: '#39723a' },
  diagramHalfLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(255,255,255,.62)' },
  diagramCircle: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,.62)', left: '50%', top: '50%', transform: [{ translateX: -23 }, { translateY: -23 }] },
  diagramLeftBox: { position: 'absolute', left: 0, top: '25%', width: 40, height: '50%', borderWidth: 1, borderColor: 'rgba(255,255,255,.62)' },
  diagramRightBox: { position: 'absolute', right: 0, top: '25%', width: 40, height: '50%', borderWidth: 1, borderColor: 'rgba(255,255,255,.62)' },
  diagramLeftGoal: { position: 'absolute', left: -1, top: '39%', width: 8, height: '22%', borderWidth: 1, borderColor: '#ffffff' },
  diagramRightGoal: { position: 'absolute', right: -1, top: '39%', width: 8, height: '22%', borderWidth: 1, borderColor: '#ffffff' },
  offsideLine: { position: 'absolute', top: 0, bottom: 0, right: '25%', width: 2, backgroundColor: '#ffdf5d', alignItems: 'center' },
  offsideLabel: { color: '#ffdf5d', fontSize: 5.5, fontWeight: '900', marginTop: 5, marginLeft: 28 },
  penaltySpot: { position: 'absolute', right: 29, top: '50%', marginTop: -8 },
  cornerMarker: { position: 'absolute', right: 4, top: 2 },
  shotOrigin: { position: 'absolute', left: '58%', top: '50%', marginTop: -8 },
  shotArrow: { position: 'absolute', right: 21, top: '41%', color: '#ffffff', fontSize: 28, fontWeight: '900' },
  centerBall: { position: 'absolute', left: '50%', top: '50%', marginLeft: -4, marginTop: -8 },
  ballGlyph: { color: '#ffffff', fontSize: 12, textShadowColor: '#000', textShadowRadius: 2 },
  broadcastReadingBox: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#31513d', paddingTop: 8, gap: 3 },
  broadcastReadingLabel: { color: '#ffe66a', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  broadcastReadingText: { color: '#dce8df', fontSize: 8, lineHeight: 12 },
  broadcastLead: { color: '#dce8df', fontSize: 8.5, lineHeight: 13, paddingVertical: 2 },
  tacticalBars: { gap: 8 },
  tacticalMetric: { gap: 4 },
  tacticalMetricHeader: { flexDirection: 'row', alignItems: 'center' },
  tacticalSideValue: { width: 56, color: '#ffffff', fontSize: 7.5, fontWeight: '900' },
  tacticalMetricLabel: { flex: 1, color: '#91a498', fontSize: 6.5, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  dualBar: { height: 10, borderRadius: 99, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#172b20' },
  dualBarLeft: { height: '100%', backgroundColor: '#79ef91' },
  dualBarRight: { height: '100%', backgroundColor: '#b9825b' },

  matchIntelligence: { gap: 8, backgroundColor: '#10291d', borderColor: '#315f3f' },
  intelligenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  intelligenceScore: { color: '#95a99c', fontSize: 7, fontWeight: '900' },
  metricGrid: { gap: 2 },
  metricRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#254332' },
  metricValue: { width: 45, color: '#ffffff', fontSize: 9, fontWeight: '900' },
  metricLabel: { flex: 1, color: '#97aa9d', fontSize: 7, fontWeight: '800', textAlign: 'center' },
  cardsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  cardsText: { color: '#dce8df', fontSize: 7.5, fontWeight: '800' },
  xgText: { color: '#79ef91', fontSize: 8, fontWeight: '900' },

  liveInfoPanel: { padding: 0, overflow: 'hidden', backgroundColor: '#0b2117', borderColor: '#315f3f' },
  infoTabs: { flexDirection: 'row', gap: 6, padding: 7, backgroundColor: '#0d2618' },
  infoTab: { flex: 1, minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#132d20', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  infoTabActive: { backgroundColor: '#79ef91', borderColor: '#79ef91' },
  infoTabText: { color: '#9fb2a5', fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  infoTabTextActive: { color: '#07150d' },
  tabContent: { overflow: 'hidden' },
  statsTabContent: { paddingBottom: 8 },
  statsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#254332' },
  statsSubtitle: { color: '#74897c', fontSize: 6.5, marginTop: 2 },
  statsTeams: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: '#10291d' },
  statsTeamName: { color: '#ffffff', fontSize: 8, fontWeight: '900' },
  statsVersus: { color: '#79ef91', fontSize: 7, fontWeight: '900' },
  statsCompactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8 },
  statTile: { width: '49%', minHeight: 55, borderRadius: 9, borderWidth: 1, borderColor: '#284837', backgroundColor: '#10291d', paddingHorizontal: 8, paddingVertical: 7, justifyContent: 'space-between' },
  statTileLabel: { color: '#8ea295', fontSize: 6, fontWeight: '900', letterSpacing: 0.45, textAlign: 'center' },
  statTileValues: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statTileValue: { flex: 1, color: '#ffffff', fontSize: 13, fontWeight: '900' },
  statTileDivider: { width: 1, height: 18, backgroundColor: '#31513d', marginHorizontal: 7 },
  disciplineStrip: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#0d2618' },
  disciplineTeam: { flex: 1, minWidth: 0 },
  disciplineClub: { color: '#a9b9ae', fontSize: 6.5, fontWeight: '900' },
  disciplineCards: { color: '#ffffff', fontSize: 8.5, fontWeight: '900', marginTop: 2 },
  disciplineCenter: { paddingHorizontal: 4 },
  disciplineLabel: { color: '#79ef91', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.6 },
  refereePanel: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#171e18', borderColor: '#3d493f' },
  refereeIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#2a3027', alignItems: 'center', justifyContent: 'center' },
  refereeLabel: { color: '#a39869', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  refereeName: { color: '#ffffff', fontSize: 11, fontWeight: '900', marginTop: 2 },
  refereeMeta: { color: '#8d9b90', fontSize: 7, marginTop: 2 },

  commentaryPanel: { padding: 0, overflow: 'hidden', backgroundColor: '#0b2117', borderColor: '#315f3f', maxHeight: 270 },
  commentaryHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#14351f' },
  commentaryTitle: { color: '#dce8df', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  commentaryClock: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  commentaryRow: { minHeight: 30, flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  varEventRow: { backgroundColor: '#102534' },
  commentaryMinute: { width: 29, color: '#ffe66a', fontSize: 8, fontWeight: '900' },
  commentarySymbol: { width: 25, color: '#ffffff', fontSize: 8, textAlign: 'center', fontWeight: '900' },
  commentaryText: { flex: 1, color: '#dce8df', fontSize: 7.5, lineHeight: 10 },
  commentaryEmpty: { color: '#8fa696', fontSize: 9, padding: 12 },

  allMatchesPanel: { padding: 0, overflow: 'hidden', backgroundColor: '#153426', borderColor: '#315f3f' },
  allMatchesHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#0d2618' },
  allMatchesTitle: { color: '#dce8df', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  allMatchesClock: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  allMatchRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  allMatchRowUser: { backgroundColor: '#225034' },
  allMatchClub: { flex: 1, minWidth: 0, color: '#eef5ef', fontSize: 9, fontWeight: '800' },
  allMatchScore: { width: 20, textAlign: 'center', color: '#ffffff', fontSize: 11, fontWeight: '900' },
  allMatchDash: { color: '#8ea595', fontSize: 9, fontWeight: '900' },

  liveControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  controlButton: { flex: 1.2, minHeight: 36, borderRadius: 8, backgroundColor: '#79ef91', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  controlButtonText: { color: '#07150d', fontSize: 8, fontWeight: '900' },
  speedGroup: { flexDirection: 'row', gap: 3 },
  speedButton: { minWidth: 31, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#173326', alignItems: 'center', justifyContent: 'center' },
  speedButtonActive: { backgroundColor: '#ffe66a', borderColor: '#ffe66a' },
  speedText: { color: '#dce8df', fontSize: 8, fontWeight: '900' },
  speedTextActive: { color: '#263411' },
  controlDark: { flex: 1, minHeight: 36, borderRadius: 8, backgroundColor: '#173326', borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center' },
  controlDarkText: { color: '#dce8df', fontSize: 8, fontWeight: '900' },
  controlDisabled: { opacity: 0.38 },

  halftimeHero: { alignItems: 'center', gap: 7, paddingVertical: 22, backgroundColor: '#153426', borderColor: '#356a4a' },
  halftimeKicker: { color: '#79ef91', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  halftimeScore: { color: '#f5f7f5', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  halftimeText: { color: '#9fb2a5', fontSize: 9, textAlign: 'center' },
  roundBoard: { padding: 0, overflow: 'hidden', backgroundColor: '#153426', borderColor: '#315f3f' },
  roundBoardHeader: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d2618' },
  roundBoardTitle: { color: '#dce8df', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  roundBoardMinute: { color: '#ffe66a', fontSize: 11, fontWeight: '900' },
  roundGameRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  roundGameRowUser: { backgroundColor: '#225034' },
  roundClub: { flex: 1, minWidth: 0, color: '#eef5ef', fontSize: 9, fontWeight: '800' },
  roundScore: { width: 48, textAlign: 'center', color: '#ffffff', fontSize: 13, fontWeight: '900' },
  halftimeActions: { gap: 8 },

  finalPanel: { alignItems: 'center', gap: 6 },
  finalTitle: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  finalText: { color: '#9fb2a5', fontSize: 10, textAlign: 'center' },
});