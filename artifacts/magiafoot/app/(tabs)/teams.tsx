import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PageTitle, TeamRow } from '@/components/FootballUI';
import { useAppState } from '@/context/AppState';
import { teams, type Team } from '@/data/football';
import { useColors } from '@/hooks/useColors';

export default function TeamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { followedTeamIds, toggleFollowedTeam } = useAppState();
  const [search, setSearch] = useState('');
  const [followingOnly, setFollowingOnly] = useState(false);
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 8);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return teams.filter((team) => {
      if (followingOnly && !followedTeamIds.includes(team.id)) return false;
      return !query || team.name.toLocaleLowerCase('pt-BR').includes(query) || team.city.toLocaleLowerCase('pt-BR').includes(query);
    });
  }, [followedTeamIds, followingOnly, search]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: Platform.OS === 'web' ? 110 : 34 }]}
      data={filteredTeams}
      keyExtractor={(team) => team.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <PageTitle eyebrow="Sua torcida" title="Times" description="Siga seus clubes para deixar a agenda com a sua cara." />
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar time ou cidade"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.foreground }]}
              accessibilityLabel="Buscar time ou cidade"
            />
            {search.length ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Limpar busca">
                <Feather name="x" size={17} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFollowingOnly((current) => !current)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.followingFilter, { backgroundColor: followingOnly ? colors.primary : colors.secondary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="star" size={14} color={followingOnly ? colors.primaryForeground : colors.primary} />
            <Text style={[styles.followingFilterText, { color: followingOnly ? colors.primaryForeground : colors.secondaryForeground }]}>
              {followingOnly ? 'Exibindo meus times' : `Meus times${followedTeamIds.length ? ` · ${followedTeamIds.length}` : ''}`}
            </Text>
          </Pressable>
          <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>{filteredTeams.length} CLUBES</Text>
        </View>
      }
      renderItem={({ item }: { item: Team }) => (
        <TeamRow
          team={item}
          following={followedTeamIds.includes(item.id)}
          onToggle={() => {
            toggleFollowedTeam(item.id);
            void Haptics.selectionAsync();
          }}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <EmptyState title={followingOnly ? 'Você ainda não segue times' : 'Nenhum time encontrado'} description={followingOnly ? 'Volte para a lista e escolha os seus favoritos.' : 'Tente procurar pelo nome do clube ou cidade.'} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, flexGrow: 1 },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9, marginBottom: 11 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  followingFilter: { minHeight: 38, borderRadius: 19, paddingHorizontal: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7 },
  followingFilterText: { fontSize: 12, fontWeight: '700' },
  listLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginTop: 18, marginBottom: 3 },
  emptyWrap: { marginTop: 10 },
});
