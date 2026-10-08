import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { FORMATIONS } from '@/game/data';
import { effectiveStrength } from '@/game/engine';
import type { Intensity, Mentality, Player } from '@/game/types';

const POSITION_ORDER = ['GOL','LD','ZAG','LE','VOL','MC','MEI','PE','PD','ATA'];

function sortPlayers(players: Player[]) {
  return [...players].sort((a,b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.strength - a.strength);
}

export default function TacticsScreen() {
  const router = useRouter();
  const {
    career, setFormation, movePlayer, chooseCaptain, makeSubstitution, setTactics,
    swapBenchPlayer, pauseMatchForTactics, resumeMatchFromTactics,
  } = useCareer();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const live = Boolean(career?.liveMatch && career.liveMatch.phase !== 'pregame' && career.liveMatch.phase !== 'finished');

  useEffect(() => {
    if (!live) return;
    pauseMatchForTactics();
    return () => resumeMatchFromTactics();
  }, [live, pauseMatchForTactics, resumeMatchFromTactics]);

  if (!career) {
    return <><GameHeader title="Táticas" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  const substitutionsRemaining = live && career.liveMatch ? Math.max(0, 5 - career.liveMatch.substitutionsUsed) : 5;
  const lineup = career.liveMatch?.userLineup ?? career.lineup;
  const starterIds = new Set(lineup.map((slot) => slot.playerId));
  const benchIds = career.liveMatch?.userBenchIds ?? career.benchIds;
  const bench = sortPlayers(career.players.filter((p) => benchIds.includes(p.id) && !starterIds.has(p.id) && p.status === 'available'));
  const substitutedOut = live
    ? sortPlayers(career.players.filter((p) => (career.liveMatch?.substitutedOutIds ?? []).includes(p.id)))
    : [];
  const currentStarterIds = new Set((career.liveMatch?.phase === 'pregame' ? career.liveMatch.userLineup : career.lineup).map((slot) => slot.playerId));
  const currentBenchIds = new Set(career.liveMatch?.phase === 'pregame' ? career.liveMatch.userBenchIds : career.benchIds);
  const outside = live
    ? []
    : sortPlayers(career.players.filter((p) => !currentStarterIds.has(p.id) && !currentBenchIds.has(p.id)));

  const selectedPlayer = selectedPlayerId ? career.players.find((p) => p.id === selectedPlayerId) : undefined;
  const selectedIsBench = selectedPlayer ? benchIds.includes(selectedPlayer.id) : false;
  const selectedIsOutside = selectedPlayer ? outside.some((p) => p.id === selectedPlayer.id) : false;

  const selectStarter = (slotId: string, playerId: string) => {
    if (selectedPlayerId) {
      if (live) {
        if (selectedIsBench && substitutionsRemaining > 0) makeSubstitution(playerId, selectedPlayerId);
      } else {
        movePlayer(slotId, selectedPlayerId);
      }
      setSelectedPlayerId(null);
      return;
    }
    if (!live) chooseCaptain(playerId);
  };

  const selectBench = (playerId: string) => {
    if (live) {
      if (substitutionsRemaining <= 0) return;
      setSelectedPlayerId((current) => current === playerId ? null : playerId);
      return;
    }

    if (selectedPlayerId && selectedIsOutside) {
      swapBenchPlayer(playerId, selectedPlayerId);
      setSelectedPlayerId(null);
      return;
    }

    setSelectedPlayerId((current) => current === playerId ? null : playerId);
  };

  const selectOutside = (player: Player) => {
    if (player.status !== 'available') return;
    setSelectedPlayerId((current) => current === player.id ? null : player.id);
  };

  const changeMentality = (mentality: Mentality) => setTactics({ ...career.tactics, mentality });
  const changePressure = (pressure: Intensity) => setTactics({ ...career.tactics, pressure });
  const changeTempo = (tempo: Intensity) => setTactics({ ...career.tactics, tempo });

  const backToMatch = () => {
    if (live) resumeMatchFromTactics();
    router.back();
  };

  return (
    <>
      <GameHeader title="Táticas" eyebrow={live ? 'PARTIDA PAUSADA' : 'ESCALAÇÃO E RELACIONADOS'} />
      <Screen>
        {live ? (
          <Panel style={styles.subStatus}>
            <View style={styles.subStatusIcon}>
              <Feather name="pause-circle" size={19} color="#79ef91" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subStatusLabel}>JOGO PAUSADO PARA AJUSTES</Text>
              <Text style={styles.subStatusValue}>{substitutionsRemaining} substituições restantes</Text>
            </View>
            <Text style={styles.subStatusUsed}>{career.liveMatch?.minute ?? 0}′</Text>
          </Panel>
        ) : null}

        {!live ? (
          <>
            <Text style={styles.sectionTitle}>FORMAÇÃO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formations}>
              {FORMATIONS.map((formation) => {
                const selected = career.formationId === formation.id;
                return (
                  <Pressable key={formation.id} onPress={() => setFormation(formation.id)} style={[styles.formation, selected && styles.formationSelected]}>
                    <Text style={[styles.formationText, selected && styles.formationTextSelected]}>{formation.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Panel style={styles.pitch}>
          <View pointerEvents="none" style={styles.halfLine} />
          <View pointerEvents="none" style={styles.centerCircle} />
          <View pointerEvents="none" style={styles.boxTop} />
          <View pointerEvents="none" style={styles.boxBottom} />
          {lineup.map((slot) => {
            const player = career.players.find((p) => p.id === slot.playerId);
            if (!player) return null;
            const captain = player.id === career.captainId;
            return (
              <Pressable
                key={slot.id}
                onPress={() => selectStarter(slot.id, player.id)}
                style={[styles.player, { left: slot.x + '%', top: slot.y + '%', transform: [{ translateX: -27 }, { translateY: -24 }] }]}
              >
                <Text style={styles.playerRating}>{effectiveStrength(player, slot.position)}</Text>
                <Text numberOfLines={1} style={styles.playerName}>{player.name.split(' ')[0]}{captain ? ' ★' : ''}</Text>
                <Text style={styles.playerPos}>{slot.position}</Text>
              </Pressable>
            );
          })}
        </Panel>

        <Text style={styles.hint}>
          {selectedPlayer
            ? live
              ? 'Agora toque no jogador em campo que vai sair. Depois da troca, ele não poderá voltar.'
              : selectedIsOutside
                ? 'Toque em um titular para colocá-lo no time ou toque em um reserva para colocar este jogador no banco.'
                : 'Toque em um titular para fazer a troca.'
            : live
              ? 'O relógio está parado. Escolha um reserva e depois quem sai.'
              : 'Você pode escolher qualquer jogador disponível do plantel para ser titular ou ir para o banco.'}
        </Text>

        <View style={styles.sectionLine}>
          <Text style={styles.sectionTitle}>BANCO DA PARTIDA</Text>
          <Text style={styles.sectionMeta}>{bench.length}/7</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bench}>
          {bench.map((player) => {
            const selected = selectedPlayerId === player.id;
            return (
              <Pressable
                key={player.id}
                disabled={live && substitutionsRemaining <= 0}
                onPress={() => selectBench(player.id)}
                style={[styles.benchCard, selected && styles.benchSelected, live && substitutionsRemaining <= 0 && styles.cardDisabled]}
              >
                <Text style={styles.benchPos}>{player.position}</Text>
                <Text numberOfLines={1} style={styles.benchName}>{player.name.split(' ')[0]}</Text>
                <Text style={styles.benchRating}>FOR {effectiveStrength(player)}</Text>
                <Text style={styles.benchCondition}>CND {Math.round(player.fitness)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!live ? (
          <>
            <View style={styles.sectionLine}>
              <Text style={styles.sectionTitle}>OUTROS JOGADORES DO PLANTEL</Text>
              <Text style={styles.sectionMeta}>{outside.length}</Text>
            </View>
            <Text style={styles.poolHint}>Toque em um jogador daqui. Depois escolha um titular ou um jogador do banco para substituí-lo na relação.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bench}>
              {outside.map((player) => {
                const selected = selectedPlayerId === player.id;
                const available = player.status === 'available';
                return (
                  <Pressable
                    key={player.id}
                    disabled={!available}
                    onPress={() => selectOutside(player)}
                    style={[styles.poolCard, selected && styles.benchSelected, !available && styles.cardDisabled]}
                  >
                    <Text style={styles.benchPos}>{player.position}</Text>
                    <Text numberOfLines={1} style={styles.benchName}>{player.name.split(' ')[0]}</Text>
                    <Text style={styles.benchRating}>FOR {effectiveStrength(player)}</Text>
                    <Text style={styles.benchCondition}>{available ? 'DISPONÍVEL' : player.status === 'injured' ? 'LESIONADO' : player.status === 'suspended' ? 'SUSPENSO' : 'INDISPONÍVEL'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {live && substitutedOut.length ? (
          <>
            <Text style={styles.sectionTitle}>JÁ SUBSTITUÍDOS — NÃO PODEM VOLTAR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bench}>
              {substitutedOut.map((player) => (
                <View key={player.id} style={[styles.poolCard, styles.outCard]}>
                  <Text style={styles.outLabel}>FORA</Text>
                  <Text numberOfLines={1} style={styles.benchName}>{player.name.split(' ')[0]}</Text>
                  <Text style={styles.benchCondition}>SUBSTITUÍDO</Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>INSTRUÇÕES</Text>
        <Panel style={styles.instructions}>
          <OptionRow title="Mentalidade" options={['cautelosa','equilibrada','ofensiva']} value={career.tactics.mentality} onChange={(v) => changeMentality(v as Mentality)} />
          <OptionRow title="Pressão" options={['baixa','normal','alta']} value={career.tactics.pressure} onChange={(v) => changePressure(v as Intensity)} />
          <OptionRow title="Ritmo" options={['baixa','normal','alta']} value={career.tactics.tempo} onChange={(v) => changeTempo(v as Intensity)} />
        </Panel>

        {live
          ? <GameButton label="CONFIRMAR E VOLTAR À PARTIDA" icon="play" onPress={backToMatch} />
          : <GameButton label="SALVAR E VOLTAR" icon="check" onPress={() => router.back()} />}
      </Screen>
    </>
  );
}

function OptionRow({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.optionButtons}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => onChange(option)} style={[styles.option, value === option && styles.optionSelected]}>
            <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>{option.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subStatus: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#153426', borderColor: '#356a4a' },
  subStatusIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  subStatusLabel: { color: '#9fb2a5', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  subStatusValue: { color: '#f5f7f5', fontSize: 13, fontWeight: '900', marginTop: 3 },
  subStatusUsed: { color: '#79ef91', fontSize: 15, fontWeight: '900' },
  sectionLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { color: '#dce8df', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  sectionMeta: { color: '#79ef91', fontSize: 8, fontWeight: '900' },
  formations: { gap: 8, paddingRight: 20 },
  formation: { minWidth: 84, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#0b2117', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  formationSelected: { backgroundColor: '#79ef91', borderColor: '#79ef91' },
  formationText: { color: '#eef5ef', fontSize: 12, fontWeight: '900' },
  formationTextSelected: { color: '#07150d' },
  pitch: { height: 520, position: 'relative', backgroundColor: '#19452f', borderColor: '#3c7150', overflow: 'hidden', padding: 0 },
  halfLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(255,255,255,.35)' },
  centerCircle: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', left: '50%', top: '50%', transform: [{ translateX: -46 }, { translateY: -46 }] },
  boxTop: { position: 'absolute', width: 150, height: 65, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', left: '50%', top: 0, transform: [{ translateX: -75 }] },
  boxBottom: { position: 'absolute', width: 150, height: 65, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', left: '50%', bottom: 0, transform: [{ translateX: -75 }] },
  player: { position: 'absolute', width: 54, minHeight: 48, borderRadius: 12, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#79ef91', alignItems: 'center', justifyContent: 'center', padding: 3 },
  playerRating: { color: '#79ef91', fontSize: 12, fontWeight: '900' },
  playerName: { color: '#f5f7f5', fontSize: 8, fontWeight: '800', maxWidth: 48 },
  playerPos: { color: '#8fa696', fontSize: 7, fontWeight: '800' },
  hint: { color: '#9fb2a5', fontSize: 9, lineHeight: 14 },
  poolHint: { color: '#7f9587', fontSize: 8, lineHeight: 12 },
  bench: { gap: 8, paddingRight: 20 },
  benchCard: { width: 94, minHeight: 82, borderRadius: 14, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#0b2117', padding: 9, gap: 3 },
  poolCard: { width: 104, minHeight: 82, borderRadius: 14, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#10291d', padding: 9, gap: 3 },
  benchSelected: { borderColor: '#79ef91', backgroundColor: '#153426', borderWidth: 2 },
  cardDisabled: { opacity: 0.38 },
  benchPos: { color: '#79ef91', fontSize: 9, fontWeight: '900' },
  benchName: { color: '#f5f7f5', fontSize: 11, fontWeight: '900' },
  benchRating: { color: '#d7e3da', fontSize: 8, fontWeight: '800' },
  benchCondition: { color: '#879b8e', fontSize: 6.5, fontWeight: '800' },
  outCard: { borderColor: '#593c3c', backgroundColor: '#261818' },
  outLabel: { color: '#ef7777', fontSize: 8, fontWeight: '900' },
  instructions: { gap: 16 },
  optionRow: { gap: 8 },
  optionTitle: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  optionButtons: { flexDirection: 'row', gap: 6 },
  option: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10291d' },
  optionSelected: { backgroundColor: '#79ef91', borderColor: '#79ef91' },
  optionText: { color: '#c4d2c8', fontSize: 8, fontWeight: '900' },
  optionTextSelected: { color: '#07150d' },
});