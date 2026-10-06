import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { CLUBS, getClub } from '@/game/data';
import { effectiveStrength, getCurrentFixture } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

type Shortcut = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
};

const SHORTCUTS: Shortcut[] = [
  { label: 'Elenco', icon: 'users', route: '/squad' },
  { label: 'Táticas', icon: 'cpu', route: '/tactics' },
  { label: 'Jogos', icon: 'calendar', route: '/calendar' },
  { label: 'Classificação', icon: 'columns', route: '/league' },
  { label: 'Mercado', icon: 'search', route: '/market' },
  { label: 'Finanças', icon: 'dollar-sign', route: '/finances' },
  { label: 'Estádio', icon: 'home', route: '/stadium' },
  { label: 'Notícias', icon: 'file-text', route: '/news' },
  { label: 'Competições', icon: 'award', route: '/competitions' },
  { label: 'Carreira', icon: 'briefcase', route: '/career' },
];

function getPositionAndPoints(career: NonNullable<ReturnType<typeof useCareer>['career']>) {
  const table = CLUBS.map((club) => ({ clubId: club.id, points: 0, gd: 0 }));
  for (const result of career.results) {
    const home = table.find((item) => item.clubId === result.homeClubId);
    const away = table.find((item) => item.clubId === result.awayClubId);
    if (!home || !away) continue;

    home.gd += result.homeGoals - result.awayGoals;
    away.gd += result.awayGoals - result.homeGoals;

    if (result.homeGoals > result.awayGoals) home.points += 3;
    else if (result.awayGoals > result.homeGoals) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  table.sort((a, b) => b.points - a.points || b.gd - a.gd);
  const index = table.findIndex((row) => row.clubId === career.clubId);
  return {
    position: index >= 0 ? index + 1 : 1,
    points: table.find((row) => row.clubId === career.clubId)?.points ?? 0,
  };
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { career, isReady } = useCareer();

  const dashboard = useMemo(() => {
    if (!career) return null;
    const club = getClub(career.clubId);
    const fixture = getCurrentFixture(career);
    const nextOpponentId = fixture
      ? fixture.homeClubId === career.clubId
        ? fixture.awayClubId
        : fixture.homeClubId
      : undefined;
    const nextOpponent = nextOpponentId ? getClub(nextOpponentId) : undefined;
    const squad = [...career.players]
      .sort((a, b) => {
        const posOrder = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];
        return posOrder.indexOf(a.position) - posOrder.indexOf(b.position) || b.strength - a.strength;
      });

    return {
      club,
      nextOpponent,
      fixture,
      squad,
      table: getPositionAndPoints(career),
    };
  }, [career]);

  if (!isReady) {
    return (
      <Screen style={[styles.loading, { paddingTop: insets.top + 24 }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando carreira…</Text>
      </Screen>
    );
  }

  if (!career || !dashboard) {
    return (
      <Screen style={{ paddingTop: insets.top + (Platform.OS === 'web' ? 28 : 16) }}>
        <View style={styles.brandLine}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>MAGIA<Text style={{ color: '#76f08f' }}>FOOT</Text></Text>
          <Text style={[styles.seasonLine, { color: colors.mutedForeground }]}>Manager de futebol</Text>
        </View>
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sua carreira começa aqui.</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Crie seu clube e assuma o comando do MagiaFoot.</Text>
          <Pressable onPress={() => router.push('/new-career')} style={[styles.playButton, { backgroundColor: '#7df28e' }]}>
            <Feather name="play" size={18} color="#07150d" />
            <Text style={styles.playButtonText}>NOVA CARREIRA</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const currentRound = career.roundIndex + 1;

  return (
    <Screen style={[styles.page, { paddingTop: insets.top + (Platform.OS === 'web' ? 24 : 14), backgroundColor: '#07150d' }]}>
      <View style={styles.headerBlock}>
        <Text style={styles.brandName}>MAGIA<Text style={{ color: '#76f08f' }}>FOOT</Text></Text>
        <Text style={styles.seasonLine}>{2026 + career.season - 1} • 3ª Divisão • Rodada {currentRound}</Text>
      </View>

      <View style={styles.shortcutGrid}>
        {SHORTCUTS.map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.route as never)} style={styles.shortcutCard}>
            <Feather name={item.icon} size={26} color="#79ef91" />
            <Text style={styles.shortcutLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.lowerGrid}>
        <View style={[styles.panel, styles.squadPanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderTitle}>PLANTEL</Text>
            <Text style={styles.panelHeaderMeta}>{career.players.length} jogadores</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.colPos, styles.tableHeaderText]}>POS</Text>
            <Text style={[styles.colName, styles.tableHeaderText]}>JOGADOR</Text>
            <Text style={[styles.colAge, styles.tableHeaderText]}>IDADE</Text>
            <Text style={[styles.colFor, styles.tableHeaderText]}>FOR</Text>
          </View>
          <ScrollView style={styles.squadScroll} nestedScrollEnabled showsVerticalScrollIndicator>
            {dashboard.squad.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <Text style={[styles.colPos, styles.playerText]}>{player.position}</Text>
                <Text numberOfLines={1} style={[styles.colName, styles.playerName]}>{player.name}</Text>
                <Text style={[styles.colAge, styles.playerText]}>{player.age}</Text>
                <Text style={[styles.colFor, styles.playerRating]}>{effectiveStrength(player)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sideColumn}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderTitle}>PRÓXIMO JOGO</Text>
            </View>
            <View style={styles.nextGameBody}>
              <Text style={styles.nextTeam}>{dashboard.club?.name ?? 'Seu clube'}</Text>
              <Text style={styles.versus}>×</Text>
              <Text style={styles.nextTeam}>{dashboard.nextOpponent?.name ?? 'Adversário'}</Text>
              <Text style={styles.roundLabel}>Rodada {currentRound}</Text>
              <Pressable
                onPress={() => router.push(career.liveMatch ? '/match' : '/match')}
                style={styles.playButton}
              >
                <Feather name="play" size={20} color="#07150d" />
                <Text style={styles.playButtonText}>{career.liveMatch ? 'CONTINUAR' : 'JOGAR'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderTitle}>SITUAÇÃO</Text>
            </View>
            <View style={styles.situationGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Posição</Text>
                <Text style={styles.statValue}>{dashboard.table.position}º</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Pontos</Text>
                <Text style={styles.statValue}>{dashboard.table.points}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, paddingHorizontal: 20, paddingBottom: 34 },
  loading: { alignItems: 'center', justifyContent: 'center', minHeight: 420 },
  loadingText: { marginTop: 10, fontSize: 12 },
  headerBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#234334' },
  brandLine: { gap: 8, marginBottom: 12 },
  brandName: { color: '#f3f7f3', fontSize: 37, lineHeight: 40, fontWeight: '900', letterSpacing: -1.5 },
  seasonLine: { color: '#9fb2a5', fontSize: 18, fontWeight: '500', marginTop: 4 },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  shortcutCard: {
    width: '19%',
    minHeight: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#264937',
    backgroundColor: '#153426',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  shortcutLabel: { color: '#f2f6f3', fontSize: 8.5, lineHeight: 11, fontWeight: '800', textAlign: 'center' },
  lowerGrid: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c503d',
    backgroundColor: '#0b2117',
    overflow: 'hidden',
  },
  squadPanel: { flex: 1.7, minWidth: 0, maxHeight: 520 },
  squadScroll: { maxHeight: 420 },
  sideColumn: { flex: 0.95, minWidth: 0, gap: 8 },
  panelHeader: {
    minHeight: 46,
    backgroundColor: '#29563a',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelHeaderTitle: { color: '#f5f7f5', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  panelHeaderMeta: { color: '#b9cbbf', fontSize: 9, fontWeight: '700' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 8, minHeight: 34, alignItems: 'center', backgroundColor: '#10291d' },
  tableHeaderText: { color: '#91aa99', fontSize: 12, fontWeight: '700' },
  playerRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1d3b2a' },
  playerText: { color: '#e7efe9', fontSize: 9 },
  playerName: { color: '#f4f7f5', fontSize: 9, fontWeight: '800' },
  playerRating: { color: '#6ff08d', fontSize: 9, fontWeight: '900' },
  colPos: { width: 28 },
  colName: { flex: 1 },
  colAge: { width: 34, textAlign: 'center' },
  colFor: { width: 28, textAlign: 'right' },
  nextGameBody: { alignItems: 'center', padding: 12, gap: 6 },
  nextTeam: { color: '#f5f7f5', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  versus: { color: '#6f8b78', fontSize: 16, fontWeight: '700' },
  roundLabel: { color: '#9fb2a5', fontSize: 10, marginTop: 3 },
  playButton: {
    marginTop: 8,
    minHeight: 46,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#7df28e',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
  },
  playButtonText: { color: '#07150d', fontSize: 11, fontWeight: '900' },
  situationGrid: { flexDirection: 'row', gap: 5, padding: 8 },
  statBox: { flex: 1, minHeight: 72, borderRadius: 18, borderWidth: 1, borderColor: '#294536', justifyContent: 'center', padding: 8 },
  statLabel: { color: '#a8b8ae', fontSize: 9, marginBottom: 5 },
  statValue: { color: '#f6f8f6', fontSize: 18, fontWeight: '900' },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  emptyTitle: { fontSize: 22, fontWeight: '900' },
  emptyText: { fontSize: 14, lineHeight: 20 },
});
