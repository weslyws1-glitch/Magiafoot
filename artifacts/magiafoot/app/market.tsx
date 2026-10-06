import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { effectiveStrength } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function MarketScreen() {
  const colors = useColors();
  const { career, signPlayer, transferPlayer } = useCareer();

  if (!career) {
    return <><GameHeader title="Mercado" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para acessar o mercado.</Text></Screen></>;
  }

  return (
    <>
      <GameHeader title="Mercado" eyebrow="TRANSFERÊNCIAS" />
      <Screen>
        <Panel style={styles.balance}>
          <View><Text style={styles.balanceLabel}>CAIXA DISPONÍVEL</Text><Text style={styles.balanceValue}>{formatCurrency(career.balance)}</Text></View>
          <Feather name="search" size={28} color="#79ef91" />
        </Panel>

        <Text style={styles.sectionTitle}>JOGADORES DISPONÍVEIS</Text>
        <Panel style={styles.list}>
          {career.market.map((player) => {
            const canBuy = career.balance >= player.value && career.players.length < 32;
            return (
              <View key={player.id} style={styles.row}>
                <View style={styles.rating}><Text style={styles.ratingText}>{effectiveStrength(player)}</Text></View>
                <View style={styles.info}>
                  <Text style={styles.name}>{player.name}</Text>
                  <Text style={styles.meta}>{player.position} · {player.age} anos · {formatCurrency(player.value)}</Text>
                </View>
                <Pressable disabled={!canBuy} onPress={() => signPlayer(player.id)} style={[styles.action, !canBuy && styles.disabled]}>
                  <Text style={styles.actionText}>COMPRAR</Text>
                </Pressable>
              </View>
            );
          })}
        </Panel>

        <Text style={styles.sectionTitle}>VENDER JOGADORES</Text>
        <Panel style={styles.list}>
          {career.players.filter((p) => !career.lineup.some((s) => s.playerId === p.id) && !career.benchIds.includes(p.id)).map((player) => (
            <View key={player.id} style={styles.row}>
              <View style={styles.rating}><Text style={styles.ratingText}>{effectiveStrength(player)}</Text></View>
              <View style={styles.info}>
                <Text style={styles.name}>{player.name}</Text>
                <Text style={styles.meta}>{player.position} · valor {formatCurrency(player.value)}</Text>
              </View>
              <Pressable onPress={() => transferPlayer(player.id)} style={[styles.action, styles.sell]}>
                <Text style={styles.sellText}>VENDER</Text>
              </Pressable>
            </View>
          ))}
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  balance: { minHeight: 108, backgroundColor: '#153426', borderColor: '#356a4a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { color: '#9fb2a5', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  balanceValue: { color: '#f5f7f5', fontSize: 25, fontWeight: '900', marginTop: 6 },
  sectionTitle: { color: '#dce8df', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  list: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  rating: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  ratingText: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
  info: { flex: 1 },
  name: { color: '#f5f7f5', fontSize: 13, fontWeight: '900' },
  meta: { color: '#8fa696', fontSize: 9, marginTop: 4 },
  action: { minHeight: 36, borderRadius: 10, backgroundColor: '#79ef91', justifyContent: 'center', paddingHorizontal: 10 },
  actionText: { color: '#07150d', fontSize: 8, fontWeight: '900' },
  disabled: { opacity: 0.35 },
  sell: { backgroundColor: '#153426', borderWidth: 1, borderColor: '#2c503d' },
  sellText: { color: '#dce8df', fontSize: 8, fontWeight: '900' },
});
