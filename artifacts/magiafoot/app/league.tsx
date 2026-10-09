import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { calculateCareerStandings, getCareerDivision } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function LeagueScreen() {
  const colors = useColors();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Classificação" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para acompanhar a liga.</Text></Screen></>;
  }

  const standings = calculateCareerStandings(career);
  const division = getCareerDivision(career);

  return (
    <>
      <GameHeader title="Classificação" eyebrow={(division?.shortName ?? division?.name ?? 'LIGA').toUpperCase()} />
      <Screen>
        <Panel style={styles.table}>
          <View style={styles.header}>
            <Text style={[styles.pos, styles.head]}>#</Text>
            <Text style={[styles.club, styles.head]}>CLUBE</Text>
            <Text style={[styles.num, styles.head]}>J</Text>
            <Text style={[styles.num, styles.head]}>V</Text>
            <Text style={[styles.num, styles.head]}>E</Text>
            <Text style={[styles.num, styles.head]}>D</Text>
            <Text style={[styles.sg, styles.head]}>SG</Text>
            <Text style={[styles.pts, styles.head]}>PTS</Text>
          </View>
          {standings.map((row, index) => {
            const own = row.club.id === career.clubId;
            return (
              <View key={row.club.id} style={[styles.row, own && styles.ownRow]}>
                <Text style={[styles.pos, styles.posText, own && styles.ownText]}>{index + 1}º</Text>
                <View style={styles.club}>
                  <Text numberOfLines={1} style={[styles.clubName, own && styles.ownText]}>{row.club.name}</Text>
                </View>
                <Text style={[styles.num, styles.cell]}>{row.played}</Text>
                <Text style={[styles.num, styles.cell]}>{row.wins}</Text>
                <Text style={[styles.num, styles.cell]}>{row.draws}</Text>
                <Text style={[styles.num, styles.cell]}>{row.losses}</Text>
                <Text style={[styles.sg, styles.cell]}>{row.goalsFor - row.goalsAgainst}</Text>
                <Text style={[styles.pts, styles.points, own && styles.ownText]}>{row.points}</Text>
              </View>
            );
          })}
        </Panel>
        <Text style={styles.legend}>{division?.note ?? 'Critérios: pontos, saldo de gols e gols marcados.'}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  table: { padding: 0, overflow: 'hidden' },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: '#173326' },
  head: { color: '#8ea595', fontSize: 9, fontWeight: '900' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  ownRow: { backgroundColor: '#153426' },
  ownText: { color: '#79ef91' },
  pos: { width: 36 },
  posText: { color: '#dce8df', fontSize: 11, fontWeight: '900' },
  club: { flex: 1, paddingRight: 5 },
  clubName: { color: '#f5f7f5', fontSize: 11, fontWeight: '800' },
  num: { width: 28, textAlign: 'center' },
  sg: { width: 34, textAlign: 'center' },
  pts: { width: 42, textAlign: 'right' },
  cell: { color: '#b9c8be', fontSize: 10 },
  points: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  legend: { color: '#839a8a', fontSize: 9, textAlign: 'center', lineHeight: 14 },
});
