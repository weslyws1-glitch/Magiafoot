import React, { useMemo } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getClub } from '@/game/data';
import { effectiveStrength, formatCurrency, POSITION_LABELS } from '@/game/engine';
import type { Career, Player } from '@/game/types';
import { useColors } from '@/hooks/useColors';

export function GameHeader({ title, eyebrow, back = true, right }: {
  title: string;
  eyebrow?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 16 : 7) }]}>
      <View style={styles.headerLine}>
        {back ? (
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar" style={[styles.iconButton, { backgroundColor: colors.secondary }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={[styles.headerBadge, { backgroundColor: colors.accent }]}>
            <Feather name="zap" size={16} color={colors.accentForeground} />
          </View>
        )}
        <View style={styles.headerText}>
          {eyebrow ? <Text style={[styles.headerEyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
          <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        {right}
      </View>
    </View>
  );
}

export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: object }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom + 28, 38) + (Platform.OS === 'web' ? 34 : 0);
  const containerStyle = [styles.screenContent, { paddingBottom }, style];
  return scroll
    ? <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={containerStyle} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
    : <View style={[styles.screenContent, { flex: 1, paddingBottom, backgroundColor: colors.background }, style]}>{children}</View>;
}

export function Panel({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function GameButton({ label, onPress, icon, variant = 'primary', disabled = false, compact = false }: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'dark' | 'outline' | 'danger';
  disabled?: boolean;
  compact?: boolean;
}) {
  const colors = useColors();
  const palette = {
    primary: { backgroundColor: colors.accent, borderColor: colors.accent, color: colors.accentForeground },
    dark: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.primaryForeground },
    outline: { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
    danger: { backgroundColor: colors.destructive, borderColor: colors.destructive, color: colors.destructiveForeground },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.gameButton,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
        compact && styles.gameButtonCompact,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={palette.color} /> : null}
      <Text style={[styles.gameButtonText, { color: palette.color }, compact && styles.gameButtonTextCompact]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ title, action }: { title: string; action?: React.ReactNode }) {
  const colors = useColors();
  return <View style={styles.sectionLine}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>{action}</View>;
}

export function ClubBadge({ clubId, size = 48 }: { clubId: string; size?: number }) {
  const colors = useColors();
  const club = getClub(clubId);
  if (club?.badgeUrl) {
    return (
      <View style={[styles.clubBadgeImageWrap, { width: size, height: size }]}>
        <Image source={{ uri: club.badgeUrl }} resizeMode="contain" style={{ width: size, height: size }} />
      </View>
    );
  }
  return (
    <View style={[styles.clubBadge, { width: size, height: size, borderRadius: size * 0.29, backgroundColor: club?.color ?? colors.primary }]}>
      <View style={[styles.badgeInner, { borderColor: 'rgba(255,255,255,0.42)' }]}>
        <Text style={[styles.badgeText, { fontSize: size * 0.24, color: colors.inverse }]}>{club?.initials ?? 'MF'}</Text>
      </View>
    </View>
  );
}

export function PlayerRating({ player, position = player.position }: { player: Player; position?: Player['position'] }) {
  const colors = useColors();
  const rating = effectiveStrength(player, position);
  const ratingColor = rating >= 75 ? colors.primary : rating >= 63 ? '#d5a81e' : colors.destructive;
  return <View style={[styles.ratingPill, { backgroundColor: `${ratingColor}20` }]}><Text style={[styles.ratingText, { color: ratingColor }]}>{rating}</Text></View>;
}

export function PlayerRow({ player, trailing, dimmed = false }: { player: Player; trailing?: React.ReactNode; dimmed?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.playerRow, { borderBottomColor: colors.border, opacity: dimmed ? 0.65 : 1 }]}>
      <PlayerRating player={player} />
      <View style={styles.playerInfo}>
        <Text numberOfLines={1} style={[styles.playerName, { color: colors.foreground }]}>{player.name}</Text>
        <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>{POSITION_LABELS[player.position]} · {player.age} anos · físico {Math.round(player.fitness)}%</Text>
      </View>
      {trailing}
    </View>
  );
}

export function BarStat({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors = useColors();
  const fill = color ?? colors.primary;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.barStat}>
      <View style={styles.barLabelLine}><Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.barValue, { color: colors.foreground }]}>{Math.round(value)}%</Text></View>
      <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}><View style={[styles.barFill, { width: `${clamped}%`, backgroundColor: fill }]} /></View>
    </View>
  );
}

export function CareerOverview({ career }: { career: Career }) {
  const colors = useColors();
  const club = getClub(career.clubId);
  const summary = useMemo(() => `${club?.name ?? 'Seu clube'} · Temporada ${career.season}`, [career.season, club?.name]);
  return (
    <View style={[styles.overview, { backgroundColor: colors.secondary }]}>
      <ClubBadge clubId={career.clubId} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.overviewCoach, { color: colors.foreground }]}>{career.coachName}</Text>
        <Text style={[styles.overviewSub, { color: colors.mutedForeground }]}>{summary}</Text>
      </View>
      {career.liveMatch ? <View style={[styles.saveDot, { backgroundColor: colors.accent }]}><Text style={[styles.saveDotText, { color: colors.accentForeground }]}>AO VIVO</Text></View> : null}
    </View>
  );
}

export function LoadingState() {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.mutedForeground, marginTop: 10 }}>Carregando sua carreira…</Text></View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#07150d', borderBottomWidth: 1, borderBottomColor: '#234334' },
  headerLine: { minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 3 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  screenContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  panel: { borderRadius: 18, borderWidth: 1, padding: 16 },
  gameButton: { minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  gameButtonCompact: { minHeight: 43, paddingHorizontal: 13, borderRadius: 15 },
  gameButtonText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  gameButtonTextCompact: { fontSize: 13 },
  sectionLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
  clubBadge: { padding: 3, alignItems: 'center', justifyContent: 'center' },
  clubBadgeImageWrap: { alignItems: 'center', justifyContent: 'center' },
  badgeInner: { width: '100%', height: '100%', borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontWeight: '900', letterSpacing: -0.4 },
  ratingPill: { minWidth: 38, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  ratingText: { fontSize: 14, fontWeight: '900' },
  playerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 13, fontWeight: '700' },
  playerMeta: { fontSize: 10, marginTop: 4 },
  barStat: { flex: 1, gap: 6 },
  barLabelLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { fontSize: 11, fontWeight: '600' },
  barValue: { fontSize: 11, fontWeight: '800' },
  barTrack: { height: 7, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  overview: { borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  overviewCoach: { fontSize: 13, fontWeight: '800' },
  overviewSub: { fontSize: 10, marginTop: 3 },
  saveDot: { borderRadius: 12, paddingHorizontal: 7, paddingVertical: 5 },
  saveDotText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280 },
});

export { formatCurrency };
