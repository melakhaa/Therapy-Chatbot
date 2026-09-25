import React from 'react';
import { Text, View } from 'react-native';
import { useAdminProfile, useLogout } from './AdminAuth';
import { Eyebrow, LabelValue, SectionHeader } from './OperationsUI';
import { BackendPending, SegmentedControl } from './ProductPrimitives';
import { useAdminExperience } from './AdminExperience';
import { Avatar, Badge, Button, Card, Notice, Page, formatDate, ui } from '@/components/ui';

export default function SettingsV2() {
  const user = useAdminProfile(); const logout = useLogout();
  const { language, setLanguage, themeMode, setThemeMode } = useAdminExperience(); const id = language === 'id';
  return <Page title={id ? 'Pengaturan' : 'Settings'} subtitle={id ? 'Preferensi tampilan lokal, identitas administrator, dan informasi sistem.' : 'Local display preferences, administrator identity, and system information.'}>
    <View style={ui.grid}>
      <View style={[ui.column, { flexBasis: 430 }]}><Card><SectionHeader title={id ? 'Tampilan' : 'Appearance'} description={id ? 'Tema tersimpan hanya pada perangkat ini.' : 'Theme is stored on this device only.'} /><SegmentedControl value={themeMode} onChange={value => setThemeMode(value as 'light'|'dark'|'system')} options={[{ value:'light',label:id?'Terang':'Light',icon:'light-mode'},{value:'dark',label:id?'Gelap':'Dark',icon:'dark-mode'},{value:'system',label:id?'Sistem':'System',icon:'brightness-auto'}]} /></Card></View>
      <View style={[ui.column, { flexBasis: 430 }]}><Card><SectionHeader title={id ? 'Bahasa' : 'Language'} description={id ? 'Laporan formal tetap menggunakan Bahasa Indonesia.' : 'Formal reports remain in Indonesian.'} /><SegmentedControl value={language} onChange={value => setLanguage(value as 'id'|'en')} options={[{value:'id',label:'Bahasa Indonesia'},{value:'en',label:'English'}]} /></Card></View>
    </View>
    <View style={ui.grid}><View style={[ui.column, { flexBasis: 470 }]}><Card><SectionHeader title={id ? 'Profil administrator' : 'Administrator profile'} description={id ? 'Identitas dari endpoint profil terautentikasi.' : 'Identity from the authenticated profile endpoint.'} /><View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={user.nama} /><View style={{ flex: 1 }}><Eyebrow>ADMINISTRATOR</Eyebrow><Text style={[ui.heading, { fontSize: 18 }]}>{user.nama}</Text><Text style={ui.muted}>{user.email}</Text></View><Badge value={user.role} /></View><View style={ui.grid}><LabelValue label={id ? 'Terdaftar' : 'Registered'} value={formatDate(user.created_at)} /><LabelValue label="Account ID" value={user.user_id.slice(0, 8)} /></View></Card></View>
    <View style={[ui.column, { flexBasis: 350 }]}><Card title={id ? 'Sesi & keamanan' : 'Session & security'}><Text style={ui.text}>{id ? 'Keluar menghapus sesi login yang tersimpan pada aplikasi normal.' : 'Signing out removes the stored normal-application login session.'}</Text><Button label={false ? (id ? 'Kembali ke login preview' : 'Return to preview login') : (id ? 'Keluar dengan aman' : 'Sign out securely')} icon="logout" tone="quiet" onPress={() => { void logout(); }} /></Card></View></View>
    <Card><SectionHeader title={id ? 'Informasi sistem' : 'System information'} /><View style={ui.grid}><LabelValue label="Platform" value="Mental Health Early Warning & Counseling Operations" /><LabelValue label={id ? 'Peran aktif' : 'Active role'} value="Administrator" /><LabelValue label={id ? 'Cakupan asesmen' : 'Assessment scope'} value="DASS-21 Stress Subscale" /><LabelValue label={id ? 'Sumber data' : 'Data source'} value={false ? (id ? 'Preview lokal sintetis' : 'Local synthetic preview') : 'Authenticated API'} /></View></Card>
    <BackendPending title={id ? 'Fitur Iteration 3 yang menunggu backend' : 'Iteration 3 features awaiting backend'} detail={id ? 'Metadata akademik, notifikasi persisten, permintaan konseling, ketersediaan berulang, profil konselor lengkap, riwayat janji temu, catatan internal, dan audit laporan rahasia.' : 'Academic metadata, persistent notifications, counseling requests, recurring availability, complete counselor profiles, appointment history, internal notes, and confidential-report auditing.'} />
    <Notice>{id ? 'Tidak ada kontrol palsu untuk ambang asesmen, perilaku AI, kesehatan database, atau konfigurasi klinis.' : 'No fake controls are exposed for assessment thresholds, AI behavior, database health, or clinical configuration.'}</Notice>
  </Page>;
}
