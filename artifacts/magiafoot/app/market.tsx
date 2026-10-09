import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { effectiveStrength } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

function flagEmoji(code?: string) {
  if (!code || code.length !== 2) return '🌍';
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export default function MarketScreen() {
  const colors = useColors();
  const { career, negotiateMarketPlayer, transferPlayer } = useCareer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [transferBid, setTransferBid] = useState(0);
  const [weeklyWage, setWeeklyWage] = useState(0);
  const [signingBonus, setSigningBonus] = useState(0);
  const [negotiationMessage, setNegotiationMessage] = useState<string | null>(null);

  if (!career) {
    return <><GameHeader title="Mercado" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para acessar o mercado.</Text></Screen></>;
  }

  const currency = career.currency ?? 'BRL';
  const transferBudget = career.finance?.transferBudget ?? career.balance;
  const wageBill = career.players.reduce((sum, player) => sum + player.wage, 0);
  const wageBudget = career.finance?.weeklyWageBudget ?? wageBill;
  const wageRoom = Math.max(0, wageBudget - wageBill);
  const selectedPlayer = selectedPlayerId ? career.market.find((player) => player.id === selectedPlayerId) ?? null : null;
  const sellerClub = selectedPlayer?.currentClubId ? getClub(selectedPlayer.currentClubId) : undefined;

  const visibleMarket = career.market
    .slice()
    .sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name, 'pt-BR'));

  const openNegotiation = (playerId: string) => {
    const player = career.market.find((item) => item.id === playerId);
    if (!player) return;
    setSelectedPlayerId(playerId);
    setTransferBid(player.value);
    setWeeklyWage(player.wage);
    setSigningBonus(Math.max(player.wage * 3, player.signingBonus ?? 0));
    setNegotiationMessage(null);
  };

  const submitNegotiation = () => {
    if (!selectedPlayer) return;
    const negotiation = negotiateMarketPlayer(selectedPlayer.id, transferBid, weeklyWage, signingBonus);
    if (negotiation.result === 'completed') {
      setNegotiationMessage('ACORDO FECHADO! O jogador foi contratado e já está no elenco.');
      setSelectedPlayerId(null);
      return;
    }
    if (negotiation.result === 'club_rejected') {
      if (typeof negotiation.counterOffer === 'number') setTransferBid(negotiation.counterOffer);
      setNegotiationMessage(
        typeof negotiation.counterOffer === 'number'
          ? 'O clube recusou e respondeu com contraproposta de ' + formatCurrency(negotiation.counterOffer, currency) + '.'
          : 'O clube vendedor recusou a proposta. Aumente o valor da transferência.'
      );
    } else if (negotiation.result === 'player_rejected') {
      if (typeof negotiation.wageDemand === 'number') setWeeklyWage(negotiation.wageDemand);
      setSigningBonus((value) => Math.max(value, Math.round(selectedPlayer.wage * 3)));
      setNegotiationMessage(
        typeof negotiation.wageDemand === 'number'
          ? 'O jogador quer pelo menos ' + formatCurrency(negotiation.wageDemand, currency) + '/semana. Ajustei a proposta para você avaliar.'
          : 'O jogador recusou os termos pessoais. Melhore salário ou luvas.'
      );
    } else if (negotiation.result === 'budget') setNegotiationMessage('A proposta ultrapassa o caixa, orçamento de transferências ou limite salarial.');
    else if (negotiation.result === 'squad_full') setNegotiationMessage('O elenco atingiu o limite de 32 jogadores.');
    else setNegotiationMessage('Não foi possível concluir a negociação.');
  };

  const adjust = (field: 'fee' | 'wage' | 'bonus', direction: -1 | 1) => {
    if (!selectedPlayer) return;
    if (field === 'fee') setTransferBid((value) => Math.max(0, Math.round((value + direction * selectedPlayer.value * 0.05) / 1000) * 1000));
    if (field === 'wage') setWeeklyWage((value) => Math.max(0, Math.round((value + direction * selectedPlayer.wage * 0.05) / 100) * 100));
    if (field === 'bonus') setSigningBonus((value) => Math.max(0, Math.round((value + direction * selectedPlayer.wage) / 1000) * 1000));
    setNegotiationMessage(null);
  };

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

        {selectedPlayer ? (
          <Panel style={styles.negotiation}>
            <View style={styles.negotiationHeader}>
              <View style={styles.rating}><Text style={styles.ratingText}>{effectiveStrength(selectedPlayer)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.negotiationKicker}>MESA DE NEGOCIAÇÃO</Text>
                <Text style={styles.negotiationTitle}>{selectedPlayer.name}</Text>
                <Text style={styles.negotiationMeta}>{sellerClub?.name ?? 'Sem clube'} · {selectedPlayer.position} · {selectedPlayer.age} anos</Text>
              </View>
              <Pressable onPress={() => { setSelectedPlayerId(null); setNegotiationMessage(null); }} style={styles.closeButton}>
                <Feather name="x" size={17} color="#9fb2a5" />
              </Pressable>
            </View>

            <View style={styles.offerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerLabel}>PROPOSTA AO CLUBE</Text>
                <Text style={styles.offerValue}>{formatCurrency(transferBid, currency)}</Text>
                <Text style={styles.offerReference}>Valor de mercado: {formatCurrency(selectedPlayer.value, currency)}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => adjust('fee', -1)} style={styles.stepButton}><Feather name="minus" size={14} color="#dce8df" /></Pressable>
                <Pressable onPress={() => adjust('fee', 1)} style={styles.stepButton}><Feather name="plus" size={14} color="#dce8df" /></Pressable>
              </View>
            </View>

            <View style={styles.offerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerLabel}>SALÁRIO SEMANAL</Text>
                <Text style={styles.offerValue}>{formatCurrency(weeklyWage, currency)}</Text>
                <Text style={styles.offerReference}>Pedido inicial: {formatCurrency(selectedPlayer.wage, currency)}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => adjust('wage', -1)} style={styles.stepButton}><Feather name="minus" size={14} color="#dce8df" /></Pressable>
                <Pressable onPress={() => adjust('wage', 1)} style={styles.stepButton}><Feather name="plus" size={14} color="#dce8df" /></Pressable>
              </View>
            </View>

            <View style={styles.offerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerLabel}>LUVAS AO JOGADOR</Text>
                <Text style={styles.offerValue}>{formatCurrency(signingBonus, currency)}</Text>
                <Text style={styles.offerReference}>Pagamento imediato na assinatura</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => adjust('bonus', -1)} style={styles.stepButton}><Feather name="minus" size={14} color="#dce8df" /></Pressable>
                <Pressable onPress={() => adjust('bonus', 1)} style={styles.stepButton}><Feather name="plus" size={14} color="#dce8df" /></Pressable>
              </View>
            </View>

            <View style={styles.negotiationSummary}>
              <Text style={styles.summaryText}>Custo imediato: {formatCurrency(transferBid + signingBonus, currency)}</Text>
              <Text style={styles.summaryText}>Folha após acordo: {formatCurrency(wageBill + weeklyWage, currency)}/{formatCurrency(wageBudget, currency)}</Text>
            </View>

            {negotiationMessage ? <Text style={styles.negotiationMessage}>{negotiationMessage}</Text> : null}

            <Pressable onPress={submitNegotiation} style={styles.submitOffer}>
              <Feather name="send" size={15} color="#07150d" />
              <Text style={styles.submitOfferText}>ENVIAR PROPOSTA</Text>
            </Pressable>
          </Panel>
        ) : negotiationMessage ? (
          <Panel style={styles.successMessage}><Feather name="check-circle" size={17} color="#79ef91" /><Text style={styles.successText}>{negotiationMessage}</Text></Panel>
        ) : null}

        <Panel style={styles.infoStrip}>
          <Feather name="briefcase" size={16} color="#79ef91" />
          <Text style={styles.infoStripText}>Agora a contratação passa por proposta ao clube, salário e luvas. O clube e o jogador podem recusar os termos.</Text>
        </Panel>

        <Text style={styles.sectionTitle}>JOGADORES OBSERVADOS</Text>
        <Panel style={styles.list}>
          {visibleMarket.map((player) => {
            const source = player.currentClubId ? getClub(player.currentClubId) : undefined;
            const possible =
              career.players.length < 32 &&
              transferBudget > 0 &&
              wageRoom > 0;

            return (
              <View key={player.id} style={styles.row}>
                <View style={styles.rating}><Text style={styles.ratingText}>{effectiveStrength(player)}</Text></View>
                <View style={styles.info}>
                  <View style={styles.nameLine}>
                    <Text numberOfLines={1} style={styles.name}>{player.name}</Text>
                    <Text style={styles.flag}>{flagEmoji(player.nationalityCode)}</Text>
                  </View>
                  <Text style={styles.meta}>{player.position} · {player.age} anos · {source?.name ?? 'Livre'}</Text>
                  <Text style={styles.money}>Valor {formatCurrency(player.value, currency)} · salário {formatCurrency(player.wage, currency)}/sem</Text>
                </View>
                <Pressable disabled={!possible} onPress={() => openNegotiation(player.id)} style={[styles.action, !possible && styles.disabled]}>
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
            <Text style={styles.marketFutureTitle}>Mercado entre clubes</Text>
            <Text style={styles.marketFutureText}>Jogadores observados agora aparecem ligados a clubes do universo da carreira. A expansão internacional usa a mesma estrutura.</Text>
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
  negotiation: { gap: 11, backgroundColor: '#0d281c', borderColor: '#79ef91' },
  negotiationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  negotiationKicker: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.65 },
  negotiationTitle: { color: '#f5f7f5', fontSize: 16, fontWeight: '900', marginTop: 2 },
  negotiationMeta: { color: '#879b8e', fontSize: 8, marginTop: 2 },
  closeButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10291d' },
  offerRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#294536', paddingTop: 9 },
  offerLabel: { color: '#809587', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  offerValue: { color: '#f5f7f5', fontSize: 13, fontWeight: '900', marginTop: 3 },
  offerReference: { color: '#718478', fontSize: 7, marginTop: 2 },
  stepper: { flexDirection: 'row', gap: 5 },
  stepButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  negotiationSummary: { borderRadius: 10, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#294536', padding: 9, gap: 4 },
  summaryText: { color: '#aebfb4', fontSize: 7.5, fontWeight: '800' },
  negotiationMessage: { color: '#f1ce75', fontSize: 8.5, lineHeight: 12, textAlign: 'center' },
  submitOffer: { minHeight: 44, borderRadius: 12, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  submitOfferText: { color: '#07150d', fontSize: 8.5, fontWeight: '900' },
  successMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#153426', borderColor: '#356a4a' },
  successText: { flex: 1, color: '#dce8df', fontSize: 8.5, lineHeight: 12 },
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
