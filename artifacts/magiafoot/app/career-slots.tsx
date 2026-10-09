import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { getClub } from '@/game/data';

const SLOT_NUMBERS = [1,2,3,4] as const;

export default function CareerSlotsScreen() {
  const router = useRouter();
  const {
    cloudEmail,
    careerSlots,
    refreshCareerSlots,
    chooseCareerSlot,
    chooseEmptyCareerSlot,
    cloudStatus,
    signOutCloud,
  } = useCareer();
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  useEffect(() => {
    void refreshCareerSlots();
  }, [refreshCareerSlots]);

  if (!cloudEmail) {
    router.replace('/account-save');
    return null;
  }

  const openSlot = async (slot: 1 | 2 | 3 | 4) => {
    const saved = careerSlots.find((item) => item.slot === slot);
    if (!saved) {
      chooseEmptyCareerSlot(slot);
      router.replace('/new-career');
      return;
    }

    setLoadingSlot(slot);
    const ok = await chooseCareerSlot(slot);
    setLoadingSlot(null);
    if (ok) router.replace('/');
  };

  return (
    <Screen style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>MAGIA<Text style={styles.logoGreen}>FOOT</Text></Text>
          <Text style={styles.subtitle}>Escolha sua carreira</Text>
        </View>
        <Pressable onPress={() => router.push('/account-save')} style={styles.accountButton}>
          <Feather name="user" size={15} color="#79ef91" />
          <Text style={styles.accountButtonText}>CONTA</Text>
        </Pressable>
      </View>

      <Text style={styles.helper}>Você pode manter até 4 carreiras diferentes no mesmo login.</Text>

      <View style={styles.slotsGrid}>
        {SLOT_NUMBERS.map((slot) => {
          const saved = careerSlots.find((item) => item.slot === slot);
          const club = saved ? getClub(saved.clubId) : undefined;
          const isLoading = loadingSlot === slot;
          return (
            <Pressable key={slot} onPress={() => void openSlot(slot)} style={styles.slotCard}>
              <View style={styles.slotTop}>
                <View style={[styles.slotNumber, !saved && styles.slotNumberEmpty]}>
                  <Text style={[styles.slotNumberText, !saved && styles.slotNumberTextEmpty]}>{slot}</Text>
                </View>
                <Text style={styles.slotKicker}>CARREIRA {slot}</Text>
                <Feather name={saved ? 'chevron-right' : 'plus-circle'} size={20} color="#79ef91" />
              </View>

              {saved ? (
                <>
                  <Text numberOfLines={1} style={styles.coach}>{saved.coachName}</Text>
                  <Text numberOfLines={1} style={styles.club}>{club?.name ?? saved.clubId}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaLabel}>TEMPORADA</Text>
                      <Text style={styles.metaValue}>{saved.season}</Text>
                    </View>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaLabel}>RODADA</Text>
                      <Text style={styles.metaValue}>{saved.roundIndex + 1}</Text>
                    </View>
                  </View>
                  <Text style={styles.updated}>Atualizada em {new Date(saved.updatedAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</Text>
                </>
              ) : (
                <View style={styles.emptyBox}>
                  <Feather name="plus" size={28} color="#79ef91" />
                  <Text style={styles.emptyTitle}>Nova carreira</Text>
                  <Text style={styles.emptyText}>Toque para começar neste espaço.</Text>
                </View>
              )}

              {isLoading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color="#79ef91" />
                  <Text style={styles.loadingText}>Carregando…</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={async () => {
          await signOutCloud();
          router.replace('/account-save');
        }}
        style={styles.logoutButton}
      >
        <Feather name="log-out" size={14} color="#93a69a" />
        <Text style={styles.logoutText}>SAIR DA CONTA</Text>
      </Pressable>

      {cloudStatus === 'error' ? <Text style={styles.error}>Não foi possível atualizar todas as carreiras. Tente novamente.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor:'#07150d', paddingHorizontal:20, paddingTop:34, paddingBottom:34, gap:16 },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:12 },
  logo:{ color:'#f5f7f5', fontSize:30, fontWeight:'900', letterSpacing:-1.1 },
  logoGreen:{ color:'#79ef91' },
  subtitle:{ color:'#9fb2a5', fontSize:11, marginTop:2 },
  accountButton:{ minHeight:38, paddingHorizontal:12, borderRadius:11, borderWidth:1, borderColor:'#31513d', backgroundColor:'#10291d', flexDirection:'row', alignItems:'center', gap:6 },
  accountButtonText:{ color:'#79ef91', fontSize:7.5, fontWeight:'900' },
  helper:{ color:'#7e9285', fontSize:8.5, lineHeight:12 },
  slotsGrid:{ gap:11 },
  slotCard:{ position:'relative', minHeight:150, borderRadius:18, borderWidth:1, borderColor:'#31513d', backgroundColor:'#0b2117', padding:14, gap:8, overflow:'hidden' },
  slotTop:{ flexDirection:'row', alignItems:'center', gap:8 },
  slotNumber:{ width:30, height:30, borderRadius:9, backgroundColor:'#79ef91', alignItems:'center', justifyContent:'center' },
  slotNumberEmpty:{ backgroundColor:'#153426', borderWidth:1, borderColor:'#31513d' },
  slotNumberText:{ color:'#07150d', fontSize:11, fontWeight:'900' },
  slotNumberTextEmpty:{ color:'#79ef91' },
  slotKicker:{ flex:1, color:'#79ef91', fontSize:7, fontWeight:'900', letterSpacing:0.6 },
  coach:{ color:'#fff', fontSize:17, fontWeight:'900' },
  club:{ color:'#a7b7ad', fontSize:10.5 },
  metaRow:{ flexDirection:'row', gap:8 },
  metaBox:{ flex:1, minHeight:46, borderRadius:10, backgroundColor:'#10291d', borderWidth:1, borderColor:'#284837', padding:8 },
  metaLabel:{ color:'#71877a', fontSize:5.8, fontWeight:'900' },
  metaValue:{ color:'#fff', fontSize:10, fontWeight:'900', marginTop:3 },
  updated:{ color:'#667a6e', fontSize:6.8 },
  emptyBox:{ flex:1, minHeight:92, alignItems:'center', justifyContent:'center', gap:5 },
  emptyTitle:{ color:'#fff', fontSize:14, fontWeight:'900' },
  emptyText:{ color:'#7e9285', fontSize:8 },
  loadingOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(7,21,13,0.88)', alignItems:'center', justifyContent:'center', gap:7 },
  loadingText:{ color:'#dce8df', fontSize:8 },
  logoutButton:{ alignSelf:'center', flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:12 },
  logoutText:{ color:'#93a69a', fontSize:7, fontWeight:'900' },
  error:{ color:'#e9c46a', fontSize:8, textAlign:'center' },
});
