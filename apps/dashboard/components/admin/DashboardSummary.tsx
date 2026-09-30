import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetDashboard, apiGetAccounts } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { canManageUsers, useAdminProfile } from './AdminAuth';
import { SeverityChart, WeeklyChart } from './AssessmentCharts';
import { Button, Card, DataTable, ErrorState, LoadingState, Page, StatCard, formatDate, ui, Notice } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';
export default function DashboardSummary({ analytics = false }: { analytics?: boolean }) {
  const { language } = useAdminExperience(); const id = language === 'id';
  const profile = useAdminProfile();
  const dashboard = useAdminResource(apiGetDashboard);
  const accounts = useAdminResource(apiGetAccounts, canManageUsers(profile));
  const data = dashboard.data;
  const names = new Map(accounts.data?.users.map(u => [u.user_id, u.nama]));
  const title = analytics ? 'Analytics' : (id ? 'Selamat datang, ' : 'Welcome, ') + profile.nama.split(' ')[0];
  return <Page title={title} subtitle={analytics ? (id ? 'Ringkasan data asesmen yang tercatat di Sanctuary.' : 'Summary of assessment data recorded in Sanctuary.') : (id ? 'Pantau asesmen dan dukung kesejahteraan komunitas kampus.' : 'Monitor assessments and support campus community wellbeing.')} action={<Button label={id ? 'Perbarui' : 'Refresh'} icon="refresh" tone="quiet" onPress={() => { dashboard.reload(); accounts.reload(); }} />}>
    {dashboard.loading ? <LoadingState /> : dashboard.error ? <ErrorState message={dashboard.error} retry={dashboard.reload} /> : data && <>
      <View style={ui.grid}>
        {canManageUsers(profile) && <StatCard label={id ? 'Mahasiswa terdaftar' : 'Registered students'} value={accounts.loading ? '…' : accounts.error ? '—' : accounts.data?.users.filter(u => u.role === 'mahasiswa').length ?? 0} icon="school" note={id ? 'Akun dengan peran mahasiswa' : 'Accounts with student role'} />}
        <StatCard label={id ? 'Total asesmen' : 'Total assessments'} value={data.total_assessments} icon="assignment" tone="purple" note={id ? 'Seluruh hasil yang tercatat' : 'All recorded results'} />
        <StatCard label={id ? 'Asesmen severe' : 'Severe assessments'} value={data.severity_distribution.severe} icon="warning-amber" tone="red" note={id ? 'Hasil asesmen, bukan jumlah mahasiswa' : 'Results, not unique students'} />
        <StatCard label={id ? 'Pemicu guardrail' : 'Guardrail triggers'} value={data.guardrail_trigger_count} icon="shield" tone="blue" note={id ? 'Jumlah kejadian yang tercatat' : 'Number of recorded events'} />
      </View>
      {accounts.error && <ErrorState message={accounts.error} retry={accounts.reload} />}
      <View style={ui.grid}><View style={ui.column}><SeverityChart data={data} /></View><View style={ui.column}><WeeklyChart data={data} /></View></View>
      {analytics ? <Notice>{id ? 'Distribusi menghitung hasil asesmen, bukan mahasiswa unik. Grafik mingguan menunjukkan jumlah pengiriman, bukan skor stres.' : 'Distribution counts assessment results, not unique students. The weekly chart shows submission counts, not stress scores.'}</Notice> : <View style={ui.grid}>
        <View style={ui.column}><Card title={id ? 'Asesmen severe terbaru' : 'Recent severe assessments'} subtitle={id ? 'Maksimal 10 hasil terbaru' : 'Up to 10 recent results'} action={<Button label={id ? 'Lihat semua' : 'View all'} tone="quiet" onPress={() => router.push('/risk' as Href)} />}>
          <DataTable rows={data.recent_severe} rowKey={r => r.assessment_id} columns={[
            { title: id ? 'Mahasiswa / ID' : 'Student / ID', width: 160, render: r => <Text style={ui.text}>{names.get(r.user_id) || r.user_id.slice(0, 8)}</Text> },
            { title: id ? 'Skor' : 'Score', width: 55, render: r => <Text style={ui.text}>{r.score}</Text> },
            { title: id ? 'Tanggal' : 'Date', width: 100, render: r => <Text style={ui.muted}>{formatDate(r.taken_at)}</Text> },
            { title: id ? 'Tindakan' : 'Action', width: 80, render: r => <Button label={id ? 'Tinjau' : 'Review'} tone="quiet" onPress={() => router.push(('/students/' + r.user_id) as Href)} /> },
          ]} />
        </Card></View>
        <View style={ui.column}><Card title={id ? 'Booking menunggu' : 'Pending bookings'} subtitle={id ? 'Maksimal 10 booking yang dapat Anda akses' : 'Up to 10 bookings you can access'} action={<Button label="Counseling" tone="quiet" onPress={() => router.push('/counseling' as Href)} />}>
          <DataTable rows={data.pending_bookings} rowKey={r => r.booking_id} columns={[
             { title: id ? 'Mahasiswa / ID' : 'Student / ID', width: 150, render: r => <Text style={ui.text}>{names.get(r.user_id) || r.user_id.slice(0, 8)}</Text> },
             { title: id ? 'Dibuat' : 'Created', width: 110, render: r => <Text style={ui.muted}>{formatDate(r.created_at)}</Text> },
          ]} />
          <Text style={ui.muted}>{id ? 'Tanggal di atas adalah waktu pemesanan, bukan jadwal sesi. Daftar ini tidak mewakili total booking.' : 'The dates above are booking times, not session schedules. This list does not represent all bookings.'}</Text>
        </Card></View>
      </View>}
    </>}
  </Page>;
}
