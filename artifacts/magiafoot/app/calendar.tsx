import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { LEAGUE_FIXTURES, LEAGUE_ROUNDS, getCurrentFixture } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, startCurrentMatch } = useCareer();

  if (!career) {
    return <><GameHeader title="Jogos" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  const clubFixtures = useMemo(() => LEAGUE_FIXTURES
    .filter((f) => f.homeClubId === career.clubId || f.awayClubId === career.clubId)
    .sort((a, b) => a.roundIndex - b.roundIndex), [career.clubId]);

  const current = getCurrentFixture(career);
  const play = () => {
    if (!current) return;
    if (!career.liveMatch) startCurrentMatch();
    router.push('/match');
  };

  return (
    <>
      <GameHeader title="Jogos" eyebrow={'TEMPORADA ' + career.season} />
      <Screen>
        <Panel style={styles.summary}>
          <Text style={styles.summaryLabel}>CALENDÁRIO</Text>
          <Text style={styles.summaryTitle}>{LEAGUE_ROUNDS} rodadas</Text>
          <Text style={styles.summaryText}>Você está na rodada {career.roundIndex + 1}. Resultados concluídos ficam marcados abaixo.</Text>
        </Panel>

        <Panel style={styles.list}>
          {clubFixtures.map((fixture) => {
            const home = getClub(fixture.homeClubId);
            const away = getClub(fixture.awayClubId);
            const result = career.results.find((r) => r.id === fixture.id);
            const currentRound = fixture.roundIndex === career.roundIndex;
            return (
              <Pressable key={fixture.id} onPress={currentRound ? play : undefined} style={[styles.row, currentRound && styles.rowCurrent]}>
                <View style={styles.roundBox}><Text style={styles.roundSmall}>ROD</Text><Text style={styles.roundNumber}>{fixture.roundIndex + 1}</Text></View>
                <View style={styles.teams}>
                  <Text style={styles.team}>{home?.name ?? 'Casa'}</Text>
                  <Text style={styles.vs}>{result ? result.homeGoals + '  ×  ' + result.awayGoals : '×'}</Text>
                  <Text style={styles.team}>{away?.name ?? 'Fora'}</Text>
                </View>
                <Text style={[styles.status, result ? styles.done : currentRound ? styles.next : undefined]}>{result ? 'FINAL' : currentRound ? 'PRÓXIMO' : '—'}</Text>
              </Pressable>
            );
          })}
        </Panel>

        {current ? <GameButton label={career.liveMatch ? 'CONTINUAR PARTIDA' : 'JOGAR PRÓXIMA PARTIDA'} icon="play" onPress={play} /> : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: '#153426', borderColor: '#356a4a', gap: 6 },
  summaryLabel: { color: '#79ef91', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  summaryTitle: { color: '#f5f7f5', fontSize: 22, fontWeight: '900' },
  summaryText: { color: '#9fb2a5', fontSize: 11, lineHeight: 17 },
  list: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  rowCurrent: { backgroundColor: '#153426' },
  roundBox: { width: 44, alignItems: 'center' },
  roundSmall: { color: '#708a78', fontSize: 7, fontWeight: '900' },
  roundNumber: { color: '#eef5ef', fontSize: 18, fontWeight: '900' },
  teams: { flex: 1, gap: 3 },
  team: { color: '#f5f7f5', fontSize: 12, fontWeight: '800' },
  vs: { color: '#7e9585', fontSize: 9, fontWeight: '700' },
  status: { width: 55, textAlign: 'right', color: '#6f8b78', fontSize: 8, fontWeight: '900' },
  done: { color: '#9fb2a5' },
  next: { color: '#79ef91' },
});
