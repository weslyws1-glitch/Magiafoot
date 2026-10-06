import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen, SectionLabel } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function ClubHeadquartersScreen() {
  const colors = useColors();
  const { career } = useCareer();
  if (!career) return <><GameHeader title="Sede do clube" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar a sede.</Text></Screen></>;
  const club=getClub(career.clubId);
  if(!club) return null;

  const items=[
    ['Diretoria','Melhora organização e capacidade administrativa.','briefcase'],
    ['Sala de reuniões','Apoia planejamento e decisões estratégicas.','users'],
    ['Marketing','Aumenta exposição, torcida e patrocínios.','radio'],
    ['Loja oficial','Gera receita com produtos do clube.','shopping-bag'],
    ['Museu','Fortalece história, imagem e visitação.','book-open'],
    ['Centro de imprensa','Melhora relacionamento com mídia e reputação.','mic'],
  ];

  return (
    <>
      <GameHeader title="Sede do clube" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.icon}><Feather name="briefcase" size={28} color="#79ef91" /></View>
          <Text style={styles.title}>Sede do {club.name}</Text>
          <Text style={styles.sub}>Administração, imagem, negócios e relacionamento institucional.</Text>
        </Panel>
        <SectionLabel title="Departamentos" />
        <View style={styles.grid}>
          {items.map(([title,text,icon])=>(
            <Panel key={title} style={styles.card}>
              <Feather name={icon as any} size={18} color="#79ef91" />
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardText}>{text}</Text>
              <Text style={styles.level}>NÍVEL 1</Text>
            </Panel>
          ))}
        </View>
      </Screen>
    </>
  );
}

const styles=StyleSheet.create({
  hero:{alignItems:'center',gap:8,paddingVertical:24,backgroundColor:'#153426',borderColor:'#2c503d'},
  icon:{width:58,height:58,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#0b2117',borderWidth:1,borderColor:'#2c503d'},
  title:{color:'#f5f7f5',fontSize:20,fontWeight:'900'},
  sub:{color:'#9fb2a5',fontSize:11,textAlign:'center'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  card:{width:'48%',minHeight:135,gap:7},
  cardTitle:{color:'#f5f7f5',fontSize:12,fontWeight:'900'},
  cardText:{color:'#9fb2a5',fontSize:9,lineHeight:13,flex:1},
  level:{color:'#79ef91',fontSize:9,fontWeight:'900'},
});