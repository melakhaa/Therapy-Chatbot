import React from 'react';
import { Text, View } from 'react-native';
import { useLogout, useAdminProfile } from '@/components/admin/AdminAuth';
import { Avatar, Badge, Button, Card, Notice, Page, formatDate, ui } from '@/components/ui';
export default function Settings() {
  const logout = useLogout();
  const user = useAdminProfile();
  return <Page title="Settings" subtitle="Informasi profil dan sesi akun Sanctuary.">
    <View style={ui.grid}><View style={ui.column}><Card title="Profil akun"><View style={ui.row}><Avatar name={user.nama} /><View><Text style={ui.heading}>{user.nama}</Text><Text style={ui.muted}>{user.email}</Text></View></View><Badge value={user.role} /><Text style={ui.text}>Terdaftar: {formatDate(user.created_at)}</Text>{user.nim && <Text style={ui.text}>NIM: {user.nim}</Text>}</Card></View>
    <View style={ui.column}><Card title="Sesi Anda" subtitle="Kelola akses pada perangkat ini"><Text style={ui.text}>Keluar akan menghapus informasi login yang tersimpan pada perangkat ini. Masuk kembali diperlukan untuk membuka portal.</Text><Button label="Keluar dari perangkat ini" icon="logout" tone="quiet" onPress={() => { void logout(); }} /></Card></View></View>
    <Card title="Konfigurasi sistem"><Notice>Pengaturan notifikasi, konfigurasi asesmen, dan pemantauan kesehatan layanan belum tersedia. Halaman ini tidak menyimpan preferensi sistem.</Notice></Card>
  </Page>;
}
