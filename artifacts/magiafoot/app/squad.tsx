import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, PlayerRow, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getRosterGroups, formatCurrency } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function SquadScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, chooseCaptain } = useCareer();
  if (!career) {
    return <><GameHeader title="Elenco" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }
  const groups = getRosterGroups(career);
  const totalWages = career.players.reduce((sum, player) => sum + player.wage, 0);

  return (
    <>
      <GameHeader title="Elenco" eyebrow={`${career.players.length} JOGADORES`} right={<Text style={[styles.headerMetric, { color: colors.primary }]}>{formatCurrency(totalWages)}<Text style={[styles.headerMetricCaption, { color: colors.mutedForeground }]}>/sem</Text></Text>} />
      <Screen>
        <Panel style={styles.introPanel}>
          <View style={styles.introRow}>
            <View style={[styles.teamIcon, { backgroundColor: colors.secondary }]}><Feather name="users" size={19} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.introTitle, { color: colors.foreground }]}>Seu grupo de trabalho</Text>
              <Text style={[styles.introDescription, { color: colors.mutedForeground }]}>Toque em um titular para escolhê-lo como capitão.</Text>
            </View>
          </View>
          <View style={styles.metrics}>
            <View style={[styles.metric, { backgroundColor: colors.secondary }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{groups.starters.length}</Text><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>titulares</Text></View>
            <View style={[styles.metric, { backgroundColor: colors.secondary }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{groups.bench.length}</Text><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>reservas</Text></View>
            <View style={[styles.metric, { backgroundColor: colors.secondary }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{groups.unavailable.length}</Text><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>indisponíveis</Text></View>
          </View>
        </Panel>

        <SectionLabel title={`Titulares · ${groups.starters.length}`} action={<Pressable onPress={() => router.push('/tactics')}><Text style={[styles.actionText, { color: colors.primary }]}>Editar tática</Text></Pressable>} />
        <Panel style={styles.playerPanel}>
          {groups.starters.map(({ slot, player }) => {
            const captain = player.id === career.captainId;
            return (
              <Pressable key={slot.id} onPress={() => chooseCaptain(player.id)} accessibilityRole="button" accessibilityLabel={`${player.name}, ${player.position}${captain ? ', capitão' : ''}`}>
                <PlayerRow
                  player={player}
                  trailing={captain
                    ? <View style={[styles.captainBadge, { backgroundColor: colors.accent }]}><Feather name="star" size={13} color={colors.accentForeground} /></View>
                    : <Text style={[styles.slotLabel, { color: colors.mutedForeground }]}>{slot.position}</Text>}
                />
              </Pressable>
            );
          })}
        </Panel>

        <SectionLabel title={`Banco · ${groups.bench.length}`} />
        <Panel style={styles.playerPanel}>
          {groups.bench.map((player) => <PlayerRow key={player.id} player={player} />)}
        </Panel>

        {groups.reserves.length ? (
          <>
            <SectionLabel title={`Demais atletas · ${groups.reserves.length}`} />
            <Panel style={styles.playerPanel}>
              {groups.reserves.map((player) => <PlayerRow key={player.id} player={player} />)}
            </Panel>
          </>
        ) : null}

        {groups.unavailable.length ? (
          <>
            <SectionLabel title="Departamento médico" />
            <Panel style={styles.playerPanel}>
              {groups.unavailable.map((player) => (
                <PlayerRow key={player.id} player={player} dimmed trailing={
                  <Text style={[styles.unavailableLabel, { color: colors.destructive }]}>
                    {player.status === 'injured' ? 'Lesionado' : 'Suspenso'}
                  </Text>
                } />
              ))}
            </Panel>
          </>
        ) : null}

        <GameButton label="Organizar escalação" icon="layout" onPress={() => router.push('/tactics')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerMetric: { fontSize: 10, fontWeight: '900', textAlign: 'right' },
  headerMetricCaption: { fontSize: 9, fontWeight: '600' },
  introPanel: { gap: 14 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 13, fontWeight: '800' },
  introDescription: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 7 },
  metric: { flex: 1, minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 15, fontWeight: '900' },
  metricLabel: { fontSize: 9, marginTop: 2 },
  actionText: { fontSize: 11, fontWeight: '800' },
  playerPanel: { paddingVertical: 3 },
  captainBadge: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  slotLabel: { fontSize: 9, fontWeight: '900', minWidth: 32, textAlign: 'right' },
  unavailableLabel: { fontSize: 9, fontWeight: '800' },
});
