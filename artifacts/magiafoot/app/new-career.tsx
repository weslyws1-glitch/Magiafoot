import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClubBadge, GameButton, GameHeader, LoadingState, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { selectableClubs } from '@/game/data';
import type { CurrencyCode } from '@/game/types';
import { useColors } from '@/hooks/useColors';

const CURRENCIES: Array<{ code: CurrencyCode; label: string; symbol: string }> = [
  { code: 'BRL', label: 'Real brasileiro', symbol: 'R$' },
  { code: 'USD', label: 'Dólar americano', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
];

function flagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export default function NewCareerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isReady, createNewCareer } = useCareer();

  const availableClubs = useMemo(() => selectableClubs(), []);

  const countries = useMemo(() => {
    const byCountry = new Map<string, { name: string; code: string }>();
    for (const club of availableClubs) byCountry.set(club.country, { name: club.country, code: club.countryCode });
    return Array.from(byCountry.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [availableClubs]);

  const [coachName, setCoachName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('BRL');
  const [openSelector, setOpenSelector] = useState<'country' | 'division' | 'club' | 'currency' | null>(null);
  const [error, setError] = useState('');

  const countryInfo = countries.find((item) => item.name === country) ?? null;

  const divisions = useMemo(() => {
    if (!country) return [];
    const seen = new Map<string, { id: string; name: string; level: number }>();
    for (const club of availableClubs.filter((item) => item.country === country)) {
      seen.set(club.divisionId, { id: club.divisionId, name: club.divisionName, level: club.divisionLevel });
    }
    return Array.from(seen.values()).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'));
  }, [country, availableClubs]);

  const effectiveDivisionId = divisionId ?? (divisions.length === 1 ? divisions[0]?.id ?? null : null);

  const clubsForSelection = useMemo(
    () => availableClubs
      .filter((club) => club.country === country && (!effectiveDivisionId || club.divisionId === effectiveDivisionId))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [country, effectiveDivisionId, availableClubs],
  );

  const selectedDivision = divisions.find((item) => item.id === effectiveDivisionId) ?? null;
  const selectedClub = availableClubs.find((club) => club.id === clubId) ?? null;
  const selectedCurrency = CURRENCIES.find((item) => item.code === currency)!;

  const create = () => {
    const cleanName = coachName.trim();
    if (cleanName.length < 2) {
      setError('Digite um nome de treinador com pelo menos 2 caracteres.');
      return;
    }
    if (!country) {
      setError('Escolha o país.');
      return;
    }
    if (divisions.length > 1 && !effectiveDivisionId) {
      setError('Escolha a divisão.');
      return;
    }
    if (!clubId) {
      setError('Escolha o clube.');
      return;
    }

    createNewCareer(cleanName, clubId, currency);
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
      <GameHeader title="Nova carreira" eyebrow="CONFIGURAÇÃO" />
      <Screen>
        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.foreground }]}>Escolha seu desafio</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            País, divisão, clube e moeda ficam vinculados a esta carreira.
          </Text>
        </View>

        <Panel style={styles.namePanel}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NOME DO TREINADOR</Text>
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
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />
        </Panel>

        <View style={styles.blocks}>
          <Pressable
            onPress={() => setOpenSelector((current) => current === 'country' ? null : 'country')}
            style={[styles.selectorCard, { backgroundColor: colors.card, borderColor: country ? colors.primary : colors.border }]}
          >
            <View style={styles.flagBox}>
              <Text style={styles.flagText}>{countryInfo ? flagEmoji(countryInfo.code) : '🌎'}</Text>
            </View>
            <View style={styles.selectorCopy}>
              <Text style={styles.selectorLabel}>PAÍS</Text>
              <Text style={[styles.selectorValue, { color: colors.foreground }]}>{country ?? 'Escolher país'}</Text>
            </View>
            <Feather name={openSelector === 'country' ? 'chevron-up' : 'chevron-down'} size={20} color="#79ef91" />
          </Pressable>

          {openSelector === 'country' ? (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {countries.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => {
                    const countryDivisions = Array.from(new Map(
                      availableClubs.filter((club) => club.country === item.name)
                        .map((club) => [club.divisionId, club])
                    ).values()).sort((a, b) => a.divisionLevel - b.divisionLevel);
                    setCountry(item.name);
                    setDivisionId(countryDivisions.length === 1 ? countryDivisions[0]?.divisionId ?? null : null);
                    setClubId(null);
                    setOpenSelector(countryDivisions.length > 1 ? 'division' : 'club');
                    setError('');
                  }}
                  style={styles.dropdownRow}
                >
                  <Text style={styles.listFlag}>{flagEmoji(item.code)}</Text>
                  <Text style={[styles.dropdownText, { color: colors.foreground }]}>{item.name}</Text>
                  {country === item.name ? <Feather name="check" size={17} color="#79ef91" /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {country && divisions.length > 1 ? (
            <>
              <Pressable
                onPress={() => setOpenSelector((current) => current === 'division' ? null : 'division')}
                style={[styles.selectorCard, { backgroundColor: colors.card, borderColor: effectiveDivisionId ? colors.primary : colors.border }]}
              >
                <View style={styles.selectorIcon}><Feather name="layers" size={20} color="#79ef91" /></View>
                <View style={styles.selectorCopy}>
                  <Text style={styles.selectorLabel}>DIVISÃO</Text>
                  <Text style={[styles.selectorValue, { color: colors.foreground }]}>{selectedDivision?.name ?? 'Escolher divisão'}</Text>
                </View>
                <Feather name={openSelector === 'division' ? 'chevron-up' : 'chevron-down'} size={20} color="#79ef91" />
              </Pressable>

              {openSelector === 'division' ? (
                <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {divisions.map((division) => (
                    <Pressable
                      key={division.id}
                      onPress={() => {
                        setDivisionId(division.id);
                        setClubId(null);
                        setOpenSelector('club');
                        setError('');
                      }}
                      style={styles.dropdownRow}
                    >
                      <Text style={[styles.dropdownText, { color: colors.foreground }]}>{division.name}</Text>
                      {effectiveDivisionId === division.id ? <Feather name="check" size={17} color="#79ef91" /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          <Pressable
            disabled={!country || (divisions.length > 1 && !effectiveDivisionId)}
            onPress={() => setOpenSelector((current) => current === 'club' ? null : 'club')}
            style={[
              styles.selectorCard,
              { backgroundColor: colors.card, borderColor: selectedClub ? colors.primary : colors.border },
              (!country || (divisions.length > 1 && !effectiveDivisionId)) && styles.disabled,
            ]}
          >
            <View style={styles.crestBox}>
              {selectedClub ? <ClubBadge clubId={selectedClub.id} size={42} /> : <Feather name="shield" size={21} color="#79ef91" />}
            </View>
            <View style={styles.selectorCopy}>
              <Text style={styles.selectorLabel}>CLUBE</Text>
              <Text style={[styles.selectorValue, { color: colors.foreground }]}>{selectedClub?.name ?? 'Escolher clube'}</Text>
              {selectedClub ? <Text style={styles.selectorSub}>{selectedClub.city}</Text> : null}
            </View>
            <Feather name={openSelector === 'club' ? 'chevron-up' : 'chevron-down'} size={20} color="#79ef91" />
          </Pressable>

          {openSelector === 'club' && country && effectiveDivisionId ? (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {clubsForSelection.map((club) => (
                <Pressable
                  key={club.id}
                  onPress={() => {
                    setClubId(club.id);
                    setOpenSelector(null);
                    setError('');
                  }}
                  style={styles.clubRow}
                >
                  <ClubBadge clubId={club.id} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clubName, { color: colors.foreground }]}>{club.name}</Text>
                    <Text style={styles.clubMeta}>{club.city}</Text>
                  </View>
                  {club.id === clubId ? <Feather name="check" size={17} color="#79ef91" /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={() => setOpenSelector((current) => current === 'currency' ? null : 'currency')}
            style={[styles.selectorCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
          >
            <View style={styles.currencyBox}><Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text></View>
            <View style={styles.selectorCopy}>
              <Text style={styles.selectorLabel}>MOEDA</Text>
              <Text style={[styles.selectorValue, { color: colors.foreground }]}>{selectedCurrency.label}</Text>
              <Text style={styles.selectorSub}>Valores do jogo serão exibidos em {selectedCurrency.code}</Text>
            </View>
            <Feather name={openSelector === 'currency' ? 'chevron-up' : 'chevron-down'} size={20} color="#79ef91" />
          </Pressable>

          {openSelector === 'currency' ? (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {CURRENCIES.map((item) => (
                <Pressable
                  key={item.code}
                  onPress={() => {
                    setCurrency(item.code);
                    setOpenSelector(null);
                    setError('');
                  }}
                  style={styles.dropdownRow}
                >
                  <View style={styles.currencyMini}><Text style={styles.currencyMiniText}>{item.symbol}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownText, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                  </View>
                  {currency === item.code ? <Feather name="check" size={17} color="#79ef91" /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {country && divisions.length === 1 ? (
          <Text style={styles.autoDivision}>Divisão disponível: {divisions[0]?.name}</Text>
        ) : null}

        {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

        <GameButton
          label={selectedClub ? `Começar no ${selectedClub.name}` : 'Criar carreira'}
          icon="arrow-right"
          onPress={create}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  description: { fontSize: 12, lineHeight: 18, maxWidth: 330 },
  namePanel: { gap: 8 },
  fieldLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 14, fontWeight: '700' },
  blocks: { gap: 9 },
  selectorCard: { minHeight: 74, borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  disabled: { opacity: 0.45 },
  flagBox: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  flagText: { fontSize: 25 },
  selectorIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  crestBox: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  currencyBox: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  currencySymbol: { color: '#79ef91', fontSize: 17, fontWeight: '900' },
  selectorCopy: { flex: 1, minWidth: 0 },
  selectorLabel: { color: '#7f9587', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  selectorValue: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  selectorSub: { color: '#7f9587', fontSize: 7.5, marginTop: 3 },
  dropdown: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  dropdownRow: { minHeight: 52, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284837' },
  dropdownText: { flex: 1, fontSize: 12, fontWeight: '800' },
  listFlag: { fontSize: 21 },
  clubRow: { minHeight: 62, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284837' },
  clubName: { fontSize: 12, fontWeight: '900' },
  clubMeta: { color: '#7f9587', fontSize: 8, marginTop: 2 },
  currencyMini: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  currencyMiniText: { color: '#79ef91', fontSize: 12, fontWeight: '900' },
  currencyCode: { color: '#71877a', fontSize: 7, marginTop: 2, fontWeight: '800' },
  autoDivision: { color: '#789080', fontSize: 8, textAlign: 'center', marginTop: -5 },
  errorText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
});
