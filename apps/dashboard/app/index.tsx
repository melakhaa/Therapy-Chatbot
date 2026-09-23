import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { ApiError, apiLogin, clearAuth } from '@prototype/api-client';
import { Button, ErrorState, Field, ui } from '@/components/ui';
import { adminTheme as c } from '@/constants/adminTheme';
import { errorMessage } from '@/hooks/useAdminResource';
export default function LoginScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Static export and the first browser render must use the same layout.
  const width = hydrated ? viewportWidth : 0;
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const login = async () => {
    if (busy) return;
    if (!email.trim() || !password) { setError('Isi email dan kata sandi.'); return; }
    setBusy(true); setError(null);
    try {
      const data = await apiLogin({ email: email.trim(), password });
      if (data.user.role === 'mahasiswa') { await clearAuth(); setError('Portal admin hanya tersedia untuk admin, konselor, dan pemangku jabatan.'); }
      else { setPassword(''); router.replace('/overview' as Href); }
    } catch (e) { setError(e instanceof ApiError && e.status === 401 ? 'Email atau kata sandi salah.' : errorMessage(e)); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, flexDirection: width >= 850 ? 'row' : 'column' }} keyboardShouldPersistTaps="handled">
      <View style={{ flex: 1, backgroundColor: c.primarySoft, padding: width >= 850 ? 64 : 28, justifyContent: 'center', gap: 24 }}>
        <View style={ui.row}><MaterialIcons name="spa" color={c.primary} size={40} /><Text style={{ color: c.primary, fontSize: 32, fontWeight: '700', letterSpacing: -1 }}>Sanctuary</Text></View>
        <Text style={{ fontSize: width >= 850 ? 38 : 26, color: c.primary, fontWeight: '600', lineHeight: width >= 850 ? 49 : 36 }}>Ruang dukungan.{'\n'}Komunitas yang lebih sehat.</Text>
        <Text style={[ui.text, { maxWidth: 380, color: c.primary }]}>Portal administrasi untuk mendampingi mahasiswa, meninjau asesmen, dan mengelola konseling.</Text>
        {width >= 850 && <View style={{ gap: 18, marginTop: 20 }}>{['Pemantauan asesmen', 'Pengelolaan konseling', 'Akses sesuai peran'].map(t => <View key={t} style={ui.row}><MaterialIcons name="check-circle-outline" color={c.primary} size={19} /><Text style={{ color: c.primary, fontSize: 14 }}>{t}</Text></View>)}</View>}
      </View>
      <View style={{ flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center' }}><View style={{ width: '100%', maxWidth: 390, gap: 22 }}>
        <View style={{ gap: 8 }}><Text style={[ui.muted, { letterSpacing: 2, fontSize: 10 }]}>ADMIN PORTAL</Text><Text accessibilityRole="header" style={ui.title}>Selamat datang kembali</Text><Text style={ui.muted}>Masuk dengan akun Sanctuary Anda.</Text></View>
        <Field label="Email" placeholder="nama@kampus.ac.id" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" editable={!busy} />
        <Field label="Kata sandi" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="current-password" autoCapitalize="none" editable={!busy} onSubmitEditing={() => { void login(); }} />
        <Button label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} tone="quiet" onPress={() => setShow(v => !v)} />
        {error && <ErrorState message={error} />}
        <Button label={busy ? 'Memverifikasi…' : 'Masuk ke dashboard'} disabled={busy} onPress={() => { void login(); }} />
        <Text style={[ui.muted, { textAlign: 'center' }]}>Akses terbatas · Jaga kerahasiaan informasi mahasiswa.</Text>
      </View></View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
