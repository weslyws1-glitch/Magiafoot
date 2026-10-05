import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CareerOverview, GameButton, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { career, isReady, storageWarning } = useCareer();

  const continueCareer = () => router.push(career?.liveMatch ? '/match' : '/club');

  return (
    <Screen style={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 15) }}>
      <View style={styles.brandLine}>
        <View style={[styles.brandMark, { backgroundColor: colors.accent }]}>
          <Feather name="zap" size={19} color={colors.accentForeground} />
        </View>
        <View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>MAGIAFOOT</Text>
          <Text style={[styles.brandCaption, { color: colors.mutedForeground }]}>MANAGER DE FUTEBOL</Text>
        </View>
      </View>

      <Panel style={[styles.hero, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <View style={[styles.heroOrbit, { backgroundColor: colors.accent, opacity: 0.14 }]} />
        <View style={[styles.heroBall, { borderColor: colors.primaryForeground }]}>
          <Feather name="target" size={37} color={colors.accent} />
        </View>
        <View style={styles.heroTag}>
          <View style={[styles.heroDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.heroTagText, { color: colors.primaryForeground }]}>SUA PRÓXIMA HISTÓRIA COMEÇA AQUI</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.primaryForeground }]}>Sua história.{'\n'}Seu clube.{'\n'}Sua magia.</Text>
        <Text style={[styles.heroDescription, { color: colors.primaryForeground }]}>
          Monte seu time, tome as decisões e escreva uma nova temporada.
        </Text>
      </Panel>

      {!isReady ? (
        <View style={[styles.loadingRow, { backgroundColor: colors.secondary }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando sua carreira salva…</Text>
        </View>
      ) : career ? (
        <>
          <CareerOverview career={career} />
          <SectionLabel title="Sua carreira" />
          <GameButton
            label={career.liveMatch ? 'Retomar partida' : 'Continuar carreira'}
            icon={career.liveMatch ? 'play' : 'arrow-right'}
            onPress={continueCareer}
          />
          <GameButton
            label="Começar uma nova carreira"
            icon="plus"
            variant="outline"
            onPress={() => router.push('/new-career')}
          />
        </>
      ) : (
        <>
          <View style={styles.startCopy}>
            <Text style={[styles.startTitle, { color: colors.foreground }]}>Assuma o comando.</Text>
            <Text style={[styles.startDescription, { color: colors.mutedForeground }]}>
              Escolha seu clube fictício e transforme uma equipe em candidata ao título.
            </Text>
          </View>
          <GameButton label="Nova carreira" icon="play" onPress={() => router.push('/new-career')} />
        </>
      )}

      {storageWarning ? (
        <View style={[styles.storageNotice, { backgroundColor: colors.secondary }]}>
          <Feather name="alert-circle" size={16} color={colors.destructive} />
          <Text style={[styles.storageNoticeText, { color: colors.secondaryForeground }]}>
            Não foi possível ler o salvamento anterior. Uma nova carreira pode ser criada neste aparelho.
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>UMA LIGA FICTÍCIA. DECISÕES SUAS. FUTEBOL DO SEU JEITO.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 17 },
  brandMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  brandCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },
  hero: { padding: 20, minHeight: 283, justifyContent: 'center', overflow: 'hidden', marginBottom: 3 },
  heroOrbit: { position: 'absolute', width: 215, height: 215, borderRadius: 108, right: -85, top: -50 },
  heroBall: { position: 'absolute', right: 19, top: 87, width: 69, height: 69, borderRadius: 35, borderWidth: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.86 },
  heroTag: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 18, maxWidth: '75%' },
  heroDot: { width: 7, height: 7, borderRadius: 4 },
  heroTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.75 },
  heroTitle: { fontSize: 32, lineHeight: 35, letterSpacing: -1.2, fontWeight: '900' },
  heroDescription: { fontSize: 13, lineHeight: 19, marginTop: 13, maxWidth: 255, opacity: 0.82 },
  startCopy: { gap: 5, marginTop: 5, marginBottom: 1 },
  startTitle: { fontSize: 17, fontWeight: '800' },
  startDescription: { fontSize: 13, lineHeight: 19 },
  storageNotice: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 14, alignItems: 'center' },
  storageNoticeText: { flex: 1, fontSize: 11, lineHeight: 16 },
  footer: { alignItems: 'center', paddingTop: 13, paddingBottom: 6 },
  footerText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.9, textAlign: 'center' },
  loadingRow: { minHeight: 68, padding: 13, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 11, fontWeight: '600' },
});
