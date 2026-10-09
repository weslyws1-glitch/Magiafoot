import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GameHeader, Panel, Screen } from '@/components/ManagerUI';
import { useRouter } from 'expo-router';
import { useCareer } from '@/context/CareerContext';

export default function AccountSaveScreen() {
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

  const saveHealthLabel =
    !career ? 'Sem carreira ativa' :
    saveHealth === 'healthy' ? 'Protegido' :
    saveHealth === 'restored_backup' ? 'Backup restaurado' :
    saveHealth === 'legacy_migrated' ? 'Save atualizado' :
    saveHealth === 'corrupt' ? 'Atenção necessária' : 'Preparando';

  const lastSaveLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Ainda não salvo';

  const cloudSaveLabel = cloudLastSavedAt
    ? new Date(cloudLastSavedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Ainda não sincronizado';

  const saveNow = async () => {
    if (saving || !career) return;
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
    if (ok) {
      setAccountPassword('');
      if (accountMode === 'login') router.replace('/');
    }
    setAccountBusy(false);
  };

  return (
    <>
      <GameHeader title="Conta & Salvamento" eyebrow="MAGIAFOOT" />
      <Screen>
        <Panel style={styles.savePanel}>
          <View style={styles.saveHeader}>
            <View style={styles.saveIcon}><Feather name="shield" size={21} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>PROTEÇÃO DA CARREIRA</Text>
              <Text style={styles.title}>{saveHealthLabel}</Text>
            </View>
            <View style={styles.badge}><Text style={styles.badgeText}>SAVE V2</Text></View>
          </View>

          <View style={styles.magiaIdBox}>
            <Text style={styles.boxLabel}>MAGIA ID · IDENTIFICAÇÃO DE SUPORTE</Text>
            <Text selectable style={styles.magiaIdValue}>{magiaId ?? 'Gerando identificação…'}</Text>
            <Text style={styles.hint}>Use este código se precisar recuperar a conta ou pedir ajuda ao suporte.</Text>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>ÚLTIMO SAVE</Text>
              <Text style={styles.statusValue}>{lastSaveLabel}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>BACKUPS LOCAIS</Text>
              <Text style={styles.statusValue}>{backupCount}/5</Text>
            </View>
          </View>

          <View style={styles.securityList}>
            <View style={styles.securityRow}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.securityText}>Integridade SHA-256 em cada salvamento</Text></View>
            <View style={styles.securityRow}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.securityText}>Restauração automática se o save principal corromper</Text></View>
            <View style={styles.securityRow}><Feather name="check-circle" size={14} color="#79ef91" /><Text style={styles.securityText}>Histórico rotativo de até 5 cópias locais</Text></View>
          </View>

          <Pressable
            disabled={saving || !career}
            onPress={saveNow}
            style={[styles.primaryButton, (saving || !career) && styles.disabledButton]}
          >
            <Feather name={saving ? 'loader' : 'save'} size={16} color="#07150d" />
            <Text style={styles.primaryButtonText}>{saving ? 'SALVANDO…' : career ? 'SALVAR AGORA' : 'CRIE UMA CARREIRA PARA SALVAR'}</Text>
          </Pressable>
          {saveMessage ? <Text style={styles.message}>{saveMessage}</Text> : null}
        </Panel>

        <Panel style={styles.cloudPanel}>
          <View style={styles.cloudHeader}>
            <View style={styles.cloudIcon}><Feather name="cloud" size={21} color="#79ef91" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>CONTA MAGIAFOOT</Text>
              <Text style={styles.title}>{cloudEmail ? 'Nuvem conectada' : 'Proteção em nuvem'}</Text>
            </View>
            <View style={[styles.cloudStateBadge, cloudEmail && styles.cloudStateBadgeOn]}>
              <Text style={[styles.cloudStateText, cloudEmail && styles.cloudStateTextOn]}>{cloudEmail ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
          </View>

          {cloudEmail ? (
            <>
              <Pressable onPress={() => router.replace('/')} style={styles.enterGameButton}>
                <Feather name="play" size={16} color="#07150d" />
                <Text style={styles.enterGameButtonText}>ENTRAR NO JOGO</Text>
              </Pressable>

              <View style={styles.cloudIdentity}>
                <Text style={styles.boxLabel}>CONTA VERIFICADA</Text>
                <Text style={styles.cloudEmail}>{cloudEmail}</Text>
                <Text style={styles.boxLabel}>MAGIA ID DA CONTA</Text>
                <Text selectable style={styles.cloudMagiaId}>{cloudMagiaId ?? magiaId ?? 'Carregando…'}</Text>
              </View>

              <View style={styles.statusGrid}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>ÚLTIMA NUVEM</Text>
                  <Text style={styles.statusValue}>{cloudSaveLabel}</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>STATUS</Text>
                  <Text style={styles.statusValue}>
                    {cloudStatus === 'syncing' ? 'Sincronizando…' : cloudStatus === 'error' ? 'Atenção' : 'Protegido'}
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={!career || cloudStatus === 'syncing'}
                onPress={syncCloudNow}
                style={[styles.primaryButton, (!career || cloudStatus === 'syncing') && styles.disabledButton]}
              >
                <Feather name="upload-cloud" size={15} color="#07150d" />
                <Text style={styles.primaryButtonText}>{cloudStatus === 'syncing' ? 'SINCRONIZANDO…' : 'SINCRONIZAR AGORA'}</Text>
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
                style={[styles.secondaryButton, confirmRestore && styles.restoreConfirmButton]}
              >
                <Feather name="download-cloud" size={15} color={confirmRestore ? '#07150d' : '#dce8df'} />
                <Text style={[styles.secondaryButtonText, confirmRestore && styles.restoreConfirmText]}>
                  {confirmRestore ? 'CONFIRMAR RECUPERAÇÃO' : 'RECUPERAR DA NUVEM'}
                </Text>
              </Pressable>

              {confirmRestore ? <Text style={styles.restoreWarning}>A confirmação substituirá a carreira deste aparelho pelo backup mais recente da conta.</Text> : null}

              <Pressable onPress={signOutCloud} style={styles.signOutButton}>
                <Text style={styles.signOutText}>DESCONECTAR CONTA DESTE APARELHO</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cloudIntro}>Entre com seu e-mail para vincular sua carreira à conta MagiaFoot e recuperar o progresso em outro aparelho.</Text>

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
                style={[styles.primaryButton, (accountBusy || !accountEmail.trim() || accountPassword.length < 8) && styles.disabledButton]}
              >
                <Feather name={accountMode === 'signup' ? 'user-plus' : 'log-in'} size={15} color="#07150d" />
                <Text style={styles.primaryButtonText}>
                  {accountBusy ? 'AGUARDE…' : accountMode === 'signup' ? 'CRIAR CONTA PROTEGIDA' : 'ENTRAR E SINCRONIZAR'}
                </Text>
              </Pressable>

              <Text style={styles.hint}>Ao criar a conta, confirme o e-mail antes do primeiro acesso. A senha não é salva pelo MagiaFoot.</Text>
            </>
          )}

          {cloudMessage ? <Text style={styles.message}>{cloudMessage}</Text> : null}
        </Panel>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  savePanel: { gap: 12, backgroundColor: '#0b2117', borderColor: '#356a4a' },
  cloudPanel: { gap: 11, backgroundColor: '#0a2018', borderColor: '#356a4a' },
  saveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cloudHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426', borderWidth: 1, borderColor: '#2c503d' },
  cloudIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#123426', borderWidth: 1, borderColor: '#2c503d' },
  kicker: { color: '#79ef91', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#f5f7f5', fontSize: 14, fontWeight: '900', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#153426' },
  badgeText: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  magiaIdBox: { borderRadius: 12, padding: 12, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#264937' },
  boxLabel: { color: '#809587', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.55 },
  magiaIdValue: { color: '#ffffff', fontSize: 19, fontWeight: '900', letterSpacing: 1.1, marginTop: 6 },
  hint: { color: '#829789', fontSize: 7.2, lineHeight: 11, marginTop: 5, textAlign: 'center' },
  statusGrid: { flexDirection: 'row', gap: 8 },
  statusItem: { flex: 1, minHeight: 58, borderRadius: 10, backgroundColor: '#10291d', borderWidth: 1, borderColor: '#284837', padding: 9, justifyContent: 'center' },
  statusLabel: { color: '#799081', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.4 },
  statusValue: { color: '#ffffff', fontSize: 9, fontWeight: '900', marginTop: 4 },
  securityList: { gap: 7 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  securityText: { flex: 1, color: '#b9c8be', fontSize: 8, lineHeight: 11 },
  primaryButton: { minHeight: 42, borderRadius: 11, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryButtonText: { color: '#07150d', fontSize: 8.2, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
  message: { color: '#b9c8be', fontSize: 7.5, lineHeight: 11, textAlign: 'center' },
  cloudStateBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: '#405247', backgroundColor: '#141d18' },
  cloudStateBadgeOn: { borderColor: '#79ef91', backgroundColor: '#163a25' },
  cloudStateText: { color: '#7d9184', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.5 },
  cloudStateTextOn: { color: '#79ef91' },
  enterGameButton: { minHeight: 44, borderRadius: 12, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  enterGameButtonText: { color: '#07150d', fontSize: 8.5, fontWeight: '900' },
  cloudIdentity: { gap: 5, borderRadius: 11, padding: 11, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#264937' },
  cloudEmail: { color: '#ffffff', fontSize: 10.5, fontWeight: '800', marginBottom: 4 },
  cloudMagiaId: { color: '#79ef91', fontSize: 17, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  secondaryButton: { minHeight: 40, borderRadius: 11, backgroundColor: '#153426', borderWidth: 1, borderColor: '#315f3f', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryButtonText: { color: '#dce8df', fontSize: 7.8, fontWeight: '900' },
  restoreConfirmButton: { backgroundColor: '#ffe66a', borderColor: '#ffe66a' },
  restoreConfirmText: { color: '#07150d' },
  restoreWarning: { color: '#e9c46a', fontSize: 7.2, lineHeight: 11, textAlign: 'center' },
  signOutButton: { alignItems: 'center', paddingVertical: 5 },
  signOutText: { color: '#8ea296', fontSize: 6.6, fontWeight: '900', letterSpacing: 0.4 },
  cloudIntro: { color: '#a9bbb0', fontSize: 8.5, lineHeight: 13 },
  accountTabs: { flexDirection: 'row', gap: 6 },
  accountTab: { flex: 1, minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#31513d', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10291d' },
  accountTabActive: { backgroundColor: '#153f29', borderColor: '#79ef91' },
  accountTabText: { color: '#7f9487', fontSize: 7.2, fontWeight: '900' },
  accountTabTextActive: { color: '#79ef91' },
  accountInput: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#07150d', color: '#ffffff', paddingHorizontal: 11, fontSize: 10 },
});
