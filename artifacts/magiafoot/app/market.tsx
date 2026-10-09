import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { effectiveStrength } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

function flagEmoji(code?: string) {
  if (!code || code.length !== 2) return '🌍';
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export default function MarketScreen() {
  const colors = useColors();
  const { career, signPlayer, transferPlayer } = useCareer();

  if (!career) {
    return <><GameHeader title="Mercado" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para acessar o mercado.</Text></Screen></>;
  }

  const currency = career.currency ?? 'BRL';
  const transferBudget = career.finance?.transferBudget ?? career.balance;
  const wageBill = career.players.reduce((sum, player) => sum + player.wage, 0);
  const wageBudget = career.finance?.weeklyWageBudget ?? wageBill;
  const wageRoom = Math.max(0, wageBudget - wageBill);

  return (
    <>
      <GameHeader title="Mercado" eyebrow="TRANSFERÊNCIAS" />
      <Screen>
        <View style={styles.budgetGrid}>
          <Panel style={styles.budgetCard}>
            <Text style={styles.budgetLabel}>ORÇAMENTO DE TRANSFERÊNCIAS</Text>
            <Text style={styles.budgetValue}>{formatCurrency(transferBudget, currency)}</Text>
          </Panel>
          <Panel style={styles.budgetCard}>
            <Text style={styles.budgetLabel}>MARGEM SALARIAL / SEMANA</Text>
            <Text style={styles.budgetValue}>{formatCurrency(wageRoom, currency)}</Text>
          </Panel>
        </View>

        <Panel style={styles.infoStrip}>
          <Feather name="briefcase" size={16} color="#79ef91" />
          <Text style={styles.infoStripText}>Uma contratação precisa caber no orçamento de compra, no caixa do clube e também na folha salarial.</Text>
        </Panel>

        <Text style={styles.sectionTitle}>JOGADORES OBSERVADOS</Text>
        <Panel style={styles.list}>
          {career.market.map((player) => {
            const canBuy =
              transferBudget >= player.value &&
              career.balance >= player.value &&
              wageBill + player.wage <= wageBudget &&
              career.players.length < 32;

            return (
              <View key={player.id} style={styles.row}>
                <View style={styles.rating}><Text style={styles.ratingText}>{effectiveStrength(player)}</Text></View>
                <View style={styles.info}>
                  <View style={styles.nameLine}>
                    <Text numberOfLines={1} style={styles.name}>{player.name}</Text>
                    <Text style={styles.flag}>{flagEmoji(player.nationalityCode)}</Text>
                  </View>
                  <Text style={styles.meta}>{player.position} · {player.age} anos · {player.nationality ?? 'Internacional'}</Text>
                  <Text style={styles.money}>Valor {formatCurrency(player.value, currency)} · salário {formatCurrency(player.wage, currency)}/sem</Text>
                </View>
                <Pressable disabled={!canBuy} onPress={() => signPlayer(player.id)} style={[styles.action, !canBuy && styles.disabled]}>
                  <Text style={styles.actionText}>NEGOCIAR</Text>
                </Pressable>
              </View>
            );
          })}
        </Panel>

        <Text style={styles.sectionTitle}>SEU ELENCO NO MERCADO</Text>
        <Panel style={styles.list}>
          {career.players
            .filter((p) => !career.lineup.some((s) => s.playerId === p.id) && !career.benchIds.includes(p.id))
            .sort((a, b) => b.value - a.value)
            .map((player) => (
              <View key={player.id} style={styles.row}>
                <View style={styles.rating}><Text style={styles.ratingText}>{effectiveStrength(player)}</Text></View>
                <View style={styles.info}>
                  <Text numberOfLines={1} style={styles.name}>{player.name}</Text>
                  <Text style={styles.meta}>{player.position} · {player.age} anos · salário {formatCurrency(player.wage, currency)}/sem</Text>
                  <Text style={styles.money}>Valor de mercado {formatCurrency(player.value, currency)}</Text>
                </View>
                <Pressable onPress={() => transferPlayer(player.id)} style={[styles.action, styles.sell]}>
                  <Text style={styles.sellText}>VENDER</Text>
                </Pressable>
              </View>
            ))}
        </Panel>

        <Panel style={styles.marketFuture}>
          <Feather name="globe" size={18} color="#79ef91" />
          <View style={{ flex: 1 }}>
            <Text style={styles.marketFutureTitle}>Mercado internacional preparado</Text>
            <Text style={styles.marketFutureText}>A estrutura já aceita nacionalidade, clubes de origem, diferentes países e valores exibidos em real, dólar ou euro.</Text>
          </View>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  budgetGrid: { flexDirection: 'row', gap: 10 },
  budgetCard: { flex: 1, minHeight: 104, justifyContent: 'center', gap: 7, backgroundColor: '#153426', borderColor: '#356a4a' },
  budgetLabel: { color: '#8fa696', fontSize: 7, fontWeight: '900', letterSpacing: 0.55, lineHeight: 10 },
  budgetValue: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  infoStrip: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  infoStripText: { flex: 1, color: '#9fb2a5', fontSize: 8.5, lineHeight: 13 },
  sectionTitle: { color: '#dce8df', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  list: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  rating: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  ratingText: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
  info: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#f5f7f5', fontSize: 12.5, fontWeight: '900', flexShrink: 1 },
  flag: { fontSize: 14 },
  meta: { color: '#8fa696', fontSize: 8, marginTop: 4 },
  money: { color: '#b5c5bb', fontSize: 7.5, marginTop: 3, fontWeight: '700' },
  action: { minHeight: 36, borderRadius: 10, backgroundColor: '#79ef91', justifyContent: 'center', paddingHorizontal: 9 },
  actionText: { color: '#07150d', fontSize: 7.5, fontWeight: '900' },
  disabled: { opacity: 0.3 },
  sell: { backgroundColor: '#153426', borderWidth: 1, borderColor: '#2c503d' },
  sellText: { color: '#dce8df', fontSize: 7.5, fontWeight: '900' },
  marketFuture: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  marketFutureTitle: { color: '#f5f7f5', fontSize: 10, fontWeight: '900' },
  marketFutureText: { color: '#829789', fontSize: 8, lineHeight: 12, marginTop: 3 },
});
