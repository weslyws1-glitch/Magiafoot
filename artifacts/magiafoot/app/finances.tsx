import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function FinancesScreen() {
  const colors = useColors();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Finanças" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar as finanças.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  const wages = career.players.reduce((sum, player) => sum + player.wage, 0);
  const capacity = (club?.stadiumCapacity ?? 0) + career.stadiumLevel * 3500;
  const ticket = club?.ticketPrice ?? 0;
  const expectedGate = Math.round(capacity * ticket * 0.72);
  const payrollMonth = wages * 4;
  const projection = career.balance + expectedGate - payrollMonth;

  return (
    <>
      <GameHeader title="Finanças" eyebrow={club?.name ?? 'Clube'} />
      <Screen>
        <Panel style={styles.hero}>
          <View>
            <Text style={styles.heroLabel}>SALDO DO CLUBE</Text>
            <Text style={styles.heroValue}>{formatCurrency(career.balance)}</Text>
            <Text style={styles.heroSub}>Atualizado após jogos, salários e transferências.</Text>
          </View>
          <View style={styles.heroIcon}><Feather name="dollar-sign" size={27} color="#79ef91" /></View>
        </Panel>

        <View style={styles.grid}>
          <Panel style={styles.metric}><Text style={styles.label}>FOLHA SEMANAL</Text><Text style={styles.value}>{formatCurrency(wages)}</Text><Text style={styles.detail}>{career.players.length} jogadores</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.label}>FOLHA MENSAL</Text><Text style={styles.value}>{formatCurrency(payrollMonth)}</Text><Text style={styles.detail}>estimativa de 4 semanas</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.label}>BILHETERIA</Text><Text style={styles.value}>{formatCurrency(expectedGate)}</Text><Text style={styles.detail}>estimativa em casa</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.label}>PROJEÇÃO</Text><Text style={[styles.value, projection < 0 && styles.negative]}>{formatCurrency(projection)}</Text><Text style={styles.detail}>saldo + renda - folha</Text></Panel>
        </View>

        <Panel style={styles.info}>
          <Feather name="info" size={17} color="#79ef91" />
          <Text style={styles.infoText}>Contratações reduzem o caixa imediatamente. Vendas aumentam o saldo. Ampliar o estádio aumenta a capacidade e a receita potencial dos jogos em casa.</Text>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 130, backgroundColor: '#29563a', borderColor: '#356a4a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: '#b7c7bd', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  heroValue: { color: '#f5f7f5', fontSize: 29, fontWeight: '900', marginTop: 7 },
  heroSub: { color: '#a6b9ac', fontSize: 10, marginTop: 6 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#0b2117', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 112, justifyContent: 'center', gap: 5 },
  label: { color: '#8fa696', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  value: { color: '#f5f7f5', fontSize: 15, fontWeight: '900' },
  detail: { color: '#789080', fontSize: 9 },
  negative: { color: '#ff7474' },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#9fb2a5', fontSize: 10, lineHeight: 16 },
});
