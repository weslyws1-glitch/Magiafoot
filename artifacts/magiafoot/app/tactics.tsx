import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameButton, GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { FORMATIONS } from '@/game/data';
import { effectiveStrength } from '@/game/engine';
import type { Intensity, Mentality } from '@/game/types';
import { useColors } from '@/hooks/useColors';

export default function TacticsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, setFormation, movePlayer, chooseCaptain, makeSubstitution, setTactics } = useCareer();
  const [selectedBench, setSelectedBench] = useState<string | null>(null);

  if (!career) {
    return <><GameHeader title="Táticas" /><Screen><GameButton label="Criar carreira" onPress={() => router.push('/new-career')} /></Screen></>;
  }

  const live = Boolean(career.liveMatch && career.liveMatch.phase !== 'pregame' && career.liveMatch.phase !== 'finished');
  const lineup = career.liveMatch?.userLineup ?? career.lineup;
  const starterIds = new Set(lineup.map((slot) => slot.playerId));
  const benchIds = career.liveMatch?.userBenchIds ?? career.benchIds;
  const bench = career.players.filter((p) => benchIds.includes(p.id) && !starterIds.has(p.id) && p.status === 'available');

  const selectStarter = (slotId: string, playerId: string) => {
    if (selectedBench) {
      if (live) makeSubstitution(playerId, selectedBench);
      else movePlayer(slotId, selectedBench);
      setSelectedBench(null);
      return;
    }
    if (!live) chooseCaptain(playerId);
  };

  const changeMentality = (mentality: Mentality) => setTactics({ ...career.tactics, mentality });
  const changePressure = (pressure: Intensity) => setTactics({ ...career.tactics, pressure });
  const changeTempo = (tempo: Intensity) => setTactics({ ...career.tactics, tempo });

  return (
    <>
      <GameHeader title="Táticas" eyebrow={live ? 'PARTIDA AO VIVO' : 'ESCALAÇÃO'} />
      <Screen>
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

        <Text style={styles.hint}>{selectedBench ? 'Agora toque no titular que vai sair.' : live ? 'Toque em um reserva e depois no titular.' : 'Toque em um titular para torná-lo capitão. Para trocar, escolha um reserva.'}</Text>

        <Text style={styles.sectionTitle}>BANCO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bench}>
          {bench.map((player) => {
            const selected = selectedBench === player.id;
            return (
              <Pressable key={player.id} onPress={() => setSelectedBench(selected ? null : player.id)} style={[styles.benchCard, selected && styles.benchSelected]}>
                <Text style={styles.benchPos}>{player.position}</Text>
                <Text style={styles.benchName}>{player.name.split(' ')[0]}</Text>
                <Text style={styles.benchRating}>{effectiveStrength(player)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>INSTRUÇÕES</Text>
        <Panel style={styles.instructions}>
          <OptionRow title="Mentalidade" options={['cautelosa','equilibrada','ofensiva']} value={career.tactics.mentality} onChange={(v) => changeMentality(v as Mentality)} />
          <OptionRow title="Pressão" options={['baixa','normal','alta']} value={career.tactics.pressure} onChange={(v) => changePressure(v as Intensity)} />
          <OptionRow title="Ritmo" options={['baixa','normal','alta']} value={career.tactics.tempo} onChange={(v) => changeTempo(v as Intensity)} />
        </Panel>

        {live ? <GameButton label="VOLTAR À PARTIDA" icon="play" onPress={() => router.back()} /> : <GameButton label="SALVAR E VOLTAR" icon="check" onPress={() => router.back()} />}
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
  sectionTitle: { color: '#dce8df', fontSize: 12, fontWeight: '900', letterSpacing: 0.9 },
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
  hint: { color: '#9fb2a5', fontSize: 10, lineHeight: 15 },
  bench: { gap: 8, paddingRight: 20 },
  benchCard: { width: 92, minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: '#2c503d', backgroundColor: '#0b2117', padding: 9, gap: 3 },
  benchSelected: { borderColor: '#79ef91', backgroundColor: '#153426' },
  benchPos: { color: '#79ef91', fontSize: 9, fontWeight: '900' },
  benchName: { color: '#f5f7f5', fontSize: 11, fontWeight: '900' },
  benchRating: { color: '#9fb2a5', fontSize: 10 },
  instructions: { gap: 16 },
  optionRow: { gap: 8 },
  optionTitle: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  optionButtons: { flexDirection: 'row', gap: 6 },
  option: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10291d' },
  optionSelected: { backgroundColor: '#79ef91', borderColor: '#79ef91' },
  optionText: { color: '#c4d2c8', fontSize: 8, fontWeight: '900' },
  optionTextSelected: { color: '#07150d' },
});
