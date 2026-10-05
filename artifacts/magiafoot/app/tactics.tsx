import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { CLUBS, FORMATIONS } from '@/game/data';
import { effectiveStrength, getPlayer, POSITION_LABELS } from '@/game/engine';
import type { FormationSlot, Player } from '@/game/types';
import { useColors } from '@/hooks/useColors';

interface PitchBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function PitchPlayer({ player, slot, selected, canDrag = true, onSelect, onDrop }: {
  player: Player;
  slot: FormationSlot;
  selected: boolean;
  canDrag?: boolean;
  onSelect: () => void;
  onDrop: (x: number, y: number) => void;
}) {
  const colors = useColors();
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => canDrag && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8,
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 14) onDrop(gesture.moveX, gesture.moveY);
    },
  }), [canDrag, onDrop]);
  const rating = effectiveStrength(player, slot.position);
  return (
    <Pressable
      {...pan.panHandlers}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, ${POSITION_LABELS[slot.position]}, força ${rating}`}
      style={[
        styles.pitchPlayer,
        {
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          borderColor: selected ? colors.accent : colors.primaryForeground,
          backgroundColor: slot.sentOff ? colors.destructive : colors.primary,
          transform: [{ translateX: -31 }, { translateY: -28 }],
          opacity: slot.sentOff ? 0.57 : 1,
        },
      ]}
    >
      <Text style={[styles.pitchRating, { color: colors.primaryForeground }]}>{rating}</Text>
      <Text numberOfLines={1} style={[styles.pitchName, { color: colors.primaryForeground }]}>{player.name.split(' ')[0]}</Text>
      <Text style={[styles.pitchPosition, { color: colors.primaryForeground }]}>{slot.position}</Text>
      {player.status !== 'available' ? <View style={[styles.statusDot, { backgroundColor: colors.destructive }]} /> : null}
    </Pressable>
  );
}

function BenchPlayer({ player, selected, onSelect, onDrop }: {
  player: Player;
  selected: boolean;
  onSelect: () => void;
  onDrop: (x: number, y: number) => void;
}) {
  const colors = useColors();
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8,
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 14) onDrop(gesture.moveX, gesture.moveY);
    },
  }), [onDrop]);
  return (
    <Pressable
      {...pan.panHandlers}
      onPress={onSelect}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.benchPlayer,
        {
          backgroundColor: selected ? colors.accent : colors.secondary,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <Text numberOfLines={1} style={[styles.benchPosition, { color: colors.primary }]}>{POSITION_LABELS[player.position]}</Text>
      <Text numberOfLines={1} style={[styles.benchName, { color: colors.foreground }]}>{player.name.split(' ')[0]}</Text>
      <Text style={[styles.benchRating, { color: colors.mutedForeground }]}>{effectiveStrength(player)}</Text>
    </Pressable>
  );
}

export default function TacticsScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    career, setFormation, movePlayer, chooseCaptain, makeSubstitution, setTactics,
  } = useCareer();
  const pitchRef = useRef<View>(null);
  const [bounds, setBounds] = useState<PitchBounds | null>(null);
  const [selectedBench, setSelectedBench] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const lineUp = career?.liveMatch?.userLineup ?? career?.lineup ?? [];
  const starterIds = new Set(lineUp.map((slot) => slot.playerId));
  const benchIds = career?.liveMatch?.userBenchIds ?? career?.players
    .filter((player) => player.status === 'available' && !starterIds.has(player.id))
    .map((player) => player.id) ?? [];
  const benchPlayers = (career?.players ?? []).filter((player) => benchIds.includes(player.id) && player.status === 'available');
  const live = Boolean(career?.liveMatch && career.liveMatch.phase !== 'pregame' && career.liveMatch.phase !== 'finished');
  const canChangeShape = Boolean(career && !career.liveMatch);

  const measurePitch = useCallback((_event: LayoutChangeEvent) => {
    pitchRef.current?.measureInWindow((left, top, width, height) => {
      setBounds({ left, top, width, height });
    });
  }, []);

  const dropOnPitch = useCallback((playerId: string, sourceSlotId: string | null, pageX: number, pageY: number) => {
    if (!career || !bounds) {
      setFeedback('Solte o jogador dentro do campo.');
      return;
    }
    const x = ((pageX - bounds.left) / bounds.width) * 100;
    const y = ((pageY - bounds.top) / bounds.height) * 100;
    const nearest = lineUp
      .map((slot) => ({ slot, distance: Math.hypot(slot.x - x, (slot.y - y) * 0.76) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > 22) {
      setFeedback('Solte o jogador perto de uma posição.');
      return;
    }
    const targetPlayer = getPlayer(career, nearest.slot.playerId);
    if (!targetPlayer) return;
    if (live) {
      if (sourceSlotId) {
        setFeedback('Durante a partida, arraste um reserva até o titular que vai sair.');
        return;
      }
      const success = makeSubstitution(targetPlayer.id, playerId);
      setFeedback(success ? 'Substituição realizada.' : 'Não foi possível fazer essa substituição.');
      if (success) setSelectedBench(null);
      return;
    }
    movePlayer(nearest.slot.id, playerId);
    setFeedback('Escalação atualizada. Jogadores fora de posição têm a força reduzida.');
    setSelectedBench(null);
  }, [bounds, career, lineUp, live, makeSubstitution, movePlayer]);

  const chooseFieldPlayer = useCallback((slot: FormationSlot) => {
    if (!career) return;
    if (selectedBench) {
      const success = live
        ? makeSubstitution(slot.playerId, selectedBench)
        : (movePlayer(slot.id, selectedBench), true);
      setFeedback(success ? 'Jogador atualizado na escalação.' : 'Não foi possível fazer essa substituição.');
      if (success) setSelectedBench(null);
      return;
    }
    if (!live) {
      chooseCaptain(slot.playerId);
      setFeedback('Faixa de capitão atualizada.');
    } else {
      setFeedback('Escolha um reserva e toque em quem vai sair.');
    }
  }, [career, chooseCaptain, live, makeSubstitution, movePlayer, selectedBench]);

  const activeClub = career ? CLUBS.find((club) => club.id === career.clubId) : undefined;
  if (!career || !activeClub) {
    return <><GameHeader title="Escalação e táticas" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  return (
    <>
      <GameHeader title="Escalação e táticas" eyebrow={live ? `${career.liveMatch?.minute ?? 0}′ · PARTIDA AO VIVO` : 'MONTE SEU TIME'} />
      <Screen>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>{live ? 'Ajuste o time' : 'Escolha como jogar'}</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
              {live ? 'Toque em um reserva e depois no titular para substituir.' : 'Arraste para trocar; fora da posição natural, a força cai.'}
            </Text>
          </View>
          {live ? <View style={[styles.subBadge, { backgroundColor: colors.secondary }]}><Text style={[styles.subBadgeText, { color: colors.primary }]}>{career.liveMatch?.substitutionsUsed ?? 0}/5</Text></View> : null}
        </View>

        {canChangeShape ? (
          <>
            <SectionLabel title="Formação" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formations}>
              {FORMATIONS.map((formation) => {
                const selected = career.formationId === formation.id;
                return (
                  <Pressable
                    key={formation.id}
                    onPress={() => {
                      setFormation(formation.id);
                      setSelectedBench(null);
                      setFeedback(`${formation.label} selecionada. Os melhores jogadores foram posicionados automaticamente.`);
                    }}
                    style={({ pressed }) => [
                      styles.formationChoice,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <Feather name="grid" size={14} color={selected ? colors.primaryForeground : colors.primary} />
                    <Text style={[styles.formationText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{formation.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View
          ref={pitchRef}
          onLayout={measurePitch}
          style={[styles.pitch, { borderColor: colors.border, backgroundColor: colors.secondary }]}
        >
          <View pointerEvents="none" style={[styles.pitchBorder, { borderColor: colors.mutedForeground }]} />
          <View pointerEvents="none" style={[styles.pitchHalfLine, { backgroundColor: colors.mutedForeground }]} />
          <View pointerEvents="none" style={[styles.pitchCircle, { borderColor: colors.mutedForeground }]} />
          <View pointerEvents="none" style={[styles.pitchBoxTop, { borderColor: colors.mutedForeground }]} />
          <View pointerEvents="none" style={[styles.pitchBoxBottom, { borderColor: colors.mutedForeground }]} />
          {lineUp.map((slot) => {
            const player = career.players.find((item) => item.id === slot.playerId);
            if (!player) return null;
            return (
              <PitchPlayer
                key={slot.id}
                player={player}
                slot={slot}
                selected={selectedBench === player.id}
                canDrag={!live}
                onSelect={() => chooseFieldPlayer(slot)}
                onDrop={(x, y) => dropOnPitch(player.id, slot.id, x, y)}
              />
            );
          })}
          <View pointerEvents="none" style={styles.pitchDirection}><Feather name="arrow-up" size={13} color={colors.mutedForeground} /><Text style={[styles.pitchDirectionText, { color: colors.mutedForeground }]}>ATAQUE</Text></View>
        </View>

        <View style={styles.pitchLegend}>
          <Text style={[styles.pitchLegendText, { color: colors.mutedForeground }]}>Força exibida já considera posição, físico e moral.</Text>
          {lineUp.find((slot) => slot.playerId === career.captainId) ? <Text style={[styles.captainLegend, { color: colors.primary }]}>★ Capitão</Text> : null}
        </View>

        <SectionLabel title={`Banco · ${benchPlayers.length}`} action={<Text style={[styles.dragHint, { color: colors.mutedForeground }]}>{live ? 'arraste para substituir' : 'arraste para escalar'}</Text>} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.benchList}>
          {benchPlayers.map((player) => (
            <BenchPlayer
              key={player.id}
              player={player}
              selected={player.id === selectedBench}
              onSelect={() => {
                setSelectedBench(player.id === selectedBench ? null : player.id);
                setFeedback(live ? 'Agora toque no titular que vai sair.' : 'Agora toque em um titular para trocar de posição.');
              }}
              onDrop={(x, y) => dropOnPitch(player.id, null, x, y)}
            />
          ))}
        </ScrollView>

        {feedback ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}

        {!live ? (
          <Panel style={styles.tacticsPanel}>
            <SectionLabel title="Instruções" />
            <Text style={[styles.tacticLabel, { color: colors.mutedForeground }]}>Mentalidade</Text>
            <View style={styles.tacticGroup}>
              {(['cautelosa', 'equilibrada', 'ofensiva'] as const).map((option) => {
                const selected = career.tactics.mentality === option;
                return <Pressable key={option} onPress={() => setTactics({ ...career.tactics, mentality: option })} style={[styles.tacticChoice, { backgroundColor: selected ? colors.primary : colors.secondary }]}><Text style={[styles.tacticText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option[0]?.toUpperCase()}{option.slice(1)}</Text></Pressable>;
              })}
            </View>
            <Text style={[styles.tacticLabel, { color: colors.mutedForeground }]}>Pressão</Text>
            <View style={styles.tacticGroup}>
              {(['baixa', 'normal', 'alta'] as const).map((option) => {
                const selected = career.tactics.pressure === option;
                return <Pressable key={option} onPress={() => setTactics({ ...career.tactics, pressure: option })} style={[styles.tacticChoice, { backgroundColor: selected ? colors.primary : colors.secondary }]}><Text style={[styles.tacticText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option[0]?.toUpperCase()}{option.slice(1)}</Text></Pressable>;
              })}
            </View>
            <Text style={[styles.tacticLabel, { color: colors.mutedForeground }]}>Ritmo</Text>
            <View style={styles.tacticGroup}>
              {(['baixa', 'normal', 'alta'] as const).map((option) => {
                const selected = career.tactics.tempo === option;
                return <Pressable key={option} onPress={() => setTactics({ ...career.tactics, tempo: option })} style={[styles.tacticChoice, { backgroundColor: selected ? colors.primary : colors.secondary }]}><Text style={[styles.tacticText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option[0]?.toUpperCase()}{option.slice(1)}</Text></Pressable>;
              })}
            </View>
          </Panel>
        ) : (
          <GameButton label="Voltar à partida" icon="arrow-left" variant="outline" onPress={() => router.back()} />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  pageSub: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  subBadge: { minWidth: 43, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  subBadgeText: { fontSize: 13, fontWeight: '900' },
  formations: { flexDirection: 'row', gap: 8, paddingBottom: 3 },
  formationChoice: { minHeight: 40, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  formationText: { fontSize: 12, fontWeight: '800' },
  pitch: { height: 410, width: '100%', borderWidth: 1, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  pitchBorder: { position: 'absolute', left: 9, right: 9, top: 9, bottom: 9, borderWidth: 1, borderRadius: 14, opacity: 0.35 },
  pitchHalfLine: { position: 'absolute', left: 9, right: 9, height: 1, top: '50%', opacity: 0.35 },
  pitchCircle: { position: 'absolute', width: 77, height: 77, borderRadius: 39, borderWidth: 1, top: '50%', left: '50%', marginLeft: -38, marginTop: -38, opacity: 0.35 },
  pitchBoxTop: { position: 'absolute', top: 9, left: '24%', width: '52%', height: '13%', borderWidth: 1, borderTopWidth: 0, opacity: 0.35 },
  pitchBoxBottom: { position: 'absolute', bottom: 9, left: '24%', width: '52%', height: '13%', borderWidth: 1, borderBottomWidth: 0, opacity: 0.35 },
  pitchPlayer: { width: 62, height: 57, borderRadius: 14, borderWidth: 1.5, position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, zIndex: 3 },
  pitchRating: { fontSize: 13, fontWeight: '900', lineHeight: 15 },
  pitchName: { fontSize: 8, fontWeight: '800', maxWidth: 57, lineHeight: 12 },
  pitchPosition: { fontSize: 7, fontWeight: '800', opacity: 0.8, lineHeight: 9 },
  statusDot: { position: 'absolute', right: 3, top: 3, width: 6, height: 6, borderRadius: 3 },
  pitchDirection: { position: 'absolute', bottom: 11, alignSelf: 'center', flexDirection: 'row', gap: 4, alignItems: 'center', opacity: 0.7 },
  pitchDirectionText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  pitchLegend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pitchLegendText: { fontSize: 9, flex: 1 },
  captainLegend: { fontSize: 9, fontWeight: '800' },
  dragHint: { fontSize: 9 },
  benchList: { flexDirection: 'row', gap: 8, paddingBottom: 3 },
  benchPlayer: { width: 78, minHeight: 66, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 3 },
  benchPosition: { fontSize: 8, fontWeight: '900' },
  benchName: { fontSize: 10, fontWeight: '800' },
  benchRating: { fontSize: 9, fontWeight: '700' },
  feedback: { fontSize: 10, fontWeight: '700', lineHeight: 15 },
  tacticsPanel: { gap: 10 },
  tacticLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  tacticGroup: { flexDirection: 'row', gap: 7 },
  tacticChoice: { flex: 1, minHeight: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tacticText: { fontSize: 10, fontWeight: '800' },
});
