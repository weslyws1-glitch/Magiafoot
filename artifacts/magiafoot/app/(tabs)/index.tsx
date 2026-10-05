import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BrandHeader, EmptyState, MatchCard, SectionHeading, TeamMark } from '@/components/FootballUI';
import { useAppState } from '@/context/AppState';
import { competitions, getTeam, matches } from '@/data/football';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { followedTeamIds, savedMatchIds, toggleFollowedTeam, toggleSavedMatch } = useAppState();
  const followedTeams = followedTeamIds.map(getTeam).filter((team) => team !== undefined);
  const nextMatches = matches.slice(0, 3);
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 8);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: Platform.OS === 'web' ? 112 : 34 }]}
      showsVerticalScrollIndicator={false}
    >
      <BrandHeader subtitle="Seu futebol, no mesmo lugar" />

      <LinearGradient colors={['#153d2a', '#0d2419']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.welcomeCard}>
        <View style={styles.welcomeOrb} />
        <View style={styles.welcomeCopy}>
          <View style={styles.welcomeTag}>
            <Feather name="zap" size={12} color={colors.accentForeground} />
            <Text style={[styles.welcomeTagText, { color: colors.accentForeground }]}>A BOLA É SUA</Text>
          </View>
          <Text style={styles.welcomeTitle}>A paixão pelo{'\n'}jogo começa aqui.</Text>
          <Text style={styles.welcomeDescription}>Times, partidas e campeonatos que você acompanha.</Text>
          <Pressable
            onPress={() => router.push('/teams')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.welcomeButton, { backgroundColor: colors.accent, opacity: pressed ? 0.84 : 1 }]}
          >
            <Text style={[styles.welcomeButtonText, { color: colors.accentForeground }]}>Escolher meus times</Text>
            <Feather name="arrow-up-right" size={16} color={colors.accentForeground} />
          </Pressable>
        </View>
        <View style={styles.heroBall}>
          <Feather name="target" size={72} color={colors.accent} />
        </View>
      </LinearGradient>

      <View style={[styles.demoNotice, { backgroundColor: colors.secondary }]}>
        <Feather name="info" size={15} color={colors.primary} />
        <Text style={[styles.demoNoticeText, { color: colors.secondaryForeground }]}>Agenda de demonstração · sem placares ao vivo</Text>
      </View>

      <SectionHeading title="Próximos jogos" actionLabel="Ver agenda" onAction={() => router.push('/matches')} />
      {nextMatches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          saved={savedMatchIds.includes(match.id)}
          onToggleSaved={() => {
            toggleSavedMatch(match.id);
            void Haptics.selectionAsync();
          }}
        />
      ))}

      <SectionHeading title="Meus times" actionLabel={followedTeams.length ? 'Editar' : 'Encontrar'} onAction={() => router.push('/teams')} />
      {followedTeams.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.followedTeams}>
          {followedTeams.map((team) => (
            <Pressable
              key={team.id}
              onPress={() => {
                toggleFollowedTeam(team.id);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [styles.followedTeam, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
            >
              <TeamMark team={team} size={42} />
              <Text numberOfLines={1} style={[styles.followedTeamName, { color: colors.foreground }]}>{team.shortName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <EmptyState title="Sua torcida tem lugar aqui" description="Siga seus times para encontrar os jogos deles mais rápido." />
      )}

      <SectionHeading title="Campeonatos" actionLabel="Explorar" onAction={() => router.push('/tournaments')} />
      <View style={styles.competitionPills}>
        {competitions.slice(0, 3).map((competition) => (
          <Pressable
            key={competition.id}
            onPress={() => router.push({ pathname: '/matches', params: { competition: competition.id } })}
            style={({ pressed }) => [styles.competitionPill, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
          >
            <Text style={[styles.competitionPillText, { color: colors.foreground }]}>{competition.name}</Text>
            <Feather name="arrow-up-right" size={14} color={colors.primary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  welcomeCard: { minHeight: 258, borderRadius: 28, padding: 21, marginBottom: 14, overflow: 'hidden', justifyContent: 'center' },
  welcomeCopy: { width: '77%', zIndex: 1 },
  welcomeTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: '#d9f36a', borderRadius: 16, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 15 },
  welcomeTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  welcomeTitle: { fontSize: 27, lineHeight: 31, color: '#f4f6f0', fontWeight: '800', letterSpacing: -0.8 },
  welcomeDescription: { color: '#c7d8c9', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 230 },
  welcomeButton: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start', marginTop: 17 },
  welcomeButtonText: { fontSize: 12, fontWeight: '800' },
  welcomeOrb: { position: 'absolute', width: 205, height: 205, borderRadius: 103, backgroundColor: 'rgba(128,199,90,0.09)', right: -66, top: 18 },
  heroBall: { position: 'absolute', right: 14, top: 81, width: 94, height: 94, borderRadius: 47, backgroundColor: 'rgba(217,243,106,0.09)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  demoNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginBottom: 17 },
  demoNoticeText: { fontSize: 11, fontWeight: '600', flex: 1 },
  followedTeams: { gap: 10, paddingBottom: 5 },
  followedTeam: { width: 75, minHeight: 92, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 7 },
  followedTeamName: { fontSize: 11, fontWeight: '800' },
  competitionPills: { gap: 9, marginBottom: 12 },
  competitionPill: { borderWidth: 1, borderRadius: 15, minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  competitionPillText: { fontSize: 13, fontWeight: '600' },
});
