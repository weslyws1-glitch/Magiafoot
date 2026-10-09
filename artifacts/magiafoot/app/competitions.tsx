import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClubBadge, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { buildContinentalSeedPool } from '@/game/data';
import { calculateCareerStandings, getCareerDivision, getLeagueRoundCount } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function CompetitionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Competições" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para disputar competições.</Text></Screen></>;
  }

  const standings = calculateCareerStandings(career);
  const division = getCareerDivision(career);
  const leagueRounds = Math.max(1, getLeagueRoundCount(career));
  const position = standings.findIndex((row) => row.club.id === career.clubId) + 1;
  const points = standings.find((row) => row.club.id === career.clubId)?.points ?? 0;
  const progress = Math.min(100, Math.round((career.roundIndex / leagueRounds) * 100));
  const continentalPool = buildContinentalSeedPool(32);
  const continentalCountries = new Set(continentalPool.map((club) => club.country)).size;

  return (
    <>
      <GameHeader title="Competições" eyebrow="Temporada 2026" />
      <Screen>
        <Pressable onPress={() => router.push('/league')} style={styles.card}>
          <View style={styles.trophy}><Feather name="award" size={28} color="#79ef91" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{division?.name ?? 'Liga nacional'}</Text>
            <Text style={styles.meta}>Liga nacional · {leagueRounds} rodadas da fase atual</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: (progress + '%') as any }]} /></View>
            <Text style={styles.progressText}>Rodada {career.roundIndex + 1} · {position}º lugar · {points} pts</Text>
          </View>
        </Pressable>

        <Panel style={styles.locked}>
          <Feather name="git-branch" size={22} color="#79ef91" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedTitle}>Formato 2026</Text>
            <Text style={styles.lockedText}>{division?.note ?? 'A competição segue o formato cadastrado para esta divisão.'}</Text>
          </View>
        </Panel>

        <Panel style={styles.continental}>
          <View style={styles.continentalTop}>
            <View style={styles.continentalIcon}><Feather name="globe" size={22} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockedTitle}>Copa Continental · Base CONMEBOL</Text>
              <Text style={styles.lockedText}>{continentalPool.length} clubes-semente de {continentalCountries} países já fazem parte do universo. A classificação esportiva e o mata-mata serão a próxima camada.</Text>
            </View>
          </View>
          <View style={styles.clubPreview}>
            {continentalPool.slice(0, 6).map((club) => (
              <View key={club.id} style={styles.previewClub}>
                <ClubBadge clubId={club.id} size={30} />
                <Text numberOfLines={1} style={styles.previewName}>{club.name}</Text>
              </View>
            ))}
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
  continental: { gap: 12, backgroundColor: '#10291d', borderColor: '#356a4a' },
  continentalTop: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  continentalIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426' },
  clubPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  previewClub: { width: '31.5%', minHeight: 66, borderRadius: 10, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#284837', alignItems: 'center', justifyContent: 'center', padding: 5, gap: 4 },
  previewName: { color: '#b9c8be', fontSize: 6.5, fontWeight: '800', textAlign: 'center', maxWidth: '100%' },
  lockedTitle: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  lockedText: { color: '#9fb2a5', fontSize: 11, marginTop: 4, lineHeight: 16 },
});
