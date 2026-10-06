import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameButton, GameHeader, Panel, Screen, SectionLabel, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function StadiumScreen() {
  const colors = useColors();
  const { career, expandStadium } = useCareer();

  if (!career) {
    return <><GameHeader title="Infraestrutura" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para administrar a infraestrutura do clube.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  if (!club) return null;

  const capacity = club.stadiumCapacity + career.stadiumLevel * 3500;
  const nextCost = 850000 + career.stadiumLevel * 350000;
  const maxed = career.stadiumLevel >= 3;
  const projected = Math.round(capacity * club.ticketPrice * 0.72);

  return (
    <>
      <GameHeader title="Infraestrutura" eyebrow={club.name} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.heroIcon}><Feather name="home" size={30} color="#79ef91" /></View>
          <Text style={styles.heroTitle}>Infraestrutura do {club.name}</Text>
          <Text style={styles.heroSub}>Centro estrutural do clube · nível {career.stadiumLevel + 1}</Text>
        </Panel>

        <View style={styles.grid}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CAPACIDADE</Text><Text style={styles.metricValue}>{capacity.toLocaleString('pt-BR')}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>INGRESSO</Text><Text style={styles.metricValue}>{formatCurrency(club.ticketPrice)}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>RENDA POTENCIAL</Text><Text style={styles.metricValue}>{formatCurrency(projected)}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CAIXA</Text><Text style={styles.metricValue}>{formatCurrency(career.balance)}</Text></Panel>
        </View>

        <SectionLabel title="Infraestrutura" />
        <Panel style={styles.upgrade}>
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>{maxed ? 'Arquibancadas no nível máximo' : 'Ampliar arquibancadas'}</Text>
            <Text style={styles.upgradeText}>{maxed ? 'As arquibancadas já atingiram o limite atual.' : 'Adiciona 3.500 lugares e aumenta a renda possível nos jogos em casa.'}</Text>
          </View>
          {!maxed ? <Text style={styles.cost}>{formatCurrency(nextCost)}</Text> : null}
        </Panel>
        {!maxed ? <GameButton label="AMPLIAR ARQUIBANCADAS" icon="arrow-up-circle" onPress={expandStadium} disabled={career.balance < nextCost} /> : null}

        <SectionLabel title="Estrutura interna" />
        <View style={styles.featureGrid}>
          {[
            ['Gramado', 'Melhora desempenho e reduz risco de lesão.', 'activity'],
            ['Iluminação', 'Melhora jogos noturnos e qualidade do espetáculo.', 'sun'],
            ['Vestiários', 'Ajuda moral, conforto e preparação da equipe.', 'users'],
            ['Academia', 'Apoia evolução física e condicionamento.', 'trending-up'],
            ['Centro médico', 'Acelera recuperação e tratamento de lesões.', 'heart'],
            ['Recuperação', 'Ajuda desgaste e fadiga entre partidas.', 'refresh-cw'],
            ['Drenagem', 'Reduz impacto da chuva no gramado.', 'droplet'],
            ['Irrigação', 'Mantém o gramado em melhor estado.', 'cloud-rain'],
          ].map(([title, text, icon]) => (
            <Panel key={title} style={styles.featureCard}>
              <View style={styles.featureIcon}><Feather name={icon as any} size={18} color="#79ef91" /></View>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureText}>{text}</Text>
              <View style={styles.levelBar}><View style={styles.levelFill} /></View>
              <Text style={styles.featureLevel}>NÍVEL 1</Text>
            </Panel>
          ))}
        </View>

        <SectionLabel title="Experiência da torcida" />
        <View style={styles.featureGrid}>
          {[
            ['Cobertura', 'Aumenta conforto e público em dias de chuva.', 'umbrella'],
            ['Cadeiras', 'Melhora conforto e percepção do estádio.', 'grid'],
            ['Camarotes', 'Aumenta receita premium por partida.', 'star'],
            ['Placar eletrônico', 'Melhora experiência e prestígio.', 'monitor'],
            ['Segurança', 'Reduz problemas e melhora controle de público.', 'shield'],
            ['Catracas', 'Agiliza entrada e organização dos torcedores.', 'log-in'],
            ['Estacionamento', 'Facilita acesso e ajuda média de público.', 'truck'],
            ['Wi-Fi', 'Melhora experiência digital do torcedor.', 'wifi'],
          ].map(([title, text, icon]) => (
            <Panel key={title} style={styles.featureCard}>
              <View style={styles.featureIcon}><Feather name={icon as any} size={18} color="#79ef91" /></View>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureText}>{text}</Text>
              <View style={styles.levelBar}><View style={styles.levelFill} /></View>
              <Text style={styles.featureLevel}>NÍVEL 1</Text>
            </Panel>
          ))}
        </View>

        <SectionLabel title="Receitas e imagem" />
        <View style={styles.featureGrid}>
          {[
            ['Loja oficial', 'Gera receita com produtos do clube.', 'shopping-bag'],
            ['Praça de alimentação', 'Aumenta receita por torcedor.', 'coffee'],
            ['Museu do clube', 'Melhora popularidade e gera renda.', 'book-open'],
            ['Centro de imprensa', 'Ajuda reputação e exposição do clube.', 'mic'],
          ].map(([title, text, icon]) => (
            <Panel key={title} style={styles.featureCard}>
              <View style={styles.featureIcon}><Feather name={icon as any} size={18} color="#79ef91" /></View>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureText}>{text}</Text>
              <View style={styles.levelBar}><View style={styles.levelFill} /></View>
              <Text style={styles.featureLevel}>NÍVEL 1</Text>
            </Panel>
          ))}
        </View>

        <SectionLabel title="Manutenção" />
        <Panel style={styles.maintenance}>
          <View style={{ flex: 1 }}>
            <Text style={styles.maintenanceTitle}>Estado geral da infraestrutura</Text>
            <Text style={styles.maintenanceText}>Estruturas mal cuidadas poderão reduzir público, receitas e desempenho do clube.</Text>
          </View>
          <View style={styles.maintenanceBadge}><Text style={styles.maintenanceBadgeText}>100%</Text></View>
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24, backgroundColor: '#153426', borderColor: '#2c503d' },
  heroIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  heroTitle: { color: '#f5f7f5', fontSize: 20, fontWeight: '900' },
  heroSub: { color: '#9fb2a5', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 104, justifyContent: 'center', gap: 8 },
  metricLabel: { color: '#90a898', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  metricValue: { color: '#f5f7f5', fontSize: 18, fontWeight: '900' },
  upgrade: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeTitle: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  upgradeText: { color: '#9fb2a5', fontSize: 11, lineHeight: 17, marginTop: 5 },
  cost: { color: '#79ef91', fontSize: 13, fontWeight: '900' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: { width: '48%', minHeight: 150, gap: 7, justifyContent: 'flex-start' },
  featureIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d' },
  featureTitle: { color: '#f5f7f5', fontSize: 12, fontWeight: '900' },
  featureText: { color: '#9fb2a5', fontSize: 9, lineHeight: 13, minHeight: 38 },
  featureLevel: { color: '#79ef91', fontSize: 8, fontWeight: '900' },
  levelBar: { height: 6, borderRadius: 999, backgroundColor: '#0b2117', overflow: 'hidden', borderWidth: 1, borderColor: '#2c503d' },
  levelFill: { width: '20%', height: '100%', backgroundColor: '#79ef91' },
  maintenance: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#153426', borderColor: '#2c503d' },
  maintenanceTitle: { color: '#f5f7f5', fontSize: 13, fontWeight: '900' },
  maintenanceText: { color: '#9fb2a5', fontSize: 10, lineHeight: 15, marginTop: 4 },
  maintenanceBadge: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#79ef91' },
  maintenanceBadgeText: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
});
