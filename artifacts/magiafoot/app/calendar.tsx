import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { LEAGUE_FIXTURES, LEAGUE_ROUNDS, formatSeasonRoundDate, getCurrentFixture, seasonRoundDate, seasonYear } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

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

  const groupedFixtures = useMemo(() => {
    const groups: Array<{ month: number; fixtures: typeof clubFixtures }> = [];
    for (const fixture of clubFixtures) {
      const month = seasonRoundDate(career.season, fixture.roundIndex).getUTCMonth();
      const found = groups.find((group) => group.month === month);
      if (found) found.fixtures.push(fixture);
      else groups.push({ month, fixtures: [fixture] });
    }
    return groups;
  }, [clubFixtures, career.season]);

  const current = getCurrentFixture(career);
  const year = seasonYear(career.season);
  const currentDate = current ? formatSeasonRoundDate(career.season, current.roundIndex) : 'Temporada concluída';

  const play = () => {
    if (!current) return;
    if (!career.liveMatch) startCurrentMatch();
    router.push('/match');
  };

  return (
    <>
      <GameHeader title="Calendário" eyebrow={'TEMPORADA ' + year} />
      <Screen>
        <Panel style={styles.summary}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>CALENDÁRIO NACIONAL</Text>
              <Text style={styles.summaryTitle}>{LEAGUE_ROUNDS} rodadas</Text>
            </View>
            <View style={styles.yearBadge}><Text style={styles.yearText}>{year}</Text></View>
          </View>
          <Text style={styles.summaryText}>20 clubes · turno e returno · uma rodada por semana · março a novembro.</Text>
          <View style={styles.nextDateBox}>
            <Text style={styles.nextDateLabel}>PRÓXIMA DATA</Text>
            <Text style={styles.nextDate}>{currentDate}</Text>
            <Text style={styles.nextRound}>Rodada {Math.min(career.roundIndex + 1, LEAGUE_ROUNDS)} de {LEAGUE_ROUNDS}</Text>
          </View>
        </Panel>

        {groupedFixtures.map((group) => (
          <View key={group.month} style={styles.monthGroup}>
            <SectionLabel title={MONTHS[group.month] + ' ' + year} />
            <Panel style={styles.list}>
              {group.fixtures.map((fixture) => {
                const home = getClub(fixture.homeClubId);
                const away = getClub(fixture.awayClubId);
                const result = career.results.find((r) => r.id === fixture.id);
                const currentRound = fixture.roundIndex === career.roundIndex;
                const date = seasonRoundDate(career.season, fixture.roundIndex);
                const day = String(date.getUTCDate()).padStart(2,'0');
                const weekday = date.toLocaleDateString('pt-BR',{ weekday:'short', timeZone:'UTC' }).replace('.','').toUpperCase();
                const isHome = fixture.homeClubId === career.clubId;
                const opponent = isHome ? away : home;

                return (
                  <Pressable key={fixture.id} onPress={currentRound ? play : undefined} style={[styles.row, currentRound && styles.rowCurrent]}>
                    <View style={styles.dateBox}>
                      <Text style={styles.weekday}>{weekday}</Text>
                      <Text style={styles.day}>{day}</Text>
                    </View>

                    <View style={styles.matchInfo}>
                      <View style={styles.roundLine}>
                        <Text style={styles.roundText}>RODADA {fixture.roundIndex + 1}</Text>
                        <Text style={styles.homeAway}>{isHome ? 'CASA' : 'FORA'}</Text>
                      </View>
                      <Text style={styles.opponent}>{opponent?.name ?? 'Adversário'}</Text>
                      <Text style={styles.fullDate}>{formatSeasonRoundDate(career.season, fixture.roundIndex)}</Text>
                    </View>

                    <View style={styles.resultBox}>
                      {result ? (
                        <>
                          <Text style={styles.score}>{result.homeGoals} × {result.awayGoals}</Text>
                          <Text style={styles.done}>FINAL</Text>
                        </>
                      ) : currentRound ? (
                        <>
                          <Text style={styles.next}>PRÓXIMO</Text>
                          <Text style={styles.playHint}>JOGAR</Text>
                        </>
                      ) : (
                        <Text style={styles.future}>AGENDADO</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </Panel>
          </View>
        ))}

        {current ? <GameButton label={career.liveMatch ? 'CONTINUAR PARTIDA' : 'JOGAR PRÓXIMA PARTIDA'} icon="play" onPress={play} /> : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: '#153426', borderColor: '#356a4a', gap: 10 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  summaryLabel: { color: '#79ef91', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  summaryTitle: { color: '#f5f7f5', fontSize: 24, fontWeight: '900', marginTop: 3 },
  summaryText: { color: '#9fb2a5', fontSize: 10, lineHeight: 15 },
  yearBadge: { minWidth: 64, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#356a4a' },
  yearText: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
  nextDateBox: { padding: 10, borderRadius: 10, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  nextDateLabel: { color: '#718b79', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  nextDate: { color: '#f5f7f5', fontSize: 11, fontWeight: '900', marginTop: 3, textTransform: 'capitalize' },
  nextRound: { color: '#8fa595', fontSize: 7.5, marginTop: 2 },
  monthGroup: { gap: 4 },
  list: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  rowCurrent: { backgroundColor: '#153426', borderLeftWidth: 3, borderLeftColor: '#79ef91' },
  dateBox: { width: 44, height: 48, borderRadius: 9, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center' },
  weekday: { color: '#789080', fontSize: 6.5, fontWeight: '900' },
  day: { color: '#f5f7f5', fontSize: 17, fontWeight: '900', marginTop: 1 },
  matchInfo: { flex: 1, minWidth: 0, gap: 2 },
  roundLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  roundText: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.4 },
  homeAway: { color: '#7e9585', fontSize: 6, fontWeight: '900' },
  opponent: { color: '#f5f7f5', fontSize: 11, fontWeight: '900' },
  fullDate: { color: '#829789', fontSize: 6.8, textTransform: 'capitalize' },
  resultBox: { width: 58, alignItems: 'flex-end', gap: 2 },
  score: { color: '#f5f7f5', fontSize: 13, fontWeight: '900' },
  done: { color: '#8fa595', fontSize: 6.5, fontWeight: '900' },
  next: { color: '#79ef91', fontSize: 7, fontWeight: '900' },
  playHint: { color: '#d6e4da', fontSize: 6.5, fontWeight: '900' },
  future: { color: '#607568', fontSize: 6.3, fontWeight: '900' },
});