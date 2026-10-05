import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClubBadge, GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { calculateStandings, getCurrentLeaguePosition } from '@/game/engine';
import { LEAGUE_NAME } from '@/game/data';
import { LEAGUE_ROUNDS } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function LeagueScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career } = useCareer();
  if (!career) {
    return <><GameHeader title="Classificação" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }
  const standings = calculateStandings(career.results);
  const position = getCurrentLeaguePosition(career);

  return (
    <>
      <GameHeader title="Classificação" eyebrow={LEAGUE_NAME.toUpperCase()} />
      <Screen>
        <Panel style={styles.summary}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}><Feather name="award" size={20} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{career.season}ª temporada · {LEAGUE_NAME}</Text>
            <Text style={[styles.summarySub, { color: colors.mutedForeground }]}>{career.roundIndex} de {LEAGUE_ROUNDS} rodadas disputadas</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.positionValue, { color: colors.primary }]}>{position || '—'}º</Text>
            <Text style={[styles.positionLabel, { color: colors.mutedForeground }]}>SEU CLUBE</Text>
          </View>
        </Panel>

        <SectionLabel title="Tabela geral" action={<Text style={[styles.liveLabel, { color: colors.mutedForeground }]}>PONTOS · SALDO · GOLS</Text>} />
        <Panel style={styles.tablePanel}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderNumber, { color: colors.mutedForeground }]}>#</Text>
            <Text style={[styles.tableHeaderClub, { color: colors.mutedForeground }]}>CLUBE</Text>
            <Text style={[styles.tableHeaderNumber, { color: colors.mutedForeground }]}>PJ</Text>
            <Text style={[styles.tableHeaderNumber, { color: colors.mutedForeground }]}>V</Text>
            <Text style={[styles.tableHeaderNumber, { color: colors.mutedForeground }]}>SG</Text>
            <Text style={[styles.tableHeaderPoints, { color: colors.mutedForeground }]}>PTS</Text>
          </View>
          {standings.map((row, index) => {
            const selected = row.club.id === career.clubId;
            const goalDifference = row.goalsFor - row.goalsAgainst;
            return (
              <View key={row.club.id} style={[
                styles.tableRow,
                { borderBottomColor: colors.border, backgroundColor: selected ? colors.secondary : 'transparent' },
              ]}>
                <View style={styles.rank}>
                  <Text style={[styles.rankText, { color: index < 3 ? colors.primary : colors.mutedForeground }]}>{index + 1}</Text>
                </View>
                <View style={styles.clubCell}>
                  <ClubBadge clubId={row.club.id} size={29} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={[styles.clubText, { color: selected ? colors.primary : colors.foreground }]}>{row.club.name}</Text>
                    <Text style={[styles.clubSub, { color: colors.mutedForeground }]}>{row.wins}V · {row.draws}E · {row.losses}D</Text>
                  </View>
                </View>
                <Text style={[styles.numberCell, { color: colors.mutedForeground }]}>{row.played}</Text>
                <Text style={[styles.numberCell, { color: colors.mutedForeground }]}>{row.wins}</Text>
                <Text style={[styles.numberCell, { color: goalDifference > 0 ? colors.primary : colors.mutedForeground }]}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</Text>
                <Text style={[styles.pointsCell, { color: selected ? colors.primary : colors.foreground }]}>{row.points}</Text>
              </View>
            );
          })}
        </Panel>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          A tabela é atualizada depois de cada rodada. Os resultados dos outros clubes também são simulados.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
  summaryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 12, fontWeight: '800' },
  summarySub: { fontSize: 10, marginTop: 4 },
  positionValue: { fontSize: 19, fontWeight: '900' },
  positionLabel: { fontSize: 7, letterSpacing: 0.5, fontWeight: '900', marginTop: 1 },
  liveLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  tablePanel: { paddingHorizontal: 8, paddingVertical: 4 },
  tableHeader: { minHeight: 29, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingHorizontal: 4 },
  tableHeaderNumber: { width: 25, textAlign: 'center', fontSize: 8, fontWeight: '800' },
  tableHeaderClub: { flex: 1, fontSize: 8, fontWeight: '800', paddingLeft: 5 },
  tableHeaderPoints: { width: 29, textAlign: 'center', fontSize: 8, fontWeight: '900' },
  tableRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, borderRadius: 7 },
  rank: { width: 25, alignItems: 'center' },
  rankText: { fontSize: 10, fontWeight: '800' },
  clubCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 3 },
  clubText: { fontSize: 9, fontWeight: '800' },
  clubSub: { fontSize: 7, marginTop: 2 },
  numberCell: { width: 25, textAlign: 'center', fontSize: 9, fontWeight: '600' },
  pointsCell: { width: 29, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 9, paddingBottom: 8 },
});
