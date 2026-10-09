import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClubBadge, GameButton, GameHeader, LoadingState, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { CLUBS } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function NewCareerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isReady, createNewCareer } = useCareer();

  const countries = useMemo(
    () => Array.from(new Set(CLUBS.map((club) => club.country))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [],
  );

  const [coachName, setCoachName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [openSelector, setOpenSelector] = useState<'country' | 'club' | null>(null);
  const [error, setError] = useState('');

  const clubsForCountry = useMemo(
    () => CLUBS
      .filter((club) => club.country === country)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [country],
  );

  const selectedClub = CLUBS.find((club) => club.id === clubId) ?? null;

  const create = () => {
    const cleanName = coachName.trim();
    if (cleanName.length < 2) {
      setError('Digite um nome de treinador com pelo menos 2 caracteres.');
      return;
    }
    if (!country) {
      setError('Escolha o país do clube.');
      return;
    }
    if (!clubId) {
      setError('Escolha um clube para iniciar a carreira.');
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
          <Text style={[styles.title, { color: colors.foreground }]}>Monte sua carreira</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            Informe seu nome, escolha o país e depois o clube que você quer comandar.
          </Text>
        </View>

        <Panel style={styles.formPanel}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>NOME DO TREINADOR</Text>
          <TextInput
            value={coachName}
            onChangeText={(value) => {
              setCoachName(value);
              setError('');
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

        <View style={styles.selectorGroup}>
          <Pressable
            onPress={() => setOpenSelector((current) => current === 'country' ? null : 'country')}
            style={[styles.selectorCard, { backgroundColor: colors.card, borderColor: country ? colors.primary : colors.border }]}
          >
            <View style={styles.selectorIcon}>
              <Feather name="globe" size={20} color="#79ef91" />
            </View>
            <View style={styles.selectorCopy}>
              <Text style={[styles.selectorLabel, { color: colors.mutedForeground }]}>PAÍS</Text>
              <Text style={[styles.selectorValue, { color: colors.foreground }]}>{country ?? 'Escolher país'}</Text>
            </View>
            <Feather name={openSelector === 'country' ? 'chevron-up' : 'chevron-down'} size={20} color="#79ef91" />
          </Pressable>

          {openSelector === 'country' ? (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {countries.map((item) => {
                const selected = item === country;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setCountry(item);
                      setClubId(null);
                      setOpenSelector('club');
                      setError('');
                    }}
                    style={[styles.dropdownRow, selected && styles.dropdownRowSelected]}
                  >
                    <Text style={[styles.dropdownText, { color: colors.foreground }]}>{item}</Text>
                    {selected ? <Feather name="check" size={17} color="#79ef91" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable
            disabled={!country}
            onPress={() => setOpenSelector((current) => current === 'club' ? null : 'club')}
            style={[
              styles.selectorCard,
              { backgroundColor: colors.card, borderColor: selectedClub ? colors.primary : colors.border },
              !country && styles.selectorDisabled,
            ]}
          >
            <View style={styles.selectorIcon}>
              <Feather name="shield" size={20} color={country ? '#79ef91' : '#66796d'} />
            </View>
            <View style={styles.selectorCopy}>
              <Text style={[styles.selectorLabel, { color: colors.mutedForeground }]}>CLUBE</Text>
              <Text style={[styles.selectorValue, { color: country ? colors.foreground : colors.mutedForeground }]}>
                {selectedClub?.name ?? (country ? 'Escolher clube' : 'Escolha o país primeiro')}
              </Text>
              {selectedClub ? (
                <Text style={[styles.selectorMeta, { color: colors.mutedForeground }]}>{selectedClub.city}</Text>
              ) : null}
            </View>
            <Feather name={openSelector === 'club' ? 'chevron-up' : 'chevron-down'} size={20} color={country ? '#79ef91' : '#66796d'} />
          </Pressable>

          {openSelector === 'club' && country ? (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {clubsForCountry.map((club) => {
                const selected = club.id === clubId;
                return (
                  <Pressable
                    key={club.id}
                    onPress={() => {
                      setClubId(club.id);
                      setOpenSelector(null);
                      setError('');
                    }}
                    style={[styles.clubRow, selected && styles.dropdownRowSelected]}
                  >
                    <ClubBadge clubId={club.id} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.clubName, { color: colors.foreground }]}>{club.name}</Text>
                      <Text style={[styles.clubCity, { color: colors.mutedForeground }]}>{club.city}</Text>
                    </View>
                    {selected ? <Feather name="check" size={17} color="#79ef91" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

        <GameButton
          label={selectedClub ? `Começar no ${selectedClub.name}` : 'Criar carreira'}
          icon="arrow-right"
          onPress={create}
        />

        <Text style={[styles.fictionNote, { color: colors.mutedForeground }]}>
          Países e clubes aparecerão aqui em ordem alfabética conforme o universo do MagiaFoot for expandido.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  description: { fontSize: 12, lineHeight: 18, maxWidth: 330 },
  formPanel: { gap: 9 },
  inputLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 15, fontWeight: '600' },
  selectorGroup: { gap: 9 },
  selectorCard: { minHeight: 70, borderWidth: 1, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectorDisabled: { opacity: 0.48 },
  selectorIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  selectorCopy: { flex: 1, minWidth: 0 },
  selectorLabel: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  selectorValue: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  selectorMeta: { fontSize: 9, marginTop: 2 },
  dropdown: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  dropdownRow: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284837' },
  dropdownRowSelected: { backgroundColor: '#173b28' },
  dropdownText: { flex: 1, fontSize: 12, fontWeight: '800' },
  clubRow: { minHeight: 60, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284837' },
  clubName: { fontSize: 12, fontWeight: '900' },
  clubCity: { fontSize: 8.5, marginTop: 2 },
  errorText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  fictionNote: { fontSize: 9, textAlign: 'center', lineHeight: 14, paddingHorizontal: 12, paddingBottom: 7 },
});
