import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatMatchDate, getCompetition, getTeam, type Competition, type Match, type Team } from '@/data/football';

export function BrandHeader({ subtitle }: { subtitle: string }) {
  const colors = useColors();
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandLockup}>
        <Image source={require('../assets/images/icon.png')} style={styles.brandIcon} />
        <View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>Magiafoot</Text>
          <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={[styles.headerMark, { backgroundColor: colors.accent }]}>
        <Feather name="zap" size={16} color={colors.accentForeground} />
      </View>
    </View>
  );
}

export function SectionHeading({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const colors = useColors();
  return (
    <View style={styles.pageTitle}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text>
      <Text style={[styles.pageTitleText, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.pageDescription, { color: colors.mutedForeground }]}>{description}</Text>
    </View>
  );
}

export function TeamMark({ team, size = 40 }: { team: Team; size?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.teamMark, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.secondary }]}>
      <Text style={[styles.teamMarkText, { color: colors.primary, fontSize: size * 0.28 }]}>{team.shortName.slice(0, 3)}</Text>
    </View>
  );
}

export function FollowButton({ active, onPress, label }: { active: boolean; onPress: () => void; label?: string }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ?? (active ? 'Deixar de seguir time' : 'Seguir time')}
      style={({ pressed }) => [styles.followButton, { backgroundColor: active ? colors.accent : colors.secondary, opacity: pressed ? 0.72 : 1 }]}
    >
      <FontAwesome name={active ? 'star' : 'star-o'} size={15} color={active ? colors.accentForeground : colors.mutedForeground} />
      {label ? <Text style={[styles.followButtonText, { color: active ? colors.accentForeground : colors.foreground }]}>{label}</Text> : null}
    </Pressable>
  );
}

export function TeamRow({ team, following, onToggle }: { team: Team; following: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.teamRow, { borderBottomColor: colors.border }]}>
      <TeamMark team={team} size={44} />
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, { color: colors.foreground }]}>{team.name}</Text>
        <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{team.city}</Text>
      </View>
      <FollowButton active={following} onPress={onToggle} label={following ? 'Seguindo' : 'Seguir'} />
    </View>
  );
}

export function MatchCard({ match, saved, onToggleSaved }: { match: Match; saved: boolean; onToggleSaved: () => void }) {
  const colors = useColors();
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const competition = getCompetition(match.competitionId);
  if (!home || !away || !competition) return null;
  return (
    <View style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.matchMeta}>
        <View style={styles.competitionLabel}>
          <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.competitionText, { color: colors.mutedForeground }]}>{competition.name}</Text>
        </View>
        <Pressable
          onPress={onToggleSaved}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remover partida salva' : 'Salvar partida'}
          style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.55 : 1 }]}
        >
          <Feather name={saved ? 'bookmark' : 'bookmark'} size={17} color={saved ? colors.primary : colors.mutedForeground} />
        </Pressable>
      </View>
      <View style={styles.matchTeams}>
        <View style={styles.matchTeam}>
          <TeamMark team={home} size={46} />
          <Text numberOfLines={1} style={[styles.matchTeamName, { color: colors.foreground }]}>{home.name}</Text>
        </View>
        <View style={styles.matchCenter}>
          <Text style={[styles.kickoff, { color: colors.foreground }]}>{match.kickoff}</Text>
          <Text style={[styles.matchDay, { color: colors.mutedForeground }]}>{formatMatchDate(match.dayOffset)}</Text>
        </View>
        <View style={styles.matchTeam}>
          <TeamMark team={away} size={46} />
          <Text numberOfLines={1} style={[styles.matchTeamName, { color: colors.foreground }]}>{away.name}</Text>
        </View>
      </View>
    </View>
  );
}

export function CompetitionCard({ competition, onPress }: { competition: Competition; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.competitionCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={[styles.competitionIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={competition.id === 'champions' ? 'globe' : 'award'} size={21} color={colors.primary} />
      </View>
      <View style={styles.competitionInfo}>
        <Text style={[styles.competitionName, { color: colors.foreground }]}>{competition.name}</Text>
        <Text style={[styles.competitionSub, { color: colors.mutedForeground }]}>{competition.region} · {competition.format}</Text>
      </View>
      <View style={styles.competitionTrailing}>
        <Text style={[styles.teamCount, { color: colors.mutedForeground }]}>{competition.teamCount}</Text>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  const colors = useColors();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="flag" size={19} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: { width: 42, height: 42, borderRadius: 14 },
  brandName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  brandSubtitle: { fontSize: 12, marginTop: 2 },
  headerMark: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  actionText: { fontSize: 13, fontWeight: '700' },
  pageTitle: { marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 7 },
  pageTitleText: { fontSize: 31, fontWeight: '800', letterSpacing: -1.1 },
  pageDescription: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  teamMark: { alignItems: 'center', justifyContent: 'center' },
  teamMarkText: { fontWeight: '800', letterSpacing: -0.3 },
  followButton: { borderRadius: 20, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 6 },
  followButtonText: { fontSize: 12, fontWeight: '700' },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  teamInfo: { flex: 1, marginLeft: 12 },
  teamName: { fontSize: 15, fontWeight: '700' },
  teamCity: { fontSize: 12, marginTop: 3 },
  matchCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 11 },
  matchMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  competitionLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { height: 7, width: 7, borderRadius: 4 },
  competitionText: { fontSize: 12, fontWeight: '600' },
  saveButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  matchTeam: { alignItems: 'center', flex: 1, gap: 8 },
  matchTeamName: { fontSize: 12, fontWeight: '700', maxWidth: '100%' },
  matchCenter: { minWidth: 58, alignItems: 'center' },
  kickoff: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  matchDay: { fontSize: 11, marginTop: 3 },
  competitionCard: { borderRadius: 20, borderWidth: 1, padding: 15, marginBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  competitionIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  competitionInfo: { flex: 1 },
  competitionName: { fontSize: 15, fontWeight: '700' },
  competitionSub: { fontSize: 12, marginTop: 4 },
  competitionTrailing: { alignItems: 'flex-end', gap: 4 },
  teamCount: { fontSize: 10, fontWeight: '600' },
  emptyState: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'flex-start' },
  emptyIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyDescription: { fontSize: 13, lineHeight: 19, marginTop: 6 },
});
