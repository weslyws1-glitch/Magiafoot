import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { LEAGUE_FIXTURES, LEAGUE_ROUNDS, getCurrentFixture } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, startCurrentMatch } = useCareer();
  const [selectedRound, setSelectedRound] = useState(career?.roundIndex ?? 0);
  if (!career) {
    return <><GameHeader title="Calendário" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }
  const round = Math.min(Math.max(selectedRound, 0), LEAGUE_ROUNDS - 1);
  const fixtures = LEAGUE_FIXTURES.filter((fixture) => fixture.roundIndex === round);
  const currentFixture = getCurrentFixture(career);
  const hasCurrentMatch = currentFixture?.roundIndex === round;

  const enterMatch = () => {
    if (!currentFixture) return;
    if (!career.liveMatch) startCurrentMatch();
    router.push('/match');
  };

  return (
    <>
      <GameHeader title="Calendário" eyebrow="TEMPORADA FICTÍCIA" />
      <Screen>
        <Panel style={styles.roundSummary}>
          <View style={[styles.calendarIcon, { backgroundColor: colors.accent }]}><Feather name="calendar" size={19} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roundHeading, { color: colors.foreground }]}>Rodada {round + 1}</Text>
            <Text style={[styles.roundCaption, { color: colors.mutedForeground }]}>4 partidas · turno {round < 7 ? 'de ida' : 'de volta'}</Text>
          </View>
          {hasCurrentMatch ? <View style={[styles.nextTag, { backgroundColor: colors.secondary }]}><Text style={[styles.nextTagText, { color: colors.primary }]}>SEU JOGO</Text></View> : null}
        </Panel>

        <SectionLabel title="Escolha a rodada" action={<Text style={[styles.roundCount, { color: colors.mutedForeground }]}>{LEAGUE_ROUNDS} RODADAS</Text>} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roundChips}>
          {Array.from({ length: LEAGUE_ROUNDS }, (_, index) => (
            <Pressable
              key={index}
              onPress={() => setSelectedRound(index)}
              style={[styles.roundChip, { backgroundColor: round === index ? colors.primary : colors.card, borderColor: round === index ? colors.primary : colors.border }]}
            >
              <Text style={[styles.roundChipText, { color: round === index ? colors.primaryForeground : colors.foreground }]}>{index + 1}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Panel style={styles.fixturesPanel}>
          {fixtures.map((fixture) => {
            const home = getClub(fixture.homeClubId);
            const away = getClub(fixture.awayClubId);
            const result = career.results.find((item) => item.id === fixture.id);
            const myGame = fixture.homeClubId === career.clubId || fixture.awayClubId === career.clubId;
            const isCurrent = currentFixture?.id === fixture.id;
            const score = result ? `${result.homeGoals}  :  ${result.awayGoals}` : isCurrent ? 'VS' : '—';
            return (
              <Pressable
                key={fixture.id}
                disabled={!isCurrent}
                onPress={enterMatch}
                style={({ pressed }) => [
                  styles.fixtureRow,
                  { borderBottomColor: colors.border, backgroundColor: myGame ? colors.secondary : 'transparent', opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <View style={[styles.fixtureTeam, { alignItems: 'flex-start' }]}>
                  <View style={[styles.clubInitials, { backgroundColor: home?.color ?? colors.primary }]}><Text style={[styles.initialsText, { color: colors.inverse }]}>{home?.initials}</Text></View>
                  <Text numberOfLines={1} style={[styles.fixtureTeamName, { color: colors.foreground }]}>{home?.name}</Text>
                </View>
                <View style={styles.fixtureCenter}>
                  <Text style={[styles.fixtureScore, { color: result ? colors.foreground : isCurrent ? colors.primary : colors.mutedForeground }]}>{score}</Text>
                  <Text style={[styles.fixtureStatus, { color: colors.mutedForeground }]}>{result ? 'FINAL' : isCurrent ? career.liveMatch ? 'RETOMAR' : 'JOGAR' : 'AGUARDANDO'}</Text>
                </View>
                <View style={[styles.fixtureTeam, { alignItems: 'flex-end' }]}>
                  <Text numberOfLines={1} style={[styles.fixtureTeamName, { color: colors.foreground }]}>{away?.name}</Text>
                  <View style={[styles.clubInitials, { backgroundColor: away?.color ?? colors.primary }]}><Text style={[styles.initialsText, { color: colors.inverse }]}>{away?.initials}</Text></View>
                </View>
              </Pressable>
            );
          })}
        </Panel>
        {hasCurrentMatch && currentFixture ? (
          <GameButton label={career.liveMatch ? 'Retomar sua partida' : 'Jogar sua partida'} icon="play" onPress={enterMatch} />
        ) : null}
        <Text style={[styles.calendarNote, { color: colors.mutedForeground }]}>Toque no seu jogo para acompanhar os 90 minutos. Os outros placares são simulados.</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  roundSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  roundHeading: { fontSize: 15, fontWeight: '900' },
  roundCaption: { fontSize: 10, marginTop: 3 },
  nextTag: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  nextTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  roundCount: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  roundChips: { flexDirection: 'row', gap: 7, paddingBottom: 3 },
  roundChip: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundChipText: { fontSize: 11, fontWeight: '900' },
  fixturesPanel: { paddingVertical: 3, paddingHorizontal: 9 },
  fixtureRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingHorizontal: 6, gap: 6 },
  fixtureTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  clubInitials: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 7, fontWeight: '900' },
  fixtureTeamName: { fontSize: 8, fontWeight: '700', flexShrink: 1 },
  fixtureCenter: { width: 59, alignItems: 'center', gap: 3 },
  fixtureScore: { fontSize: 11, fontWeight: '900' },
  fixtureStatus: { fontSize: 6, fontWeight: '800', letterSpacing: 0.45 },
  calendarNote: { fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 7 },
});
