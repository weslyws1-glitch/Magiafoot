import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClubName } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

export default function NewsScreen() {
  const colors = useColors();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Notícias" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para acompanhar as notícias.</Text></Screen></>;
  }

  const lastResultText = career.lastResult
    ? getClubName(career.lastResult.homeClubId) + ' ' + career.lastResult.homeGoals + ' x ' + career.lastResult.awayGoals + ' ' + getClubName(career.lastResult.awayClubId)
    : 'A imprensa aguarda os primeiros passos do seu trabalho no comando.';

  const items = [
    { title: 'Boletim do clube', body: career.lastNews, icon: 'radio' as const },
    { title: career.lastResult ? 'Último resultado' : 'Temporada começando', body: lastResultText, icon: 'flag' as const },
    { title: 'Diretoria', body: 'Confiança atual no seu trabalho: ' + career.boardTrust + '%.', icon: 'briefcase' as const },
    { title: 'Mercado', body: career.market.length + ' jogadores estão sendo observados pelo departamento de futebol.', icon: 'search' as const },
  ];

  return (
    <>
      <GameHeader title="Notícias" eyebrow="Central MagiaFoot" />
      <Screen>
        <Panel style={styles.headline}>
          <Text style={styles.kicker}>MAGIAFOOT NEWS</Text>
          <Text style={styles.headlineTitle}>{career.lastNews}</Text>
          <Text style={styles.headlineMeta}>Temporada {career.season} · Rodada {career.roundIndex + 1}</Text>
        </Panel>
        {items.map((item, index) => (
          <Panel key={item.title + '-' + index} style={styles.card}>
            <View style={styles.icon}><Feather name={item.icon} size={18} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </Panel>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headline: { backgroundColor: '#29563a', borderColor: '#356a4a', gap: 8, paddingVertical: 22 },
  kicker: { color: '#79ef91', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  headlineTitle: { color: '#f5f7f5', fontSize: 21, lineHeight: 27, fontWeight: '900' },
  headlineMeta: { color: '#b7c7bd', fontSize: 11 },
  card: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#153426', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#f5f7f5', fontSize: 14, fontWeight: '900', marginBottom: 5 },
  body: { color: '#9fb2a5', fontSize: 11, lineHeight: 17 },
});
