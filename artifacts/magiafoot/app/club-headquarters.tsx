import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import {
  HEADQUARTERS_REVENUE_DEMAND_MULTIPLIER,
  HEADQUARTERS_REVENUE_PRICE_MULTIPLIER,
  headquartersRevenueLabel,
  headquartersUpgradeCost,
  headquartersInvestmentLabel,
  HEADQUARTERS_INVESTMENT_MONTHLY_COST,
  administrationStaffCapacity,
  administrationRequiredStaff,
  administrationDepartmentEfficiency,
  administrationNeedScore,
  activeAdministrativeStaff,
  previewAdministrativeCandidate,
} from '@/game/engine';
import type { AdministrationDepartmentKey, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey } from '@/game/types';
import { useColors } from '@/hooks/useColors';

type HqItem = {
  key: HeadquartersUpgradeKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
  effect: string;
  group: 'administracao';
};

type RevenueItem = {
  key: HeadquartersRevenueKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
  baseRevenue: number;
};

type ImageItem = {
  key: HeadquartersImageKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
  baseFans: number;
};

const ITEMS: HqItem[] = [
  { key: 'meeting', title: 'Sala de reuniões', text: 'Estrutura de decisão e coordenação. Evoluir libera capacidade para equipes administrativas maiores.', icon: 'users', effect: 'Libera mais vagas de funcionários', group: 'administracao' },
  { key: 'technology', title: 'Tecnologia e TI', text: 'Sistemas, dados e ferramentas usados por todos os departamentos administrativos.', icon: 'cpu', effect: 'Libera mais vagas e melhora eficiência', group: 'administracao' },
];

const ADMIN_STAFF_ITEMS: Array<{
  key: AdministrationDepartmentKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: 'board', title: 'Diretoria', text: 'Executivos e gestores responsáveis pela organização e decisões administrativas.', icon: 'briefcase' },
  { key: 'finance', title: 'Departamento financeiro', text: 'Profissionais que cuidam de orçamento, controle e planejamento financeiro.', icon: 'dollar-sign' },
  { key: 'legal', title: 'Departamento jurídico', text: 'Equipe responsável por contratos, compliance e riscos jurídicos do clube.', icon: 'shield' },
];

const COMMERCIAL_INVESTMENTS: Array<{
  key: HeadquartersInvestmentKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: 'marketing', title: 'Marketing', text: 'Define quanto o clube investe mensalmente em campanhas, marca e aproximação com a torcida.', icon: 'radio' },
  { key: 'commercial', title: 'Departamento comercial', text: 'Define o investimento em equipe comercial, parcerias, prospecção e novos negócios.', icon: 'trending-up' },
];

const IMAGE_ITEMS: ImageItem[] = [
  { key: 'museum', title: 'Museu do clube', text: 'Ações de história, visitas e experiências para aproximar novos torcedores.', icon: 'book-open', baseFans: 1100 },
  { key: 'press', title: 'Centro de imprensa', text: 'Exposição na mídia e comunicação para alcançar novos públicos.', icon: 'mic', baseFans: 1500 },
  { key: 'history', title: 'História e identidade', text: 'Campanhas de tradição e identidade para converter simpatizantes em torcedores.', icon: 'archive', baseFans: 900 },
];

const REVENUE_ITEMS: RevenueItem[] = [
  { key: 'store', title: 'Loja oficial', text: 'Defina o nível de preço dos produtos e camisas do clube.', icon: 'shopping-bag', baseRevenue: 42000 },
  { key: 'members', title: 'Sócio-torcedor', text: 'Defina o preço dos planos e acompanhe adesão dos torcedores.', icon: 'heart', baseRevenue: 52000 },
  { key: 'events', title: 'Eventos da sede', text: 'Defina o valor médio de ingressos, locações e experiências.', icon: 'calendar', baseRevenue: 31000 },
];

