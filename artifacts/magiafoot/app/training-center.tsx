import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { trainingCenterNeedScore, trainingCenterUpgradeCost, trainingFieldCapacity } from '@/game/engine';
import type { TrainingCenterUpgradeKey } from '@/game/types';
import { useColors } from '@/hooks/useColors';

const ITEMS: Array<{
  key: TrainingCenterUpgradeKey;
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: 'field', title: 'Campo de treinamento', text: 'Define quantos jogadores o CT consegue atender sem perder qualidade ou aumentar desgaste.', icon: 'activity' },
  { key: 'medical', title: 'Departamento médico', text: 'Reduz o risco de lesões conforme o calendário fica mais pesado e o elenco acumula desgaste.', icon: 'heart' },
  { key: 'physio', title: 'Fisioterapia', text: 'Acelera recuperação física e ajuda atletas lesionados e cansados a voltarem melhor.', icon: 'refresh-cw' },
  { key: 'gym', title: 'Academia', text: 'Melhora condicionamento e ajuda o elenco a sofrer menos queda física entre os jogos.', icon: 'trending-up' },
  { key: 'analysis', title: 'Análise de desempenho', text: 'Acompanha a complexidade do elenco e prepara o clube para decisões cada vez mais detalhadas.', icon: 'bar-chart-2' },
];

function needLabel(value: number) {
  if (value >= 80) return 'URGENTE';
  if (value >= 60) return 'NECESSÁRIO';
  if (value >= 35) return 'RECOMENDADO';
  return 'SEM NECESSIDADE';
}

export default function TrainingCenterScreen() {
  const colors = useColors();
  const { career, upgradeTrainingCenterItem } = useCareer();

  if (!career) {
    return <><GameHeader title="Centro de treinamento" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar o CT.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const upgrades = career.trainingCenterUpgrades ?? { field: 1, medical: 1, physio: 1, gym: 1, analysis: 1 };
  const injured = career.players.filter((player) => player.status === 'injured').length;
  const tired = career.players.filter((player) => player.fitness < 55).length;
  const fieldCapacity = trainingFieldCapacity(upgrades.field);
  const overallNeed = Math.round(ITEMS.reduce((sum, item) => sum + trainingCenterNeedScore(career, item.key), 0) / ITEMS.length);

  return (
    <>
      <GameHeader title="Centro de treinamento" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.icon}><Feather name="target" size={28} color="#79ef91" /></View>
            <View style={styles.heroBody}>
              <Text style={styles.kicker}>CENTRO DE TREINAMENTO</Text>
              <Text style={styles.title}>CT do {club.name}</Text>
              <Text style={styles.sub}>Estrutura simples, evolutiva e ligada às necessidades reais do elenco.</Text>
            </View>
          </View>
          <View style={styles.needHeader}>
            <Text style={styles.needLabel}>NECESSIDADE GERAL</Text>
            <Text style={styles.needValue}>{overallNeed}%</Text>
          </View>
          <View style={styles.needTrack}><View style={[styles.needFill,{ width:(overallNeed + '%') as any }]} /></View>
        </Panel>

        <View style={styles.metrics}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>PLANTEL</Text><Text style={styles.metricValue}>{career.players.length}</Text><Text style={styles.metricHint}>jogadores</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CAPACIDADE</Text><Text style={styles.metricValue}>{fieldCapacity}</Text><Text style={styles.metricHint}>campo atual</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>LESIONADOS</Text><Text style={styles.metricValue}>{injured}</Text><Text style={styles.metricHint}>no momento</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CANSADOS</Text><Text style={styles.metricValue}>{tired}</Text><Text style={styles.metricHint}>fitness abaixo de 55</Text></Panel>
        </View>

        <SectionLabel title="Estruturas do CT" />
        <View style={styles.list}>
          {ITEMS.map((item) => {
            const level = upgrades[item.key] ?? 1;
            const need = trainingCenterNeedScore(career,item.key);
            const maxed = level >= 10;
            const cost = trainingCenterUpgradeCost(item.key,level);
            const affordable = career.balance >= cost;
            const status = needLabel(need);

            return (
              <Panel key={item.key} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}><Feather name={item.icon} size={20} color="#79ef91" /></View>
                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.level}>NV {level}/10</Text>
                    </View>
                    <Text style={styles.cardText}>{item.text}</Text>
                  </View>
                </View>

                <View style={styles.needHeader}>
                  <Text style={styles.needLabel}>{status}</Text>
                  <Text style={styles.needValue}>{need}%</Text>
                </View>
                <View style={styles.needTrack}><View style={[styles.needFill,{ width:(need + '%') as any }]} /></View>

                {item.key === 'field' ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>CAPACIDADE DO CAMPO</Text>
                    <Text style={styles.detailValue}>{career.players.length} / {fieldCapacity} jogadores</Text>
                    <Text style={styles.detailText}>
                      {career.players.length > fieldCapacity
                        ? 'Plantel acima da capacidade. O elenco sofre perda adicional de condição física até o CT evoluir.'
                        : 'O plantel está dentro da capacidade atual de treinamento.'}
                    </Text>
                  </View>
                ) : item.key === 'medical' ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>RISCO DE LESÃO</Text>
                    <Text style={styles.detailValue}>{level <= 2 ? 'Alto' : level <= 5 ? 'Moderado' : level <= 8 ? 'Baixo' : 'Muito baixo'}</Text>
                    <Text style={styles.detailText}>Quanto pior o departamento em relação à carga de jogos, maior o risco de lesões durante as partidas.</Text>
                  </View>
                ) : item.key === 'physio' ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>RECUPERAÇÃO</Text>
                    <Text style={styles.detailValue}>+{18 + level * 2} fitness base</Text>
                    <Text style={styles.detailText}>Níveis maiores aceleram a recuperação entre rodadas.</Text>
                  </View>
                ) : item.key === 'gym' ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>CONDICIONAMENTO</Text>
                    <Text style={styles.detailValue}>Nível {level}</Text>
                    <Text style={styles.detailText}>Ajuda na recuperação e reduz parte do risco físico provocado por desgaste.</Text>
                  </View>
                ) : (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>ANÁLISE</Text>
                    <Text style={styles.detailValue}>Nível {level}</Text>
                    <Text style={styles.detailText}>A necessidade cresce conforme o clube e o elenco ficam mais complexos.</Text>
                  </View>
                )}

                {maxed ? (
                  <View style={styles.maxed}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.maxedText}>NÍVEL MÁXIMO</Text></View>
                ) : (
                  <Pressable
                    onPress={() => upgradeTrainingCenterItem(item.key)}
                    disabled={!affordable}
                    style={[styles.upgradeButton,!affordable && styles.upgradeButtonDisabled]}
                  >
                    <Text style={[styles.upgradeButtonText,!affordable && styles.upgradeButtonTextDisabled]}>
                      EVOLUIR PARA NV {level + 1} · {formatCurrency(cost)}
                    </Text>
                  </Pressable>
                )}
              </Panel>
            );
          })}
        </View>

        <SectionLabel title="Caixa do clube" />
        <Panel style={styles.cashPanel}>
          <Text style={styles.cashLabel}>DISPONÍVEL</Text>
          <Text style={styles.cashValue}>{formatCurrency(career.balance)}</Text>
          <Text style={styles.cashHint}>Evolua somente quando a necessidade justificar o investimento.</Text>
        </Panel>
      </Screen>
    </>
  );
}

