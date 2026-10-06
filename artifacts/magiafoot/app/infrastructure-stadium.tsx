import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { stadiumUpgradeCost, ticketDemandMultiplier } from '@/game/engine';
import type { StadiumUpgradeKey } from '@/game/types';
import { useColors } from '@/hooks/useColors';

const ITEMS: Array<{
  key: StadiumUpgradeKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
  effect: string;
}> = [
  { key: 'stands', title: 'Arquibancadas', text: 'Aumenta a capacidade total do estádio.', icon: 'layers', effect: '+4.000 lugares por nível' },
  { key: 'pitch', title: 'Gramado', text: 'Melhora a qualidade do campo e reduz desgaste.', icon: 'activity', effect: 'Melhor condição de jogo' },
  { key: 'roof', title: 'Cobertura', text: 'Protege a torcida e melhora público em dias ruins.', icon: 'umbrella', effect: 'Mais conforto e presença' },
  { key: 'lighting', title: 'Iluminação', text: 'Moderniza jogos noturnos e o espetáculo.', icon: 'sun', effect: 'Mais prestígio' },
  { key: 'seats', title: 'Cadeiras', text: 'Aumenta conforto e retenção de público.', icon: 'grid', effect: 'Melhora ocupação' },
  { key: 'boxes', title: 'Camarotes', text: 'Cria setores premium para maior receita.', icon: 'star', effect: 'Receita premium' },
  { key: 'scoreboard', title: 'Placar eletrônico', text: 'Melhora experiência e aparência do estádio.', icon: 'monitor', effect: 'Mais experiência' },
  { key: 'security', title: 'Segurança', text: 'Melhora controle e operação em dias de jogo.', icon: 'shield', effect: 'Menos riscos' },
  { key: 'turnstiles', title: 'Catracas', text: 'Agiliza entrada e organização do público.', icon: 'log-in', effect: 'Fluxo de entrada' },
  { key: 'parking', title: 'Estacionamento', text: 'Facilita acesso e aumenta presença da torcida.', icon: 'truck', effect: 'Mais acesso' },
  { key: 'drainage', title: 'Drenagem', text: 'Mantém o campo utilizável mesmo com chuva.', icon: 'droplet', effect: 'Protege o gramado' },
  { key: 'irrigation', title: 'Irrigação', text: 'Mantém o gramado em melhor condição.', icon: 'cloud-rain', effect: 'Melhora conservação' },
];

