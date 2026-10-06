import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import {
  HEADQUARTERS_REVENUE_DEMAND_MULTIPLIER,
  HEADQUARTERS_REVENUE_PRICE_MULTIPLIER,
  headquartersRevenueLabel,
  headquartersUpgradeCost,
} from '@/game/engine';
import type { HeadquartersRevenueKey, HeadquartersUpgradeKey } from '@/game/types';
import { useColors } from '@/hooks/useColors';

type HqItem = {
  key: HeadquartersUpgradeKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
  effect: string;
  group: 'administracao' | 'comercial' | 'imagem';
};

type RevenueItem = {
  key: HeadquartersRevenueKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
  baseRevenue: number;
};

const ITEMS: HqItem[] = [
  { key: 'board', title: 'Diretoria', text: 'Melhora organização, planejamento e capacidade administrativa.', icon: 'briefcase', effect: 'Gestão mais eficiente', group: 'administracao' },
  { key: 'finance', title: 'Departamento financeiro', text: 'Aprimora controle de gastos e planejamento do caixa.', icon: 'dollar-sign', effect: 'Melhor controle financeiro', group: 'administracao' },
  { key: 'meeting', title: 'Sala de reuniões', text: 'Apoia decisões estratégicas e planejamento da temporada.', icon: 'users', effect: 'Decisões mais eficientes', group: 'administracao' },
  { key: 'legal', title: 'Departamento jurídico', text: 'Reduz riscos contratuais, multas e problemas administrativos.', icon: 'shield', effect: 'Menos riscos e penalidades', group: 'administracao' },
  { key: 'technology', title: 'Tecnologia e TI', text: 'Moderniza processos e melhora eficiência dos departamentos.', icon: 'cpu', effect: 'Mais eficiência interna', group: 'administracao' },

  { key: 'marketing', title: 'Marketing', text: 'Aumenta exposição, alcance da torcida e valor da marca.', icon: 'radio', effect: 'Mais popularidade', group: 'comercial' },
  { key: 'sponsors', title: 'Patrocínios', text: 'Melhora captação e valor dos contratos comerciais.', icon: 'award', effect: 'Mais receita comercial', group: 'comercial' },
  { key: 'commercial', title: 'Departamento comercial', text: 'Amplia parcerias, ações promocionais e novos negócios.', icon: 'trending-up', effect: 'Mais oportunidades', group: 'comercial' },

  { key: 'museum', title: 'Museu do clube', text: 'Fortalece história, visitação e prestígio institucional.', icon: 'book-open', effect: 'Mais prestígio e visitação', group: 'imagem' },
  { key: 'press', title: 'Centro de imprensa', text: 'Melhora relacionamento com mídia e exposição do clube.', icon: 'mic', effect: 'Mais reputação', group: 'imagem' },
  { key: 'history', title: 'Arquivo histórico', text: 'Preserva conquistas e reforça tradição e identidade do clube.', icon: 'archive', effect: 'Mais tradição', group: 'imagem' },
];

const REVENUE_ITEMS: RevenueItem[] = [
  { key: 'store', title: 'Loja oficial', text: 'Defina o nível de preço dos produtos e camisas do clube.', icon: 'shopping-bag', baseRevenue: 42000 },
  { key: 'members', title: 'Sócio-torcedor', text: 'Defina o preço dos planos e acompanhe adesão dos torcedores.', icon: 'heart', baseRevenue: 52000 },
  { key: 'events', title: 'Eventos da sede', text: 'Defina o valor médio de ingressos, locações e experiências.', icon: 'calendar', baseRevenue: 31000 },
];

