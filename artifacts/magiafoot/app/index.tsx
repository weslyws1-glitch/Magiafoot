import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { calculateStandings, formatFixtureDate, getCurrentFixture, seasonYear } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

type Shortcut = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
};

const SHORTCUTS: Shortcut[] = [
  { label: 'Elenco', icon: 'users', route: '/squad' },
  { label: 'Táticas', icon: 'cpu', route: '/tactics' },
  { label: 'Calendário', icon: 'calendar', route: '/calendar' },
  { label: 'Classificação', icon: 'columns', route: '/league' },
  { label: 'Mercado', icon: 'search', route: '/market' },
  { label: 'Finanças', icon: 'dollar-sign', route: '/finances' },
  { label: 'Infraestrutura', icon: 'home', route: '/stadium' },
  { label: 'Notícias', icon: 'file-text', route: '/news' },
  { label: 'Competições', icon: 'award', route: '/competitions' },
  { label: 'Carreira', icon: 'briefcase', route: '/career' },
];

function trustLabel(value: number) {
  if (value >= 85) return 'Excelente';
  if (value >= 70) return 'Muito boa';
  if (value >= 55) return 'Boa';
  if (value >= 40) return 'Pressão';
  return 'Crítica';
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { career, isReady, startCurrentMatch } = useCareer();

  const dashboard = useMemo(() => {
    if (!career) return null;

    const club = getClub(career.clubId);
    const fixture = getCurrentFixture(career);
    const homeClub = fixture ? getClub(fixture.homeClubId) : undefined;
    const awayClub = fixture ? getClub(fixture.awayClubId) : undefined;
    const standings = calculateStandings(career.results);
    const userIndex = standings.findIndex((row) => row.club.id === career.clubId);
    const start = Math.max(0, userIndex - 2);
    const end = Math.min(standings.length, userIndex + 3);
    const nearbyStandings = standings.slice(start, end);

    return {
      club,
      fixture,
      homeClub,
      awayClub,
      standings,
      userIndex,
      nearbyStandings,
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
          <View style={styles.brandTopRow}>
            <Text style={[styles.brandName, { color: colors.foreground }]}>MAGIA<Text style={{ color: '#76f08f' }}>FOOT</Text></Text>
            <Pressable onPress={() => router.push('/account-save' as never)} style={styles.accountAccess}>
              <Feather name="shield" size={16} color="#79ef91" />
              <Text style={styles.accountAccessText}>CONTA</Text>
            </Pressable>
          </View>
          <Text style={[styles.seasonLine, { color: colors.mutedForeground }]}>Manager de futebol</Text>
        </View>
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sua carreira começa aqui.</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Crie seu clube e assuma o comando do MagiaFoot.</Text>
          <Pressable onPress={() => router.push('/new-career')} style={styles.playButton}>
            <Feather name="play" size={18} color="#07150d" />
            <Text style={styles.playButtonText}>NOVA CARREIRA</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const currentRound = Math.min(career.roundIndex + 1, dashboard.standings.length * 2 - 2);
  const openMatch = () => {
    if (!dashboard.fixture) return;
    if (!career.liveMatch) startCurrentMatch();
    router.push('/match');
  };
  const isHome = dashboard.fixture?.homeClubId === career.clubId;
  const opponent = dashboard.fixture
    ? getClub(isHome ? dashboard.fixture.awayClubId : dashboard.fixture.homeClubId)
    : undefined;

  return (
    <Screen style={[styles.page, { paddingTop: insets.top + (Platform.OS === 'web' ? 24 : 14), backgroundColor: '#07150d' }]}>
      <View style={styles.headerBlock}>
        <View style={styles.brandTopRow}>
          <Text style={styles.brandName}>MAGIA<Text style={{ color: '#76f08f' }}>FOOT</Text></Text>
          <Pressable onPress={() => router.push('/account-save' as never)} style={styles.accountAccess}>
            <Feather name="shield" size={16} color="#79ef91" />
            <Text style={styles.accountAccessText}>CONTA</Text>
          </Pressable>
        </View>
        <Text style={styles.seasonLine}>{seasonYear(career.season)} • 3ª Divisão • Rodada {currentRound}</Text>
      </View>

      <View style={styles.shortcutGrid}>
        {SHORTCUTS.map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.route as never)} style={styles.shortcutCard}>
            <Feather name={item.icon} size={25} color="#79ef91" />
            <Text style={styles.shortcutLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.trustGrid}>
        <View style={styles.trustCard}>
          <View style={styles.trustTop}>
            <View style={styles.trustIcon}><Feather name="users" size={19} color="#79ef91" /></View>
            <View style={styles.trustTextBox}>
              <Text style={styles.trustLabel}>SATISFAÇÃO DA TORCIDA</Text>
              <Text style={styles.trustStatus}>{trustLabel(career.fanTrust)}</Text>
            </View>
            <Text style={styles.trustValue}>{career.fanTrust}%</Text>
          </View>
          <View style={styles.trustTrack}><View style={[styles.trustFill,{ width: (career.fanTrust + '%') as any }]} /></View>
        </View>

        <View style={styles.trustCard}>
          <View style={styles.trustTop}>
            <View style={styles.trustIcon}><Feather name="briefcase" size={19} color="#79ef91" /></View>
            <View style={styles.trustTextBox}>
              <Text style={styles.trustLabel}>SATISFAÇÃO DA DIRETORIA</Text>
              <Text style={styles.trustStatus}>{trustLabel(career.boardTrust)}</Text>
            </View>
            <Text style={styles.trustValue}>{career.boardTrust}%</Text>
          </View>
          <View style={styles.trustTrack}><View style={[styles.trustFill,{ width: (career.boardTrust + '%') as any }]} /></View>
        </View>
      </View>

      <View style={styles.nextMatchPanel}>
        <View style={styles.nextMatchHeader}>
          <View>
            <Text style={styles.nextMatchKicker}>PRÓXIMO JOGO</Text>
            <Text style={styles.nextMatchCompetition}>3ª Divisão • Rodada {currentRound}</Text>
          </View>
          <View style={[styles.homeAwayBadge, isHome ? styles.homeBadge : styles.awayBadge]}>
            <Text style={[styles.homeAwayText, !isHome && styles.awayText]}>{isHome ? 'CASA' : 'FORA'}</Text>
          </View>
        </View>

        {dashboard.fixture ? (
          <>
            <View style={styles.matchTeams}>
              <View style={styles.teamSide}>
                <View style={[styles.clubBadge,{ backgroundColor: dashboard.homeClub?.color ?? '#234334' }]}>
                  <Text style={styles.clubInitials}>{dashboard.homeClub?.initials ?? 'CAS'}</Text>
                </View>
                <Text style={styles.teamName}>{dashboard.homeClub?.name ?? 'Mandante'}</Text>
                <Text style={styles.teamRole}>MANDANTE</Text>
              </View>

              <View style={styles.matchCenter}>
                <Text style={styles.matchVs}>×</Text>
                <Text style={styles.matchDate}>{formatFixtureDate(dashboard.fixture, career.season)}</Text>
                <Text style={styles.matchRound}>Liga nacional</Text>
              </View>

              <View style={styles.teamSide}>
                <View style={[styles.clubBadge,{ backgroundColor: dashboard.awayClub?.color ?? '#234334' }]}>
                  <Text style={styles.clubInitials}>{dashboard.awayClub?.initials ?? 'FOR'}</Text>
                </View>
                <Text style={styles.teamName}>{dashboard.awayClub?.name ?? 'Visitante'}</Text>
                <Text style={styles.teamRole}>VISITANTE</Text>
              </View>
            </View>

            <View style={styles.matchDetails}>
              <View style={styles.matchDetailItem}>
                <Text style={styles.matchDetailLabel}>SEU ADVERSÁRIO</Text>
                <Text style={styles.matchDetailValue}>{opponent?.name ?? 'Adversário'}</Text>
              </View>
              <View style={styles.matchDetailItem}>
                <Text style={styles.matchDetailLabel}>MANDO</Text>
                <Text style={styles.matchDetailValue}>{isHome ? 'Em casa' : 'Fora de casa'}</Text>
              </View>
              <View style={styles.matchDetailItem}>
                <Text style={styles.matchDetailLabel}>SITUAÇÃO</Text>
                <Text style={styles.matchDetailValue}>{career.liveMatch ? 'Em andamento' : 'Agendado'}</Text>
              </View>
            </View>

            <Pressable onPress={openMatch} style={styles.playButton}>
              <Feather name="play" size={20} color="#07150d" />
              <Text style={styles.playButtonText}>{career.liveMatch ? 'CONTINUAR PARTIDA' : 'INICIAR PARTIDA'}</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.noMatch}>
            <Feather name="check-circle" size={24} color="#79ef91" />
            <Text style={styles.noMatchTitle}>Temporada concluída</Text>
            <Text style={styles.noMatchText}>Não há outra partida agendada nesta temporada.</Text>
          </View>
        )}
      </View>

      <View style={styles.classificationPanel}>
        <View style={styles.classificationHeader}>
          <View>
            <Text style={styles.classificationKicker}>CLASSIFICAÇÃO</Text>
            <Text style={styles.classificationTitle}>Sua posição na tabela</Text>
          </View>
          <Pressable onPress={() => router.push('/league')} style={styles.openTableButton}>
            <Text style={styles.openTableText}>VER TABELA</Text>
            <Feather name="chevron-right" size={14} color="#79ef91" />
          </Pressable>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeadText,styles.colRank]}>POS</Text>
          <Text style={[styles.tableHeadText,styles.colClub]}>CLUBE</Text>
          <Text style={[styles.tableHeadText,styles.colPlayed]}>J</Text>
          <Text style={[styles.tableHeadText,styles.colPoints]}>PTS</Text>
        </View>

        {dashboard.nearbyStandings.map((row) => {
          const absolutePosition = dashboard.standings.findIndex((item) => item.club.id === row.club.id) + 1;
          const isUser = row.club.id === career.clubId;
          return (
            <View key={row.club.id} style={[styles.tableRow,isUser && styles.tableRowUser]}>
              <Text style={[styles.rankText,styles.colRank,isUser && styles.userText]}>{absolutePosition}º</Text>
              <View style={styles.colClub}>
                <Text numberOfLines={1} style={[styles.clubNameText,isUser && styles.userText]}>{row.club.name}</Text>
                {isUser ? <Text style={styles.youLabel}>SEU CLUBE</Text> : null}
              </View>
              <Text style={[styles.rowText,styles.colPlayed,isUser && styles.userText]}>{row.played}</Text>
              <Text style={[styles.pointsText,styles.colPoints,isUser && styles.userText]}>{row.points}</Text>
            </View>
          );
        })}
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
  brandTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  accountAccess: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#315f3f', backgroundColor: '#10291d', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  accountAccessText: { color: '#79ef91', fontSize: 7.2, fontWeight: '900', letterSpacing: 0.6 },
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
  trustGrid: { flexDirection: 'row', gap: 8 },
  trustCard: { flex: 1, padding: 11, borderRadius: 15, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#0b2117', gap: 9 },
  trustTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426' },
  trustTextBox: { flex: 1, minWidth: 0 },
  trustLabel: { color: '#88a190', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.5 },
  trustStatus: { color: '#f5f7f5', fontSize: 9, fontWeight: '900', marginTop: 2 },
  trustValue: { color: '#79ef91', fontSize: 15, fontWeight: '900' },
  trustTrack: { height: 7, borderRadius: 99, overflow: 'hidden', backgroundColor: '#07150d' },
  trustFill: { height: '100%', backgroundColor: '#79ef91' },
  nextMatchPanel: { padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#356247', backgroundColor: '#10291d', gap: 13 },
  nextMatchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nextMatchKicker: { color: '#79ef91', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  nextMatchCompetition: { color: '#f5f7f5', fontSize: 13, fontWeight: '900', marginTop: 3 },
  homeAwayBadge: { minWidth: 58, minHeight: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  homeBadge: { backgroundColor: '#79ef91' },
  awayBadge: { backgroundColor: '#356cf1' },
  homeAwayText: { color: '#07150d', fontSize: 7.5, fontWeight: '900' },
  awayText: { color: '#ffffff' },
  matchTeams: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  teamSide: { flex: 1, alignItems: 'center', minWidth: 0 },
  clubBadge: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  clubInitials: { color: '#fff', fontSize: 14, fontWeight: '900' },
  teamName: { color: '#f5f7f5', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  teamRole: { color: '#809587', fontSize: 6, fontWeight: '900', marginTop: 2 },
  matchCenter: { width: 86, alignItems: 'center' },
  matchVs: { color: '#79ef91', fontSize: 24, fontWeight: '900' },
  matchDate: { color: '#dbe6de', fontSize: 7.2, fontWeight: '800', textAlign: 'center', marginTop: 2, textTransform: 'capitalize' },
  matchRound: { color: '#73887b', fontSize: 6.2, marginTop: 2 },
  matchDetails: { flexDirection: 'row', gap: 6 },
  matchDetailItem: { flex: 1, minHeight: 56, borderRadius: 10, padding: 8, justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#294536' },
  matchDetailLabel: { color: '#789080', fontSize: 5.7, fontWeight: '900' },
  matchDetailValue: { color: '#f5f7f5', fontSize: 7.5, fontWeight: '900', marginTop: 3 },
  playButton: { minHeight: 48, width: '100%', borderRadius: 15, backgroundColor: '#7df28e', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 18 },
  playButtonText: { color: '#07150d', fontSize: 10.5, fontWeight: '900' },
  noMatch: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 6 },
  noMatchTitle: { color: '#f5f7f5', fontSize: 15, fontWeight: '900' },
  noMatchText: { color: '#829789', fontSize: 8, textAlign: 'center' },
  classificationPanel: { borderRadius: 18, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#0b2117', overflow: 'hidden' },
  classificationHeader: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#153426' },
  classificationKicker: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  classificationTitle: { color: '#f5f7f5', fontSize: 12, fontWeight: '900', marginTop: 2 },
  openTableButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  openTableText: { color: '#79ef91', fontSize: 6.5, fontWeight: '900' },
  tableHeader: { minHeight: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c1d14' },
  tableHeadText: { color: '#718779', fontSize: 6.3, fontWeight: '900' },
  tableRow: { minHeight: 43, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#24412f' },
  tableRowUser: { backgroundColor: '#173b28', borderLeftWidth: 3, borderLeftColor: '#79ef91' },
  colRank: { width: 36 },
  colClub: { flex: 1, minWidth: 0 },
  colPlayed: { width: 32, textAlign: 'center' },
  colPoints: { width: 38, textAlign: 'right' },
  rankText: { color: '#cbd8cf', fontSize: 8.5, fontWeight: '900' },
  clubNameText: { color: '#f5f7f5', fontSize: 8.5, fontWeight: '800' },
  youLabel: { color: '#79ef91', fontSize: 5.3, fontWeight: '900', marginTop: 1 },
  rowText: { color: '#9caf9f', fontSize: 8, fontWeight: '800' },
  pointsText: { color: '#f5f7f5', fontSize: 9, fontWeight: '900' },
  userText: { color: '#ffffff' },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  emptyTitle: { fontSize: 22, fontWeight: '900' },
  emptyText: { fontSize: 14, lineHeight: 20 },
});