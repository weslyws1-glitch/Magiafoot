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
  const currency = career.currency ?? 'BRL';
  const wages = career.players.reduce((sum, player) => sum + player.wage, 0);
  const wageBudget = career.finance?.weeklyWageBudget ?? wages;
  const wageRoom = Math.max(0, wageBudget - wages);
  const transferBudget = career.finance?.transferBudget ?? 0;
  const squadValue = career.players.reduce((sum, player) => sum + player.value, 0);
  const capacity = (club?.stadiumCapacity ?? 0) + Math.max(0, (career.stadiumUpgrades?.stands ?? 1) - 1) * 4_000;
  const expectedAttendance = Math.round(capacity * 0.72);
  const expectedGate = expectedAttendance * (career.ticketPrice ?? club?.ticketPrice ?? 0);
  const sponsorPerMatch = (career.sponsorships?.contracts ?? []).reduce((sum, contract) => sum + contract.perMatch, 0);
  const adminWeekly = [
    ...(career.administrationStaff?.board ?? []),
    ...(career.administrationStaff?.finance ?? []),
    ...(career.administrationStaff?.legal ?? []),
  ].reduce((sum, person) => sum + person.salary, 0);
  const estimatedMonthlyIncome = expectedGate * 2 + sponsorPerMatch * 4;
  const estimatedMonthlyCosts = wages * 4 + adminWeekly * 4;
  const monthlyResult = estimatedMonthlyIncome - estimatedMonthlyCosts;
  const finance = career.finance;

  const seasonRows = [
    { label: 'Bilheteria', value: finance?.seasonMatchdayIncome ?? 0 },
    { label: 'Patrocínios', value: finance?.seasonSponsorshipIncome ?? 0 },
    { label: 'Vendas', value: finance?.seasonTransferIncome ?? 0 },
    { label: 'Compras', value: -(finance?.seasonTransferSpend ?? 0) },
    { label: 'Salários pagos', value: -(finance?.seasonWagesPaid ?? 0) },
  ];

  return (
    <>
      <GameHeader title="Finanças" eyebrow={club?.name ?? 'Clube'} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>CAIXA DO CLUBE</Text>
            <Text style={styles.heroValue}>{formatCurrency(career.balance, currency)}</Text>
            <Text style={styles.heroSub}>Moeda da carreira: {currency}</Text>
          </View>
          <View style={styles.heroIcon}><Feather name="bar-chart-2" size={27} color="#79ef91" /></View>
        </Panel>

        <Text style={styles.sectionTitle}>ORÇAMENTOS</Text>
        <View style={styles.grid}>
          <Panel style={styles.metric}>
            <Text style={styles.label}>TRANSFERÊNCIAS</Text>
            <Text style={styles.value}>{formatCurrency(transferBudget, currency)}</Text>
            <Text style={styles.detail}>verba liberada pela diretoria</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.label}>FOLHA / LIMITE</Text>
            <Text style={styles.value}>{formatCurrency(wages, currency)}</Text>
            <Text style={styles.detail}>de {formatCurrency(wageBudget, currency)} por semana</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.label}>MARGEM SALARIAL</Text>
            <Text style={[styles.value, wageRoom <= 0 && styles.negative]}>{formatCurrency(wageRoom, currency)}</Text>
            <Text style={styles.detail}>espaço para novos contratos</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.label}>VALOR DO ELENCO</Text>
            <Text style={styles.value}>{formatCurrency(squadValue, currency)}</Text>
            <Text style={styles.detail}>{career.players.length} jogadores</Text>
          </Panel>
        </View>

        <Text style={styles.sectionTitle}>PROJEÇÃO MENSAL</Text>
        <Panel style={styles.forecast}>
          <View style={styles.forecastRow}>
            <Text style={styles.forecastLabel}>Receitas estimadas</Text>
            <Text style={styles.positive}>{formatCurrency(estimatedMonthlyIncome, currency)}</Text>
          </View>
          <View style={styles.forecastRow}>
            <Text style={styles.forecastLabel}>Custos estimados</Text>
            <Text style={styles.negative}>{formatCurrency(estimatedMonthlyCosts, currency)}</Text>
          </View>
          <View style={[styles.forecastRow, styles.forecastTotal]}>
            <Text style={styles.forecastTotalLabel}>Resultado projetado</Text>
            <Text style={monthlyResult >= 0 ? styles.positiveStrong : styles.negativeStrong}>{formatCurrency(monthlyResult, currency)}</Text>
          </View>
          <Text style={styles.forecastHint}>Inclui folha, equipe administrativa, bilheteria média e contratos de patrocínio ativos.</Text>
        </Panel>

        <Text style={styles.sectionTitle}>TEMPORADA</Text>
        <Panel style={styles.breakdown}>
          {seasonRows.map((row) => (
            <View key={row.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{row.label}</Text>
              <Text style={row.value >= 0 ? styles.breakdownPositive : styles.breakdownNegative}>
                {row.value >= 0 ? '+' : ''}{formatCurrency(row.value, currency)}
              </Text>
            </View>
          ))}
          <View style={[styles.breakdownRow, styles.debtRow]}>
            <Text style={styles.breakdownLabel}>Dívida financeira</Text>
            <Text style={(finance?.debt ?? 0) > 0 ? styles.breakdownNegative : styles.breakdownMuted}>{formatCurrency(finance?.debt ?? 0, currency)}</Text>
          </View>
        </Panel>

        <Text style={styles.sectionTitle}>MOVIMENTAÇÕES RECENTES</Text>
        <Panel style={styles.ledger}>
          {(finance?.ledger ?? []).length ? (finance?.ledger ?? []).slice(0, 8).map((entry) => (
            <View key={entry.id} style={styles.ledgerRow}>
              <View style={styles.ledgerIcon}>
                <Feather name={entry.amount >= 0 ? 'arrow-down-left' : 'arrow-up-right'} size={14} color={entry.amount >= 0 ? '#79ef91' : '#ff8a8a'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerTitle}>{entry.description}</Text>
                <Text style={styles.ledgerMeta}>Rodada {entry.roundIndex + 1} · {entry.category.replace('_', ' ')}</Text>
              </View>
              <Text style={entry.amount >= 0 ? styles.ledgerIn : styles.ledgerOut}>
                {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount, currency)}
              </Text>
            </View>
          )) : (
            <Text style={styles.empty}>As movimentações financeiras da carreira aparecerão aqui.</Text>
          )}
        </Panel>

        <Panel style={styles.info}>
          <Feather name="info" size={17} color="#79ef91" />
          <Text style={styles.infoText}>O caixa e o orçamento de transferências são diferentes. Uma venda não libera automaticamente 100% do valor para novas contratações, e a folha salarial também limita o mercado.</Text>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 130, backgroundColor: '#29563a', borderColor: '#356a4a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: '#b7c7bd', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  heroValue: { color: '#f5f7f5', fontSize: 27, fontWeight: '900', marginTop: 7 },
  heroSub: { color: '#a6b9ac', fontSize: 9, marginTop: 6 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#0b2117', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#dce8df', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 110, justifyContent: 'center', gap: 5 },
  label: { color: '#8fa696', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  value: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  detail: { color: '#789080', fontSize: 8, lineHeight: 12 },
  negative: { color: '#ff8a8a' },
  forecast: { gap: 11 },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  forecastLabel: { color: '#aabbb0', fontSize: 10 },
  positive: { color: '#79ef91', fontSize: 11, fontWeight: '900' },
  positiveStrong: { color: '#79ef91', fontSize: 15, fontWeight: '900' },
  negativeStrong: { color: '#ff8a8a', fontSize: 15, fontWeight: '900' },
  forecastTotal: { borderTopWidth: 1, borderTopColor: '#284837', paddingTop: 11 },
  forecastTotalLabel: { color: '#f5f7f5', fontSize: 11, fontWeight: '900' },
  forecastHint: { color: '#6f8577', fontSize: 7.5, lineHeight: 11 },
  breakdown: { paddingVertical: 4 },
  breakdownRow: { minHeight: 42, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284837' },
  breakdownLabel: { color: '#a8b9ae', fontSize: 9.5 },
  breakdownPositive: { color: '#79ef91', fontSize: 9.5, fontWeight: '900' },
  breakdownNegative: { color: '#ff8a8a', fontSize: 9.5, fontWeight: '900' },
  breakdownMuted: { color: '#9fb2a5', fontSize: 9.5, fontWeight: '900' },
  debtRow: { borderBottomWidth: 0 },
  ledger: { paddingVertical: 4 },
  ledgerRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284837' },
  ledgerIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#10291d', alignItems: 'center', justifyContent: 'center' },
  ledgerTitle: { color: '#f3f6f4', fontSize: 9.5, fontWeight: '800' },
  ledgerMeta: { color: '#71877a', fontSize: 6.8, marginTop: 3, textTransform: 'capitalize' },
  ledgerIn: { color: '#79ef91', fontSize: 9, fontWeight: '900' },
  ledgerOut: { color: '#ff8a8a', fontSize: 9, fontWeight: '900' },
  empty: { color: '#789080', fontSize: 9, textAlign: 'center', paddingVertical: 18 },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#9fb2a5', fontSize: 9, lineHeight: 14 },
});
