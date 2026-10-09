import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameHeader, Panel, Screen, formatCurrency } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';
import { calculateStandings, LEAGUE_ROUNDS } from '@/game/engine';
import { getClub } from '@/game/data';
import { useColors } from '@/hooks/useColors';

export default function CareerScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    career, magiaId, saveHealth, lastSavedAt, backupCount, manualSave,
    cloudEmail, cloudMagiaId, cloudStatus, cloudLastSavedAt, cloudMessage,
    createCloudAccount, signInCloud, signOutCloud, syncCloudNow, restoreCloudLatest,
  } = useCareer();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountMode, setAccountMode] = useState<'login' | 'signup'>('login');
  const [accountBusy, setAccountBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  if (!career) {
    return <><GameHeader title="Carreira" /><Screen><Text style={{ color: colors.foreground }}>Crie uma carreira para começar.</Text></Screen></>;
  }

  const club = getClub(career.clubId);
  const standings = calculateStandings(career.results);
  const position = standings.findIndex((row) => row.club.id === career.clubId) + 1;
  const wins = career.results.filter((r) => (r.homeClubId === career.clubId && r.homeGoals > r.awayGoals) || (r.awayClubId === career.clubId && r.awayGoals > r.homeGoals)).length;
  const draws = career.results.filter((r) => r.homeGoals === r.awayGoals && (r.homeClubId === career.clubId || r.awayClubId === career.clubId)).length;
  const losses = career.results.length - wins - draws;
  const saveHealthLabel =
    saveHealth === 'healthy' ? 'Protegido' :
    saveHealth === 'restored_backup' ? 'Backup restaurado' :
    saveHealth === 'legacy_migrated' ? 'Save atualizado' :
    saveHealth === 'corrupt' ? 'Atenção necessária' : 'Preparando';
  const lastSaveLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Ainda não salvo';

  const saveNow = async () => {
    if (saving) return;
    setSaving(true);
    setSaveMessage(null);
    const ok = await manualSave();
    setSaveMessage(ok ? 'Carreira protegida com sucesso.' : 'Não foi possível concluir o salvamento.');
    setSaving(false);
  };

  const submitAccount = async () => {
    if (accountBusy || !accountEmail.trim() || accountPassword.length < 8) return;
    setAccountBusy(true);
    const ok = accountMode === 'signup'
      ? await createCloudAccount(accountEmail, accountPassword)
      : await signInCloud(accountEmail, accountPassword);
    if (ok) setAccountPassword('');
    setAccountBusy(false);
  };

  const cloudSaveLabel = cloudLastSavedAt
    ? new Date(cloudLastSavedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Ainda não sincronizado';

  return (
    <>
      <GameHeader title="Carreira" eyebrow={career.coachName} />
      <Screen>
        <Panel style={styles.hero}>
          <View style={styles.avatar}><Feather name="user" size={28} color="#79ef91" /></View>
          <Text style={styles.coach}>{career.coachName}</Text>
          <Text style={styles.club}>{club?.name ?? 'Clube'} · Temporada {career.season}</Text>
          <View style={styles.trust}><Text style={styles.trustLabel}>Confiança da diretoria</Text><Text style={styles.trustValue}>{career.boardTrust}%</Text></View>
        </Panel>

        <View style={styles.grid}>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>POSIÇÃO</Text><Text style={styles.metricValue}>{position > 0 ? position + 'º' : '—'}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>RODADA</Text><Text style={styles.metricValue}>{career.roundIndex + 1}/{LEAGUE_ROUNDS}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>VITÓRIAS</Text><Text style={styles.metricValue}>{wins}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>EMPATES</Text><Text style={styles.metricValue}>{draws}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>DERROTAS</Text><Text style={styles.metricValue}>{losses}</Text></Panel>
          <Panel style={styles.metric}><Text style={styles.metricLabel}>CAIXA</Text><Text style={styles.metricValueSmall}>{formatCurrency(career.balance)}</Text></Panel>
        </View>

        <Panel style={styles.savePanel}>
          <View style={styles.saveHeader}>
            <View style={styles.saveIcon}><Feather name="shield" size={21} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.saveKicker}>PROTEÇÃO DA CARREIRA</Text>
              <Text style={styles.saveTitle}>{saveHealthLabel}</Text>
            </View>
            <View style={styles.protectedBadge}><Text style={styles.protectedBadgeText}>SAVE V2</Text></View>
          </View>

          <View style={styles.magiaIdBox}>
            <Text style={styles.magiaIdLabel}>MAGIA ID · IDENTIFICAÇÃO DE SUPORTE</Text>
            <Text selectable style={styles.magiaIdValue}>{magiaId ?? 'Gerando identificação…'}</Text>
            <Text style={styles.magiaIdHint}>Guarde este código. Ele será vinculado à sua conta na nuvem para recuperação e suporte.</Text>
          </View>

          <View style={styles.saveStatusGrid}>
            <View style={styles.saveStatusItem}>
              <Text style={styles.saveStatusLabel}>ÚLTIMO SAVE</Text>
              <Text style={styles.saveStatusValue}>{lastSaveLabel}</Text>
            </View>
            <View style={styles.saveStatusItem}>
              <Text style={styles.saveStatusLabel}>BACKUPS LOCAIS</Text>
              <Text style={styles.saveStatusValue}>{backupCount}/5</Text>
            </View>
          </View>

          <View style={styles.securityList}>
            <View style={styles.securityRow}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.securityText}>Integridade SHA-256 em cada salvamento</Text></View>
            <View style={styles.securityRow}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.securityText}>Restauração automática se o save principal corromper</Text></View>
            <View style={styles.securityRow}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.securityText}>Histórico rotativo de até 5 cópias de segurança</Text></View>
          </View>

          <Pressable disabled={saving} onPress={saveNow} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            <Feather name={saving ? 'loader' : 'save'} size={16} color="#07150d" />
            <Text style={styles.saveButtonText}>{saving ? 'SALVANDO…' : 'SALVAR AGORA'}</Text>
          </Pressable>
          {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}
        </Panel>

        <Panel style={styles.cloudPanel}>
          <View style={styles.cloudHeader}>
            <View style={styles.cloudIcon}><Feather name="cloud" size={21} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.saveKicker}>CONTA MAGIAFOOT</Text>
              <Text style={styles.cloudTitle}>{cloudEmail ? 'Nuvem conectada' : 'Proteção em nuvem'}</Text>
            </View>
            <View style={[styles.cloudStateBadge, cloudEmail && styles.cloudStateBadgeOn]}>
              <Text style={[styles.cloudStateText, cloudEmail && styles.cloudStateTextOn]}>{cloudEmail ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
          </View>

          {cloudEmail ? (
            <>
              <View style={styles.cloudIdentity}>
                <Text style={styles.cloudIdentityLabel}>CONTA VERIFICADA</Text>
                <Text style={styles.cloudEmail}>{cloudEmail}</Text>
                <Text style={styles.cloudIdentityLabel}>MAGIA ID DA CONTA</Text>
                <Text selectable style={styles.cloudMagiaId}>{cloudMagiaId ?? magiaId ?? 'Carregando…'}</Text>
              </View>

              <View style={styles.saveStatusGrid}>
                <View style={styles.saveStatusItem}>
                  <Text style={styles.saveStatusLabel}>ÚLTIMA NUVEM</Text>
                  <Text style={styles.saveStatusValue}>{cloudSaveLabel}</Text>
                </View>
                <View style={styles.saveStatusItem}>
                  <Text style={styles.saveStatusLabel}>STATUS</Text>
                  <Text style={styles.saveStatusValue}>
                    {cloudStatus === 'syncing' ? 'Sincronizando…' : cloudStatus === 'error' ? 'Atenção' : 'Protegido'}
                  </Text>
                </View>
              </View>

              <View style={styles.cloudActions}>
                <Pressable disabled={cloudStatus === 'syncing'} onPress={syncCloudNow} style={[styles.cloudPrimaryButton, cloudStatus === 'syncing' && styles.saveButtonDisabled]}>
                  <Feather name="upload-cloud" size={15} color="#07150d" />
                  <Text style={styles.cloudPrimaryText}>{cloudStatus === 'syncing' ? 'SINCRONIZANDO…' : 'SINCRONIZAR AGORA'}</Text>
                </Pressable>
                <Pressable
                  disabled={cloudStatus === 'syncing'}
                  onPress={async () => {
                    if (!confirmRestore) {
                      setConfirmRestore(true);
                      return;
                    }
                    setConfirmRestore(false);
                    await restoreCloudLatest();
                  }}
                  style={[styles.cloudSecondaryButton, confirmRestore && styles.restoreConfirmButton]}
                >
                  <Feather name="download-cloud" size={15} color={confirmRestore ? '#07150d' : '#dce8df'} />
                  <Text style={[styles.cloudSecondaryText, confirmRestore && styles.restoreConfirmText]}>
                    {confirmRestore ? 'CONFIRMAR RECUPERAÇÃO' : 'RECUPERAR DA NUVEM'}
                  </Text>
                </Pressable>
              </View>

              {confirmRestore ? <Text style={styles.restoreWarning}>A confirmação substituirá a carreira deste aparelho pelo backup mais recente da conta.</Text> : null}

              <Pressable onPress={signOutCloud} style={styles.signOutButton}>
                <Text style={styles.signOutText}>DESCONECTAR CONTA DESTE APARELHO</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cloudIntro}>Entre com seu e-mail para vincular a carreira à sua conta e permitir recuperação em outro aparelho.</Text>

              <View style={styles.accountTabs}>
                <Pressable onPress={() => setAccountMode('login')} style={[styles.accountTab, accountMode === 'login' && styles.accountTabActive]}>
                  <Text style={[styles.accountTabText, accountMode === 'login' && styles.accountTabTextActive]}>ENTRAR</Text>
                </Pressable>
                <Pressable onPress={() => setAccountMode('signup')} style={[styles.accountTab, accountMode === 'signup' && styles.accountTabActive]}>
                  <Text style={[styles.accountTabText, accountMode === 'signup' && styles.accountTabTextActive]}>CRIAR CONTA</Text>
                </Pressable>
              </View>

              <TextInput
                value={accountEmail}
                onChangeText={setAccountEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="seuemail@exemplo.com"
                placeholderTextColor="#5f7467"
                style={styles.accountInput}
              />
              <TextInput
                value={accountPassword}
                onChangeText={setAccountPassword}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder="Senha com pelo menos 8 caracteres"
                placeholderTextColor="#5f7467"
                style={styles.accountInput}
              />

              <Pressable
                disabled={accountBusy || !accountEmail.trim() || accountPassword.length < 8}
                onPress={submitAccount}
                style={[styles.cloudPrimaryButton, (accountBusy || !accountEmail.trim() || accountPassword.length < 8) && styles.saveButtonDisabled]}
              >
                <Feather name={accountMode === 'signup' ? 'user-plus' : 'log-in'} size={15} color="#07150d" />
                <Text style={styles.cloudPrimaryText}>
                  {accountBusy ? 'AGUARDE…' : accountMode === 'signup' ? 'CRIAR CONTA PROTEGIDA' : 'ENTRAR E SINCRONIZAR'}
                </Text>
              </Pressable>
              <Text style={styles.accountHint}>Ao criar a conta, o e-mail precisa ser confirmado antes do primeiro acesso. A senha não é salva pelo MagiaFoot.</Text>
            </>
          )}

          {cloudMessage ? <Text style={styles.cloudMessage}>{cloudMessage}</Text> : null}
        </Panel>

        <Pressable onPress={() => router.push('/new-career')} style={styles.newCareer}>
          <Feather name="plus-circle" size={18} color="#79ef91" />
          <View style={{ flex: 1 }}>
            <Text style={styles.newCareerTitle}>Nova carreira</Text>
            <Text style={styles.newCareerText}>Começar de novo substituirá o salvamento atual após confirmação.</Text>
          </View>
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 7, paddingVertical: 24, backgroundColor: '#153426', borderColor: '#356a4a' },
  avatar: { width: 62, height: 62, borderRadius: 18, backgroundColor: '#0b2117', borderWidth: 1, borderColor: '#2c503d', alignItems: 'center', justifyContent: 'center' },
  coach: { color: '#f5f7f5', fontSize: 21, fontWeight: '900', marginTop: 4 },
  club: { color: '#9fb2a5', fontSize: 11 },
  trust: { marginTop: 8, width: '100%', borderTopWidth: 1, borderTopColor: '#2c503d', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  trustLabel: { color: '#b7c7bd', fontSize: 11, fontWeight: '700' },
  trustValue: { color: '#79ef91', fontSize: 14, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 96, justifyContent: 'center', gap: 7 },
  metricLabel: { color: '#90a898', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  metricValue: { color: '#f5f7f5', fontSize: 24, fontWeight: '900' },
  metricValueSmall: { color: '#f5f7f5', fontSize: 15, fontWeight: '900' },
  savePanel: { gap: 12, backgroundColor: '#0b2117', borderColor: '#356a4a' },
  saveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426', borderWidth: 1, borderColor: '#2c503d' },
  saveKicker: { color: '#79ef91', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  saveTitle: { color: '#f5f7f5', fontSize: 14, fontWeight: '900', marginTop: 2 },
  protectedBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#153426' },
  protectedBadgeText: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  magiaIdBox: { borderRadius: 12, padding: 12, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#264937' },
  magiaIdLabel: { color: '#809587', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.55 },
  magiaIdValue: { color: '#ffffff', fontSize: 19, fontWeight: '900', letterSpacing: 1.1, marginTop: 6 },
  magiaIdHint: { color: '#829789', fontSize: 7.5, lineHeight: 11, marginTop: 6 },
  saveStatusGrid: { flexDirection: 'row', gap: 8 },
  saveStatusItem: { flex: 1, minHeight: 58, borderRadius: 10, backgroundColor: '#10291d', borderWidth: 1, borderColor: '#284837', padding: 9, justifyContent: 'center' },
  saveStatusLabel: { color: '#799081', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.4 },
  saveStatusValue: { color: '#ffffff', fontSize: 9, fontWeight: '900', marginTop: 4 },
  securityList: { gap: 7 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  securityText: { flex: 1, color: '#b9c8be', fontSize: 8, lineHeight: 11 },
  saveButton: { minHeight: 42, borderRadius: 11, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: '#07150d', fontSize: 8.5, fontWeight: '900' },
  saveMessage: { color: '#9fb2a5', fontSize: 7.5, textAlign: 'center' },
  cloudPanel: { gap: 11, backgroundColor: '#0a2018', borderColor: '#356a4a' },
  cloudHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cloudIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#123426', borderWidth: 1, borderColor: '#2c503d' },
  cloudTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  cloudStateBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: '#405247', backgroundColor: '#141d18' },
  cloudStateBadgeOn: { borderColor: '#79ef91', backgroundColor: '#163a25' },
  cloudStateText: { color: '#7d9184', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.5 },
  cloudStateTextOn: { color: '#79ef91' },
  cloudIntro: { color: '#a9bbb0', fontSize: 8.5, lineHeight: 13 },
  cloudIdentity: { gap: 5, borderRadius: 11, padding: 11, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#264937' },
  cloudIdentityLabel: { color: '#71877a', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  cloudEmail: { color: '#ffffff', fontSize: 10.5, fontWeight: '800', marginBottom: 4 },
  cloudMagiaId: { color: '#79ef91', fontSize: 17, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  cloudActions: { gap: 7 },
  cloudPrimaryButton: { minHeight: 42, borderRadius: 11, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  cloudPrimaryText: { color: '#07150d', fontSize: 8.2, fontWeight: '900' },
  cloudSecondaryButton: { minHeight: 40, borderRadius: 11, backgroundColor: '#153426', borderWidth: 1, borderColor: '#315f3f', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  cloudSecondaryText: { color: '#dce8df', fontSize: 7.8, fontWeight: '900' },
  restoreConfirmButton: { backgroundColor: '#ffe66a', borderColor: '#ffe66a' },
  restoreConfirmText: { color: '#07150d' },
  restoreWarning: { color: '#e9c46a', fontSize: 7.2, lineHeight: 11, textAlign: 'center' },
  signOutButton: { alignItems: 'center', paddingVertical: 5 },
  signOutText: { color: '#8ea296', fontSize: 6.6, fontWeight: '900', letterSpacing: 0.4 },
  accountTabs: { flexDirection: 'row', gap: 6 },
  accountTab: { flex: 1, minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#31513d', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10291d' },
  accountTabActive: { backgroundColor: '#153f29', borderColor: '#79ef91' },
  accountTabText: { color: '#7f9487', fontSize: 7.2, fontWeight: '900' },
  accountTabTextActive: { color: '#79ef91' },
  accountInput: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#07150d', color: '#ffffff', paddingHorizontal: 11, fontSize: 10 },
  accountHint: { color: '#71877a', fontSize: 6.8, lineHeight: 10, textAlign: 'center' },
  cloudMessage: { color: '#b9c8be', fontSize: 7.5, lineHeight: 11, textAlign: 'center' },
  newCareer: { borderWidth: 1, borderColor: '#2c503d', borderRadius: 18, backgroundColor: '#0b2117', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  newCareerTitle: { color: '#f5f7f5', fontSize: 14, fontWeight: '900' },
  newCareerText: { color: '#9fb2a5', fontSize: 10, lineHeight: 15, marginTop: 3 },
});
