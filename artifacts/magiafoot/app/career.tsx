import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameHeader, Panel, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { calculateCareerStandings, getCareerDivision, getLeagueRoundCount } from '@/game/engine';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function CareerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career } = useCareer();

  if (!career) {
    return (
      <>
        <GameHeader title="Carreira" />
        <Screen>
          <Text style={{ color: colors.foreground }}>Crie uma carreira para começar.</Text>
        </Screen>
      </>
    );
  }

  const club = getClub(career.clubId);
  const standings = calculateCareerStandings(career);
  const leagueRounds = Math.max(1, getLeagueRoundCount(career));
  const division = getCareerDivision(career);
  const position = standings.findIndex((row) => row.club.id === career.clubId) + 1;
  const wins = career.results.filter((r) =>
    (r.homeClubId === career.clubId && r.homeGoals > r.awayGoals) ||
    (r.awayClubId === career.clubId && r.awayGoals > r.homeGoals)
  ).length;
  const draws = career.results.filter((r) =>
    r.homeGoals === r.awayGoals &&
    (r.homeClubId === career.clubId || r.awayClubId === career.clubId)
  ).length;
  const losses = career.results.length - wins - draws;

  return (
    <>
      <GameHeader title="Carreira" eyebrow={career.coachName} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.avatar}>
            <Feather name="user" size={28} color="#79ef91" />
          </View>
          <Text style={styles.coach}>{career.coachName}</Text>
          <Text style={styles.club}>{club?.name ?? 'Clube'} · {division?.name ?? 'Liga'} · Temporada {career.season}</Text>
          <View style={styles.trust}>
            <Text style={styles.trustLabel}>Confiança da diretoria</Text>
            <Text style={styles.trustValue}>{career.boardTrust}%</Text>
          </View>
        </Panel>

        <View style={styles.grid}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>POSIÇÃO</Text><Text style={styles.metricValue}>{position > 0 ? position + 'º' : '—'}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>RODADA</Text><Text style={styles.metricValue}>{Math.min(career.roundIndex + 1, leagueRounds)}/{leagueRounds}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>VITÓRIAS</Text><Text style={styles.metricValue}>{wins}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>EMPATES</Text><Text style={styles.metricValue}>{draws}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>DERROTAS</Text><Text style={styles.metricValue}>{losses}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CAIXA</Text><Text style={styles.metricValueSmall}>{formatCurrency(career.balance)}</Text></Panel>
        </View>

        <Pressable onPress={() => router.push('/new-career')} style={styles.newCareer}>
          <Feather name="plus-circle" size={18} color="#79ef91" />
          <View style={{ flex: 1 }}>
            <Text style={styles.newCareerTitle}>Nova carreira</Text>
            <Text style={styles.newCareerText}>Começar de novo substituirá o salvamento atual após confirmação.</Text>
          </View>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 7, paddingVertical: 24, backgroundColor: '#153426', borderColor: '#356a4a' },
  avatar: { width: 62, height: 62, borderRadius: 18, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center' },
  coach: { color: '#f5f7f5', fontSize: 21, fontWeight: '900', marginTop: 4 },
  club: { color: '#9fb2a5', fontSize: 11 },
  trust: { marginTop: 8, width: '100%', borderTopWidth: 1, borderTopColor: '#2c503d', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  trustLabel: { color: '#b7c7bd', fontSize: 11, fontWeight: '700' },
  trustValue: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 96, justifyContent: 'center', gap: 7 },
  metricLabel: { color: '#90a898', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  metricValue: { color: '#f5f7f5', fontSize: 24, fontWeight: '900' },
  metricValueSmall: { color: '#f5f7f5', fontSize: 15, fontWeight: '900' },
  newCareer: { borderWidth: 1, borderColor: '#2c503d', borderRadius: 18, backgroundColor: '#0b2117', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  newCareerTitle: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  newCareerText: { color: '#9fb2a5', fontSize: 10, lineHeight: 15, marginTop: 3 },
});
