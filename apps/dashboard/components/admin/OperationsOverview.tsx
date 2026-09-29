import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetAccounts, apiGetAttention, apiGetDashboard, apiGetOrganizationSchedules } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { Button, Card, ErrorState, LoadingState, Page, formatDate, ui } from '@/components/ui';
import { DistributionBars, Eyebrow, OperationalMetric, SectionHeader, SignalCard } from './OperationsUI';
import { WeeklyChart } from './AssessmentCharts';
import { useAdminExperience } from './AdminExperience';

export default function OperationsOverview() {
  const { language } = useAdminExperience(); const id = language === 'id';
  const dashboard = useAdminResource(apiGetDashboard);
  const accounts = useAdminResource(apiGetAccounts);
  const attention = useAdminResource(() => apiGetAttention({ unread_only: true }));
  const schedules = useAdminResource(apiGetOrganizationSchedules);
  const refresh = () => { dashboard.reload(); accounts.reload(); attention.reload(); schedules.reload(); };
  const data = dashboard.data;
  const studentCount = accounts.data?.users.filter(user => user.role === 'mahasiswa').length;
  const pending = data?.pending_bookings.length || 0;
  const safety = attention.data?.summary.find(item => item.signal_type === 'safety')?.unread || 0;
  const assessmentSignals = attention.data?.summary.find(item => item.signal_type === 'assessment')?.unread || 0;
  const upcoming = (schedules.data?.schedules || []).filter(item => item.status !== 'selesai' && item.status !== 'dibatalkan').slice(0, 4);
  const loading = dashboard.loading || accounts.loading || attention.loading || schedules.loading;
  const error = dashboard.error || accounts.error || attention.error || schedules.error;
  return <Page title={id ? 'Ringkasan Operasional' : 'Operations Overview'} subtitle={id ? 'Apa yang terjadi di Sanctuary saat ini dan apa yang memerlukan perhatian administrator?' : 'What is happening in Sanctuary now, and what needs administrator attention?'} action={<Button label={id ? 'Muat ulang ruang kerja' : 'Refresh workspace'} icon="refresh" tone="quiet" onPress={refresh} />}>
    <View style={{ gap: 5 }}><Eyebrow>{id ? 'PUSAT KOMANDO OPERASIONAL ADMIN' : 'ADMIN OPERATIONS COMMAND CENTER'}</Eyebrow><Text style={[ui.muted, { fontSize: 11 }]}>{id ? 'Diperbarui dari catatan berwenang terbaru' : 'Updated from the latest authorized records'} · {new Date().toLocaleDateString(id ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : data && <>
      <View style={ui.grid}>
        <OperationalMetric label={id ? 'Mahasiswa terdaftar' : 'Registered students'} value={studentCount ?? '—'} note={id ? 'Akun dengan peran mahasiswa' : 'Accounts with student role'} icon="school" />
        <OperationalMetric label={id ? 'Pengiriman asesmen' : 'Assessment submissions'} value={data.total_assessments} note={id ? 'Hasil, bukan mahasiswa unik' : 'Results, not unique students'} icon="assignment" tone="purple" />
        <OperationalMetric label={id ? 'Hasil tercatat meningkat' : 'Elevated recorded results'} value={data.severity_distribution.severe} note={id ? 'Klasifikasi severe tersimpan' : 'Stored severe classification'} icon="monitor-heart" tone="amber" />
        <OperationalMetric label={id ? 'Sinyal keselamatan belum dibaca' : 'Unread safety signals'} value={safety} note={id ? 'Peristiwa guardrail; konten disembunyikan' : 'Guardrail events; content hidden'} icon="health-and-safety" tone="red" />
        <OperationalMetric label={id ? 'Booking menunggu' : 'Pending bookings'} value={pending} note={id ? 'Sampel menunggu terbaru' : 'Latest accessible pending sample'} icon="event-note" tone="blue" />
      </View>

      <SectionHeader title={id ? 'Memerlukan perhatian' : 'Attention required'} description={id ? 'Sinyal asesmen dan keselamatan dipisahkan. Keduanya tidak disajikan sebagai diagnosis.' : 'Assessment and safety signals are kept separate. Neither is presented as a diagnosis.'} action={<Button label={id ? 'Buka pemantauan' : 'Open monitoring'} tone="quiet" onPress={() => router.push('/attention' as Href)} />} />
      <View style={ui.grid}>
        <View style={[ui.column, { flexBasis: 520 }]}><Card title={id ? 'Sinyal operasional belum dibaca' : 'Unread operational signals'} subtitle={`${assessmentSignals} ${id ? 'asesmen' : 'assessment'} · ${safety} safety`}>
          <View style={{ gap: 10 }}>{(attention.data?.signals || []).slice(0, 4).map(item => <SignalCard key={item.log_id} type={item.signal_type} title={item.signal_type === 'safety' ? 'Safety Guardrail' : (id ? 'Sinyal asesmen meningkat' : 'Elevated assessment signal')} detail={item.nama || (id ? 'Identitas tidak tersedia' : 'Identity unavailable')} meta={`${item.nim || (id ? 'Tanpa NIM' : 'No NIM')} · ${formatDate(item.notified_at)}`} action={item.user_id ? <Button label={id ? 'Lihat' : 'View'} tone="quiet" onPress={() => router.push(('/students/' + item.user_id) as Href)} /> : undefined} />)}{!attention.data?.signals.length && <Text style={ui.muted}>{id ? 'Tidak ada sinyal belum dibaca yang memerlukan perhatian.' : 'No unread signals require attention.'}</Text>}</View>
        </Card></View>
        <View style={[ui.column, { flexBasis: 360 }]}><Card title={id ? 'Cuplikan asesmen' : 'Assessment snapshot'} subtitle={id ? 'Klasifikasi tercatat · semua data tersedia' : 'Recorded classifications · all available data'}><DistributionBars values={[
          { label: 'Minimal', value: data.severity_distribution.minimal }, { label: 'Mild', value: data.severity_distribution.mild },
          { label: 'Moderate', value: data.severity_distribution.moderate }, { label: 'Severe', value: data.severity_distribution.severe },
        ]} /><Button label={id ? 'Tinjau asesmen' : 'Review assessments'} tone="quiet" onPress={() => router.push('/assessments' as Href)} /></Card></View>
      </View>

      <SectionHeader title={id ? 'Aktivitas & operasi konseling' : 'Activity & counseling operations'} description={id ? 'Aktivitas pengiriman dan kapasitas jadwal mendatang.' : 'Submission activity and upcoming schedule capacity.'} />
      <View style={ui.grid}>
        <View style={[ui.column, { flexBasis: 520 }]}><WeeklyChart data={data} /></View>
        <View style={[ui.column, { flexBasis: 360 }]}><Card title={id ? 'Jadwal mendatang' : 'Upcoming schedule'} subtitle={id ? 'Slot lintas organisasi yang tersedia bagi administrator' : 'Organization-wide slots available to the administrator'}><View style={{ gap: 10 }}>{upcoming.map(slot => <SignalCard key={slot.jadwal_id} type="booking" title={`${formatDate(slot.tanggal)} · ${slot.waktu_mulai.slice(0, 5)}`} detail={slot.counselor_name} meta={`${slot.waktu_mulai.slice(0, 5)}–${slot.waktu_selesai.slice(0, 5)} · ${slot.booking_status || slot.status}`} />)}{!upcoming.length && <Text style={ui.muted}>{id ? 'Tidak ada catatan jadwal mendatang.' : 'No upcoming schedule records.'}</Text>}</View><Button label={id ? 'Buka jadwal' : 'Open schedule'} tone="quiet" onPress={() => router.push('/schedule' as Href)} /></Card></View>
      </View>
    </>}
  </Page>;
}
