import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarStat, ClubBadge, GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { calculateStandings, formatCurrency, getCurrentFixture, getCurrentLeaguePosition, getClubName } from '@/game/engine';
import { LEAGUE_ROUNDS } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

function HubTile({ title, detail, icon, onPress }: { title: string; detail: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.hubTile, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 }]}
    >
      <View style={[styles.hubIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={17} color={colors.primary} /></View>
      <Text style={[styles.hubTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.hubDetail, { color: colors.mutedForeground }]}>{detail}</Text>
    </Pressable>
  );
}

export default function ClubScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, startCurrentMatch } = useCareer();
  if (!career) {
    return <><GameHeader title="Central do clube" back={false} /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para assumir o comando.</Text><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;
  const fixture = getCurrentFixture(career);
  const opponentId = fixture ? fixture.homeClubId === career.clubId ? fixture.awayClubId : fixture.homeClubId : undefined;
  const isHome = fixture?.homeClubId === career.clubId;
  const opponent = opponentId ? getClub(opponentId) : undefined;
  const position = getCurrentLeaguePosition(career);
  const positionText = position ? `${position}º` : '—';
  const playLabel = career.liveMatch?.phase === 'finished'
    ? 'Ver resultado final'
    : career.liveMatch
      ? 'Retomar partida'
      : fixture
        ? 'Preparar próxima partida'
        : 'Temporada encerrada';

  const openMatch = () => {
    if (!career.liveMatch && fixture) startCurrentMatch();
    if (career.liveMatch || fixture) router.push('/match');
  };

  return (
    <>
      <GameHeader title="Central do clube" eyebrow={`TEMPORADA ${career.season}`} back={false} />
      <Screen>
        <Panel style={[styles.identityPanel, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <View style={styles.identityRow}>
            <ClubBadge clubId={club.id} size={55} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.clubName, { color: colors.primaryForeground }]}>{club.name}</Text>
              <Text style={[styles.clubCity, { color: colors.primaryForeground }]}>{club.city} · {career.coachName}</Text>
            </View>
            <View style={[styles.placeChip, { backgroundColor: colors.accent }]}>
              <Text style={[styles.placeNumber, { color: colors.accentForeground }]}>{positionText}</Text>
              <Text style={[styles.placeLabel, { color: colors.accentForeground }]}>LIGA</Text>
            </View>
          </View>
          <View style={[styles.identityDivider, { backgroundColor: colors.primaryForeground, opacity: 0.2 }]} />
          <View style={styles.identityStats}>
            <View><Text style={[styles.identityStatValue, { color: colors.primaryForeground }]}>{career.roundIndex}/{LEAGUE_ROUNDS}</Text><Text style={[styles.identityStatLabel, { color: colors.primaryForeground }]}>rodadas</Text></View>
            <View><Text style={[styles.identityStatValue, { color: colors.primaryForeground }]}>{career.players.length}</Text><Text style={[styles.identityStatLabel, { color: colors.primaryForeground }]}>jogadores</Text></View>
            <View><Text style={[styles.identityStatValue, { color: colors.primaryForeground }]}>{formatCurrency(career.balance)}</Text><Text style={[styles.identityStatLabel, { color: colors.primaryForeground }]}>caixa</Text></View>
          </View>
        </Panel>

        <Panel style={styles.nextMatchPanel}>
          <View style={styles.panelEyebrowRow}>
            <View style={[styles.liveDot, { backgroundColor: career.liveMatch ? colors.destructive : colors.primary }]} />
            <Text style={[styles.panelEyebrow, { color: colors.mutedForeground }]}>
              {career.liveMatch ? 'PARTIDA EM ANDAMENTO' : fixture ? `RODADA ${career.roundIndex + 1} · ${isHome ? 'EM CASA' : 'FORA'}` : 'FIM DE TEMPORADA'}
            </Text>
          </View>
          {fixture && opponent ? (
            <View style={styles.fixtureLine}>
              <View style={styles.fixtureTeam}>
                <ClubBadge clubId={isHome ? club.id : opponent.id} size={42} />
                <Text numberOfLines={1} style={[styles.fixtureTeamName, { color: colors.foreground }]}>{isHome ? club.name : opponent.name}</Text>
              </View>
              <Text style={[styles.fixtureVs, { color: colors.mutedForeground }]}>VS</Text>
              <View style={[styles.fixtureTeam, { alignItems: 'flex-end' }]}>
                <ClubBadge clubId={isHome ? opponent.id : club.id} size={42} />
                <Text numberOfLines={1} style={[styles.fixtureTeamName, { color: colors.foreground }]}>{isHome ? opponent.name : club.name}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.endSeasonText, { color: colors.foreground }]}>A temporada terminou. Confira a classificação final.</Text>
          )}
          <GameButton
            label={playLabel}
            icon={career.liveMatch?.phase === 'finished' ? 'flag' : 'play'}
            disabled={!fixture && !career.liveMatch}
            onPress={openMatch}
          />
        </Panel>

        {career.lastResult ? (
          <View style={[styles.newsBox, { backgroundColor: colors.secondary }]}>
            <Feather name="radio" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.newsTitle, { color: colors.foreground }]}>
                {getClubName(career.lastResult.homeClubId)} {career.lastResult.homeGoals} × {career.lastResult.awayGoals} {getClubName(career.lastResult.awayClubId)}
              </Text>
              <Text style={[styles.newsText, { color: colors.mutedForeground }]}>{career.lastNews}</Text>
            </View>
          </View>
        ) : null}

        <Panel style={styles.trustPanel}>
          <View style={styles.trustTitleLine}>
            <Text style={[styles.trustTitle, { color: colors.foreground }]}>Confiança da diretoria</Text>
            <Text style={[styles.trustValue, { color: colors.primary }]}>{career.boardTrust}%</Text>
          </View>
          <BarStat label={career.boardTrust >= 55 ? 'A temporada está no caminho certo' : 'A diretoria espera uma reação'} value={career.boardTrust} />
        </Panel>

        <SectionLabel title="Gestão" />
        <View style={styles.hubGrid}>
          <HubTile title="Elenco" detail={`${career.players.length} atletas`} icon="users" onPress={() => router.push('/squad')} />
          <HubTile title="Táticas" detail="Formação e onze" icon="layout" onPress={() => router.push('/tactics')} />
          <HubTile title="Classificação" detail={`${calculateStandings(career.results).length} clubes`} icon="award" onPress={() => router.push('/league')} />
          <HubTile title="Calendário" detail="Temporada fictícia" icon="calendar" onPress={() => router.push('/calendar')} />
          <HubTile title="Mercado" detail="Contratações" icon="repeat" onPress={() => router.push('/market')} />
          <HubTile title="Finanças" detail="Caixa e estádio" icon="briefcase" onPress={() => router.push('/finances')} />
        </View>
        <Text style={[styles.coachFooter, { color: colors.mutedForeground }]}>Técnico: {career.coachName} · {club.name}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  identityPanel: { gap: 13, padding: 17 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clubName: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  clubCity: { fontSize: 11, marginTop: 4, opacity: 0.75 },
  placeChip: { minWidth: 46, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  placeNumber: { fontSize: 17, fontWeight: '900' },
  placeLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  identityDivider: { height: 1 },
  identityStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  identityStatValue: { fontSize: 14, fontWeight: '800' },
  identityStatLabel: { fontSize: 9, marginTop: 3, opacity: 0.7 },
  nextMatchPanel: { gap: 12 },
  panelEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 5 },
  panelEyebrow: { fontSize: 9, letterSpacing: 0.9, fontWeight: '800' },
  fixtureLine: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  fixtureTeam: { flex: 1, alignItems: 'flex-start', gap: 7 },
  fixtureTeamName: { fontSize: 10, fontWeight: '700', maxWidth: '100%' },
  fixtureVs: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  endSeasonText: { fontSize: 14, fontWeight: '700', lineHeight: 21 },
  newsBox: { padding: 13, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  newsTitle: { fontSize: 12, fontWeight: '800', lineHeight: 17 },
  newsText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  trustPanel: { gap: 13 },
  trustTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trustTitle: { fontSize: 13, fontWeight: '800' },
  trustValue: { fontSize: 15, fontWeight: '900' },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  hubTile: { width: '48.3%', minHeight: 116, borderWidth: 1, borderRadius: 18, padding: 12, gap: 6, alignItems: 'flex-start' },
  hubIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  hubTitle: { fontSize: 12, fontWeight: '800' },
  hubDetail: { fontSize: 10 },
  coachFooter: { fontSize: 10, textAlign: 'center', paddingBottom: 8 },
});
