import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, PlayerRow, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { formatCurrency, getRosterGroups } from '@/game/engine';
import type { Position } from '@/game/types';
import { useColors } from '@/hooks/useColors';

const FILTERS: (Position | 'TODOS')[] = ['TODOS', 'GOL', 'ZAG', 'LE', 'LD', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];

export default function MarketScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, signPlayer, transferPlayer } = useCareer();
  const [filter, setFilter] = useState<Position | 'TODOS'>('TODOS');
  const [saleCandidate, setSaleCandidate] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  if (!career) {
    return <><GameHeader title="Mercado" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }
  const groups = getRosterGroups(career);
  const club = getClub(career.clubId);
  const blockedByMatch = Boolean(career.liveMatch && career.liveMatch.phase !== 'finished');
  const filtered = career.market
    .filter((player) => filter === 'TODOS' || player.position === filter)
    .sort((a, b) => b.strength - a.strength);
  const selectedSale = career.players.find((player) => player.id === saleCandidate);

  const buy = (playerId: string) => {
    if (blockedByMatch) {
      setNotice('Finalize a partida antes de negociar jogadores.');
      return;
    }
    const success = signPlayer(playerId);
    setNotice(success ? 'Contratação concluída. O atleta já está disponível para a escalação.' : career.players.length >= 32 ? 'O elenco atingiu o limite de 32 jogadores.' : 'Saldo insuficiente para esta contratação.');
  };

  const confirmSale = () => {
    if (!saleCandidate) return;
    const success = transferPlayer(saleCandidate);
    setNotice(success ? 'Venda concluída. O valor foi adicionado ao caixa.' : 'Este atleta não pode ser negociado agora.');
    setSaleCandidate(null);
  };

  return (
    <>
      <GameHeader title="Mercado" eyebrow={club?.name.toUpperCase()} right={<Text style={[styles.balanceTag, { color: colors.primary }]}>{formatCurrency(career.balance)}</Text>} />
      <Screen>
        <Panel style={styles.marketSummary}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}><Feather name="repeat" size={19} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Movimente o elenco</Text>
            <Text style={[styles.summaryDescription, { color: colors.mutedForeground }]}>
              {career.players.length}/32 atletas · {groups.reserves.length} disponíveis para venda
            </Text>
          </View>
        </Panel>

        <SectionLabel title="Buscar reforços" action={<Text style={[styles.count, { color: colors.mutedForeground }]}>{career.market.length} ATLETAS</Text>} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const selected = filter === item;
            return (
              <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                <Text style={[styles.filterText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{item === 'TODOS' ? 'Todos' : item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Panel style={styles.playersPanel}>
          {filtered.map((player) => {
            const affordable = career.balance >= player.value && career.players.length < 32;
            return (
              <View key={player.id} style={[styles.marketRow, { borderBottomColor: colors.border }]}>
                <PlayerRow player={player} trailing={
                  <View style={styles.playerMoney}>
                  <Text style={[styles.price, { color: colors.foreground }]}>{formatCurrency(player.value)}</Text>
                  <Text style={[styles.wage, { color: colors.mutedForeground }]}>{formatCurrency(player.wage)}/sem</Text>
                  </View>
                } />
                <GameButton
                  label={affordable ? 'Contratar' : 'Sem saldo'}
                  icon={affordable ? 'plus' : 'lock'}
                  compact
                  disabled={!affordable || blockedByMatch}
                  onPress={() => buy(player.id)}
                />
              </View>
            );
          })}
          {!filtered.length ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>{career.market.length ? 'Nenhum atleta nessa posição.' : 'Não há mais jogadores disponíveis no mercado.'}</Text> : null}
        </Panel>

        {notice ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
        {blockedByMatch ? <Text style={[styles.matchLock, { color: colors.mutedForeground }]}>Negociações pausadas durante uma partida.</Text> : null}

        <SectionLabel title="Jogadores negociáveis" action={<Text style={[styles.count, { color: colors.mutedForeground }]}>FORA DA ESCALAÇÃO</Text>} />
        <Panel style={styles.playersPanel}>
          {groups.reserves.map((player) => (
            <View key={player.id} style={[styles.saleRow, { borderBottomColor: colors.border }]}>
              <PlayerRow player={player} />
              <View style={styles.saleControls}>
                <Text style={[styles.saleValue, { color: colors.mutedForeground }]}>{formatCurrency(Math.round(player.value * 0.75))}</Text>
                <GameButton label="Vender" icon="dollar-sign" compact variant="outline" disabled={blockedByMatch || career.players.length <= 18} onPress={() => setSaleCandidate(player.id)} />
              </View>
            </View>
          ))}
          {!groups.reserves.length ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>Nenhum jogador fora do banco está disponível para venda.</Text> : null}
        </Panel>

        {selectedSale ? (
          <Panel style={[styles.confirmPanel, { borderColor: colors.destructive }]}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Confirmar venda de {selectedSale.name}?</Text>
            <Text style={[styles.confirmDescription, { color: colors.mutedForeground }]}>
              O jogador sairá do clube. O caixa recebe {formatCurrency(Math.round(selectedSale.value * 0.75))}.
            </Text>
            <View style={styles.confirmButtons}>
              <View style={{ flex: 1 }}><GameButton label="Voltar" variant="outline" compact onPress={() => setSaleCandidate(null)} /></View>
              <View style={{ flex: 1 }}><GameButton label="Confirmar venda" icon="check" variant="danger" compact onPress={confirmSale} /></View>
            </View>
          </Panel>
        ) : null}
        <Text style={[styles.note, { color: colors.mutedForeground }]}>Contratos e negociações são simulados. Os nomes e clubes pertencem ao universo de Magiafoot.</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  balanceTag: { fontSize: 10, fontWeight: '900', textAlign: 'right' },
  marketSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { width: 41, height: 41, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 13, fontWeight: '800' },
  summaryDescription: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  count: { fontSize: 8, fontWeight: '900', letterSpacing: 0.55 },
  filters: { flexDirection: 'row', gap: 7, paddingBottom: 3 },
  filterChip: { minHeight: 33, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 10, fontWeight: '800' },
  playersPanel: { paddingVertical: 3 },
  marketRow: { minHeight: 105, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center', gap: 3, paddingBottom: 7 },
  playerMoney: { alignItems: 'flex-end', paddingLeft: 6 },
  price: { fontSize: 10, fontWeight: '900' },
  wage: { fontSize: 8, marginTop: 3 },
  saleRow: { minHeight: 99, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center', gap: 2 },
  saleControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 5 },
  saleValue: { fontSize: 9, fontWeight: '700' },
  empty: { fontSize: 11, lineHeight: 17, paddingVertical: 11 },
  notice: { fontSize: 10, fontWeight: '700', lineHeight: 15 },
  matchLock: { fontSize: 10, textAlign: 'center' },
  confirmPanel: { borderWidth: 1, gap: 9 },
  confirmTitle: { fontSize: 13, fontWeight: '800' },
  confirmDescription: { fontSize: 10, lineHeight: 16 },
  confirmButtons: { flexDirection: 'row', gap: 8, marginTop: 3 },
  note: { fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 6 },
});