export default function StadiumDetailScreen() {
  const colors = useColors();
  const { career, upgradeStadiumItem, updateTicketPrice } = useCareer();

  if (!career) {
    return <><GameHeader title="Estádio" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar o estádio.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const upgrades = career.stadiumUpgrades;
  const standsLevel = upgrades.stands ?? 1;
  const capacity = club.stadiumCapacity + Math.max(0, standsLevel - 1) * 4000;
  const baseOccupancy = Math.min(0.82, 0.50 + (upgrades.seats ?? 1) * 0.025 + (upgrades.roof ?? 0) * 0.02 + (upgrades.parking ?? 0) * 0.012);
  const currentTicketPrice = career.ticketPrice ?? club.ticketPrice;
  const demandMultiplier = ticketDemandMultiplier(currentTicketPrice, club.ticketPrice);
  const occupancyFactor = Math.min(0.95, baseOccupancy * demandMultiplier);
  const projectedAttendance = Math.round(capacity * occupancyFactor);
  const premiumBonus = 1 + (upgrades.boxes ?? 0) * 0.045 + (upgrades.scoreboard ?? 0) * 0.012;
  const projectedIncome = Math.round(projectedAttendance * currentTicketPrice * premiumBonus);
  const minTicket = Math.max(5, Math.round(club.ticketPrice * 0.45));
  const maxTicket = Math.max(minTicket + 1, Math.round(club.ticketPrice * 2.2));
  const demandLabel = demandMultiplier >= 1.12 ? 'MUITO ALTA' : demandMultiplier >= 1.04 ? 'ALTA' : demandMultiplier >= 0.9 ? 'NORMAL' : demandMultiplier >= 0.7 ? 'BAIXA' : 'MUITO BAIXA';
  const demandPercent = Math.round(occupancyFactor * 100);
  const maintenance = Math.round(
    55000
    + Object.values(upgrades).reduce((sum, level) => sum + level * 8500, 0)
    + capacity * 1.15
  );
  const overallLevel = Math.round(Object.values(upgrades).reduce((a, b) => a + b, 0) / Object.keys(upgrades).length * 10) / 10;

  return (
    <>
      <GameHeader title="Estádio" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.visualPanel}>
          <View style={styles.visualHeader}>
            <View>
              <Text style={styles.visualKicker}>VISÃO DO ESTÁDIO</Text>
              <Text style={styles.visualTitle}>Estádio {club.name}</Text>
            </View>
            <View style={styles.levelBadge}><Text style={styles.levelBadgeText}>NV {overallLevel}</Text></View>
          </View>

          <StadiumVisual upgrades={upgrades} />

          <View style={styles.visualLegend}>
            <Text style={styles.visualLegendText}>{capacity.toLocaleString('pt-BR')} lugares</Text>
            <Text style={styles.visualLegendDot}>•</Text>
            <Text style={styles.visualLegendText}>Cobertura NV {upgrades.roof}</Text>
            <Text style={styles.visualLegendDot}>•</Text>
            <Text style={styles.visualLegendText}>Gramado NV {upgrades.pitch}</Text>
          </View>
        </Panel>

        <View style={styles.metrics}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CAPACIDADE</Text><Text style={styles.metricValue}>{capacity.toLocaleString('pt-BR')}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>PÚBLICO EST.</Text><Text style={styles.metricValue}>{projectedAttendance.toLocaleString('pt-BR')}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>RENDA / JOGO</Text><Text style={styles.metricValueSmall}>{formatCurrency(projectedIncome)}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>MANUTENÇÃO</Text><Text style={styles.metricValueSmall}>{formatCurrency(maintenance)}/mês</Text></Panel>
        </View>

        <SectionLabel title="Ingressos e demanda" />
        <Panel style={styles.ticketPanel}>
          <View style={styles.ticketTop}>
            <View>
              <Text style={styles.ticketLabel}>VALOR DO INGRESSO</Text>
              <Text style={styles.ticketPrice}>{formatCurrency(currentTicketPrice)}</Text>
            </View>
            <View style={styles.demandBadge}>
              <Text style={styles.demandBadgeLabel}>DEMANDA</Text>
              <Text style={styles.demandBadgeValue}>{demandLabel}</Text>
            </View>
          </View>

          <View style={styles.ticketControls}>
            <Pressable
              onPress={() => updateTicketPrice(Math.max(minTicket, currentTicketPrice - 5))}
              disabled={currentTicketPrice <= minTicket}
              style={[styles.ticketButton, currentTicketPrice <= minTicket && styles.ticketButtonDisabled]}
            >
              <Feather name="minus" size={18} color={currentTicketPrice <= minTicket ? '#65756b' : '#f5f7f5'} />
              <Text style={[styles.ticketButtonText, currentTicketPrice <= minTicket && styles.ticketButtonTextDisabled]}>R$ 5</Text>
            </Pressable>

            <View style={styles.ticketRange}>
              <Text style={styles.ticketRangeText}>Mín. {formatCurrency(minTicket)}</Text>
              <View style={styles.ticketRangeTrack}>
                <View style={[styles.ticketRangeFill, { width: (((currentTicketPrice - minTicket) / Math.max(1, maxTicket - minTicket)) * 100 + '%') as any }]} />
              </View>
              <Text style={styles.ticketRangeText}>Máx. {formatCurrency(maxTicket)}</Text>
            </View>

            <Pressable
              onPress={() => updateTicketPrice(Math.min(maxTicket, currentTicketPrice + 5))}
              disabled={currentTicketPrice >= maxTicket}
              style={[styles.ticketButton, currentTicketPrice >= maxTicket && styles.ticketButtonDisabled]}
            >
              <Feather name="plus" size={18} color={currentTicketPrice >= maxTicket ? '#65756b' : '#07150d'} />
              <Text style={[styles.ticketButtonTextPlus, currentTicketPrice >= maxTicket && styles.ticketButtonTextDisabled]}>R$ 5</Text>
            </Pressable>
          </View>

          <View style={styles.demandInfo}>
            <View style={styles.demandMetric}>
              <Text style={styles.demandMetricLabel}>OCUPAÇÃO ESTIMADA</Text>
              <Text style={styles.demandMetricValue}>{demandPercent}%</Text>
            </View>
            <View style={styles.demandMetric}>
              <Text style={styles.demandMetricLabel}>PÚBLICO ESTIMADO</Text>
              <Text style={styles.demandMetricValue}>{projectedAttendance.toLocaleString('pt-BR')}</Text>
            </View>
            <View style={styles.demandMetric}>
              <Text style={styles.demandMetricLabel}>RENDA ESTIMADA</Text>
              <Text style={styles.demandMetricValue}>{formatCurrency(projectedIncome)}</Text>
            </View>
          </View>

          <Text style={styles.ticketHint}>
            Preço menor tende a aumentar a procura. Preço alto pode aumentar a receita por torcedor, mas reduz a ocupação do estádio.
          </Text>
        </Panel>

        <SectionLabel title="Evolução do estádio" />
        <Text style={styles.sectionHint}>As melhorias alteram o estádio visualmente e afetam capacidade, público e receita.</Text>

        <View style={styles.upgradeList}>
          {ITEMS.map((item) => {
            const level = upgrades[item.key] ?? 0;
            const maxed = level >= 5;
            const cost = stadiumUpgradeCost(item.key, level);
            const affordable = career.balance >= cost;
            return (
              <Panel key={item.key} style={styles.upgradeCard}>
                <View style={styles.upgradeTop}>
                  <View style={styles.upgradeIcon}><Feather name={item.icon} size={19} color="#79ef91" /></View>
                  <View style={styles.upgradeBody}>
                    <View style={styles.titleRow}>
                      <Text style={styles.upgradeTitle}>{item.title}</Text>
                      <Text style={styles.upgradeLevel}>NV {level}/5</Text>
                    </View>
                    <Text style={styles.upgradeText}>{item.text}</Text>
                    <Text style={styles.effect}>{item.effect}</Text>
                  </View>
                </View>

                <View style={styles.progress}>
                  <View style={[styles.progressFill, { width: ((level / 5) * 100 + '%') as any }]} />
                </View>

                {maxed ? (
                  <View style={styles.maxed}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.maxedText}>NÍVEL MÁXIMO</Text></View>
                ) : (
                  <Pressable
                    onPress={() => upgradeStadiumItem(item.key)}
                    disabled={!affordable}
                    style={[styles.upgradeButton, !affordable && styles.upgradeButtonDisabled]}
                  >
                    <Text style={[styles.upgradeButtonText, !affordable && styles.upgradeButtonTextDisabled]}>
                      MELHORAR · {formatCurrency(cost)}
                    </Text>
                  </Pressable>
                )}
              </Panel>
            );
          })}
        </View>

        <SectionLabel title="Resumo financeiro" />
        <Panel style={styles.financePanel}>
          <View style={styles.financeRow}><Text style={styles.financeLabel}>Caixa atual</Text><Text style={styles.financeValue}>{formatCurrency(career.balance)}</Text></View>
          <View style={styles.financeRow}><Text style={styles.financeLabel}>Renda potencial por jogo</Text><Text style={styles.financePositive}>{formatCurrency(projectedIncome)}</Text></View>
          <View style={styles.financeRow}><Text style={styles.financeLabel}>Manutenção mensal</Text><Text style={styles.financeNegative}>-{formatCurrency(maintenance)}</Text></View>
          <View style={[styles.financeRow, styles.financeRowLast]}><Text style={styles.financeLabel}>Ingresso atual</Text><Text style={styles.financeValue}>{formatCurrency(currentTicketPrice)}</Text></View>
        </Panel>
      </Screen>
    </>
  );
}

