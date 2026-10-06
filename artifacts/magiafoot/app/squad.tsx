import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { effectiveStrength, formatCurrency, getRosterGroups } from '@/game/engine';
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
  const ordered = [...career.players].sort((a, b) => {
    const order = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];
    return order.indexOf(a.position) - order.indexOf(b.position) || b.strength - a.strength;
  });

  return (
    <>
      <GameHeader title="Elenco" eyebrow={career.players.length + ' JOGADORES'} />
      <Screen>
        <View style={styles.summary}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>TITULARES</Text><Text style={styles.metricValue}>{groups.starters.length}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>RESERVAS</Text><Text style={styles.metricValue}>{groups.bench.length + groups.reserves.length}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>FOLHA/SEM</Text><Text style={styles.metricValueSmall}>{formatCurrency(totalWages)}</Text></Panel>
        </View>

        <Panel style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.pos, styles.headText]}>POS</Text>
            <Text style={[styles.name, styles.headText]}>JOGADOR</Text>
            <Text style={[styles.age, styles.headText]}>IDADE</Text>
            <Text style={[styles.force, styles.headText]}>FOR</Text>
          </View>
          {ordered.map((player) => {
            const captain = player.id === career.captainId;
            return (
              <Pressable key={player.id} onPress={() => chooseCaptain(player.id)} style={styles.row}>
                <Text style={[styles.pos, styles.text]}>{player.position}</Text>
                <View style={styles.name}>
                  <Text numberOfLines={1} style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.status}>{captain ? '★ Capitão' : player.status === 'available' ? 'Disponível' : player.status === 'injured' ? 'Lesionado' : 'Suspenso'}</Text>
                </View>
                <Text style={[styles.age, styles.text]}>{player.age}</Text>
                <Text style={[styles.force, styles.rating]}>{effectiveStrength(player)}</Text>
              </Pressable>
            );
          })}
        </Panel>

        <GameButton label="ORGANIZAR ESCALAÇÃO" icon="layout" onPress={() => router.push('/tactics')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, minHeight: 92, justifyContent: 'center', gap: 7, backgroundColor: '#153426', borderColor: '#2c503d' },
  metricLabel: { color: '#8fa696', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  metricValue: { color: '#f5f7f5', fontSize: 24, fontWeight: '900' },
  metricValueSmall: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  table: { padding: 0, overflow: 'hidden' },
  tableHead: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#173326' },
  headText: { color: '#8fa696', fontSize: 10, fontWeight: '900' },
  row: { minHeight: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#214231' },
  text: { color: '#e6eee8', fontSize: 13 },
  playerName: { color: '#f6f8f6', fontSize: 14, fontWeight: '900' },
  status: { color: '#85a08e', fontSize: 9, marginTop: 3 },
  rating: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
  pos: { width: 48 },
  name: { flex: 1 },
  age: { width: 58, textAlign: 'center' },
  force: { width: 48, textAlign: 'right' },
});
