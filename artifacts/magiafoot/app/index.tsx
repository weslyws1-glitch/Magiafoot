import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClubBadge, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import {
  calculateCareerStandings,
  formatFixtureDate,
  getCareerDivision,
  getCurrentFixture,
  getLeagueRoundCount,
  seasonYear,
} from '@/game/engine';
import type { CareerNewsItem } from '@/game/types';
import { useColors } from '@/hooks/useColors';

const NEWS_IMAGES = {
  match: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=82',
  market: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1000&q=82',
  club: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1000&q=82',
  sponsor: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=82',
  competition: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1000&q=82',
} as const;

const NEWS_LABELS = {
  match: 'DESTAQUE',
  market: 'MERCADO',
  club: 'BASTIDORES',
  sponsor: 'NEGÓCIOS',
} as const;

const BOTTOM_NAV = [
  { label: 'Início', icon: 'home', route: '/' },
  { label: 'Calendário', icon: 'calendar', route: '/calendar' },
  { label: 'Equipe', icon: 'users', route: '/squad' },
  { label: 'Táticas', icon: 'share-2', route: '/tactics' },
  { label: 'Mercado', icon: 'repeat', route: '/market' },
  { label: 'Finanças', icon: 'database', route: '/finances' },
  { label: 'Competições', icon: 'award', route: '/competitions' },
  { label: 'Mais', icon: 'more-horizontal', route: '/club' },
] as const;

function newsImage(item?: CareerNewsItem | null) {
  const key = item?.visualKey ?? (item?.category === 'market' ? 'market' : item?.category === 'sponsor' ? 'sponsor' : item?.category === 'club' ? 'club' : 'match');
  return NEWS_IMAGES[key];
}

