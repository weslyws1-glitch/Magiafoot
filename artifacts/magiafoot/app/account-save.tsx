import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ManagerUI';
import { useCareer } from '@/context/CareerContext';

export default function AccountSaveScreen() {
  const router = useRouter();
  const {
    cloudEmail,
    cloudMagiaId,
    cloudStatus,
    cloudMessage,
    createCloudAccount,
    signInCloud,
    signOutCloud,
    authRestoring,
  } = useCareer();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !email.trim() || password.length < 8) return;
    if (mode === 'signup' && password !== confirmPassword) {
      setFormError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }
    setFormError(null);
    setBusy(true);
    const ok = mode === 'signup'
      ? await createCloudAccount(email, password, remember)
      : await signInCloud(email, password, remember);
    setBusy(false);
    if (ok && mode === 'login') router.replace('/career-slots');
  };

  if (authRestoring) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color="#79ef91" />
        <Text style={styles.loadingText}>Verificando sua conta…</Text>
      </Screen>
    );
  }

  if (cloudEmail) {
    const goBackToGame = () => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    };

    return (
      <Screen style={styles.accountPage}>
        <View style={styles.accountSheetHandle} />

        <View style={styles.accountHeader}>
          <View>
            <Text style={styles.accountKicker}>MAGIAFOOT</Text>
            <Text style={styles.accountTitle}>Conta</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>CONECTADO</Text>
          </View>
        </View>

        <View style={styles.connectedCard}>
          <View style={styles.connectedIcon}><Feather name="user" size={27} color="#79ef91" /></View>
          <Text style={styles.connectedTitle}>Sua conta</Text>
          <Text style={styles.connectedEmail}>{cloudEmail}</Text>
          {cloudMagiaId ? (
            <View style={styles.magiaIdBox}>
              <Text style={styles.magiaIdLabel}>MAGIA ID</Text>
              <Text selectable style={styles.magiaId}>{cloudMagiaId}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.accountActions}>
          <Pressable onPress={goBackToGame} style={styles.accountAction}>
            <View style={styles.accountActionSquare}>
              <Feather name="arrow-left" size={25} color="#79ef91" />
            </View>
            <Text style={styles.accountActionLabel}>VOLTAR</Text>
          </Pressable>

          <Pressable onPress={() => router.replace('/career-slots')} style={styles.accountAction}>
            <View style={styles.accountActionSquare}>
              <Feather name="grid" size={25} color="#79ef91" />
            </View>
            <Text style={styles.accountActionLabel}>CARREIRAS</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await signOutCloud();
              router.replace('/account-save');
            }}
            style={styles.accountAction}
          >
            <View style={[styles.accountActionSquare, styles.logoutSquare]}>
              <Feather name="log-out" size={25} color="#ff9a9a" />
            </View>
            <Text style={[styles.accountActionLabel, styles.logoutLabel]}>SAIR</Text>
          </Pressable>
        </View>

        <Text style={styles.accountHint}>Use Carreiras para trocar entre os quatro salvamentos. Sair encerra o login salvo neste aparelho.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.page}>
      <View style={styles.logoBox}>
        <Text style={styles.logo}>MAGIA<Text style={styles.logoGreen}>FOOT</Text></Text>
        <Text style={styles.subtitle}>Entre para continuar sua carreira</Text>
      </View>

      <View style={styles.authCard}>
        <View style={styles.tabs}>
          <Pressable onPress={() => { setMode('login'); setConfirmPassword(''); setFormError(null); }} style={[styles.tab, mode === 'login' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>ENTRAR</Text>
          </Pressable>
          <Pressable onPress={() => { setMode('signup'); setFormError(null); }} style={[styles.tab, mode === 'signup' && styles.tabActive]}>
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>CRIAR CONTA</Text>
          </Pressable>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Seu e-mail"
          placeholderTextColor="#63766a"
          style={styles.input}
        />
        <View style={styles.passwordField}>
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (formError) setFormError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showPassword}
            placeholder="Senha com pelo menos 8 caracteres"
            placeholderTextColor="#63766a"
            style={styles.passwordInput}
          />
          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            style={styles.eyeButton}
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Exibir senha'}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9fb2a5" />
          </Pressable>
        </View>

        {mode === 'signup' ? (
          <View style={[styles.passwordField, confirmPassword.length > 0 && password !== confirmPassword && styles.inputError]}>
            <TextInput
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (formError) setFormError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirme sua senha"
              placeholderTextColor="#63766a"
              style={styles.passwordInput}
            />
            <Pressable
              onPress={() => setShowConfirmPassword((value) => !value)}
              style={styles.eyeButton}
              accessibilityLabel={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
            >
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#9fb2a5" />
            </Pressable>
          </View>
        ) : null}

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Pressable onPress={() => setRemember((value) => !value)} style={styles.rememberRow}>
          <View style={[styles.checkbox, remember && styles.checkboxOn]}>
            {remember ? <Feather name="check" size={14} color="#07150d" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rememberTitle}>Manter login salvo</Text>
            <Text style={styles.rememberText}>Na próxima vez, o MagiaFoot abre direto na escolha da carreira.</Text>
          </View>
        </Pressable>

        <Pressable
          disabled={
            busy ||
            !email.trim() ||
            password.length < 8 ||
            (mode === 'signup' && (confirmPassword.length < 8 || password !== confirmPassword))
          }
          onPress={submit}
          style={[
            styles.primaryButton,
            (
              busy ||
              !email.trim() ||
              password.length < 8 ||
              (mode === 'signup' && (confirmPassword.length < 8 || password !== confirmPassword))
            ) && styles.disabled,
          ]}
        >
          <Feather name={mode === 'signup' ? 'user-plus' : 'log-in'} size={17} color="#07150d" />
          <Text style={styles.primaryText}>
            {busy ? 'AGUARDE…' : mode === 'signup' ? 'CRIAR CONTA' : 'ENTRAR'}
          </Text>
        </Pressable>

        {mode === 'signup' ? (
          <Text style={styles.helpText}>Você receberá um e-mail de confirmação antes do primeiro acesso.</Text>
        ) : null}
        {cloudStatus === 'error' || cloudMessage ? <Text style={styles.message}>{cloudMessage}</Text> : null}
      </View>

      <Text style={styles.securityText}>Conta protegida • Save em nuvem • Até 4 carreiras por login</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#07150d', paddingHorizontal: 24, paddingTop: 54, paddingBottom: 36, gap: 26 },
  centered: { backgroundColor: '#07150d', minHeight: 520, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9fb2a5', fontSize: 11, marginTop: 10 },
  logoBox: { alignItems: 'center', gap: 7, marginTop: 18 },
  logo: { color: '#f5f7f5', fontSize: 42, lineHeight: 46, fontWeight: '900', letterSpacing: -1.8 },
  logoGreen: { color: '#79ef91' },
  subtitle: { color: '#8fa497', fontSize: 12, textAlign: 'center' },
  authCard: { borderWidth: 1, borderColor: '#31513d', borderRadius: 22, backgroundColor: '#0b2117', padding: 18, gap: 13 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: '#31513d', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10291d' },
  tabActive: { borderColor: '#79ef91', backgroundColor: '#173b28' },
  tabText: { color: '#83968a', fontSize: 8, fontWeight: '900', letterSpacing: 0.55 },
  tabTextActive: { color: '#79ef91' },
  input: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#07150d', color: '#ffffff', paddingHorizontal: 13, fontSize: 12 },
  passwordField: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#07150d', flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, minHeight: 48, color: '#ffffff', paddingLeft: 13, paddingRight: 8, fontSize: 12 },
  eyeButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: '#d96b6b' },
  formError: { color: '#ff9a9a', fontSize: 8, lineHeight: 12, textAlign: 'center', fontWeight: '700' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#587061', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#79ef91', borderColor: '#79ef91' },
  rememberTitle: { color: '#f0f5f1', fontSize: 10, fontWeight: '800' },
  rememberText: { color: '#7e9285', fontSize: 7.5, lineHeight: 11, marginTop: 2 },
  primaryButton: { minHeight: 50, borderRadius: 13, backgroundColor: '#79ef91', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#07150d', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.3 },
  disabled: { opacity: 0.48 },
  secondaryButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#153426', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { color: '#dce8df', fontSize: 8.5, fontWeight: '900' },
  helpText: { color: '#7f9487', fontSize: 7.5, lineHeight: 11, textAlign: 'center' },
  message: { color: '#c5d4ca', fontSize: 8, lineHeight: 12, textAlign: 'center' },
  securityText: { color: '#64796c', fontSize: 7.5, textAlign: 'center', letterSpacing: 0.25 },
  connectedCard: { borderWidth: 1, borderColor: '#31513d', borderRadius: 22, backgroundColor: '#0b2117', padding: 20, gap: 10, alignItems: 'center' },
  connectedIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#153426' },
  connectedTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  connectedEmail: { color: '#aebfb4', fontSize: 10.5 },
  magiaId: { color: '#79ef91', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  accountPage: { backgroundColor: '#07150d', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, gap: 18 },
  accountSheetHandle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 99, backgroundColor: '#31513d', marginBottom: 2 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  accountKicker: { color: '#79ef91', fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  accountTitle: { color: '#f5f7f5', fontSize: 28, fontWeight: '900', marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#315f3f', backgroundColor: '#10291d', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#79ef91' },
  onlineText: { color: '#79ef91', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  magiaIdBox: { width: '100%', borderRadius: 12, backgroundColor: '#07150d', borderWidth: 1, borderColor: '#264937', padding: 11, alignItems: 'center', gap: 4 },
  magiaIdLabel: { color: '#708579', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  accountActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  accountAction: { flex: 1, alignItems: 'center', gap: 7 },
  accountActionSquare: { width: '100%', aspectRatio: 1, maxHeight: 112, borderRadius: 20, borderWidth: 1, borderColor: '#31513d', backgroundColor: '#0b2117', alignItems: 'center', justifyContent: 'center' },
  accountActionLabel: { color: '#dce8df', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },
  logoutSquare: { borderColor: '#593536', backgroundColor: '#211616' },
  logoutLabel: { color: '#ff9a9a' },
  accountHint: { color: '#6f8377', fontSize: 7.5, lineHeight: 11, textAlign: 'center', paddingHorizontal: 18 },
});
