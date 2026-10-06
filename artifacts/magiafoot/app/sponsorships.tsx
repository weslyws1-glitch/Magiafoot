import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { HEADQUARTERS_INVESTMENT_MONTHLY_COST, headquartersInvestmentLabel } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function SponsorshipsScreen() {
  const colors = useColors();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Patrocínios" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar os patrocínios.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const investments = career.headquartersInvestments ?? { marketing: 3, commercial: 3 };
  const marketing = investments.marketing ?? 3;
  const commercial = investments.commercial ?? 3;
  const reputation = Math.min(100, 28 + marketing * 7 + (career.headquartersUpgrades?.press ?? 0) * 6 + (career.headquartersUpgrades?.museum ?? 0) * 5);
  const commercialStrength = Math.min(100, 30 + commercial * 12 + reputation * 0.24);
  const marketValue = Math.round(90000 + reputation * 4200 + commercialStrength * 3500);
  const monthlyCommercialCost = (HEADQUARTERS_INVESTMENT_MONTHLY_COST[marketing] ?? 65000) + (HEADQUARTERS_INVESTMENT_MONTHLY_COST[commercial] ?? 65000);

  return (
    <>
      <GameHeader title="Patrocínios" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.icon}><Feather name="award" size={28} color="#79ef91" /></View>
          <View style={styles.heroBody}>
            <Text style={styles.kicker}>CENTRAL DE PATROCÍNIOS</Text>
            <Text style={styles.title}>{club.name}</Text>
            <Text style={styles.sub}>Área exclusiva para propostas, contratos e valorização comercial do clube.</Text>
          </View>
        </Panel>

        <View style={styles.metrics}>
          <Panel style={styles.metric}>
            <Text style={styles.metricLabel}>REPUTAÇÃO</Text>
            <Text style={styles.metricValue}>{reputation}/100</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.metricLabel}>FORÇA COMERCIAL</Text>
            <Text style={styles.metricValue}>{Math.round(commercialStrength)}/100</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.metricLabel}>VALOR DE MERCADO</Text>
            <Text style={styles.metricValueSmall}>{formatCurrency(marketValue)}</Text>
          </Panel>
          <Panel style={styles.metric}>
            <Text style={styles.metricLabel}>INVESTIMENTO COMERCIAL</Text>
            <Text style={styles.metricValueSmall}>{formatCurrency(monthlyCommercialCost)}/mês</Text>
          </Panel>
        </View>

        <SectionLabel title="Estrutura comercial atual" />
        <Panel style={styles.infoPanel}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Marketing</Text>
            <Text style={styles.infoValue}>{headquartersInvestmentLabel(marketing)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Departamento comercial</Text>
            <Text style={styles.infoValue}>{headquartersInvestmentLabel(commercial)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoLast]}>
            <Text style={styles.infoLabel}>Capacidade de negociação</Text>
            <Text style={styles.infoValue}>{commercialStrength >= 80 ? 'Muito forte' : commercialStrength >= 60 ? 'Forte' : commercialStrength >= 40 ? 'Média' : 'Baixa'}</Text>
          </View>
        </Panel>

        <SectionLabel title="Espaços de patrocínio" />
        <View style={styles.list}>
          {[
            ['Patrocinador principal', 'Maior espaço comercial do uniforme e contrato mais valioso.', 'star'],
            ['Mangas', 'Cota secundária com valor intermediário e boa exposição.', 'tag'],
            ['Costas', 'Espaço adicional para ampliar a receita comercial.', 'layers'],
            ['Parceiros institucionais', 'Acordos menores ligados à sede, eventos e ações do clube.', 'briefcase'],
          ].map(([title, text, icon]) => (
            <Panel key={title} style={styles.slotCard}>
              <View style={styles.slotIcon}><Feather name={icon as any} size={18} color="#79ef91" /></View>
              <View style={styles.slotBody}>
                <Text style={styles.slotTitle}>{title}</Text>
                <Text style={styles.slotText}>{text}</Text>
              </View>
              <View style={styles.status}><Text style={styles.statusText}>SEM CONTRATO</Text></View>
            </Panel>
          ))}
        </View>

        <Panel style={styles.notice}>
          <Feather name="info" size={16} color="#79ef91" />
          <Text style={styles.noticeText}>Esta janela já está separada da Sede. Aqui entraremos depois com propostas reais, duração de contrato, bônus, metas e negociação de patrocinadores.</Text>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#153426', borderColor: '#2c503d' },
  icon: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#356a4a' },
  heroBody: { flex: 1, minWidth: 0 },
  kicker: { color: '#79ef91', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#f5f7f5', fontSize: 18, fontWeight: '900', marginTop: 3 },
  sub: { color: '#9fb2a5', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48.5%', minHeight: 90, justifyContent: 'center', gap: 5 },
  metricLabel: { color: '#90a898', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },
  metricValue: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  metricValueSmall: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  infoPanel: { paddingVertical: 2, backgroundColor: '#10291d', borderColor: '#2c503d' },
  infoRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#274535' },
  infoLast: { borderBottomWidth: 0 },
  infoLabel: { color: '#c9d8ce', fontSize: 9.5, fontWeight: '800' },
  infoValue: { color: '#79ef91', fontSize: 9.5, fontWeight: '900' },
  list: { gap: 9 },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#10291d', borderColor: '#2c503d' },
  slotIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  slotBody: { flex: 1, minWidth: 0 },
  slotTitle: { color: '#f5f7f5', fontSize: 11, fontWeight: '900' },
  slotText: { color: '#9fb2a5', fontSize: 8, lineHeight: 12, marginTop: 3 },
  status: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, backgroundColor: '#171f19', borderWidth: 1, borderColor: '#3b463e' },
  statusText: { color: '#a7b5ac', fontSize: 6.5, fontWeight: '900' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#153426', borderColor: '#356a4a' },
  noticeText: { flex: 1, color: '#c0d0c5', fontSize: 8.5, lineHeight: 13 },
});