function newsLabel(item?: CareerNewsItem | null) {
  if (!item) return 'JORNAL';
  if (item.visualKey === 'competition') return 'COMPETIÇÃO';
  return NEWS_LABELS[item.category] ?? 'JORNAL';
}

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
    const standings = calculateCareerStandings(career);
    const userIndex = standings.findIndex((row) => row.club.id === career.clubId);
    const nearbyStandings = standings.slice(0, Math.min(4, standings.length));
    const clubResults = career.results.filter((result) => result.homeClubId === career.clubId || result.awayClubId === career.clubId);

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    for (const result of clubResults) {
      const home = result.homeClubId === career.clubId;
      const gf = home ? result.homeGoals : result.awayGoals;
      const ga = home ? result.awayGoals : result.homeGoals;
      goalsFor += gf;
      goalsAgainst += ga;
      if (gf > ga) wins += 1;
      else if (gf === ga) draws += 1;
      else losses += 1;
    }

    return {
      club,
      fixture,
      homeClub,
      awayClub,
      standings,
      userIndex,
      nearbyStandings,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
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
        <View style={styles.brandTopRow}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>MAGIA<Text style={styles.brandGreen}>FOOT</Text></Text>
          <Pressable onPress={() => router.push('/account-save' as never)} style={styles.accountButton}>
            <Feather name="user" size={16} color="#79ef91" />
            <Text style={styles.accountButtonText}>CONTA</Text>
          </Pressable>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sua carreira começa aqui.</Text>
          <Text style={styles.emptyText}>Escolha um espaço de carreira para assumir um clube.</Text>
          <Pressable onPress={() => router.replace('/career-slots')} style={styles.primaryButton}>
            <Feather name="grid" size={17} color="#07150d" />
            <Text style={styles.primaryButtonText}>ESCOLHER CARREIRA</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const division = getCareerDivision(career);
  const totalRounds = Math.max(1, getLeagueRoundCount(career));
  const currentRound = Math.min(career.roundIndex + 1, totalRounds);
  const position = dashboard.userIndex >= 0 ? dashboard.userIndex + 1 : 0;
  const isHome = dashboard.fixture?.homeClubId === career.clubId;
  const mainStory = career.newsFeed?.[0] ?? null;
  const storyTitle = mainStory?.title ?? (career.lastNews || (dashboard.club?.name ?? 'Seu clube') + ' inicia uma nova fase');
  const storyBody = mainStory?.body ?? 'O Jornal do MagiaFoot acompanha cada rodada, bastidores, mercado e decisões da sua carreira.';
  const smallStories = (career.newsFeed ?? []).slice(1, 5);
  const games = dashboard.wins + dashboard.draws + dashboard.losses;
  const maxPoints = games * 3;
  const pointsWon = dashboard.wins * 3 + dashboard.draws;
  const efficiency = maxPoints ? Math.round((pointsWon / maxPoints) * 100) : 0;
  const transferBudget = career.finance?.transferBudget ?? 0;
  const seasonIncome =
    (career.finance?.seasonMatchdayIncome ?? 0)
    + (career.finance?.seasonSponsorshipIncome ?? 0)
    + (career.finance?.seasonTransferIncome ?? 0);
  const seasonExpenses =
    (career.finance?.seasonWagesPaid ?? 0)
    + (career.finance?.seasonTransferSpend ?? 0);

  const openMatch = () => {
    if (!dashboard.fixture) return;
    if (!career.liveMatch) startCurrentMatch();
    router.push('/match');
  };

  return (
    <View style={styles.root}>
      <Screen
        style={[
          styles.page,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 10),
            paddingBottom: Math.max(insets.bottom + 106, 118),
          },
        ]}
      >
        <View style={styles.topHeader}>
          <View style={styles.topHeaderMainRow}>
            <View style={styles.logoArea}>
              <Text style={styles.brandName}>MAGIA<Text style={styles.brandGreen}>FOOT</Text></Text>
              <Text style={styles.brandTagline}>SEU FUTEBOL, SUAS HISTÓRIAS</Text>
            </View>

            <Pressable onPress={() => router.push('/account-save' as never)} style={styles.accountButton}>
              <Feather name="user" size={16} color="#79ef91" />
              <Text style={styles.accountButtonText}>CONTA</Text>
            </Pressable>
          </View>

          <View style={styles.topHeaderMetaRow}>
            <View style={styles.clubIdentity}>
              <ClubBadge clubId={career.clubId} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.clubIdentityName}>{dashboard.club?.name ?? 'Clube'}</Text>
                <Text numberOfLines={1} style={styles.clubIdentityMeta}>{division?.name ?? 'Liga'} · {position ? position + 'º lugar' : '—'}</Text>
              </View>
            </View>

            <View style={styles.seasonChip}>
              <Feather name="calendar" size={15} color="#dce8df" />
              <View>
                <Text style={styles.seasonChipText}>Temporada {seasonYear(career.season)}</Text>
                <Text style={styles.seasonChipSub}>Rodada {currentRound}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.heroRow}>
          <Pressable onPress={() => router.push('/news')} style={styles.heroStory}>
            <ImageBackground source={{ uri: newsImage(mainStory) }} resizeMode="cover" style={styles.heroImage} imageStyle={styles.heroImageRadius}>
              <LinearGradient
                colors={['rgba(7,21,13,0.02)', 'rgba(7,21,13,0.42)', 'rgba(7,21,13,0.96)']}
                locations={[0, 0.45, 1]}
                style={styles.heroOverlay}
              >
                <View style={styles.heroBadges}>
                  <Text style={styles.journalBadge}>JORNAL</Text>
                  <Text style={styles.storyBadge}>{newsLabel(mainStory)}</Text>
                </View>
                <View style={styles.heroSpacer} />
                <Text numberOfLines={3} style={styles.heroTitle}>{storyTitle.toUpperCase()}</Text>
                <Text numberOfLines={3} style={styles.heroBody}>{storyBody}</Text>
                <View style={styles.readStoryButton}>
                  <Text style={styles.readStoryText}>LER MATÉRIA COMPLETA</Text>
                  <Feather name="arrow-right" size={15} color="#07150d" />
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <View style={styles.heroSide}>
            <View style={styles.nextMatchCard}>
              <Text style={styles.sectionKicker}>PRÓXIMO JOGO</Text>
              <Text style={styles.nextMatchMeta}>{division?.name ?? 'Liga'} · Rodada {currentRound}</Text>

              {dashboard.fixture ? (
                <>
                  <View style={styles.nextTeams}>
                    <View style={styles.nextTeam}>
                      <ClubBadge clubId={dashboard.fixture.homeClubId} size={42} />
                      <Text numberOfLines={1} style={styles.nextTeamName}>{dashboard.homeClub?.initials ?? 'CAS'}</Text>
                    </View>
                    <Text style={styles.nextVs}>×</Text>
                    <View style={styles.nextTeam}>
                      <ClubBadge clubId={dashboard.fixture.awayClubId} size={42} />
                      <Text numberOfLines={1} style={styles.nextTeamName}>{dashboard.awayClub?.initials ?? 'FOR'}</Text>
                    </View>
                  </View>
                  <Text style={styles.nextDate}>{formatFixtureDate(dashboard.fixture, career.season)}</Text>
                  <Pressable onPress={openMatch} style={styles.playMatchButton}>
                    <Text style={styles.playMatchText}>{career.liveMatch ? 'CONTINUAR' : 'JOGAR PARTIDA'}</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.noFixture}>
                  <Feather name="check-circle" size={25} color="#79ef91" />
                  <Text style={styles.noFixtureText}>Temporada concluída</Text>
                </View>
              )}
            </View>

            <Pressable onPress={() => router.push('/league')} style={styles.miniTable}>
              <View style={styles.miniTableHeader}>
                <Text style={styles.sectionKicker}>CLASSIFICAÇÃO · {division?.name?.toUpperCase() ?? 'LIGA'}</Text>
                <Text style={styles.miniSeeMore}>Ver mais ›</Text>
              </View>
              {dashboard.nearbyStandings.map((row, index) => {
                const own = row.club.id === career.clubId;
                return (
                  <View key={row.club.id} style={[styles.miniTableRow, own && styles.miniTableOwn]}>
                    <Text style={[styles.miniPos, own && styles.miniOwnText]}>{index + 1}</Text>
                    <View style={styles.miniClubCell}>
                      <ClubBadge clubId={row.club.id} size={19} />
                      <Text numberOfLines={1} style={[styles.miniClubName, own && styles.miniOwnText]}>{row.club.name}</Text>
                    </View>
                    <Text style={[styles.miniPts, own && styles.miniOwnText]}>{row.points}</Text>
                  </View>
                );
              })}
            </Pressable>
          </View>
        </View>

        <View style={styles.latestNewsPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>ÚLTIMAS NOTÍCIAS</Text>
            <Pressable onPress={() => router.push('/news')}><Text style={styles.panelLink}>Ver todas ›</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.latestNewsRow}>
            {(career.newsFeed?.length ? career.newsFeed.slice(0, 8) : smallStories).map((item) => (
              <Pressable key={item.id} onPress={() => router.push('/news')} style={styles.latestNewsCard}>
                <ImageBackground source={{ uri: newsImage(item) }} style={styles.latestNewsImage} imageStyle={styles.latestNewsImageRadius}>
                  <LinearGradient colors={['rgba(7,21,13,0.0)', 'rgba(7,21,13,0.94)']} style={styles.latestNewsOverlay}>
                    <View style={{ flex: 1 }} />
                    <Text numberOfLines={3} style={styles.latestNewsTitle}>{item.title}</Text>
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.dashboardRow}>
          <View style={styles.performancePanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>DESEMPENHO NA TEMPORADA</Text>
              <Pressable onPress={() => router.push('/career')}><Text style={styles.panelLink}>Ver detalhes ›</Text></Pressable>
            </View>
            <View style={styles.performanceGrid}>
              <Metric label="Jogos" value={games} />
              <Metric label="Vitórias" value={dashboard.wins} />
              <Metric label="Empates" value={dashboard.draws} />
              <Metric label="Derrotas" value={dashboard.losses} />
              <Metric label="Gols pró" value={dashboard.goalsFor} />
              <Metric label="Gols contra" value={dashboard.goalsAgainst} />
              <Metric label="Saldo" value={(dashboard.goalsFor - dashboard.goalsAgainst) > 0 ? '+' + (dashboard.goalsFor - dashboard.goalsAgainst) : dashboard.goalsFor - dashboard.goalsAgainst} />
              <Metric label="Aproveitamento" value={efficiency + '%'} />
            </View>
          </View>

          <View style={styles.financesPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>FINANÇAS DO CLUBE</Text>
              <Pressable onPress={() => router.push('/finances')}><Text style={styles.panelLink}>Ver detalhes ›</Text></Pressable>
            </View>
            <FinanceLine label="Caixa" value={formatCurrency(career.balance, career.currency)} positive />
            <FinanceLine label="Verba p/ transferências" value={formatCurrency(transferBudget, career.currency)} positive />
            <FinanceLine label="Receitas da temporada" value={formatCurrency(seasonIncome, career.currency)} positive />
            <FinanceLine label="Despesas da temporada" value={formatCurrency(seasonExpenses, career.currency)} negative />
          </View>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustCard}>
            <View style={styles.trustTop}><Text style={styles.trustLabel}>TORCIDA</Text><Text style={styles.trustValue}>{career.fanTrust}%</Text></View>
            <Text style={styles.trustStatus}>{trustLabel(career.fanTrust)}</Text>
            <View style={styles.trustTrack}><View style={[styles.trustFill, { width: (career.fanTrust + '%') as any }]} /></View>
          </View>
          <View style={styles.trustCard}>
            <View style={styles.trustTop}><Text style={styles.trustLabel}>DIRETORIA</Text><Text style={styles.trustValue}>{career.boardTrust}%</Text></View>
            <Text style={styles.trustStatus}>{trustLabel(career.boardTrust)}</Text>
            <View style={styles.trustTrack}><View style={[styles.trustFill, { width: (career.boardTrust + '%') as any }]} /></View>
          </View>
        </View>
      </Screen>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 7) }]}>
        {BOTTOM_NAV.map((item, index) => {
          const active = index === 0;
          return (
            <Pressable key={item.label} onPress={() => router.push(item.route as never)} style={[styles.bottomNavItem, active && styles.bottomNavItemActive]}>
              <Feather name={item.icon} size={18} color={active ? '#79ef91' : '#b5c5bb'} />
              <Text numberOfLines={1} style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricRing}>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

function FinanceLine({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <View style={styles.financeLine}>
      <Text style={styles.financeLabel}>{label}</Text>
      <Text style={[styles.financeValue, positive && styles.financePositive, negative && styles.financeNegative]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07150d' },
  page: { backgroundColor: '#07150d', gap: 12, paddingHorizontal: 12 },
  loading: { alignItems: 'center', justifyContent: 'center', minHeight: 420 },
  loadingText: { marginTop: 10, fontSize: 12 },
  brandName: { color: '#f3f7f3', fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: -1.1 },
  brandGreen: { color: '#76f08f' },
  brandTagline: { color: '#8ea295', fontSize: 6.5, fontWeight: '800', letterSpacing: 0.7, marginTop: 1 },
  topHeader: { gap: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#234334' },
  topHeaderMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  topHeaderMetaRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  logoArea: { flex: 1, minWidth: 0 },
  clubIdentity: { flex: 1.25, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#254637', borderRadius: 11, backgroundColor: '#0b2117', paddingHorizontal: 9 },
  clubIdentityName: { color: '#f5f7f5', fontSize: 9.5, fontWeight: '900' },
  clubIdentityMeta: { color: '#92a79a', fontSize: 6.5, marginTop: 2 },
  seasonChip: { flex: 0.95, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderWidth: 1, borderColor: '#254637', borderRadius: 11, backgroundColor: '#0b2117' },
  seasonChipText: { color: '#f0f5f1', fontSize: 7, fontWeight: '800' },
  seasonChipSub: { color: '#8ea295', fontSize: 6, marginTop: 1 },
  accountButton: { minHeight: 38, paddingHorizontal: 9, borderRadius: 11, borderWidth: 1, borderColor: '#315f3f', backgroundColor: '#10291d', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  accountButtonText: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.45 },
  heroRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  heroStory: { flex: 1.62, minHeight: 320, borderRadius: 16, borderWidth: 1, borderColor: '#3b8555', overflow: 'hidden', backgroundColor: '#10291d' },
  heroImage: { flex: 1, minHeight: 320 },
  heroImageRadius: { borderRadius: 15 },
  heroOverlay: { flex: 1, padding: 14 },
  heroBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  journalBadge: { color: '#ffffff', fontSize: 8, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#d62f3f', borderRadius: 6 },
  storyBadge: { color: '#ffffff', fontSize: 6.5, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 5, backgroundColor: '#1d2b22', borderRadius: 6 },
  heroSpacer: { flex: 1 },
  heroTitle: { color: '#ffffff', fontSize: 21, lineHeight: 23, fontWeight: '900', letterSpacing: -0.45 },
  heroBody: { color: '#f2f5f3', fontSize: 9.5, lineHeight: 13.5, marginTop: 7, maxWidth: '94%' },
  readStoryButton: { alignSelf: 'flex-start', minHeight: 38, marginTop: 11, paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', gap: 8 },
  readStoryText: { color: '#07150d', fontSize: 7.5, fontWeight: '900' },
  heroSide: { flex: 1, gap: 10 },
  nextMatchCard: { flex: 1, minHeight: 156, borderRadius: 15, borderWidth: 1, borderColor: '#2e6c44', backgroundColor: '#0b2117', padding: 11 },
  sectionKicker: { color: '#79ef91', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.55 },
  nextMatchMeta: { color: '#c6d2ca', fontSize: 6.7, marginTop: 4, textAlign: 'center' },
  nextTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10 },
  nextTeam: { alignItems: 'center', width: 50 },
  nextTeamName: { color: '#f5f7f5', fontSize: 7, fontWeight: '900', marginTop: 3 },
  nextVs: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  nextDate: { color: '#dbe5de', fontSize: 6.5, textAlign: 'center', marginTop: 7, textTransform: 'capitalize' },
  playMatchButton: { minHeight: 34, marginTop: 8, borderRadius: 9, backgroundColor: '#79ef91', alignItems: 'center', justifyContent: 'center' },
  playMatchText: { color: '#07150d', fontSize: 7.5, fontWeight: '900' },
  noFixture: { flex: 1, minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 7 },
  noFixtureText: { color: '#b8c8bd', fontSize: 8, fontWeight: '800' },
  miniTable: { flex: 1, minHeight: 150, borderRadius: 15, borderWidth: 1, borderColor: '#2e6c44', backgroundColor: '#0b2117', padding: 9 },
  miniTableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, marginBottom: 5 },
  miniSeeMore: { color: '#5ee9e2', fontSize: 6 },
  miniTableRow: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#203d2d' },
  miniTableOwn: { backgroundColor: '#17452c', borderRadius: 5 },
  miniPos: { width: 16, color: '#c0cec5', fontSize: 7, fontWeight: '900' },
  miniClubCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniClubName: { flex: 1, color: '#f3f6f4', fontSize: 6.8, fontWeight: '700' },
  miniPts: { width: 18, textAlign: 'right', color: '#f3f6f4', fontSize: 7, fontWeight: '900' },
  miniOwnText: { color: '#ffffff' },
   dashboardRow: { flexDirection: 'row', gap: 10 },
  performancePanel: { flex: 1.2, minHeight: 200, borderRadius: 15, borderWidth: 1, borderColor: '#2e6c44', backgroundColor: '#0b2117', padding: 10 },
  financesPanel: { flex: 1, minHeight: 200, borderRadius: 15, borderWidth: 1, borderColor: '#2e6c44', backgroundColor: '#0b2117', padding: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginBottom: 9 },
  panelTitle: { color: '#79ef91', fontSize: 9.5, fontWeight: '900' },
  panelLink: { color: '#5ee9e2', fontSize: 6.5, fontWeight: '700' },
  performanceGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  metric: { width: '25%', alignItems: 'center', gap: 4 },
  metricLabel: { color: '#b9c8be', fontSize: 6.5, textAlign: 'center' },
  metricRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#1e5b3d', alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: '#f5f7f5', fontSize: 10.5, fontWeight: '900' },
  financeLine: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#254335' },
  financeLabel: { flex: 1, color: '#b7c7bd', fontSize: 6.8 },
  financeValue: { color: '#f5f7f5', fontSize: 7.3, fontWeight: '900', textAlign: 'right' },
  financePositive: { color: '#79ef91' },
  financeNegative: { color: '#ff7e84' },
  latestNewsPanel: { borderRadius: 15, borderWidth: 1, borderColor: '#2e6c44', backgroundColor: '#0b2117', padding: 10 },
  latestNewsRow: { gap: 8 },
  latestNewsCard: { width: 130, height: 105, borderRadius: 11, overflow: 'hidden', backgroundColor: '#10291d' },
  latestNewsImage: { flex: 1 },
  latestNewsImageRadius: { borderRadius: 11 },
  latestNewsOverlay: { flex: 1, padding: 8 },
  latestNewsTitle: { color: '#ffffff', fontSize: 8.5, lineHeight: 11, fontWeight: '800' },
  trustRow: { flexDirection: 'row', gap: 9 },
  trustCard: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#0b2117', padding: 10 },
  trustTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trustLabel: { color: '#8fa396', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.6 },
  trustValue: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  trustStatus: { color: '#eef4f0', fontSize: 8, fontWeight: '800', marginTop: 3 },
  trustTrack: { height: 5, borderRadius: 99, backgroundColor: '#07150d', overflow: 'hidden', marginTop: 7 },
  trustFill: { height: '100%', backgroundColor: '#79ef91' },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 76, paddingTop: 7, paddingHorizontal: 5, backgroundColor: '#07150df2', borderTopWidth: 1, borderTopColor: '#315f3f', flexDirection: 'row', alignItems: 'flex-start' },
  bottomNavItem: { width: '12.5%', minHeight: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 1 },
  bottomNavItemActive: { backgroundColor: '#10291d', borderWidth: 1, borderColor: '#315f3f' },
  bottomNavLabel: { color: '#c0cec5', fontSize: 5.7, fontWeight: '700', textAlign: 'center' },
  bottomNavLabelActive: { color: '#79ef91' },
  emptyCard: { borderWidth: 1, borderColor: '#31513d', borderRadius: 20, backgroundColor: '#0b2117', padding: 20, gap: 10, marginTop: 14 },
  emptyTitle: { color: '#f5f7f5', fontSize: 22, fontWeight: '900' },
  emptyText: { color: '#9fb2a5', fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  primaryButtonText: { color: '#07150d', fontSize: 9, fontWeight: '900' },
});
