import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CompetitionCard, PageTitle, SectionHeading } from '@/components/FootballUI';
import { competitions, matches } from '@/data/football';
import { useColors } from '@/hooks/useColors';

export default function TournamentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 8);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: Platform.OS === 'web' ? 110 : 34 }]}
      showsVerticalScrollIndicator={false}
    >
      <PageTitle eyebrow="No radar" title="Campeonatos" description="Explore competições e abra a agenda de cada torneio." />
      <View style={[styles.featured, { backgroundColor: colors.accent }]}>
        <View style={[styles.featuredIcon, { backgroundColor: 'rgba(20,34,26,0.1)' }]}>
          <Feather name="award" size={23} color={colors.accentForeground} />
        </View>
        <Text style={[styles.featuredEyebrow, { color: colors.accentForeground }]}>DAQUI E DO MUNDO</Text>
        <Text style={[styles.featuredTitle, { color: colors.accentForeground }]}>Uma temporada.{'\n'}Muitas histórias.</Text>
        <Text style={[styles.featuredCopy, { color: colors.accentForeground }]}>Encontre os jogos de cada competição num só lugar.</Text>
      </View>

      <SectionHeading title="Em destaque" />
      {competitions.map((competition) => {
        const matchCount = matches.filter((match) => match.competitionId === competition.id).length;
        return (
          <CompetitionCard
            key={competition.id}
            competition={{ ...competition, teamCount: `${matchCount} ${matchCount === 1 ? 'jogo' : 'jogos'} na agenda` }}
            onPress={() => router.push({ pathname: '/matches', params: { competition: competition.id } })}
          />
        );
      })}

      <View style={[styles.note, { backgroundColor: colors.secondary }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
          Esta versão usa confrontos ilustrativos. Calendários oficiais e classificações ainda não estão conectados.
        </Text>
      </View>
      <Pressable onPress={() => router.push('/matches')} style={({ pressed }) => [styles.allMatches, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
        <Text style={[styles.allMatchesText, { color: colors.foreground }]}>Abrir todas as partidas</Text>
        <Feather name="arrow-right" size={17} color={colors.primary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  featured: { borderRadius: 25, padding: 21, marginBottom: 21, overflow: 'hidden' },
  featuredIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  featuredEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  featuredTitle: { fontSize: 25, fontWeight: '800', lineHeight: 29, letterSpacing: -0.6, marginTop: 6 },
  featuredCopy: { fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 260, opacity: 0.8 },
  note: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 14, marginTop: 6 },
  noteText: { fontSize: 11, lineHeight: 16, fontWeight: '600', flex: 1 },
  allMatches: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  allMatchesText: { fontSize: 13, fontWeight: '700' },
});
