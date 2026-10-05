import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { formatCurrency } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

function FinanceMetric({ label, value, icon, detail }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; detail?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={15} color={colors.primary} /></View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {detail ? <Text style={[styles.metricDetail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
    </View>
  );
}

export default function FinancesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, expandStadium } = useCareer();
  if (!career) {
    return <><GameHeader title="Finanças e estádio" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }
  const club = getClub(career.clubId);
  if (!club) return null;
  const capacity = club.stadiumCapacity + career.stadiumLevel * 4_000;
  const wages = career.players.reduce((sum, player) => sum + player.wage, 0);
  const typicalAttendance = Math.round(capacity * 0.53);
  const ticketEstimate = typicalAttendance * club.ticketPrice;
  const previousGate = career.lastResult?.homeClubId === career.clubId
    ? (career.lastResult.attendance * club.ticketPrice)
    : 0;
  const nextCost = 850_000 + career.stadiumLevel * 350_000;
  const canExpand = career.stadiumLevel < 3 && career.balance >= nextCost;

  return (
    <>
      <GameHeader title="Finanças e estádio" eyebrow={club.name.toUpperCase()} />
      <Screen>
        <Panel style={[styles.balancePanel, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <View style={styles.balanceTop}>
            <View style={[styles.balanceIcon, { backgroundColor: colors.accent }]}><Feather name="briefcase" size={18} color={colors.accentForeground} /></View>
            <Text style={[styles.balanceLabel, { color: colors.primaryForeground }]}>SALDO DISPONÍVEL</Text>
          </View>
          <Text style={[styles.balanceAmount, { color: colors.primaryForeground }]}>{formatCurrency(career.balance)}</Text>
          <Text style={[styles.balanceNote, { color: colors.primaryForeground }]}>Orçamento da temporada {career.season}</Text>
        </Panel>

        <SectionLabel title="Resumo financeiro" />
        <View style={styles.metricGrid}>
          <FinanceMetric label="Salários por rodada" value={formatCurrency(wages)} icon="users" detail={`${career.players.length} contratos`} />
          <FinanceMetric label="Bilheteria estimada" value={formatCurrency(ticketEstimate)} icon="tag" detail={`${typicalAttendance.toLocaleString('pt-BR')} torcedores`} />
          <FinanceMetric label="Última bilheteria" value={formatCurrency(previousGate)} icon="trending-up" detail={career.lastResult ? career.lastResult.homeClubId === career.clubId ? 'Jogo em casa' : 'Jogo fora' : 'Ainda sem partidas'} />
          <FinanceMetric label="Preço do ingresso" value={formatCurrency(club.ticketPrice)} icon="tag" detail="por torcedor" />
        </View>

        <Panel style={styles.stadiumPanel}>
          <View style={styles.stadiumHeader}>
            <View style={[styles.stadiumIcon, { backgroundColor: colors.accent }]}><Feather name="home" size={19} color={colors.accentForeground} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stadiumName, { color: colors.foreground }]}>Estádio {club.name}</Text>
              <Text style={[styles.stadiumSub, { color: colors.mutedForeground }]}>Nível {career.stadiumLevel} de 3 · {capacity.toLocaleString('pt-BR')} lugares</Text>
            </View>
          </View>
          <View style={[styles.capacityTrack, { backgroundColor: colors.secondary }]}>
            <View style={[styles.capacityFill, { width: `${((career.stadiumLevel + 1) / 4) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          {career.stadiumLevel < 3 ? (
            <>
              <View style={styles.upgradeTextLine}>
                <Text style={[styles.upgradeDetail, { color: colors.mutedForeground }]}>Próxima ampliação · +4.000 lugares</Text>
                <Text style={[styles.upgradeCost, { color: colors.foreground }]}>{formatCurrency(nextCost)}</Text>
              </View>
              <GameButton
                label={canExpand ? 'Ampliar o estádio' : 'Saldo insuficiente'}
                icon="plus-circle"
                disabled={!canExpand}
                onPress={() => {
                  expandStadium();
                }}
              />
            </>
          ) : (
            <Text style={[styles.maxLevel, { color: colors.primary }]}>Capacidade máxima atingida.</Text>
          )}
        </Panel>

        <Panel style={styles.tipPanel}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            Os salários são descontados a cada rodada. O clube recebe a bilheteria quando joga em casa. Ampliações aumentam a renda potencial.
          </Text>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  balancePanel: { padding: 19, gap: 8 },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  balanceIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9, opacity: 0.85 },
  balanceAmount: { fontSize: 29, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 },
  balanceNote: { fontSize: 10, opacity: 0.76 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metricCard: { width: '48.3%', minHeight: 113, borderRadius: 17, borderWidth: 1, padding: 11, alignItems: 'flex-start', justifyContent: 'center', gap: 3 },
  metricIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  metricValue: { fontSize: 13, fontWeight: '900' },
  metricLabel: { fontSize: 9, fontWeight: '700' },
  metricDetail: { fontSize: 8 },
  stadiumPanel: { gap: 14 },
  stadiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stadiumIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stadiumName: { fontSize: 13, fontWeight: '800' },
  stadiumSub: { fontSize: 10, marginTop: 3 },
  capacityTrack: { height: 8, borderRadius: 5, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: 5 },
  upgradeTextLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  upgradeDetail: { fontSize: 9, flex: 1 },
  upgradeCost: { fontSize: 10, fontWeight: '800' },
  maxLevel: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  tipPanel: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12 },
  tipText: { flex: 1, fontSize: 10, lineHeight: 16 },
});
