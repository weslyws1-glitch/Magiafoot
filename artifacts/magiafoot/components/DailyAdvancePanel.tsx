import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCareer } from '@/context/CareerContext';
import { formatCareerDate, getDaysUntilNextMatch } from '@/game/engine';

const TRAINING = [
  { id: 'rest', label: 'DESCANSO', note: 'recuperação máxima' },
  { id: 'light', label: 'LEVE', note: 'recuperação alta' },
  { id: 'normal', label: 'NORMAL', note: 'equilibrado' },
  { id: 'intense', label: 'INTENSO', note: 'menor recuperação' },
] as const;

/** Compartilhado pelas telas Início e Calendário para não criar dois relógios.
 * Avanço automático ocorre somente com a tela aberta e pára no dia da partida.
 */
export function DailyAdvancePanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { career, advanceOneDay, changeDailyTraining, startCurrentMatch } = useCareer();
  const [automatic, setAutomatic] = useState(false);

  const remaining = career ? getDaysUntilNextMatch(career) : 0;
  const playing = Boolean(career?.liveMatch);
  const intensity = career?.trainingIntensity ?? 'normal';

  // Sempre usamos o snapshot atual: cada pulso avança exatamente UM dia.
  useEffect(() => {
    if (!automatic || !career || playing || remaining <= 0) {
      if (automatic && (playing || remaining <= 0)) setAutomatic(false);
      return;
    }
    const timeout = setTimeout(() => advanceOneDay(), 460);
    return () => clearTimeout(timeout);
  }, [automatic, career?.currentDate, career?.roundIndex, playing, remaining, advanceOneDay]);

  const stats = useMemo(() => {
    const players = career?.players ?? [];
    const available = players.filter((p) => p.status === 'available');
    const avg = available.length
      ? Math.round(available.reduce((sum, p) => sum + p.fitness, 0) / available.length) : 0;
    return {
      avg,
      tired: available.filter((p) => p.fitness < 75).length,
      injured: players.filter((p) => p.status === 'injured').length,
    };
  }, [career?.players]);

  if (!career) return null;

  const openGame = () => {
    if (automatic || remaining > 0) return;
    setAutomatic(false);
    if (!career.liveMatch) startCurrentMatch();
    router.push('/match');
  };

  return (
    <View style={[styles.panel, compact && styles.compactPanel]}>
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text style={styles.kicker}>CALENDÁRIO DA CARREIRA</Text>
          <Text style={styles.date} numberOfLines={2}>{formatCareerDate(career).toUpperCase()}</Text>
          <Text style={styles.subdate}>
            {playing ? 'PARTIDA EM ANDAMENTO'
              : remaining > 0 ? remaining + (remaining === 1 ? ' DIA ATÉ O PRÓXIMO JOGO' : ' DIAS ATÉ O PRÓXIMO JOGO')
              : 'DIA DE JOGO · ESCOLHA SUA ESCALAÇÃO'}
          </Text>
        </View>
        <View style={styles.fitness}>
          <Feather name="activity" size={13} color="#79ef91" />
          <Text style={styles.fitnessNumber}>{stats.avg}%</Text>
          <Text style={styles.fitnessCaption}>FÍSICO MÉDIO</Text>
        </View>
      </View>

      <View style={styles.conditionRow}>
        <Text style={styles.conditionText}><Text style={styles.warningValue}>{stats.tired}</Text> abaixo de 75%</Text>
        <Text style={styles.conditionText}><Text style={styles.warningValue}>{stats.injured}</Text> lesionados</Text>
        <Text style={styles.conditionText}>Físico melhora a cada dia</Text>
      </View>

      {!playing && remaining > 0 ? (
        <>
          <Text style={styles.trainingTitle}>CARGA DE TREINO DA EQUIPE</Text>
          <View style={styles.trainingRow}>
            {TRAINING.map((option) => {
              const selected = intensity === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={'Treino ' + option.label.toLowerCase()}
                  onPress={() => changeDailyTraining(option.id)}
                  style={[styles.trainingButton, selected && styles.trainingSelected]}>
                  <Text style={[styles.trainingLabel, selected && styles.trainingSelectedText]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.trainingNote}>
            {TRAINING.find((o) => o.id === intensity)?.note} · descanso recupera mais, treino intenso recupera menos
          </Text>
        </>
      ) : null}

      <View style={styles.actions}>
        {playing || remaining === 0 ? (
          <Pressable onPress={openGame} style={[styles.mainButton, styles.matchButton]}>
            <Feather name="play-circle" size={15} color="#07150d" />
            <Text style={styles.mainText}>{playing ? 'CONTINUAR PARTIDA' : 'JOGAR PARTIDA'}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              disabled={automatic}
              onPress={advanceOneDay}
              style={[styles.mainButton, automatic && styles.disabled]}>
              <Feather name="calendar" size={15} color="#07150d" />
              <Text style={styles.mainText}>+1 DIA</Text>
            </Pressable>
            <Pressable
              onPress={() => setAutomatic((current) => !current)}
              style={[styles.autoButton, automatic && styles.autoRunning]}>
              <Feather name={automatic ? 'pause' : 'fast-forward'} size={14} color={automatic ? '#07150d' : '#79ef91'} />
              <Text style={[styles.autoText, automatic && styles.autoActiveText]}>
                {automatic ? 'PARAR' : 'AUTO ATÉ O JOGO'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
      {automatic ? <Text style={styles.autoProgress}>Avançando um dia por vez... {remaining} restantes. Para automaticamente na partida.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: '#326b45', borderRadius: 14, backgroundColor: '#0b2117', padding: 12, gap: 9 },
  compactPanel: { marginBottom: 2 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  headingText: { flex: 1, minWidth: 0 },
  kicker: { color: '#79ef91', fontWeight: '900', letterSpacing: 0.75, fontSize: 8 },
  date: { color: '#f4f8f4', fontWeight: '900', fontSize: 13, marginTop: 4 },
  subdate: { color: '#a8b9ac', fontWeight: '800', fontSize: 8, marginTop: 5 },
  fitness: { minWidth: 83, borderRadius: 10, backgroundColor: '#143527', alignItems: 'center', justifyContent: 'center', padding: 8, gap: 3 },
  fitnessNumber: { color: '#fff', fontWeight: '900', fontSize: 19 },
  fitnessCaption: { color: '#a9c5b0', fontWeight: '900', fontSize: 7 },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  conditionText: { color: '#a8b9ac', fontSize: 8, fontWeight: '700' },
  warningValue: { color: '#f2d37c', fontWeight: '900' },
  trainingTitle: { color: '#b8cebd', fontWeight: '800', fontSize: 8 },
  trainingRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  trainingButton: { flex: 1, minWidth: 62, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: '#2d4c36', alignItems: 'center', backgroundColor: '#112e1e' },
  trainingSelected: { backgroundColor: '#1b6c3d', borderColor: '#79ef91' },
  trainingLabel: { color: '#bbcfc0', fontWeight: '900', fontSize: 7 },
  trainingSelectedText: { color: '#fff' },
  trainingNote: { color: '#8ca996', fontSize: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  mainButton: { flex: 0.85, minHeight: 43, borderRadius: 10, backgroundColor: '#79ef91', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  disabled: { opacity: 0.45 },
  matchButton: { flex: 1 },
  mainText: { color: '#07150d', fontSize: 11, fontWeight: '900' },
  autoButton: { flex: 1.15, minHeight: 43, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row', borderWidth: 1, borderColor: '#79ef91', borderRadius: 10, backgroundColor: '#132a1c' },
  autoRunning: { backgroundColor: '#79ef91' },
  autoText: { color: '#79ef91', fontSize: 9, fontWeight: '900' },
  autoActiveText: { color: '#07150d' },
  autoProgress: { color: '#79ef91', fontSize: 8, textAlign: 'center' },
});
