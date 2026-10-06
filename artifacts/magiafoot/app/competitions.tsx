import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { calculateStandings, LEAGUE_ROUNDS } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function CompetitionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Competições" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para disputar competições.</Text></Screen></>;
  }

  const standings = calculateStandings(career.results);
  const position = standings.findIndex((row) => row.club.id === career.clubId) + 1;
  const points = standings.find((row) => row.club.id === career.clubId)?.points ?? 0;
  const progress = Math.min(100, Math.round((career.roundIndex / LEAGUE_ROUNDS) * 100));

  return (
    <>
      <GameHeader title="Competições" eyebrow="Temporada 2026" />
      <Screen>
        <Pressable onPress={() => router.push('/league')} style={styles.card}>
          <View style={styles.trophy}><Feather name="award" size={28} color="#79ef91" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>3ª Divisão</Text>
            <Text style={styles.meta}>Liga nacional · {LEAGUE_ROUNDS} rodadas</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: progress + '%' }]} /></View>
            <Text style={styles.progressText}>Rodada {career.roundIndex + 1} · {position}º lugar · {points} pts</Text>
          </View>
        </Pressable>

        <Panel style={styles.locked}>
          <Feather name="lock" size={22} color="#6f8b78" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedTitle}>Copa MagiaFoot</Text>
            <Text style={styles.lockedText}>Será liberada em uma próxima fase do desenvolvimento.</Text>
          </View>
        </Panel>

        <Panel style={styles.locked}>
          <Feather name="lock" size={22} color="#6f8b78" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedTitle}>Copa Continental</Text>
            <Text style={styles.lockedText}>Classifique o clube para futuras competições internacionais.</Text>
          </View>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#356a4a', borderRadius: 18, backgroundColor: '#153426', padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  trophy: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  name: { color: '#f5f7f5', fontSize: 20, fontWeight: '900' },
  meta: { color: '#9fb2a5', fontSize: 11, marginTop: 4 },
  progressTrack: { height: 7, borderRadius: 5, overflow: 'hidden', backgroundColor: '#0b2117', marginTop: 13 },
  progressFill: { height: '100%', backgroundColor: '#79ef91' },
  progressText: { color: '#c7d4cb', fontSize: 11, marginTop: 8, fontWeight: '700' },
  locked: { flexDirection: 'row', gap: 12, alignItems: 'center', opacity: 0.75 },
  lockedTitle: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  lockedText: { color: '#9fb2a5', fontSize: 11, marginTop: 4, lineHeight: 16 },
});