const styles=StyleSheet.create({
  hero:{gap:12,backgroundColor:'#153426',borderColor:'#2c503d'},
  heroTop:{flexDirection:'row',alignItems:'center',gap:12},
  icon:{width:58,height:58,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#0b2117',borderWidth:1,borderColor:'#356a4a'},
  heroBody:{flex:1,minWidth:0},
  kicker:{color:'#79ef91',fontSize:7.5,fontWeight:'900',letterSpacing:1},
  title:{color:'#f5f7f5',fontSize:18,fontWeight:'900',marginTop:3},
  sub:{color:'#9fb2a5',fontSize:9,lineHeight:13,marginTop:3},
  needHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  needLabel:{color:'#90a898',fontSize:7,fontWeight:'900',letterSpacing:0.7},
  needValue:{color:'#f5f7f5',fontSize:8.5,fontWeight:'900'},
  needTrack:{height:7,borderRadius:99,backgroundColor:'#08150e',overflow:'hidden',borderWidth:1,borderColor:'#294336'},
  needFill:{height:'100%',backgroundColor:'#79ef91'},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},
  metric:{width:'48.5%',minHeight:82,justifyContent:'center',gap:4},
  metricLabel:{color:'#84998b',fontSize:7,fontWeight:'900'},
  metricValue:{color:'#f5f7f5',fontSize:18,fontWeight:'900'},
  metricHint:{color:'#74897b',fontSize:7,fontWeight:'800'},
  list:{gap:9},
  card:{gap:10,backgroundColor:'#10291d',borderColor:'#2c503d'},
  cardTop:{flexDirection:'row',gap:10},
  cardIcon:{width:42,height:42,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'#0b2117',borderWidth:1,borderColor:'#2c503d'},
  cardBody:{flex:1,minWidth:0},
  titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  cardTitle:{color:'#f5f7f5',fontSize:12,fontWeight:'900',flex:1},
  level:{color:'#79ef91',fontSize:8,fontWeight:'900'},
  cardText:{color:'#9fb2a5',fontSize:8.3,lineHeight:12.5,marginTop:3},
  detailBox:{gap:3,padding:8,borderRadius:8,backgroundColor:'#0b2117',borderWidth:1,borderColor:'#2c503d'},
  detailLabel:{color:'#789080',fontSize:6.3,fontWeight:'900',letterSpacing:0.6},
  detailValue:{color:'#f5f7f5',fontSize:9.5,fontWeight:'900'},
  detailText:{color:'#9fb2a5',fontSize:7.3,lineHeight:11},
  upgradeButton:{minHeight:40,borderRadius:9,backgroundColor:'#79ef91',alignItems:'center',justifyContent:'center'},
  upgradeButtonDisabled:{backgroundColor:'#23382c'},
  upgradeButtonText:{color:'#07150d',fontSize:8,fontWeight:'900'},
  upgradeButtonTextDisabled:{color:'#75867b'},
  maxed:{minHeight:40,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:'#153426',borderWidth:1,borderColor:'#356a4a'},
  maxedText:{color:'#79ef91',fontSize:8,fontWeight:'900'},
  cashPanel:{gap:5,alignItems:'center',backgroundColor:'#10291d',borderColor:'#2c503d'},
  cashLabel:{color:'#84998b',fontSize:7,fontWeight:'900'},
  cashValue:{color:'#79ef91',fontSize:18,fontWeight:'900'},
  cashHint:{color:'#84998b',fontSize:7.5,textAlign:'center'},
});