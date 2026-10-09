import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { calculateCareerStandings, getCareerDivision } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

function zoneFor(position: number, total: number, divisionId?: string, promotionPlaces = 0, relegationPlaces = 0) {
  if (divisionId === 'br-a') {
    if (position > total - 4) return { label: 'REBAIXAMENTO', tone: 'down' as const };
    return null;
  }
  if (divisionId === 'br-b') {
    if (position <= 2) return { label: 'ACESSO DIRETO', tone: 'up' as const };
    if (position <= 6) return { label: 'PLAYOFF', tone: 'playoff' as const };
    if (position > total - 4) return { label: 'REBAIXAMENTO', tone: 'down' as const };
    return null;
  }
  if (divisionId === 'br-c') {
    if (position <= 8) return { label: '2ª FASE', tone: 'up' as const };
    if (position > total - 2) return { label: 'REBAIXAMENTO', tone: 'down' as const };
    return null;
  }
  if (divisionId === 'br-d') {
    if (position <= 4) return { label: 'MATA-MATA', tone: 'up' as const };
    return null;
  }
  if (promotionPlaces > 0 && position <= promotionPlaces) return { label: 'ACESSO', tone: 'up' as const };
  if (relegationPlaces > 0 && position > total - relegationPlaces) return { label: 'REBAIXAMENTO', tone: 'down' as const };
  return null;
}

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
            const zone = zoneFor(index + 1, standings.length, career.divisionId, division?.promotionPlaces ?? 0, division?.relegationPlaces ?? 0);
            return (
              <View
                key={row.club.id}
                style={[
                  styles.row,
                  zone?.tone === 'up' && styles.zoneUp,
                  zone?.tone === 'playoff' && styles.zonePlayoff,
                  zone?.tone === 'down' && styles.zoneDown,
                  own && styles.ownRow,
                ]}
              >
                <Text style={[styles.pos, styles.posText, own && styles.ownText]}>{index + 1}º</Text>
                <View style={styles.club}>
                  <Text numberOfLines={1} style={[styles.clubName, own && styles.ownText]}>{row.club.name}</Text>
                  {zone ? <Text style={[
                    styles.zoneLabel,
                    zone.tone === 'up' && styles.zoneLabelUp,
                    zone.tone === 'playoff' && styles.zoneLabelPlayoff,
                    zone.tone === 'down' && styles.zoneLabelDown,
                  ]}>{zone.label}</Text> : null}
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
        <View style={styles.zoneLegend}>
          {career.divisionId === 'br-b' ? <>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotUp]} /><Text style={styles.legendItemText}>1º–2º acesso direto</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotPlayoff]} /><Text style={styles.legendItemText}>3º–6º playoff</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotDown]} /><Text style={styles.legendItemText}>4 últimos rebaixados</Text></View>
          </> : career.divisionId === 'br-c' ? <>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotUp]} /><Text style={styles.legendItemText}>G8 avança aos quadrangulares</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotDown]} /><Text style={styles.legendItemText}>2 últimos rebaixados</Text></View>
          </> : career.divisionId === 'br-d' ? <>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotUp]} /><Text style={styles.legendItemText}>4 melhores do grupo avançam</Text></View>
          </> : null}
        </View>
        <Text style={styles.legend}>{division?.note ?? 'Critérios: pontos, saldo de gols e gols marcados.'}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  table: { padding: 0, overflow: 'hidden' },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: '#173326' },
  head: { color: '#8ea595', fontSize: 9, fontWeight: '900' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231', borderLeftWidth: 3, borderLeftColor: 'transparent' },
  zoneUp: { borderLeftColor: '#79ef91' },
  zonePlayoff: { borderLeftColor: '#e9c46a' },
  zoneDown: { borderLeftColor: '#ff7a7a' },
  ownRow: { backgroundColor: '#153426' },
  ownText: { color: '#79ef91' },
  pos: { width: 36 },
  posText: { color: '#dce8df', fontSize: 11, fontWeight: '900' },
  club: { flex: 1, paddingRight: 5 },
  clubName: { color: '#f5f7f5', fontSize: 11, fontWeight: '800' },
  zoneLabel: { fontSize: 5.8, fontWeight: '900', letterSpacing: 0.45, marginTop: 2 },
  zoneLabelUp: { color: '#79ef91' },
  zoneLabelPlayoff: { color: '#e9c46a' },
  zoneLabelDown: { color: '#ff8a8a' },
  num: { width: 28, textAlign: 'center' },
  sg: { width: 34, textAlign: 'center' },
  pts: { width: 42, textAlign: 'right' },
  cell: { color: '#b9c8be', fontSize: 10 },
  points: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  zoneLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 99 },
  legendDotUp: { backgroundColor: '#79ef91' },
  legendDotPlayoff: { backgroundColor: '#e9c46a' },
  legendDotDown: { backgroundColor: '#ff7a7a' },
  legendItemText: { color: '#9fb2a5', fontSize: 6.8, fontWeight: '800' },
  legend: { color: '#839a8a', fontSize: 9, textAlign: 'center', lineHeight: 14 },
});
