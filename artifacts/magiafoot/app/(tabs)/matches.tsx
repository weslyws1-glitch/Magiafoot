import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MatchCard, PageTitle } from '@/components/FootballUI';
import { useAppState } from '@/context/AppState';
import { competitions, getTeam, matches, type Match } from '@/data/football';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MatchFilter = 'todos' | 'meus';

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ competition?: string }>();
  const { followedTeamIds, savedMatchIds, toggleSavedMatch } = useAppState();
  const [competitionOverride, setCompetitionOverride] = useState<{ forParam: string | null; value: string | null } | null>(null);
  const routeCompetition = typeof params.competition === 'string' ? params.competition : null;
  const activeCompetition = competitionOverride?.forParam === routeCompetition
    ? competitionOverride.value
    : routeCompetition;
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('todos');
  const [search, setSearch] = useState('');
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 8);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (activeCompetition && match.competitionId !== activeCompetition) return false;
      if (matchFilter === 'meus' && !followedTeamIds.some((id) => match.homeTeamId === id || match.awayTeamId === id)) return false;
      const competition = competitions.find((item) => item.id === match.competitionId);
      const query = search.trim().toLocaleLowerCase('pt-BR');
      if (!query) return true;
      const home = getTeam(match.homeTeamId)?.name.toLocaleLowerCase('pt-BR') ?? '';
      const away = getTeam(match.awayTeamId)?.name.toLocaleLowerCase('pt-BR') ?? '';
      return home.includes(query) || away.includes(query) || competition?.name.toLocaleLowerCase('pt-BR').includes(query);
    });
  }, [activeCompetition, followedTeamIds, matchFilter, search]);

  const dateOffsets = [...new Set(filteredMatches.map((match) => match.dayOffset))];
  const groupedMatches = dateOffsets.map((offset) => ({
    offset,
    games: filteredMatches.filter((match) => match.dayOffset === offset),
  }));

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: Platform.OS === 'web' ? 110 : 34 }]}
      data={groupedMatches}
      keyExtractor={(item) => String(item.offset)}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <PageTitle eyebrow="Agenda" title="Partidas" description="Encontre jogos e salve os confrontos que quer acompanhar." />
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Time ou campeonato"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.foreground }]}
              accessibilityLabel="Buscar time ou campeonato"
            />
            {search.length ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Limpar busca">
                <Feather name="x" size={17} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.filterRow}>
            {(['todos', 'meus'] as MatchFilter[]).map((filter) => {
              const active = filter === matchFilter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => {
                    setMatchFilter(filter);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [styles.filterPill, { backgroundColor: active ? colors.primary : colors.secondary, opacity: pressed ? 0.8 : 1 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.filterPillText, { color: active ? colors.primaryForeground : colors.secondaryForeground }]}>
                    {filter === 'todos' ? 'Todos os jogos' : 'Meus times'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.competitionFilters}>
            <CompetitionChip label="Todos" active={!activeCompetition} onPress={() => setCompetitionOverride({ forParam: routeCompetition, value: null })} />
            {competitions.map((competition) => (
              <CompetitionChip key={competition.id} label={competition.name} active={activeCompetition === competition.id} onPress={() => setCompetitionOverride({ forParam: routeCompetition, value: competition.id })} />
            ))}
          </ScrollView>
          <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.secondaryForeground }]}>Confrontos e horários ilustrativos, não são dados ao vivo.</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View>
          <Text style={[styles.dateHeading, { color: colors.foreground }]}>{dateLabel(item.offset)}</Text>
          {item.games.map((match: Match) => (
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
        </View>
      )}
      ListEmptyComponent={
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="calendar" size={22} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum jogo encontrado</Text>
          <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Tente outra busca ou siga um time para filtrar a agenda.</Text>
        </View>
      }
    />
  );
}

function dateLabel(dayOffset: number) {
  if (dayOffset === 0) return 'Hoje';
  if (dayOffset === 1) return 'Amanhã';
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function CompetitionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.competitionChip, { backgroundColor: active ? colors.accent : colors.card, borderColor: active ? colors.accent : colors.border, opacity: pressed ? 0.74 : 1 }]}
    >
      <Text style={[styles.competitionChipText, { color: active ? colors.accentForeground : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, flexGrow: 1 },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 13 },
  filterPill: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  filterPillText: { fontSize: 12, fontWeight: '700' },
  competitionFilters: { gap: 7, paddingBottom: 10 },
  competitionChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  competitionChipText: { fontSize: 11, fontWeight: '700' },
  notice: { borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 14 },
  noticeText: { fontSize: 11, fontWeight: '600', flex: 1 },
  dateHeading: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 9, textTransform: 'capitalize' },
  empty: { minHeight: 175, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, padding: 22, marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 11 },
  emptyCopy: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 5 },
});