const GROUPS = [
  ['administracao', 'Administração'],
  ['comercial', 'Comercial'],
  ['imagem', 'Imagem do clube'],
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function fanSatisfaction(career: NonNullable<ReturnType<typeof useCareer>['career']>) {
  const recent = [...career.results]
    .filter((result) => result.homeClubId === career.clubId || result.awayClubId === career.clubId)
    .sort((a, b) => b.roundIndex - a.roundIndex)
    .slice(0, 5);

  let formPoints = 0;
  for (const result of recent) {
    const userHome = result.homeClubId === career.clubId;
    const userGoals = userHome ? result.homeGoals : result.awayGoals;
    const rivalGoals = userHome ? result.awayGoals : result.homeGoals;
    formPoints += userGoals > rivalGoals ? 8 : userGoals === rivalGoals ? 2 : -7;
  }

  const levels = career.headquartersUpgrades;
  const structuralBonus = (levels.marketing ?? 0) * 2 + (levels.press ?? 0) * 1.5 + (levels.history ?? 0);
  const trustBonus = (career.boardTrust - 50) * 0.28;
  return clamp(Math.round(52 + formPoints + structuralBonus + trustBonus), 15, 100);
}

function satisfactionLabel(value: number) {
  if (value >= 85) return 'Excelente';
  if (value >= 70) return 'Muito boa';
  if (value >= 55) return 'Boa';
  if (value >= 40) return 'Regular';
  if (value >= 25) return 'Baixa';
  return 'Muito baixa';
}

function demandLabel(value: number) {
  if (value >= 1.18) return 'Muito alta';
  if (value >= 1.02) return 'Alta';
  if (value >= 0.84) return 'Normal';
  if (value >= 0.66) return 'Baixa';
  return 'Muito baixa';
}

export default function ClubHeadquartersScreen() {
  const colors = useColors();
  const { career, upgradeHeadquartersItem, updateHeadquartersRevenuePricing } = useCareer();

  if (!career) {
    return <><GameHeader title="Sede do clube" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar a sede.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const levels = career.headquartersUpgrades;
  const pricing = career.headquartersRevenuePricing ?? { store: 3, members: 3, events: 3 };
  const satisfaction = fanSatisfaction(career);
  const satisfactionText = satisfactionLabel(satisfaction);
  const fanMultiplier = 0.72 + (satisfaction / 100) * 0.58;
  const commercialBoost = 1 + (levels.marketing ?? 0) * 0.045 + (levels.commercial ?? 0) * 0.035;

  const revenueProjection = REVENUE_ITEMS.reduce((sum, item) => {
    const level = pricing[item.key] ?? 3;
    const priceMultiplier = HEADQUARTERS_REVENUE_PRICE_MULTIPLIER[level] ?? 1;
    const baseDemand = HEADQUARTERS_REVENUE_DEMAND_MULTIPLIER[level] ?? 1;
    const effectiveDemand = Math.min(1.42, baseDemand * fanMultiplier);
    return sum + Math.round(item.baseRevenue * priceMultiplier * effectiveDemand * commercialBoost);
  }, 0);

  const structuralRevenue =
    (levels.sponsors ?? 0) * 42000 +
    (levels.museum ?? 0) * 9000 +
    (levels.marketing ?? 0) * 12000;

  const commercialRevenue = revenueProjection + structuralRevenue;
  const totalLevel = Object.values(levels).reduce((sum, level) => sum + level, 0);
  const maxTotal = Object.keys(levels).length * 5;
  const progress = Math.round((totalLevel / maxTotal) * 100);
  const operatingCost = 42000 + totalLevel * 6200 + (levels.technology ?? 0) * 7000 + (levels.press ?? 0) * 4500;
  const projectedNet = commercialRevenue - operatingCost;
  const reputation = Math.min(100, 25 + (levels.marketing ?? 0) * 7 + (levels.press ?? 0) * 6 + (levels.museum ?? 0) * 5 + (levels.history ?? 0) * 4);
  const management = Math.min(100, 30 + (levels.board ?? 0) * 8 + (levels.finance ?? 0) * 7 + (levels.meeting ?? 0) * 5 + (levels.legal ?? 0) * 4 + (levels.technology ?? 0) * 5);

  return (
    <>
      <GameHeader title="Sede do clube" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Feather name="briefcase" size={28} color="#79ef91" /></View>
            <View style={styles.heroBody}>
              <Text style={styles.heroKicker}>CENTRO ADMINISTRATIVO</Text>
              <Text style={styles.heroTitle}>Sede do {club.name}</Text>
              <Text style={styles.heroSub}>Administração, negócios, imagem e receitas do clube.</Text>
            </View>
          </View>
          <View style={styles.overallRow}>
            <Text style={styles.overallLabel}>EVOLUÇÃO GERAL</Text>
            <Text style={styles.overallValue}>{progress}%</Text>
          </View>
          <View style={styles.overallTrack}><View style={[styles.overallFill, { width: (progress + '%') as any }]} /></View>
        </Panel>

        <View style={styles.metrics}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>GESTÃO</Text><Text style={styles.metricValue}>{management}</Text><Text style={styles.metricHint}>de 100</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>REPUTAÇÃO</Text><Text style={styles.metricValue}>{reputation}</Text><Text style={styles.metricHint}>de 100</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>RECEITA EST.</Text><Text style={styles.metricValueSmall}>{formatCurrency(commercialRevenue)}</Text><Text style={styles.metricHint}>por mês</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>TORCIDA</Text><Text style={styles.metricValueSmall}>{satisfactionText}</Text><Text style={styles.metricHint}>{satisfaction}/100 satisfação</Text></Panel>
        </View>

        {GROUPS.map(([group, label]) => (
          <React.Fragment key={group}>
            <SectionLabel title={label} />
            <View style={styles.list}>
              {ITEMS.filter((item) => item.group === group).map((item) => {
                const level = levels[item.key] ?? 0;
                const maxed = level >= 5;
                const cost = headquartersUpgradeCost(item.key, level);
                const affordable = career.balance >= cost;

                return (
                  <Panel key={item.key} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardIcon}><Feather name={item.icon} size={19} color="#79ef91" /></View>
                      <View style={styles.cardBody}>
                        <View style={styles.titleRow}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardLevel}>NV {level}/5</Text></View>
                        <Text style={styles.cardText}>{item.text}</Text>
                        <Text style={styles.cardEffect}>{item.effect}</Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: ((level / 5) * 100 + '%') as any }]} /></View>
                    {maxed ? (
                      <View style={styles.maxed}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.maxedText}>NÍVEL MÁXIMO</Text></View>
                    ) : (
                      <Pressable onPress={() => upgradeHeadquartersItem(item.key)} disabled={!affordable} style={[styles.upgradeButton, !affordable && styles.upgradeButtonDisabled]}>
                        <Text style={[styles.upgradeButtonText, !affordable && styles.upgradeButtonTextDisabled]}>MELHORAR · {formatCurrency(cost)}</Text>
                      </Pressable>
                    )}
                  </Panel>
                );
              })}
            </View>
          </React.Fragment>
        ))}

        <SectionLabel title="Receitas" />
        <Panel style={styles.fanPanel}>
          <View style={styles.fanHeader}>
            <View>
              <Text style={styles.fanKicker}>HUMOR DA TORCIDA</Text>
              <Text style={styles.fanTitle}>{satisfactionText}</Text>
            </View>
            <Text style={styles.fanScore}>{satisfaction}/100</Text>
          </View>
          <Text style={styles.fanText}>A boa fase do time aumenta a disposição da torcida para gastar. Com satisfação alta, até preços altos podem gerar receitas maiores.</Text>
        </Panel>

        <View style={styles.list}>
          {REVENUE_ITEMS.map((item) => {
            const priceLevel = pricing[item.key] ?? 3;
            const priceMultiplier = HEADQUARTERS_REVENUE_PRICE_MULTIPLIER[priceLevel] ?? 1;
            const baseDemand = HEADQUARTERS_REVENUE_DEMAND_MULTIPLIER[priceLevel] ?? 1;
            const effectiveDemand = Math.min(1.42, baseDemand * fanMultiplier);
            const projected = Math.round(item.baseRevenue * priceMultiplier * effectiveDemand * commercialBoost);
            const demandPct = Math.round(effectiveDemand * 100);
            const priceText = headquartersRevenueLabel(priceLevel);

            return (
              <Panel key={item.key} style={styles.revenueCard}>
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}><Feather name={item.icon} size={19} color="#79ef91" /></View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardText}>{item.text}</Text>
                  </View>
                </View>

                <View style={styles.priceControl}>
                  <Pressable
                    onPress={() => updateHeadquartersRevenuePricing(item.key, priceLevel - 1)}
                    disabled={priceLevel <= 1}
                    style={[styles.priceButton, priceLevel <= 1 && styles.priceButtonDisabled]}
                  >
                    <Feather name="minus" size={18} color={priceLevel <= 1 ? '#65756b' : '#f5f7f5'} />
                  </Pressable>

                  <View style={styles.priceCenter}>
                    <Text style={styles.priceLabel}>NÍVEL DE PREÇO</Text>
                    <Text style={styles.priceValue}>{priceText.toUpperCase()}</Text>
                    <View style={styles.priceDots}>
                      {[1,2,3,4,5].map((dot) => <View key={dot} style={[styles.priceDot, dot <= priceLevel && styles.priceDotActive]} />)}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => updateHeadquartersRevenuePricing(item.key, priceLevel + 1)}
                    disabled={priceLevel >= 5}
                    style={[styles.priceButton, priceLevel >= 5 && styles.priceButtonDisabled]}
                  >
                    <Feather name="plus" size={18} color={priceLevel >= 5 ? '#65756b' : '#f5f7f5'} />
                  </Pressable>
                </View>

                <View style={styles.miniWindow}>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>DEMANDA</Text>
                    <Text style={styles.miniValue}>{demandLabel(effectiveDemand)}</Text>
                    <Text style={styles.miniHint}>{demandPct}%</Text>
                  </View>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>SATISFAÇÃO</Text>
                    <Text style={styles.miniValue}>{satisfactionText}</Text>
                    <Text style={styles.miniHint}>{satisfaction}/100</Text>
                  </View>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>RECEITA / MÊS</Text>
                    <Text style={styles.miniValue}>{formatCurrency(projected)}</Text>
                    <Text style={styles.miniHint}>{priceLevel >= 4 && satisfaction >= 80 ? 'Boa fase sustenta preço alto' : 'Projeção atual'}</Text>
                  </View>
                </View>

                <Text style={styles.revenueExplanation}>
                  {priceLevel >= 4
                    ? satisfaction >= 80
                      ? 'Preço alto reduz parte da procura, mas a ótima relação com a torcida compensa e mantém forte potencial de receita.'
                      : 'Preço alto aumenta o valor por compra, porém reduz a procura. Melhorar a fase do time pode compensar essa queda.'
                    : priceLevel <= 2
                      ? 'Preço acessível aumenta a procura e a satisfação, mas reduz o ganho por compra.'
                      : 'Preço equilibrado: procura e valor por compra próximos do normal.'}
                </Text>
              </Panel>
            );
          })}
        </View>

        <SectionLabel title="Finanças da sede" />
        <Panel style={styles.financePanel}>
          <View style={styles.financeRow}><Text style={styles.financeLabel}>Caixa do clube</Text><Text style={styles.financeValue}>{formatCurrency(career.balance)}</Text></View>
          <View style={styles.financeRow}><Text style={styles.financeLabel}>Receita mensal estimada</Text><Text style={styles.financePositive}>+{formatCurrency(commercialRevenue)}</Text></View>
          <View style={styles.financeRow}><Text style={styles.financeLabel}>Operação mensal estimada</Text><Text style={styles.financeNegative}>-{formatCurrency(operatingCost)}</Text></View>
          <View style={[styles.financeRow, styles.financeLast]}><Text style={styles.financeTotalLabel}>RESULTADO PROJETADO</Text><Text style={projectedNet >= 0 ? styles.financePositive : styles.financeNegative}>{projectedNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(projectedNet))}</Text></View>
        </Panel>

        <Text style={styles.note}>Os níveis de preço podem ser alterados a qualquer momento. Demanda e satisfação reagem à política comercial e ao desempenho recente do time.</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 14, backgroundColor: '#153426', borderColor: '#2c503d' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#356a4a' },
  heroBody: { flex: 1, minWidth: 0 },
  heroKicker: { color: '#79ef91', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#f5f7f5', fontSize: 18, fontWeight: '900', marginTop: 3 },
  heroSub: { color: '#9fb2a5', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: { color: '#90a898', fontSize: 8, fontWeight: '900' },
  overallValue: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  overallTrack: { height: 7, borderRadius: 99, backgroundColor: '#0b2117', overflow: 'hidden', borderWidth: 1, borderColor: '#2c503d' },
  overallFill: { height: '100%', backgroundColor: '#79ef91' },

  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48.5%', minHeight: 94, justifyContent: 'center', gap: 4 },
  metricLabel: { color: '#90a898', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  metricValue: { color: '#f5f7f5', fontSize: 22, fontWeight: '900' },
  metricValueSmall: { color: '#f5f7f5', fontSize: 13, fontWeight: '900' },
  metricHint: { color: '#74897b', fontSize: 7.5, fontWeight: '800' },

  list: { gap: 9 },
  card: { gap: 10, backgroundColor: '#10291d', borderColor: '#2c503d' },
  cardTop: { flexDirection: 'row', gap: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  cardBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: '#f5f7f5', fontSize: 12, fontWeight: '900', flex: 1 },
  cardLevel: { color: '#79ef91', fontSize: 8.5, fontWeight: '900' },
  cardText: { color: '#9fb2a5', fontSize: 8.5, lineHeight: 12.5, marginTop: 3 },
  cardEffect: { color: '#d6e2d9', fontSize: 8, fontWeight: '800', marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 99, backgroundColor: '#081a11', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#79ef91' },

  upgradeButton: { minHeight: 38, borderRadius: 9, backgroundColor: '#79ef91', alignItems: 'center', justifyContent: 'center' },
  upgradeButtonDisabled: { backgroundColor: '#23382c' },
  upgradeButtonText: { color: '#07150d', fontSize: 9, fontWeight: '900' },
  upgradeButtonTextDisabled: { color: '#75867b' },
  maxed: { minHeight: 38, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#153426', borderWidth: 1, borderColor: '#356a4a' },
  maxedText: { color: '#79ef91', fontSize: 9, fontWeight: '900' },

  fanPanel: { backgroundColor: '#153426', borderColor: '#356a4a', gap: 8 },
  fanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fanKicker: { color: '#90a898', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  fanTitle: { color: '#79ef91', fontSize: 16, fontWeight: '900', marginTop: 2 },
  fanScore: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  fanText: { color: '#c0d0c5', fontSize: 8.5, lineHeight: 13 },

  revenueCard: { gap: 11, backgroundColor: '#10291d', borderColor: '#2c503d' },
  priceControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceButton: { width: 46, height: 46, borderRadius: 11, backgroundColor: '#173326', borderWidth: 1, borderColor: '#356a4a', alignItems: 'center', justifyContent: 'center' },
  priceButtonDisabled: { backgroundColor: '#12231b', borderColor: '#26382f' },
  priceCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  priceLabel: { color: '#84998b', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  priceValue: { color: '#f5f7f5', fontSize: 12, fontWeight: '900', marginTop: 3 },
  priceDots: { flexDirection: 'row', gap: 5, marginTop: 6 },
  priceDot: { width: 18, height: 5, borderRadius: 99, backgroundColor: '#20372a' },
  priceDotActive: { backgroundColor: '#79ef91' },

  miniWindow: { flexDirection: 'row', gap: 6, padding: 7, borderRadius: 10, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  miniMetric: { flex: 1, minWidth: 0, minHeight: 62, justifyContent: 'center' },
  miniLabel: { color: '#789080', fontSize: 6.2, fontWeight: '900' },
  miniValue: { color: '#f5f7f5', fontSize: 9, fontWeight: '900', marginTop: 4 },
  miniHint: { color: '#79ef91', fontSize: 6.5, fontWeight: '800', marginTop: 3 },
  revenueExplanation: { color: '#9fb2a5', fontSize: 8.2, lineHeight: 12.5 },

  financePanel: { paddingVertical: 2, backgroundColor: '#10291d', borderColor: '#2c503d' },
  financeRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#274535' },
  financeLast: { borderBottomWidth: 0, backgroundColor: '#153426' },
  financeLabel: { color: '#c9d8ce', fontSize: 9.5, fontWeight: '800' },
  financeValue: { color: '#f5f7f5', fontSize: 10, fontWeight: '900' },
  financePositive: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  financeNegative: { color: '#f09d9d', fontSize: 10, fontWeight: '900' },
  financeTotalLabel: { color: '#79ef91', fontSize: 9, fontWeight: '900' },
  note: { color: '#819488', fontSize: 8, lineHeight: 12, textAlign: 'center', paddingHorizontal: 8 },
});