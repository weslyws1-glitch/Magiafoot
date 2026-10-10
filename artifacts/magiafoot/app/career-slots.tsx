import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
    deleteCareerSlot,
    cloudStatus,
    signOutCloud,
  } = useCareer();
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slot: 1 | 2 | 3 | 4; careerId: string; coachName: string; clubName: string;
  } | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteTarget || deletingSlot !== null) return;
    const target = deleteTarget;
    setDeletingSlot(target.slot);
    setDeleteError(null);
    try {
      const ok = await deleteCareerSlot(target.slot, target.careerId);
      if (ok) setDeleteTarget(null);
      else setDeleteError('Não foi possível excluir essa carreira. Verifique a conexão e tente novamente.');
    } catch (error) {
      console.error('[MagiaFoot] Excluir carreira:', error);
      setDeleteError('A exclusão falhou. Sua carreira não foi removida desta lista.');
    } finally {
      setDeletingSlot(null);
    }
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
            <View key={slot} style={styles.slotCard}>
              <Pressable onPress={() => void openSlot(slot)} disabled={loadingSlot !== null || deletingSlot !== null} style={styles.slotContent}>
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

              </Pressable>

              {saved ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Excluir carreira ' + slot}
                  disabled={loadingSlot !== null || deletingSlot !== null}
                  onPress={() => {
                    setDeleteError(null);
                    setDeleteTarget({
                      slot,
                      careerId: saved.careerId,
                      coachName: saved.coachName,
                      clubName: club?.name ?? saved.clubId,
                    });
                  }}
                  style={({ pressed }) => [styles.deleteSlotButton, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="trash-2" size={13} color="#f4a49f" />
                  <Text style={styles.deleteSlotText}>EXCLUIR CARREIRA</Text>
                </Pressable>
              ) : null}

              {isLoading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color="#79ef91" />
                  <Text style={styles.loadingText}>Carregando…</Text>
                </View>
              ) : null}
            </View>
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

      <Modal transparent animationType="fade" visible={deleteTarget !== null} onRequestClose={() => {
        if (deletingSlot === null) setDeleteTarget(null);
      }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Feather name="trash-2" size={22} color="#ffaaa2" />
            </View>
            <Text style={styles.confirmTitle}>Excluir esta carreira?</Text>
            <Text style={styles.confirmDescription}>
              {deleteTarget ? deleteTarget.clubName + ' · ' + deleteTarget.coachName : ''}
            </Text>
            <Text style={styles.confirmWarning}>
              Essa ação remove o espaço e o histórico de salvamentos dessa carreira. Não é possível desfazer.
              Suas outras carreiras permanecem intactas.
            </Text>
            {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable disabled={deletingSlot !== null} onPress={() => setDeleteTarget(null)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>CANCELAR</Text>
              </Pressable>
              <Pressable disabled={deletingSlot !== null} onPress={() => void confirmDelete()} style={styles.confirmDeleteButton}>
                {deletingSlot !== null ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="trash-2" size={14} color="#fff" />}
                <Text style={styles.confirmDeleteText}>{deletingSlot !== null ? 'EXCLUINDO...' : 'EXCLUIR'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor:'#07150d', paddingHorizontal:16, paddingTop:22, paddingBottom:26, gap:13 },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:12 },
  logo:{ color:'#f5f7f5', fontSize:30, fontWeight:'900', letterSpacing:-1.1 },
  logoGreen:{ color:'#79ef91' },
  subtitle:{ color:'#9fb2a5', fontSize:11, marginTop:2 },
  accountButton:{ minHeight:38, paddingHorizontal:12, borderRadius:11, borderWidth:1, borderColor:'#31513d', backgroundColor:'#10291d', flexDirection:'row', alignItems:'center', gap:6 },
  accountButtonText:{ color:'#79ef91', fontSize:7.5, fontWeight:'900' },
  helper:{ color:'#7e9285', fontSize:8.5, lineHeight:12 },
  slotsGrid:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', gap:9, maxWidth:700 },
  slotCard:{ position:'relative', width:'48%', minWidth:128, borderRadius:14, borderWidth:1, borderColor:'#31513d', backgroundColor:'#0b2117', padding:9, gap:5, overflow:'hidden' },
  slotContent:{ gap:6, minHeight:99 },
  slotTop:{ flexDirection:'row', alignItems:'center', gap:8 },
  slotNumber:{ width:25, height:25, borderRadius:7, backgroundColor:'#79ef91', alignItems:'center', justifyContent:'center' },
  slotNumberEmpty:{ backgroundColor:'#153426', borderWidth:1, borderColor:'#31513d' },
  slotNumberText:{ color:'#07150d', fontSize:11, fontWeight:'900' },
  slotNumberTextEmpty:{ color:'#79ef91' },
  slotKicker:{ flex:1, color:'#79ef91', fontSize:7, fontWeight:'900', letterSpacing:0.6 },
  coach:{ color:'#fff', fontSize:13, fontWeight:'900' },
  club:{ color:'#a7b7ad', fontSize:10.5 },
  metaRow:{ flexDirection:'row', gap:5 },
  metaBox:{ flex:1, minHeight:34, borderRadius:8, backgroundColor:'#10291d', borderWidth:1, borderColor:'#284837', padding:6 },
  metaLabel:{ color:'#71877a', fontSize:5.8, fontWeight:'900' },
  metaValue:{ color:'#fff', fontSize:10, fontWeight:'900', marginTop:3 },
  updated:{ color:'#667a6e', fontSize:6.8 },
  emptyBox:{ flex:1, minHeight:73, alignItems:'center', justifyContent:'center', gap:5 },
  emptyTitle:{ color:'#fff', fontSize:12, fontWeight:'900' },
  emptyText:{ color:'#7e9285', fontSize:8 },
  loadingOverlay:{ ...StyleSheet.absoluteFill, backgroundColor:'rgba(7,21,13,0.88)', alignItems:'center', justifyContent:'center', gap:7 },
  loadingText:{ color:'#dce8df', fontSize:8 },
  logoutButton:{ alignSelf:'center', flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:12 },
  logoutText:{ color:'#93a69a', fontSize:7, fontWeight:'900' },
  deleteSlotButton:{ flexDirection:'row', alignItems:'center', justifyContent:'center', borderTopWidth:1, borderTopColor:'#2d4637', minHeight:33, gap:5, paddingTop:7 },
  deleteSlotText:{ color:'#f4a49f', fontSize:8, fontWeight:'900', letterSpacing:0.2 },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.78)', justifyContent:'center', padding:20 },
  confirmCard:{ width:'100%', maxWidth:420, alignSelf:'center', backgroundColor:'#102319', borderColor:'#3a5944', borderWidth:1, borderRadius:18, padding:20, gap:12 },
  confirmIcon:{ width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:'#3d2526' },
  confirmTitle:{ color:'#fff', fontSize:19, fontWeight:'900' },
  confirmDescription:{ color:'#b0d4b9', fontSize:13, fontWeight:'700' },
  confirmWarning:{ color:'#cfb5af', fontSize:12, lineHeight:19 },
  confirmActions:{ flexDirection:'row', gap:10, marginTop:10 },
  cancelButton:{ flex:1, minHeight:46, alignItems:'center', justifyContent:'center', borderRadius:10, borderWidth:1, borderColor:'#3c5845' },
  cancelText:{ fontSize:11, fontWeight:'900', color:'#c4d6c7' },
  confirmDeleteButton:{ flex:1, minHeight:46, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:6, backgroundColor:'#b13b3a', borderRadius:10 },
  confirmDeleteText:{ fontSize:11, fontWeight:'900', color:'#fff' },
  deleteError:{ color:'#ffb0a7', fontSize:11, textAlign:'center' },
  error:{ color:'#e9c46a', fontSize:8, textAlign:'center' },
});
