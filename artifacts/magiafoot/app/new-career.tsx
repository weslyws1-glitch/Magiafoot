import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClubBadge, GameButton, GameHeader, LoadingState, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { CLUBS } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function NewCareerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { career, isReady, createNewCareer } = useCareer();
  const [coachName, setCoachName] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [error, setError] = useState('');

  const create = () => {
    const cleanName = coachName.trim();
    if (cleanName.length < 2) {
      setError('Digite um nome de treinador com pelo menos 2 caracteres.');
      return;
    }
    if (!clubId) {
      setError('Escolha um clube para iniciar a carreira.');
      return;
    }
    if (career && !confirmOverwrite) {
      setConfirmOverwrite(true);
      setError('');
      return;
    }
    createNewCareer(cleanName, clubId);
    router.replace('/');
  };

  if (!isReady) {
    return (
      <>
        <GameHeader title="Nova carreira" eyebrow="Sua jornada começa" />
        <Screen><LoadingState /></Screen>
      </>
    );
  }

  return (
    <>
      <GameHeader title="Nova carreira" eyebrow="Sua jornada começa" />
      <Screen>
        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.foreground }]}>Quem vai comandar?</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            Seu nome à beira do campo. Um clube pronto para construir uma história nova.
          </Text>
        </View>

        <Panel style={styles.formPanel}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>NOME DO TREINADOR</Text>
          <TextInput
            value={coachName}
            onChangeText={(value) => {
              setCoachName(value);
              setError('');
              setConfirmOverwrite(false);
            }}
            placeholder="Ex.: Wesley"
            placeholderTextColor={colors.mutedForeground}
            maxLength={32}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Nome do treinador"
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />
        </Panel>

        <SectionLabel title="Escolha seu clube" />
        <View style={styles.clubList}>
          {CLUBS.map((club) => {
            const selected = club.id === clubId;
            return (
              <Pressable
                key={club.id}
                onPress={() => {
                  setClubId(club.id);
                  setError('');
                  setConfirmOverwrite(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                testID={`club-choice-${club.id}`}
                style={({ pressed }) => [
                  styles.clubChoice,
                  {
                    backgroundColor: selected ? colors.secondary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <ClubBadge clubId={club.id} size={46} />
                <View style={styles.clubCopy}>
                  <Text style={[styles.clubName, { color: colors.foreground }]}>{club.name}</Text>
                  <Text style={[styles.clubCity, { color: colors.mutedForeground }]}>{club.city}</Text>
                  <Text style={[styles.clubMeta, { color: colors.mutedForeground }]}>Elenco {club.rating} · estádio {club.stadiumCapacity.toLocaleString('pt-BR')}</Text>
                </View>
                <View style={[styles.selection, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>
                  {selected ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        {confirmOverwrite ? (
          <Panel style={[styles.confirmPanel, { borderColor: colors.destructive }]}>
            <View style={styles.confirmLine}>
              <Feather name="alert-triangle" size={18} color={colors.destructive} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Substituir a carreira salva?</Text>
                <Text style={[styles.confirmText, { color: colors.mutedForeground }]}>
                  A nova carreira vai ocupar o único espaço de salvamento deste aparelho.
                </Text>
              </View>
            </View>
            <GameButton label="Substituir e começar" icon="refresh-cw" variant="danger" onPress={create} />
          </Panel>
        ) : (
          <GameButton label="Criar carreira" icon="arrow-right" onPress={create} />
        )}

        <Text style={[styles.fictionNote, { color: colors.mutedForeground }]}>
          Liga, clubes e jogadores pertencem ao universo fictício do MagiaFoot.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  description: { fontSize: 12, lineHeight: 18, maxWidth: 320 },
  formPanel: { gap: 9 },
  inputLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 15, fontWeight: '600' },
  clubList: { gap: 9 },
  clubChoice: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  clubCopy: { flex: 1, gap: 3 },
  clubName: { fontSize: 13, fontWeight: '800' },
  clubCity: { fontSize: 10 },
  clubMeta: { fontSize: 9, marginTop: 1 },
  selection: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  confirmPanel: { gap: 14 },
  confirmLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  confirmTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  confirmText: { fontSize: 11, lineHeight: 16 },
  fictionNote: { fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: 12, paddingBottom: 7 },
});