function StadiumVisual({ upgrades }: { upgrades: Record<StadiumUpgradeKey, number> }) {
  const stands = upgrades.stands ?? 1;
  const pitch = upgrades.pitch ?? 1;
  const roof = upgrades.roof ?? 0;
  const lighting = upgrades.lighting ?? 1;
  const boxes = upgrades.boxes ?? 0;
  const scoreboard = upgrades.scoreboard ?? 0;

  const standThickness = 18 + stands * 4;
  const grass = pitch >= 4 ? '#2f8f46' : pitch >= 2 ? '#347a3e' : '#3d6d38';

  return (
    <View style={styles.stadiumScene}>
      <View style={styles.groundShadow} />

      {lighting >= 1 ? (
        <>
          <View style={[styles.lightTower, styles.lightTL]}><View style={styles.lightHead} /></View>
          <View style={[styles.lightTower, styles.lightTR]}><View style={styles.lightHead} /></View>
          {lighting >= 3 ? <>
            <View style={[styles.lightTower, styles.lightBL]}><View style={styles.lightHead} /></View>
            <View style={[styles.lightTower, styles.lightBR]}><View style={styles.lightHead} /></View>
          </> : null}
        </>
      ) : null}

      <View style={styles.stadiumShell}>
        <View style={[styles.standTop, { height: standThickness }]} />
        <View style={[styles.standBottom, { height: standThickness }]} />
        <View style={[styles.standLeft, { width: standThickness }]} />
        <View style={[styles.standRight, { width: standThickness }]} />

        {roof > 0 ? <View style={[styles.roofTop, { height: 8 + roof * 2 }]} /> : null}
        {roof >= 2 ? <View style={[styles.roofBottom, { height: 8 + roof * 2 }]} /> : null}
        {roof >= 4 ? <>
          <View style={[styles.roofSide, styles.roofLeft]} />
          <View style={[styles.roofSide, styles.roofRight]} />
        </> : null}

        <View style={[styles.pitchOuter, { top: standThickness + 8, bottom: standThickness + 8, left: standThickness + 10, right: standThickness + 10 }]}>
          <View style={[styles.pitch, { backgroundColor: grass }]}>
            {[0,1,2,3,4,5].map((n) => <View key={n} style={[styles.grassStripe, { left: (n * 16.7) + '%', opacity: n % 2 ? 0.10 : 0.03 }]} />)}
            <View style={styles.pitchBorder} />
            <View style={styles.midLine} />
            <View style={styles.centerCircle} />
            <View style={styles.boxA} />
            <View style={styles.boxB} />
          </View>
        </View>

        {boxes > 0 ? <View style={[styles.boxSuite, { width: 42 + boxes * 7 }]}><Text style={styles.boxSuiteText}>VIP</Text></View> : null}
        {scoreboard > 0 ? <View style={[styles.scoreboard, { width: 45 + scoreboard * 6 }]}><Text style={styles.scoreboardText}>{scoreboard >= 3 ? 'MAGIAFOOT' : '0 - 0'}</Text></View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visualPanel: { padding: 0, overflow: 'hidden', backgroundColor: '#10291d', borderColor: '#2c503d' },
  visualHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#0b2117' },
  visualKicker: { color: '#79ef91', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  visualTitle: { color: '#f5f7f5', fontSize: 16, fontWeight: '900', marginTop: 3 },
  levelBadge: { minWidth: 54, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426', borderWidth: 1, borderColor: '#356a4a' },
  levelBadgeText: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  visualLegend: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, backgroundColor: '#0b2117' },
  visualLegendText: { color: '#c9d8ce', fontSize: 8, fontWeight: '800' },
  visualLegendDot: { color: '#52705d', fontSize: 8 },

  stadiumScene: { height: 250, position: 'relative', alignItems: 'center', justifyContent: 'center', backgroundColor: '#183525', overflow: 'hidden' },
  groundShadow: { position: 'absolute', width: '84%', height: 154, borderRadius: 80, backgroundColor: 'rgba(0,0,0,.28)', transform: [{ scaleY: 0.58 }] },
  stadiumShell: { width: '86%', height: 176, position: 'relative', backgroundColor: '#4d5e54', borderRadius: 28, borderWidth: 3, borderColor: '#76877d', shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 14, shadowOffset: { width: 0, height: 9 } },
  standTop: { position: 'absolute', left: 30, right: 30, top: 3, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#768178', borderBottomWidth: 3, borderBottomColor: '#9ca59f' },
  standBottom: { position: 'absolute', left: 30, right: 30, bottom: 3, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: '#68766d', borderTopWidth: 3, borderTopColor: '#8b958f' },
  standLeft: { position: 'absolute', top: 26, bottom: 26, left: 3, borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#6d7a72', borderRightWidth: 3, borderRightColor: '#929c96' },
  standRight: { position: 'absolute', top: 26, bottom: 26, right: 3, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, backgroundColor: '#59675f', borderLeftWidth: 3, borderLeftColor: '#7e8982' },
  roofTop: { position: 'absolute', left: 22, right: 22, top: -4, borderRadius: 9, backgroundColor: '#b8c0bb', borderBottomWidth: 3, borderBottomColor: '#78847d' },
  roofBottom: { position: 'absolute', left: 22, right: 22, bottom: -4, borderRadius: 9, backgroundColor: '#9ca7a0', borderTopWidth: 3, borderTopColor: '#737f77' },
  roofSide: { position: 'absolute', top: 22, bottom: 22, width: 12, borderRadius: 8, backgroundColor: '#aeb7b1' },
  roofLeft: { left: -4 },
  roofRight: { right: -4 },
  pitchOuter: { position: 'absolute', backgroundColor: '#222f28', padding: 4, borderRadius: 7 },
  pitch: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 4 },
  grassStripe: { position: 'absolute', top: 0, bottom: 0, width: '17%', backgroundColor: '#dff4df' },
  pitchBorder: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)' },
  midLine: { position: 'absolute', top: 6, bottom: 6, left: '50%', width: 1, backgroundColor: 'rgba(255,255,255,.72)' },
  centerCircle: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)', left: '50%', top: '50%', transform: [{ translateX: -18 }, { translateY: -18 }] },
  boxA: { position: 'absolute', width: 27, top: '25%', bottom: '25%', left: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)' },
  boxB: { position: 'absolute', width: 27, top: '25%', bottom: '25%', right: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,.72)' },
  boxSuite: { position: 'absolute', height: 18, top: 7, left: '50%', marginLeft: -28, borderRadius: 4, backgroundColor: '#1c2b23', borderWidth: 1, borderColor: '#e2c56f', alignItems: 'center', justifyContent: 'center' },
  boxSuiteText: { color: '#e2c56f', fontSize: 7, fontWeight: '900' },
  scoreboard: { position: 'absolute', height: 24, right: 21, top: 21, borderRadius: 4, backgroundColor: '#08120d', borderWidth: 2, borderColor: '#79ef91', alignItems: 'center', justifyContent: 'center' },
  scoreboardText: { color: '#79ef91', fontSize: 6, fontWeight: '900' },
  lightTower: { position: 'absolute', width: 5, height: 74, backgroundColor: '#87958d', borderRadius: 3, zIndex: 2 },
  lightHead: { position: 'absolute', width: 28, height: 9, top: -4, left: -12, borderRadius: 3, backgroundColor: '#e9f0ce', borderWidth: 1, borderColor: '#b4c19a' },
  lightTL: { left: '7%', top: 24, transform: [{ rotate: '-8deg' }] },
  lightTR: { right: '7%', top: 24, transform: [{ rotate: '8deg' }] },
  lightBL: { left: '9%', bottom: 17, transform: [{ rotate: '8deg' }] },
  lightBR: { right: '9%', bottom: 17, transform: [{ rotate: '-8deg' }] },

  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48.5%', minHeight: 92, justifyContent: 'center', gap: 6 },
  metricLabel: { color: '#90a898', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.7 },
  metricValue: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  metricValueSmall: { color: '#f5f7f5', fontSize: 13, fontWeight: '900' },
  sectionHint: { color: '#9fb2a5', fontSize: 9, lineHeight: 14, marginTop: -8 },
  upgradeList: { gap: 9 },
  upgradeCard: { gap: 10, backgroundColor: '#10291d', borderColor: '#2c503d' },
  upgradeTop: { flexDirection: 'row', gap: 10 },
  upgradeIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  upgradeBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upgradeTitle: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  upgradeLevel: { color: '#79ef91', fontSize: 8.5, fontWeight: '900' },
  upgradeText: { color: '#9fb2a5', fontSize: 8.5, lineHeight: 12, marginTop: 3 },
  effect: { color: '#d6e2d9', fontSize: 8, fontWeight: '800', marginTop: 4 },
  progress: { height: 6, borderRadius: 999, backgroundColor: '#081a11', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#79ef91' },
  upgradeButton: { minHeight: 36, borderRadius: 9, backgroundColor: '#79ef91', alignItems: 'center', justifyContent: 'center' },
  upgradeButtonDisabled: { backgroundColor: '#23382c' },
  upgradeButtonText: { color: '#07150d', fontSize: 9, fontWeight: '900' },
  upgradeButtonTextDisabled: { color: '#75867b' },
  maxed: { minHeight: 36, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#153426', borderWidth: 1, borderColor: '#356a4a' },
  maxedText: { color: '#79ef91', fontSize: 9, fontWeight: '900' },
  ticketPanel: { gap: 13, backgroundColor: '#10291d', borderColor: '#2c503d' },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ticketLabel: { color: '#90a898', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.8 },
  ticketPrice: { color: '#f5f7f5', fontSize: 24, fontWeight: '900', marginTop: 3 },
  demandBadge: { minWidth: 92, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426', borderWidth: 1, borderColor: '#356a4a', paddingHorizontal: 8 },
  demandBadgeLabel: { color: '#90a898', fontSize: 7, fontWeight: '900' },
  demandBadgeValue: { color: '#79ef91', fontSize: 10, fontWeight: '900', marginTop: 3 },
  ticketControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketButton: { width: 66, minHeight: 44, borderRadius: 10, backgroundColor: '#173326', borderWidth: 1, borderColor: '#356a4a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  ticketButtonDisabled: { backgroundColor: '#12231b', borderColor: '#26382f' },
  ticketButtonText: { color: '#f5f7f5', fontSize: 8, fontWeight: '900' },
  ticketButtonTextPlus: { color: '#07150d', fontSize: 8, fontWeight: '900' },
  ticketButtonTextDisabled: { color: '#65756b' },
  ticketRange: { flex: 1, minWidth: 0, gap: 5 },
  ticketRangeTrack: { height: 7, borderRadius: 99, backgroundColor: '#081a11', overflow: 'hidden', borderWidth: 1, borderColor: '#2c503d' },
  ticketRangeFill: { height: '100%', backgroundColor: '#79ef91' },
  ticketRangeText: { color: '#8fa696', fontSize: 7, fontWeight: '800', textAlign: 'center' },
  demandInfo: { flexDirection: 'row', gap: 6 },
  demandMetric: { flex: 1, minWidth: 0, minHeight: 62, borderRadius: 9, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d', padding: 8, justifyContent: 'center' },
  demandMetricLabel: { color: '#8fa696', fontSize: 6.5, fontWeight: '900' },
  demandMetricValue: { color: '#f5f7f5', fontSize: 10, fontWeight: '900', marginTop: 4 },
  ticketHint: { color: '#9fb2a5', fontSize: 8.5, lineHeight: 13 },
  financePanel: { paddingVertical: 2, backgroundColor: '#10291d', borderColor: '#2c503d' },
  financeRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#274535' },
  financeRowLast: { borderBottomWidth: 0 },
  financeLabel: { color: '#c9d8ce', fontSize: 9.5, fontWeight: '800' },
  financeValue: { color: '#f5f7f5', fontSize: 10, fontWeight: '900' },
  financePositive: { color: '#79ef91', fontSize: 10, fontWeight: '900' },
  financeNegative: { color: '#f09d9d', fontSize: 10, fontWeight: '900' },
});