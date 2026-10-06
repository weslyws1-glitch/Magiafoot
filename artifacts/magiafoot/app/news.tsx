import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClubName } from '@/game/engine';
import { useColors } from '@/hooks/useColors';

const ICONS = {
  club: 'briefcase',
  match: 'flag',
  sponsor: 'award',
  market: 'trending-up',
} as const;

const LABELS = {
  club: 'CLUBE',
  match: 'PARTIDA',
  sponsor: 'PATROCÍNIO',
  market: 'MERCADO',
} as const;

export default function NewsScreen() {
  const colors = useColors();
  const { career } = useCareer();

  if (!career) {
    return <><GameHeader title="Notícias" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para acompanhar as notícias.</Text></Screen></>;
  }

  const lastResultText = career.lastResult
    ? getClubName(career.lastResult.homeClubId) + ' ' + career.lastResult.homeGoals + ' x ' + career.lastResult.awayGoals + ' ' + getClubName(career.lastResult.awayClubId)
    : 'A imprensa aguarda os primeiros passos do seu trabalho no comando.';

  const feed = career.newsFeed ?? [];

  return (
    <>
      <GameHeader title="Notícias" eyebrow="Central MagiaFoot" />
      <Screen>
        <Panel style={styles.headline}>
          <Text style={styles.kicker}>MAGIAFOOT NEWS</Text>
          <Text style={styles.headlineTitle}>{feed[0]?.title ?? career.lastNews}</Text>
          <Text style={styles.headlineBody}>{feed[0]?.body ?? career.lastNews}</Text>
          <Text style={styles.headlineMeta}>Temporada {career.season} · Rodada {career.roundIndex + 1}</Text>
        </Panel>

        <SectionLabel title="Últimas notícias" />
        {feed.length ? feed.slice(0, 15).map((item) => (
          <Panel key={item.id} style={styles.card}>
            <View style={styles.icon}><Feather name={ICONS[item.category]} size={18} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <Text style={styles.badge}>{LABELS[item.category]}</Text>
                <Text style={styles.round}>Rodada {item.roundIndex + 1}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </Panel>
        )) : (
          <Panel style={styles.card}>
            <View style={styles.icon}><Feather name="radio" size={18} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Boletim do clube</Text>
              <Text style={styles.body}>{career.lastNews}</Text>
            </View>
          </Panel>
        )}

        <SectionLabel title="Painel rápido" />
        <Panel style={styles.card}>
          <View style={styles.icon}><Feather name="flag" size={18} color="#79ef91" /></View>
          <View style={{ flex: 1 }}><Text style={styles.title}>Último resultado</Text><Text style={styles.body}>{lastResultText}</Text></View>
        </Panel>
        <Panel style={styles.card}>
          <View style={styles.icon}><Feather name="users" size={18} color="#79ef91" /></View>
          <View style={{ flex: 1 }}><Text style={styles.title}>Torcida e diretoria</Text><Text style={styles.body}>Torcida: {career.fanTrust}/100 · Diretoria: {career.boardTrust}/100.</Text></View>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headline:{backgroundColor:'#29563a',borderColor:'#356a4a',gap:7,paddingVertical:20},
  kicker:{color:'#79ef91',fontSize:9,fontWeight:'900',letterSpacing:1.1},
  headlineTitle:{color:'#f5f7f5',fontSize:20,lineHeight:25,fontWeight:'900'},
  headlineBody:{color:'#c0d0c5',fontSize:10,lineHeight:15},
  headlineMeta:{color:'#9fb2a5',fontSize:9},
  card:{flexDirection:'row',gap:11,alignItems:'flex-start',backgroundColor:'#10251a',borderColor:'#2e4c3a'},
  icon:{width:40,height:40,borderRadius:12,backgroundColor:'#153426',alignItems:'center',justifyContent:'center'},
  cardHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:4},
  badge:{color:'#79ef91',fontSize:6.5,fontWeight:'900',letterSpacing:0.8},
  round:{color:'#7f9285',fontSize:6.5,fontWeight:'800'},
  title:{color:'#f5f7f5',fontSize:12,fontWeight:'900',marginBottom:4},
  body:{color:'#9fb2a5',fontSize:9,lineHeight:14},
});