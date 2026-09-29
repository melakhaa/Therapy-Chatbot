import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { apiLogin, clearAuthSync } from '@prototype/api-client';
import { T, F, Neu, FACE } from '../constants/sajiwa';

// Bolder depth for the hero only, same recipe as the mobile login stage
const DISC = '-16px -16px 32px rgba(255,255,255,0.95), 16px 16px 34px rgba(122,134,168,0.55)';
const WELL = 'inset 12px 12px 24px rgba(122,134,168,0.55), inset -12px -12px 24px rgba(255,255,255,0.95)';
const SLAB = '-12px -12px 26px rgba(255,255,255,0.95), 12px 12px 28px rgba(122,134,168,0.5)';

const DEMO_ACCOUNTS = [
  { label: 'Akun Admin', icon: 'admin-panel-settings', email: 'admin@example.com', password: 'admin1234' },
  { label: 'Akun Konselor', icon: 'support-agent', email: 'konselor@example.com', password: 'konselor1234' },
] as const;

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin({ email: email.trim(), password });
      const role = data.user.role;
      if (role === 'admin' || role === 'pemangku_jabatan' || role === 'konselor') {
        // Token already saved by apiLogin; a full reload lets the root layout pick it up
        if (typeof window !== 'undefined') window.location.href = '/(dashboard)';
        else router.replace('/(dashboard)');
      } else {
        clearAuthSync(); // a student token must not linger in the staff portal
        setError('Portal ini khusus konselor dan admin. Mahasiswa masuk lewat aplikasi Sajiwa.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const D = wide ? 300 : 220; // stage diameter
  const RIM = Math.round(D * 0.09);
  const W = D - RIM * 2;
  const LIFT = Math.round(D * 0.3);

  return (
    <View style={s.root}>
      <View style={[s.split, !wide && { flexDirection: 'column', gap: 28 }]}>
        {/* Hero: the companion climbing out of its portal, as on mobile */}
        <View style={[s.hero, !wide && { alignItems: 'center' }]}>
          <View style={{ width: D, height: D + LIFT, alignSelf: wide ? 'flex-start' : 'center' }}>
            <View style={[s.disc, { width: D, height: D, borderRadius: D / 2 }]}>
              <View style={{ width: W, height: W, borderRadius: W / 2, backgroundColor: T.bg, boxShadow: WELL }} />
            </View>
            <View
              style={{
                position: 'absolute', left: RIM, bottom: RIM, width: W, height: W + LIFT, overflow: 'hidden',
                borderBottomLeftRadius: W / 2, borderBottomRightRadius: W / 2, alignItems: 'center', justifyContent: 'flex-end',
              }}
            >
              <Image source={FACE.menyapa} style={{ width: W * 1.34, height: W * 1.34 }} resizeMode="contain" />
            </View>
            <View style={[s.bubble, { left: D * 0.7 }]}>
              <Text style={s.bubbleText}>Selamat bertugas hari ini!</Text>
            </View>
          </View>

          <Text style={[s.heroTitle, !wide && { textAlign: 'center' }]}>Ruang kerja konselor Sajiwa</Text>
          <Text style={[s.heroSub, !wide && { textAlign: 'center' }]}>
            Pantau sesi konseling, atur jadwal, dan tanggapi mahasiswa yang butuh bantuan.
          </Text>
        </View>

        {/* Form on a raised slab */}
        <View style={s.card}>
          <View style={s.brandRow}>
            <Image source={require('../assets/images/logo.png')} style={s.logo} resizeMode="contain" />
            <Text style={s.brandName}>Sajiwa</Text>
          </View>
          <Text style={s.title}>Masuk ke portal</Text>
          <Text style={s.subtitle}>Khusus konselor, admin, dan pemangku jabatan.</Text>

          <Text style={s.fieldLabel}>Email</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="mail-outline" size={20} color={T.sub} />
            <TextInput
              style={s.input}
              placeholder="nama@undip.ac.id"
              placeholderTextColor={T.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <Text style={s.fieldLabel}>Kata sandi</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="lock-outline" size={20} color={T.sub} />
            <TextInput
              style={s.input}
              placeholder="Minimal 8 karakter"
              placeholderTextColor={T.muted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPass(!showPass)} accessibilityLabel={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color={T.sub} />
            </Pressable>
          </View>

          {error && (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={T.coral} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          <Pressable
            style={(state: any) => [s.btn, state.pressed && { boxShadow: Neu.inset }, (loading || !email || !password) && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Masuk</Text>}
          </Pressable>

          {/* Dev only: one-tap fill for the seeded accounts (apps/backend/scripts/seed_dev_users.py) */}
          {__DEV__ && (
            <View style={s.demoRow}>
              {DEMO_ACCOUNTS.map((a) => (
                <Pressable
                  key={a.email}
                  onPress={() => { setEmail(a.email); setPassword(a.password); setError(null); }}
                  style={(state: any) => [s.demoBtn, state.hovered && { boxShadow: Neu.raised }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Isi akun demo ${a.label}`}
                >
                  <MaterialIcons name={a.icon} size={16} color={T.primary} />
                  <Text style={s.demoTxt}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  split: { width: '100%', maxWidth: 1040, flexDirection: 'row', alignItems: 'center', gap: 64 },

  hero: { flex: 1, gap: 14 },
  disc: { position: 'absolute', bottom: 0, backgroundColor: T.bg, boxShadow: DISC, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    position: 'absolute', top: 0, width: 190, backgroundColor: T.bg, boxShadow: Neu.raisedSm,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20, fontFamily: F.bold, color: T.ink },
  heroTitle: { fontSize: 34, lineHeight: 42, fontFamily: F.extrabold, color: T.ink, letterSpacing: -1, marginTop: 18, maxWidth: 520 },
  heroSub: { fontSize: 16, lineHeight: 24, fontFamily: F.medium, color: T.sub, maxWidth: 460 },

  card: { width: '100%', maxWidth: 420, padding: 32, borderRadius: 32, backgroundColor: T.bg, boxShadow: SLAB, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  logo: { width: 26, height: 26 },
  brandName: { fontSize: 16, fontFamily: F.extrabold, color: T.primary },
  title: { fontSize: 26, fontFamily: F.extrabold, color: T.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, fontFamily: F.medium, color: T.sub, marginTop: 4, marginBottom: 24 },

  fieldLabel: { fontSize: 13, fontFamily: F.bold, color: T.ink, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 16, marginBottom: 18,
    borderRadius: 16, backgroundColor: T.bg, boxShadow: Neu.inset,
  },
  input: { flex: 1, height: '100%', fontSize: 15, fontFamily: F.medium, color: T.ink, outlineStyle: 'none' as any },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 16,
    backgroundColor: 'rgba(217,103,78,0.12)',
  },
  errorTxt: { flex: 1, fontSize: 13, fontFamily: F.semibold, color: T.coral },

  btn: {
    height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 4,
    backgroundColor: T.primary, boxShadow: '6px 8px 18px rgba(38,53,110,0.35)',
  },
  btnTxt: { color: T.onPrimary, fontSize: 16, fontFamily: F.bold },

  demoRow: { flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, backgroundColor: T.bg, boxShadow: Neu.raisedSm,
  },
  demoTxt: { fontSize: 13, fontFamily: F.semibold, color: T.primary },
});
