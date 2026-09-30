import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetDashboard, apiGetAccounts } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { canManageUsers, useAdminProfile } from './AdminAuth';
import { SeverityChart, WeeklyChart } from './AssessmentCharts';
import { Button, Card, DataTable, ErrorState, LoadingState, Page, StatCard, formatDate, ui, Notice } from '@/components/ui';
export default function DashboardSummary({ analytics = false }: { analytics?: boolean }) {
  const profile = useAdminProfile();
  const dashboard = useAdminResource(apiGetDashboard);
  const accounts = useAdminResource(apiGetAccounts, canManageUsers(profile));
  const data = dashboard.data;
  const names = new Map(accounts.data?.users.map(u => [u.user_id, u.nama]));
  const title = analytics ? 'Analytics' : 'Selamat datang, ' + profile.nama.split(' ')[0];
  return <Page title={title} subtitle={analytics ? 'Ringkasan data asesmen yang tercatat di Sanctuary.' : 'Pantau asesmen dan dukung kesejahteraan komunitas kampus.'} action={<Button label="Perbarui" icon="refresh" tone="quiet" onPress={() => { dashboard.reload(); accounts.reload(); }} />}>
    {dashboard.loading ? <LoadingState /> : dashboard.error ? <ErrorState message={dashboard.error} retry={dashboard.reload} /> : data && <>
      <View style={ui.grid}>
        {canManageUsers(profile) && <StatCard label="Mahasiswa terdaftar" value={accounts.loading ? '…' : accounts.error ? '—' : accounts.data?.users.filter(u => u.role === 'mahasiswa').length ?? 0} icon="school" note="Akun dengan peran mahasiswa" />}
        <StatCard label="Total asesmen" value={data.total_assessments} icon="assignment" tone="purple" note="Seluruh hasil yang tercatat" />
        <StatCard label="Asesmen severe" value={data.severity_distribution.severe} icon="warning-amber" tone="red" note="Hasil asesmen, bukan jumlah mahasiswa" />
        <StatCard label="Pemicu guardrail" value={data.guardrail_trigger_count} icon="shield" tone="blue" note="Jumlah kejadian yang tercatat" />
      </View>
      {accounts.error && <ErrorState message={accounts.error} retry={accounts.reload} />}
      <View style={ui.grid}><View style={ui.column}><SeverityChart data={data} /></View><View style={ui.column}><WeeklyChart data={data} /></View></View>
      {analytics ? <Notice>Distribusi menghitung hasil asesmen, bukan mahasiswa unik. Tingkat keparahan mengikuti klasifikasi aplikasi yang tersimpan; grafik mingguan menunjukkan jumlah pengiriman, bukan skor stres.</Notice> : <View style={ui.grid}>
        <View style={ui.column}><Card title="Asesmen severe terbaru" subtitle="Maksimal 10 hasil terbaru" action={<Button label="Lihat semua" tone="quiet" onPress={() => router.push('/risk' as Href)} />}>
          <DataTable rows={data.recent_severe} rowKey={r => r.assessment_id} columns={[
            { title: 'Mahasiswa / ID', width: 160, render: r => <Text style={ui.text}>{names.get(r.user_id) || r.user_id.slice(0, 8)}</Text> },
            { title: 'Skor', width: 55, render: r => <Text style={ui.text}>{r.score}</Text> },
            { title: 'Tanggal', width: 100, render: r => <Text style={ui.muted}>{formatDate(r.taken_at)}</Text> },
            { title: 'Tindakan', width: 80, render: r => <Button label="Tinjau" tone="quiet" onPress={() => router.push(('/students/' + r.user_id) as Href)} /> },
          ]} />
        </Card></View>
        <View style={ui.column}><Card title="Booking menunggu" subtitle="Maksimal 10 booking yang dapat Anda akses" action={<Button label="Konseling" tone="quiet" onPress={() => router.push('/counseling' as Href)} />}>
          <DataTable rows={data.pending_bookings} rowKey={r => r.booking_id} columns={[
            { title: 'Mahasiswa / ID', width: 150, render: r => <Text style={ui.text}>{names.get(r.user_id) || r.user_id.slice(0, 8)}</Text> },
            { title: 'Dibuat', width: 110, render: r => <Text style={ui.muted}>{formatDate(r.created_at)}</Text> },
          ]} />
          <Text style={ui.muted}>Tanggal di atas adalah waktu pemesanan, bukan jadwal sesi. Daftar ini tidak mewakili total booking.</Text>
        </Card></View>
      </View>}
    </>}
  </Page>;
}