const GROUPS = [
  ['administracao', 'Estrutura de apoio'],
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
  const investmentMarketing = career.headquartersInvestments?.marketing ?? 3;
  const structuralBonus = investmentMarketing * 2.5 + (levels.press ?? 0) * 1.5 + (levels.history ?? 0);
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

function acquisitionLabel(level: number) {
  return ({ 1: 'Baixa', 2: 'Média', 3: 'Alta' } as Record<number, string>)[level] ?? 'Baixa';
}

function riskLabel(risk: number) {
  if (risk >= 68) return 'Alto';
  if (risk >= 38) return 'Médio';
  return 'Baixo';
}

export default function ClubHeadquartersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, upgradeHeadquartersItem, updateHeadquartersRevenuePricing, updateHeadquartersImageAcquisition, updateHeadquartersInvestment, hireAdminProfessional, fireAdminProfessional } = useCareer();

  if (!career) {
    return <><GameHeader title="Sede do clube" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar a sede.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const levels = career.headquartersUpgrades;
  const pricing = career.headquartersRevenuePricing ?? { store: 3, members: 3, events: 3 };
  const imageAcquisition = career.headquartersImageAcquisition ?? { museum: 1, press: 1, history: 1 };
  const investments = career.headquartersInvestments ?? { marketing: 3, commercial: 3 };
  const satisfaction = fanSatisfaction(career);
  const satisfactionText = satisfactionLabel(satisfaction);
  const fanMultiplier = 0.72 + (satisfaction / 100) * 0.58;
  const commercialBoost = 1;

  const revenueProjection = REVENUE_ITEMS.reduce((sum, item) => {
    const level = pricing[item.key] ?? 3;
    const priceMultiplier = HEADQUARTERS_REVENUE_PRICE_MULTIPLIER[level] ?? 1;
    const baseDemand = HEADQUARTERS_REVENUE_DEMAND_MULTIPLIER[level] ?? 1;
    const effectiveDemand = Math.min(1.42, baseDemand * fanMultiplier);
    return sum + Math.round(item.baseRevenue * priceMultiplier * effectiveDemand * commercialBoost);
  }, 0);

  const structuralRevenue =
    (levels.sponsors ?? 0) * 42000 +
    (levels.museum ?? 0) * 9000;

  const commercialRevenue = revenueProjection + structuralRevenue;
  const totalLevel = Object.values(levels).reduce((sum, level) => sum + level, 0);
  const maxTotal = Object.keys(levels).length * 5;
  const progress = Math.round((totalLevel / maxTotal) * 100);
  const marketingInvestmentCost = HEADQUARTERS_INVESTMENT_MONTHLY_COST[investments.marketing] ?? 65000;
  const commercialInvestmentCost = HEADQUARTERS_INVESTMENT_MONTHLY_COST[investments.commercial] ?? 65000;
  const reputation = Math.min(100, 25 + investments.marketing * 6 + (levels.press ?? 0) * 6 + (levels.museum ?? 0) * 5 + (levels.history ?? 0) * 4);
  const staffCapacity = administrationStaffCapacity(career);
  const boardStaff = activeAdministrativeStaff(career, 'board');
  const financeStaff = activeAdministrativeStaff(career, 'finance');
  const legalStaff = activeAdministrativeStaff(career, 'legal');
  const activeStaff = { board: boardStaff, finance: financeStaff, legal: legalStaff };
  const adminEfficiencies = [
    administrationDepartmentEfficiency(career, 'board'),
    administrationDepartmentEfficiency(career, 'finance'),
    administrationDepartmentEfficiency(career, 'legal'),
  ];
  const management = Math.round(adminEfficiencies.reduce((sum, value) => sum + value, 0) / adminEfficiencies.length);
  const adminPayroll = [...boardStaff, ...financeStaff, ...legalStaff].reduce((sum, person) => sum + person.salary, 0);
  const adminNeedScores = {
    board: administrationNeedScore(career, 'board'),
    finance: administrationNeedScore(career, 'finance'),
    legal: administrationNeedScore(career, 'legal'),
  };
  const overallAdminNeed = Math.round((adminNeedScores.board + adminNeedScores.finance + adminNeedScores.legal) / 3);
  const baseOperatingCost = 42000 + totalLevel * 6200 + (levels.technology ?? 0) * 7000 + (levels.press ?? 0) * 4500 + marketingInvestmentCost + commercialInvestmentCost;
  const operatingCost = baseOperatingCost + adminPayroll;
  const projectedNet = commercialRevenue - operatingCost;

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

        <SectionLabel title="Administração" />
        <Panel style={styles.adminOverview}>
          <View style={styles.adminOverviewTop}>
            <View>
              <Text style={styles.adminOverviewKicker}>ESTRUTURA ADMINISTRATIVA</Text>
              <Text style={styles.adminOverviewTitle}>{staffCapacity} vagas por departamento</Text>
            </View>
            <Text style={styles.adminOverviewScore}>Gestão {management}/100</Text>
          </View>
          <Text style={styles.adminOverviewText}>A necessidade muda conforme a realidade do clube. Se tudo estiver organizado, não há obrigação de contratar. Crescimento, crise, dinheiro, contratos e problemas disciplinares podem aumentar a demanda.</Text>
          <View style={styles.needHeader}>
            <Text style={styles.needLabel}>NECESSIDADE ADMINISTRATIVA GERAL</Text>
            <Text style={styles.needValue}>{overallAdminNeed}%</Text>
          </View>
          <View style={styles.needTrack}>
            <View style={[styles.needFill, { width: (overallAdminNeed + '%') as any }]} />
          </View>
          <View style={styles.adminOverviewMetrics}>
            <View style={styles.adminMini}><Text style={styles.adminMiniLabel}>FOLHA ADMIN.</Text><Text style={styles.adminMiniValue}>{formatCurrency(adminPayroll)}/mês</Text></View>
            <View style={styles.adminMini}><Text style={styles.adminMiniLabel}>CAPACIDADE</Text><Text style={styles.adminMiniValue}>{staffCapacity}/10</Text></View>
          </View>
        </Panel>

        <View style={styles.list}>
          {ADMIN_STAFF_ITEMS.map((item) => {
            const people = activeStaff[item.key] ?? [];
            const required = administrationRequiredStaff(career, item.key);
            const needScore = adminNeedScores[item.key];
            const efficiency = administrationDepartmentEfficiency(career, item.key);
            const candidate = previewAdministrativeCandidate(career, item.key);
            const full = people.length >= staffCapacity || people.length >= 10;
            const canHire = !full && career.balance >= candidate.hireCost;
            const excess = Math.max(0, people.length - required);
            const status =
              required === 0
                ? (people.length === 0 ? 'SEM NECESSIDADE' : 'SOBRA DE PESSOAL')
                : people.length < required
                  ? 'SOBRECARGA'
                  : efficiency >= 82 ? 'EXCELENTE' : efficiency >= 65 ? 'BOA' : 'CONTROLADA';

            return (
              <Panel key={item.key} style={styles.adminDeptCard}>
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}><Feather name={item.icon} size={19} color="#79ef91" /></View>
                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={[styles.adminStatus, people.length < required && styles.adminStatusBad, excess > 0 && styles.adminStatusWarn]}>{status}</Text>
                    </View>
                    <Text style={styles.cardText}>{item.text}</Text>
                  </View>
                </View>

                <View style={styles.needHeader}>
                  <Text style={styles.needLabel}>NECESSIDADE DO DEPARTAMENTO</Text>
                  <Text style={styles.needValue}>{needScore}%</Text>
                </View>
                <View style={styles.needTrack}>
                  <View style={[styles.needFill, { width: (needScore + '%') as any }]} />
                </View>

                <View style={styles.adminDeptMetrics}>
                  <View style={styles.adminDeptMetric}><Text style={styles.miniLabel}>CONTRATADOS</Text><Text style={styles.adminDeptValue}>{people.length}/{staffCapacity}</Text></View>
                  <View style={styles.adminDeptMetric}><Text style={styles.miniLabel}>NECESSÁRIO</Text><Text style={styles.adminDeptValue}>{required === 0 ? 'Nenhum' : required}</Text></View>
                  <View style={styles.adminDeptMetric}><Text style={styles.miniLabel}>EFICIÊNCIA</Text><Text style={styles.adminDeptValue}>{efficiency}%</Text></View>
                </View>

                {people.length > 0 ? (
                  <View style={styles.staffList}>
                    {people.map((person) => (
                      <View key={person.id} style={styles.staffRow}>
                        <View style={styles.staffPerson}>
                          <Text style={styles.staffName}>{person.name}</Text>
                          <Text style={styles.staffRole}>{person.role} · Qualidade {person.quality}</Text>
                          <Text style={styles.staffSalary}>{formatCurrency(person.salary)}/mês</Text>
                          <Text style={styles.staffContract}>Contrato: {Math.max(0, person.contractEndRound - career.roundIndex)} jogos restantes</Text>
                        </View>
                        <Pressable
                          onPress={() => fireAdminProfessional(item.key, person.id)}
                          disabled={career.balance < person.fireCost}
                          style={[styles.fireButton, career.balance < person.fireCost && styles.fireButtonDisabled]}
                        >
                          <Text style={styles.fireButtonText}>DEMITIR</Text>
                          <Text style={styles.fireCost}>{formatCurrency(person.fireCost)}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noStaff}>Nenhum profissional contratado.</Text>
                )}

                {required === 0 && people.length > 0 ? (
                  <View style={styles.savingHint}>
                    <Feather name="trending-down" size={13} color="#d8c27c" />
                    <Text style={styles.savingHintText}>O clube não precisa desse quadro agora. Demitir pode aliviar a folha, mas existe custo de rescisão.</Text>
                  </View>
                ) : excess > 0 ? (
                  <View style={styles.savingHint}>
                    <Feather name="alert-circle" size={13} color="#d8c27c" />
                    <Text style={styles.savingHintText}>Há {excess} profissional(is) acima da necessidade atual. Você pode manter por segurança ou reduzir custos.</Text>
                  </View>
                ) : null}

                <View style={styles.candidateBox}>
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateKicker}>PRÓXIMO CANDIDATO</Text>
                    <Text style={styles.candidateName}>{candidate.name}</Text>
                    <Text style={styles.candidateMeta}>{candidate.role} · Qualidade {candidate.quality}</Text>
                    <Text style={styles.candidateMeta}>Salário {formatCurrency(candidate.salary)}/mês</Text>
                    <Text style={styles.candidateMeta}>Contrato de {candidate.contractRounds} jogos</Text>
                  </View>
                  <Pressable
                    onPress={() => hireAdminProfessional(item.key)}
                    disabled={!canHire}
                    style={[styles.hireButton, !canHire && styles.hireButtonDisabled]}
                  >
                    <Text style={[styles.hireButtonText, !canHire && styles.hireButtonTextDisabled]}>
                      {full ? 'SEM VAGA' : required === 0 ? 'CONTRATAR MESMO ASSIM' : 'CONTRATAR'}
                    </Text>
                    {!full ? <Text style={styles.hireCost}>{formatCurrency(candidate.hireCost)}</Text> : null}
                  </Pressable>
                </View>
              </Panel>
            );
          })}
        </View>

        <SectionLabel title="Estrutura de apoio administrativo" />
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

        <SectionLabel title="Comercial" />
        <View style={styles.list}>
          {COMMERCIAL_INVESTMENTS.map((item) => {
            const investmentLevel = investments[item.key] ?? 3;
            const monthlyCost = HEADQUARTERS_INVESTMENT_MONTHLY_COST[investmentLevel] ?? 65000;
            const baseRisk = investmentLevel === 1 ? 12 : investmentLevel === 2 ? 22 : investmentLevel === 3 ? 36 : investmentLevel === 4 ? 54 : 72;
            const badMomentPenalty = Math.max(0, 58 - satisfaction) * 0.35;
            const reputationRelief = reputation * 0.12;
            const risk = clamp(Math.round(baseRisk + badMomentPenalty - reputationRelief), 8, 88);
            const publicImpact = item.key === 'marketing'
              ? Math.round((650 + investmentLevel * 900) * (0.55 + satisfaction / 100) * (1 - risk / 140))
              : Math.round((420 + investmentLevel * 760) * (0.55 + reputation / 100) * (1 - risk / 145));

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
                    onPress={() => updateHeadquartersInvestment(item.key, investmentLevel - 1)}
                    disabled={investmentLevel <= 1}
                    style={[styles.priceButton, investmentLevel <= 1 && styles.priceButtonDisabled]}
                  >
                    <Feather name="minus" size={18} color={investmentLevel <= 1 ? '#65756b' : '#f5f7f5'} />
                  </Pressable>

                  <View style={styles.priceCenter}>
                    <Text style={styles.priceLabel}>NÍVEL DE INVESTIMENTO</Text>
                    <Text style={styles.priceValue}>{headquartersInvestmentLabel(investmentLevel).toUpperCase()}</Text>
                    <View style={styles.priceDots}>
                      {[1,2,3,4,5].map((dot) => <View key={dot} style={[styles.priceDot, dot <= investmentLevel && styles.priceDotActive]} />)}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => updateHeadquartersInvestment(item.key, investmentLevel + 1)}
                    disabled={investmentLevel >= 5}
                    style={[styles.priceButton, investmentLevel >= 5 && styles.priceButtonDisabled]}
                  >
                    <Feather name="plus" size={18} color={investmentLevel >= 5 ? '#65756b' : '#f5f7f5'} />
                  </Pressable>
                </View>

                <View style={styles.miniWindow}>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>INVESTIMENTO / MÊS</Text>
                    <Text style={styles.miniValue}>{formatCurrency(monthlyCost)}</Text>
                    <Text style={styles.miniHint}>{headquartersInvestmentLabel(investmentLevel)}</Text>
                  </View>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>PÚBLICO PROJETADO</Text>
                    <Text style={styles.miniValue}>+{publicImpact.toLocaleString('pt-BR')}</Text>
                    <Text style={styles.miniHint}>alcance / mês</Text>
                  </View>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>RISCO</Text>
                    <Text style={[styles.miniValue, risk >= 68 ? styles.riskHigh : risk >= 38 ? styles.riskMedium : styles.riskLow]}>
                      {risk >= 68 ? 'Alto' : risk >= 38 ? 'Médio' : 'Baixo'}
                    </Text>
                    <Text style={styles.miniHint}>{risk}%</Text>
                  </View>
                </View>

                <Text style={styles.revenueExplanation}>
                  O investimento não gera dinheiro diretamente. Ele serve para ampliar o público, alcance e captação de torcedores. Quanto maior o investimento, maior o potencial — mas também aumenta o risco de gastar muito e converter pouco se o clube estiver em má fase.
                </Text>
              </Panel>
            );
          })}

          <Panel style={styles.sponsorCard}>
            <View style={styles.cardTop}>
              <View style={styles.cardIcon}><Feather name="award" size={19} color="#79ef91" /></View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Patrocínios</Text>
                <Text style={styles.cardText}>Gerencie propostas, contratos, valores e duração dos patrocinadores em uma área própria.</Text>
              </View>
            </View>
            <Pressable style={styles.sponsorButton} onPress={() => router.push('/sponsorships' as any)}>
              <Text style={styles.sponsorButtonText}>ABRIR PATROCÍNIOS</Text>
              <Feather name="chevron-right" size={17} color="#07150d" />
            </Pressable>
          </Panel>
        </View>

        <SectionLabel title="Imagem do clube" />
        <Panel style={styles.fanPanel}>
          <View style={styles.fanHeader}>
            <View>
              <Text style={styles.fanKicker}>CAPTAÇÃO DE TORCEDORES</Text>
              <Text style={styles.fanTitle}>{satisfactionText}</Text>
            </View>
            <Text style={styles.fanScore}>{satisfaction}/100</Text>
          </View>
          <Text style={styles.fanText}>A captação depende da fase do time, reputação, marketing e satisfação. Aumentar a capacidade de captação aumenta o alcance, mas também eleva o risco de campanhas caras não converterem novos torcedores.</Text>
        </Panel>

        <View style={styles.list}>
          {IMAGE_ITEMS.map((item) => {
            const acquisitionLevel = imageAcquisition[item.key] ?? 1;
            const formFactor = satisfaction / 100;
            const reputationFactor = reputation / 100;
            const marketingFactor = 0.76 + investments.marketing * 0.07 + investments.commercial * 0.045;
            const ambitionRisk = acquisitionLevel === 1 ? 18 : acquisitionLevel === 2 ? 39 : 62;
            const poorFormRisk = Math.max(0, 55 - satisfaction) * 0.55;
            const reputationRelief = reputation * 0.18;
            const rawRisk = clamp(Math.round(ambitionRisk + poorFormRisk - reputationRelief), 8, 85);
            const risk = rawRisk;
            const successChance = clamp(100 - risk, 15, 92);
            const reachMultiplier = acquisitionLevel === 1 ? 0.85 : acquisitionLevel === 2 ? 1.35 : 2.0;
            const projectedFans = Math.max(0, Math.round(item.baseFans * reachMultiplier * (0.55 + formFactor * 0.65) * (0.65 + reputationFactor * 0.55) * marketingFactor * (successChance / 100)));
            const demand = clamp(Math.round((satisfaction * 0.50) + (reputation * 0.24) + (investments.marketing * 4) + (investments.commercial * 3)), 10, 100);

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
                    onPress={() => updateHeadquartersImageAcquisition(item.key, acquisitionLevel - 1)}
                    disabled={acquisitionLevel <= 1}
                    style={[styles.priceButton, acquisitionLevel <= 1 && styles.priceButtonDisabled]}
                  >
                    <Feather name="minus" size={18} color={acquisitionLevel <= 1 ? '#65756b' : '#f5f7f5'} />
                  </Pressable>

                  <View style={styles.priceCenter}>
                    <Text style={styles.priceLabel}>NÍVEL DE CAPTAÇÃO</Text>
                    <Text style={styles.priceValue}>{acquisitionLabel(acquisitionLevel).toUpperCase()}</Text>
                    <View style={styles.priceDots}>
                      {[1,2,3].map((dot) => <View key={dot} style={[styles.priceDot, dot <= acquisitionLevel && styles.priceDotActive]} />)}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => updateHeadquartersImageAcquisition(item.key, acquisitionLevel + 1)}
                    disabled={acquisitionLevel >= 3}
                    style={[styles.priceButton, acquisitionLevel >= 3 && styles.priceButtonDisabled]}
                  >
                    <Feather name="plus" size={18} color={acquisitionLevel >= 3 ? '#65756b' : '#f5f7f5'} />
                  </Pressable>
                </View>

                <View style={styles.miniWindow}>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>DEMANDA</Text>
                    <Text style={styles.miniValue}>{demand}%</Text>
                    <Text style={styles.miniHint}>{demand >= 75 ? 'Muito favorável' : demand >= 55 ? 'Favorável' : demand >= 35 ? 'Instável' : 'Fraca'}</Text>
                  </View>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>RISCO</Text>
                    <Text style={[styles.miniValue, risk >= 68 ? styles.riskHigh : risk >= 38 ? styles.riskMedium : styles.riskLow]}>{riskLabel(risk)}</Text>
                    <Text style={styles.miniHint}>{risk}%</Text>
                  </View>
                  <View style={styles.miniMetric}>
                    <Text style={styles.miniLabel}>NOVOS TORCEDORES</Text>
                    <Text style={styles.miniValue}>{projectedFans.toLocaleString('pt-BR')}</Text>
                    <Text style={styles.miniHint}>projeção / mês</Text>
                  </View>
                </View>

                <View style={styles.riskBox}>
                  <Feather name="alert-triangle" size={14} color={risk >= 68 ? '#f09d9d' : '#d8c27c'} />
                  <Text style={styles.riskText}>
                    {risk >= 68
                      ? 'Campanha agressiva: grande alcance, mas alto risco de baixa conversão. Uma sequência ruim do time pode derrubar a captação.'
                      : risk >= 38
                        ? 'Captação equilibrada: bom alcance, porém o resultado depende bastante da fase do time e da reputação.'
                        : 'Captação conservadora: crescimento menor, com risco reduzido de desperdício e rejeição.'}
                  </Text>
                </View>
              </Panel>
            );
          })}
        </View>

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
  adminOverview:{gap:10,backgroundColor:'#153426',borderColor:'#356a4a'},
  adminOverviewTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10},
  adminOverviewKicker:{color:'#90a898',fontSize:7,fontWeight:'900',letterSpacing:0.8},
  adminOverviewTitle:{color:'#f5f7f5',fontSize:15,fontWeight:'900',marginTop:3},
  adminOverviewScore:{color:'#79ef91',fontSize:9,fontWeight:'900'},
  adminOverviewText:{color:'#c0d0c5',fontSize:8.3,lineHeight:12.5},
  adminOverviewMetrics:{flexDirection:'row',gap:7},
  adminMini:{flex:1,minHeight:48,borderRadius:8,padding:7,justifyContent:'center',backgroundColor:'#0b2117',borderWidth:1,borderColor:'#2c503d'},
  adminMiniLabel:{color:'#789080',fontSize:6.2,fontWeight:'900'},
  adminMiniValue:{color:'#f5f7f5',fontSize:9,fontWeight:'900',marginTop:3},
  adminDeptCard:{gap:11,backgroundColor:'#10291d',borderColor:'#2c503d'},
  adminStatus:{color:'#79ef91',fontSize:7,fontWeight:'900'},
  adminStatusBad:{color:'#f09d9d'},
  adminStatusWarn:{color:'#d8c27c'},
  needHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  needLabel:{color:'#789080',fontSize:6.5,fontWeight:'900',letterSpacing:0.6},
  needValue:{color:'#f5f7f5',fontSize:8,fontWeight:'900'},
  needTrack:{height:7,borderRadius:99,backgroundColor:'#08150e',overflow:'hidden',borderWidth:1,borderColor:'#294336'},
  needFill:{height:'100%',backgroundColor:'#79ef91'},
  adminDeptMetrics:{flexDirection:'row',gap:6},
  adminDeptMetric:{flex:1,minHeight:52,borderRadius:8,padding:7,justifyContent:'center',backgroundColor:'#0b2117',borderWidth:1,borderColor:'#2c503d'},
  adminDeptValue:{color:'#f5f7f5',fontSize:10,fontWeight:'900',marginTop:3},
  staffList:{gap:7},
  staffRow:{flexDirection:'row',alignItems:'center',gap:8,padding:8,borderRadius:8,backgroundColor:'#0b2117',borderWidth:1,borderColor:'#284635'},
  staffPerson:{flex:1,minWidth:0},
  staffName:{color:'#f5f7f5',fontSize:9.5,fontWeight:'900'},
  staffRole:{color:'#8fa195',fontSize:7,lineHeight:10.5,marginTop:2},
  staffSalary:{color:'#79ef91',fontSize:7,fontWeight:'800',marginTop:3},
  staffContract:{color:'#d8c27c',fontSize:6.5,fontWeight:'800',marginTop:2},
  fireButton:{minWidth:68,minHeight:38,borderRadius:7,alignItems:'center',justifyContent:'center',backgroundColor:'#2a1a1a',borderWidth:1,borderColor:'#624141',paddingHorizontal:6},
  fireButtonDisabled:{opacity:0.4},
  fireButtonText:{color:'#efb2b2',fontSize:6.5,fontWeight:'900'},
  fireCost:{color:'#c99797',fontSize:5.8,fontWeight:'800',marginTop:2},
  noStaff:{color:'#73877a',fontSize:8,fontStyle:'italic'},
  savingHint:{flexDirection:'row',alignItems:'flex-start',gap:7,padding:8,borderRadius:8,backgroundColor:'#211f14',borderWidth:1,borderColor:'#5b5230'},
  savingHintText:{flex:1,color:'#d8cda7',fontSize:7.4,lineHeight:11.5},
  candidateBox:{flexDirection:'row',alignItems:'center',gap:8,padding:9,borderRadius:9,backgroundColor:'#13251b',borderWidth:1,borderColor:'#355846'},
  candidateInfo:{flex:1,minWidth:0},
  candidateKicker:{color:'#789080',fontSize:6.2,fontWeight:'900',letterSpacing:0.6},
  candidateName:{color:'#f5f7f5',fontSize:9.5,fontWeight:'900',marginTop:2},
  candidateMeta:{color:'#9fb2a5',fontSize:6.8,lineHeight:10.5,marginTop:2},
  hireButton:{minWidth:78,minHeight:42,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#79ef91',paddingHorizontal:7},
  hireButtonDisabled:{backgroundColor:'#23382c'},
  hireButtonText:{color:'#07150d',fontSize:7,fontWeight:'900'},
  hireButtonTextDisabled:{color:'#75867b'},
  hireCost:{color:'#12301e',fontSize:6,fontWeight:'800',marginTop:2},
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
  sponsorCard: { gap: 12, backgroundColor: '#10291d', borderColor: '#2c503d' },
  sponsorButton: { minHeight: 42, borderRadius: 9, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sponsorButtonText: { color: '#07150d', fontSize: 9, fontWeight: '900' },
  riskBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 9, borderRadius: 9, backgroundColor: '#171f19', borderWidth: 1, borderColor: '#3b463e' },
  riskText: { flex: 1, color: '#b9c7bd', fontSize: 8, lineHeight: 12 },
  riskLow: { color: '#79ef91' },
  riskMedium: { color: '#d8c27c' },
  riskHigh: { color: '#f09d9d' },

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