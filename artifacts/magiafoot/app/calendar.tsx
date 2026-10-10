import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { DailyAdvancePanel } from '@/components/DailyAdvancePanel';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { fixtureDate, formatFixtureDate, getCareerDate, getCareerDivision, getCurrentFixture, getLeagueRoundCount, seasonYear } from '@/game/engine';
import type { Fixture, LeagueResult } from '@/game/types';
import { useColors } from '@/hooks/useColors';

const MONTHS = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

const HOME_COLOR = '#A6B66A';
const AWAY_COLOR = '#B9825B';
const EMPTY_COLOR = '#10251A';

function resultForUser(result: LeagueResult, clubId: string): 'win' | 'draw' | 'loss' {
  const userHome = result.homeClubId === clubId;
  const userGoals = userHome ? result.homeGoals : result.awayGoals;
  const opponentGoals = userHome ? result.awayGoals : result.homeGoals;
  if (userGoals === opponentGoals) return 'draw';
  return userGoals > opponentGoals ? 'win' : 'loss';
}

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career } = useCareer();
  const [visibleMonth, setVisibleMonth] = useState(2);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const clubFixtures = useMemo(() => {
    if (!career) return [];
    return (career.leagueFixtures ?? [])
      .filter((fixture) => fixture.homeClubId === career.clubId || fixture.awayClubId === career.clubId)
      .sort((a, b) => fixtureDate(a, career.season).getTime() - fixtureDate(b, career.season).getTime());
  }, [career?.clubId, career?.leagueFixtures, career?.season]);

  const current = career ? getCurrentFixture(career) : undefined;
  const year = career ? seasonYear(career.season) : 2026;
  const leagueRounds = career ? Math.max(1, getLeagueRoundCount(career)) : 1;
  const division = career ? getCareerDivision(career) : undefined;

  useEffect(() => {
    if (!career) return;
    const activeFixture = current ?? clubFixtures.find((fixture) => fixture.roundIndex >= career.roundIndex) ?? clubFixtures[0];
    const month = activeFixture ? fixtureDate(activeFixture, career.season).getUTCMonth() : 2;
    setVisibleMonth(month);
    if (current) setSelectedFixtureId(current.id);
  }, [career?.season, career?.roundIndex, current?.id]);

  const monthFixtures = useMemo(() => {
    if (!career) return new Map<number, Fixture>();
    const map = new Map<number, Fixture>();
    for (const fixture of clubFixtures) {
      const date = fixtureDate(fixture, career.season);
      if (date.getUTCMonth() === visibleMonth) map.set(date.getUTCDate(), fixture);
    }
    return map;
  }, [career?.season, clubFixtures, visibleMonth]);

  const resultMap = useMemo(() => {
    const map = new Map<string, LeagueResult>();
    for (const result of career?.results ?? []) map.set(result.id, result);
    return map;
  }, [career?.results]);

  const selectedFixture = selectedFixtureId
    ? clubFixtures.find((fixture) => fixture.id === selectedFixtureId)
    : undefined;

  if (!career) {
    return <><GameHeader title="Calendário" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  const firstWeekday = new Date(Date.UTC(year, visibleMonth, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, visibleMonth + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const weeks = Array.from({ length: totalCells / 7 }, (_, weekIndex) =>
    cells.slice(weekIndex * 7, weekIndex * 7 + 7)
  );

  const goPreviousMonth = () => setVisibleMonth((month) => Math.max(0, month - 1));
  const goNextMonth = () => setVisibleMonth((month) => Math.min(11, month + 1));

  const selectedResult = selectedFixture ? resultMap.get(selectedFixture.id) : undefined;
  const selectedIsHome = selectedFixture?.homeClubId === career.clubId;
  const selectedOpponent = selectedFixture
    ? getClub(selectedIsHome ? selectedFixture.awayClubId : selectedFixture.homeClubId)
    : undefined;
  const selectedIsCurrent = selectedFixture?.roundIndex === career.roundIndex;

  return (
    <>
      <GameHeader title="Calendário" eyebrow={'TEMPORADA ' + year} />
      <Screen>
        <DailyAdvancePanel />
        <Panel style={styles.calendarPanel}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={goPreviousMonth}
              disabled={visibleMonth === 0}
              style={[styles.navButton, visibleMonth === 0 && styles.navButtonDisabled]}
            >
              <Feather name="chevron-left" size={20} color={visibleMonth === 0 ? '#476052' : '#F5F7F5'} />
            </Pressable>

            <View style={styles.monthTitleBox}>
              <Text style={styles.calendarLabel}>CALENDÁRIO DO MÊS DE</Text>
              <Text style={styles.monthTitle}>{MONTHS[visibleMonth]}</Text>
              <Text style={styles.yearTitle}>{year}</Text>
            </View>

            <Pressable
              onPress={goNextMonth}
              disabled={visibleMonth === 11}
              style={[styles.navButton, visibleMonth === 11 && styles.navButtonDisabled]}
            >
              <Feather name="chevron-right" size={20} color={visibleMonth === 11 ? '#476052' : '#F5F7F5'} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAYS.map((day) => <Text key={day} style={styles.weekHeaderText}>{day}</Text>)}
          </View>

          <View style={styles.calendarGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={'week-' + weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (!day) return <View key={'empty-' + dayIndex} style={[styles.dayCell, styles.dayCellBlank]} />;

                  const fixture = monthFixtures.get(day);
                  const result = fixture ? resultMap.get(fixture.id) : undefined;
                  const isHome = fixture?.homeClubId === career.clubId;
                  const opponent = fixture ? getClub(isHome ? fixture.awayClubId : fixture.homeClubId) : undefined;
                  const isCurrent = fixture?.roundIndex === career.roundIndex;
                  const isToday = getCareerDate(career) === year + '-' + String(visibleMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                  const isSelected = fixture?.id === selectedFixtureId;
                  const outcome = result ? resultForUser(result, career.clubId) : undefined;
                  const backgroundColor = fixture ? (isHome ? HOME_COLOR : AWAY_COLOR) : EMPTY_COLOR;
                  const lightText = false;

                  return (
                    <Pressable
                      key={day}
                      onPress={() => fixture && setSelectedFixtureId(fixture.id)}
                      disabled={!fixture}
                      style={[
                        styles.dayCell,
                        { backgroundColor },
                        fixture && styles.dayCellGame,
                        isCurrent && styles.dayCellCurrent,
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                      ]}
                    >
                      <Text style={[styles.dayNumber, fixture && { color: lightText ? '#FFFFFF' : '#07150D' }]}>{day}</Text>

                      {fixture ? (
                        <>
                          <View style={styles.fixtureCenter}>
                            <Text style={[styles.opponentInitials, { color: lightText ? '#FFFFFF' : '#07150D' }]}>
                              {opponent?.initials ?? 'ADV'}
                            </Text>
                            <Text style={[styles.homeAwayTag, { color: '#2B1A10' }]}>
                              {isHome ? 'CASA' : 'FORA'}
                            </Text>
                          </View>

                          {result ? (
                            <View style={styles.scoreBox}>
                              <Text style={[styles.cellScore, { color: lightText ? '#FFFFFF' : '#07150D' }]}>{result.homeGoals}×{result.awayGoals}</Text>
                              <View style={[
                                styles.outcomeDot,
                                outcome === 'win' ? styles.outcomeWin : outcome === 'draw' ? styles.outcomeDraw : styles.outcomeLoss,
                              ]} />
                            </View>
                          ) : isCurrent ? (
                            <View style={styles.nextBadge}><Text style={styles.nextBadgeText}>PRÓXIMO</Text></View>
                          ) : null}
                        </>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendColor,{ backgroundColor: HOME_COLOR }]} /><Text style={styles.legendText}>JOGO EM CASA</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendColor,{ backgroundColor: AWAY_COLOR }]} /><Text style={styles.legendText}>JOGO FORA</Text></View>
          </View>

          <View style={styles.resultLegend}>
            <View style={styles.resultLegendItem}><View style={[styles.resultDot,styles.outcomeWin]} /><Text style={styles.resultLegendText}>Vitória</Text></View>
            <View style={styles.resultLegendItem}><View style={[styles.resultDot,styles.outcomeDraw]} /><Text style={styles.resultLegendText}>Empate</Text></View>
            <View style={styles.resultLegendItem}><View style={[styles.resultDot,styles.outcomeLoss]} /><Text style={styles.resultLegendText}>Derrota</Text></View>
          </View>
        </Panel>

        {selectedFixture ? (
          <Panel style={styles.matchDetail}>
            <View style={styles.detailTop}>
              <View>
                <Text style={styles.detailKicker}>RODADA {selectedFixture.roundIndex + 1} · {selectedIsHome ? 'CASA' : 'FORA'}</Text>
                <Text style={styles.detailTitle}>{selectedOpponent?.name ?? 'Adversário'}</Text>
                <Text style={styles.detailDate}>{formatFixtureDate(selectedFixture, career.season)}</Text>
              </View>
              <View style={[styles.detailType,{ backgroundColor: selectedIsHome ? HOME_COLOR : AWAY_COLOR }]}>
                <Text style={[styles.detailTypeText,{ color: selectedIsHome ? '#07150D' : '#FFFFFF' }]}>{selectedIsHome ? 'C' : 'F'}</Text>
              </View>
            </View>

            {selectedResult ? (
              <View style={styles.finalResult}>
                <Text style={styles.finalLabel}>RESULTADO FINAL</Text>
                <Text style={styles.finalScore}>{getClub(selectedFixture.homeClubId)?.initials} {selectedResult.homeGoals} × {selectedResult.awayGoals} {getClub(selectedFixture.awayClubId)?.initials}</Text>
              </View>
            ) : (
              <View style={styles.scheduledBox}>
                <Feather name={selectedIsCurrent ? 'clock' : 'calendar'} size={16} color="#79EF91" />
                <View>
                  <Text style={styles.scheduledTitle}>{selectedIsCurrent ? 'PRÓXIMA PARTIDA' : 'PARTIDA AGENDADA'}</Text>
                  <Text style={styles.scheduledText}>O início da partida agora fica na página principal.</Text>
                </View>
              </View>
            )}
          </Panel>
        ) : (
          <Panel style={styles.emptyDetail}>
            <Feather name="calendar" size={20} color="#789080" />
            <Text style={styles.emptyDetailText}>Toque em um dia com jogo para ver os detalhes da partida.</Text>
          </Panel>
        )}

        <Panel style={styles.seasonProgress}>
          <View>
            <Text style={styles.progressLabel}>TEMPORADA {year}</Text>
            <Text style={styles.progressValue}>Rodada {Math.min(career.roundIndex + 1, leagueRounds)} de {leagueRounds}</Text>
          </View>
          <Text style={styles.progressMeta}>{division?.name ?? 'Liga nacional'} · jogos da fase atual</Text>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  calendarPanel: { padding: 10, gap: 10, backgroundColor: '#0B2117', borderColor: '#2C503D' },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  navButton: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426', borderWidth: 1, borderColor: '#356A4A' },
  navButtonDisabled: { backgroundColor: '#0D1B13', borderColor: '#1D3125' },
  monthTitleBox: { flex: 1, alignItems: 'center' },
  calendarLabel: { color: '#A2B6A8', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  monthTitle: { color: '#79EF91', fontSize: 25, fontWeight: '900', letterSpacing: 0.2, marginTop: 1 },
  yearTitle: { color: '#F5F7F5', fontSize: 10, fontWeight: '900', marginTop: 1 },
  weekHeader: { flexDirection: 'row', gap: 3 },
  weekHeaderText: { flex: 1, color: '#98AB9F', fontSize: 6.2, fontWeight: '900', textAlign: 'center' },
  calendarGrid: { gap: 3 },
  weekRow: { flexDirection: 'row', gap: 3 },
  dayCell: { flex: 1, minWidth: 0, aspectRatio: 0.86, borderRadius: 6, borderWidth: 1, borderColor: '#294536', padding: 4, position: 'relative', overflow: 'hidden' },
  dayCellBlank: { opacity: 0.22, backgroundColor: '#08140D', borderColor: '#14271B' },
  dayCellGame: { borderColor: 'rgba(255,255,255,0.28)' },
  dayCellCurrent: { borderWidth: 2, borderColor: '#FFFFFF' },
  dayCellToday: { borderWidth: 2, borderColor: '#79ef91' },
  dayCellSelected: { transform: [{ scale: 0.97 }] },
  dayNumber: { color: '#D7E2DA', fontSize: 8.5, fontWeight: '900' },
  fixtureCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 26 },
  opponentInitials: { fontSize: 9.5, fontWeight: '900' },
  homeAwayTag: { fontSize: 5.4, fontWeight: '900', marginTop: 1 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 },
  cellScore: { fontSize: 7.2, fontWeight: '900' },
  outcomeDot: { width: 6, height: 6, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' },
  outcomeWin: { backgroundColor: '#18C964' },
  outcomeDraw: { backgroundColor: '#F5B942' },
  outcomeLoss: { backgroundColor: '#EF4444' },
  nextBadge: { alignSelf: 'center', paddingHorizontal: 3, paddingVertical: 2, borderRadius: 4, backgroundColor: '#07150D' },
  nextBadgeText: { color: '#79EF91', fontSize: 4.7, fontWeight: '900' },
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendColor: { width: 18, height: 8, borderRadius: 2 },
  legendText: { color: '#D9E5DC', fontSize: 6.5, fontWeight: '900' },
  resultLegend: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  resultLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultDot: { width: 6, height: 6, borderRadius: 99 },
  resultLegendText: { color: '#7F9586', fontSize: 6.2, fontWeight: '800' },
  matchDetail: { gap: 10, backgroundColor: '#10291D', borderColor: '#2C503D' },
  detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailKicker: { color: '#79EF91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  detailTitle: { color: '#F5F7F5', fontSize: 15, fontWeight: '900', marginTop: 3 },
  detailDate: { color: '#879C8E', fontSize: 7.5, marginTop: 2, textTransform: 'capitalize' },
  detailType: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailTypeText: { fontSize: 14, fontWeight: '900' },
  finalResult: { padding: 10, borderRadius: 9, backgroundColor: '#0B2117', borderWidth: 1, borderColor: '#2C503D' },
  finalLabel: { color: '#829789', fontSize: 6.5, fontWeight: '900' },
  finalScore: { color: '#F5F7F5', fontSize: 15, fontWeight: '900', marginTop: 3 },
  scheduledBox: { minHeight: 42, borderRadius: 9, backgroundColor: '#0B2117', borderWidth: 1, borderColor: '#2C503D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  scheduledTitle: { color: '#79EF91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  scheduledText: { color: '#A7B8AD', fontSize: 8, fontWeight: '800', marginTop: 2 },
  emptyDetail: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#10291D', borderColor: '#2C503D' },
  emptyDetailText: { color: '#879C8E', fontSize: 8, textAlign: 'center' },
  seasonProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#10291D', borderColor: '#2C503D' },
  progressLabel: { color: '#79EF91', fontSize: 6.5, fontWeight: '900' },
  progressValue: { color: '#F5F7F5', fontSize: 10, fontWeight: '900', marginTop: 2 },
  progressMeta: { color: '#829789', fontSize: 7, fontWeight: '800', textAlign: 'right' },
});