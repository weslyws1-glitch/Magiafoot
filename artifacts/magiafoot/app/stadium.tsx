import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function InfrastructureScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Infraestrutura" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar a infraestrutura do clube.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const stadiumCapacity = club.stadiumCapacity + career.stadiumLevel * 3500;
  const stadiumMaintenance = 65000 + career.stadiumLevel * 18000;
  const trainingMaintenance = 48000;
  const hqMaintenance = 36000;
  const monthlyMaintenance = stadiumMaintenance + trainingMaintenance + hqMaintenance;

  const options = [
    {
      title: 'Estádio',
      subtitle: 'Campo, arquibancadas, cobertura, iluminação, camarotes e experiência da torcida.',
      icon: 'home',
      route: '/infrastructure-stadium',
      meta: stadiumCapacity.toLocaleString('pt-BR') + ' lugares',
    },
    {
      title: 'Centro de treinamento',
      subtitle: 'Campos, academia, departamento médico, fisioterapia e desenvolvimento do elenco.',
      icon: 'target',
      route: '/training-center',
      meta: 'Nível inicial',
    },
    {
      title: 'Sede do clube',
      subtitle: 'Diretoria, marketing, loja oficial, museu, imprensa e administração.',
      icon: 'briefcase',
      route: '/club-headquarters',
      meta: 'Nível inicial',
    },
  ];

  return (
    <>
      <GameHeader title="Infraestrutura" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.heroIcon}><Feather name="layers" size={30} color="#79ef91" /></View>
          <Text style={styles.heroTitle}>Infraestrutura do {club.name}</Text>
          <Text style={styles.heroSub}>Escolha uma área para administrar e evoluir.</Text>
        </Panel>

        <SectionLabel title="Áreas" />
        <View style={styles.options}>
          {options.map((item) => (
            <Pressable key={item.title} onPress={() => router.push(item.route as any)}>
              <Panel style={styles.optionCard}>
                <View style={styles.optionIcon}>
                  <Feather name={item.icon as any} size={24} color="#79ef91" />
                </View>
                <View style={styles.optionBody}>
                  <Text style={styles.optionTitle}>{item.title}</Text>
                  <Text style={styles.optionText}>{item.subtitle}</Text>
                  <Text style={styles.optionMeta}>{item.meta}</Text>
                </View>
                <Feather name="chevron-right" size={22} color="#79ef91" />
              </Panel>
            </Pressable>
          ))}
        </View>

        <SectionLabel title="Finanças das estruturas" />
        <View style={styles.financeGrid}>
          <Panel style={styles.metric}>
            <Text style={styles.metricLabel}>CAIXA DO CLUBE</Text>
            <Text style={styles.metricValue}>{formatCurrency(career.balance)}</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.metricLabel}>MANUTENÇÃO / MÊS</Text>
            <Text style={styles.metricValue}>{formatCurrency(monthlyMaintenance)}</Text>
          </Panel>
        </View>

        <Panel style={styles.financePanel}>
          <View style={styles.financeRow}>
            <Text style={styles.financeName}>Estádio</Text>
            <Text style={styles.financeValue}>{formatCurrency(stadiumMaintenance)}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeName}>Centro de treinamento</Text>
            <Text style={styles.financeValue}>{formatCurrency(trainingMaintenance)}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeName}>Sede do clube</Text>
            <Text style={styles.financeValue}>{formatCurrency(hqMaintenance)}</Text>
          </View>
          <View style={[styles.financeRow, styles.financeTotal]}>
            <Text style={styles.financeTotalLabel}>TOTAL MENSAL</Text>
            <Text style={styles.financeTotalValue}>{formatCurrency(monthlyMaintenance)}</Text>
          </View>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24, backgroundColor: '#153426', borderColor: '#2c503d' },
  heroIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  heroTitle: { color: '#f5f7f5', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  heroSub: { color: '#9fb2a5', fontSize: 11, textAlign: 'center' },
  options: { gap: 10 },
  optionCard: { minHeight: 118, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#153426', borderColor: '#2c503d' },
  optionIcon: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#356a4a' },
  optionBody: { flex: 1, minWidth: 0 },
  optionTitle: { color: '#f5f7f5', fontSize: 15, fontWeight: '900' },
  optionText: { color: '#9fb2a5', fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  optionMeta: { color: '#79ef91', fontSize: 9, fontWeight: '900', marginTop: 7 },
  financeGrid: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, minHeight: 100, justifyContent: 'center', gap: 7 },
  metricLabel: { color: '#90a898', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  metricValue: { color: '#f5f7f5', fontSize: 16, fontWeight: '900' },
  financePanel: { paddingVertical: 4, backgroundColor: '#10291d', borderColor: '#2c503d' },
  financeRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#274535' },
  financeName: { color: '#dce8df', fontSize: 10, fontWeight: '800' },
  financeValue: { color: '#f5f7f5', fontSize: 10, fontWeight: '900' },
  financeTotal: { borderBottomWidth: 0, marginTop: 2, backgroundColor: '#153426' },
  financeTotalLabel: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  financeTotalValue: { color: '#79ef91', fontSize: 12, fontWeight: '900' },
});