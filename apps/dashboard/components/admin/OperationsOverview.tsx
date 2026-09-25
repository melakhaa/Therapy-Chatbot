import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetAccounts, apiGetDashboard } from '@/services/adminData';
import { apiGetAttention, apiGetOrganizationSchedules } from '@/services/operationsData';
import { useAdminResource } from '@/hooks/useAdminResource';
import { Button, Card, ErrorState, LoadingState, Page, formatDate, ui } from '@/components/ui';
import { DistributionBars, Eyebrow, OperationalMetric, SectionHeader, SignalCard } from './OperationsUI';
import { WeeklyChart } from './AssessmentCharts';

export default function OperationsOverview() {
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
  return <Page title="Operations Overview" subtitle="What is happening in Sanctuary now, and what needs administrator attention?" action={<Button label="Refresh workspace" icon="refresh" tone="quiet" onPress={refresh} />}>
    <View style={{ gap: 5 }}><Eyebrow>ADMIN OPERATIONS COMMAND CENTER</Eyebrow><Text style={[ui.muted, { fontSize: 11 }]}>Updated from the latest authorized records · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : data && <>
      <View style={ui.grid}>
        <OperationalMetric label="Registered students" value={studentCount ?? '—'} note="Accounts with student role" icon="school" />
        <OperationalMetric label="Assessment submissions" value={data.total_assessments} note="Results, not unique students" icon="assignment" tone="purple" />
        <OperationalMetric label="Elevated recorded results" value={data.severity_distribution.severe} note="Stored severe classification" icon="monitor-heart" tone="amber" />
        <OperationalMetric label="Unread safety signals" value={safety} note="Guardrail events; content hidden" icon="health-and-safety" tone="red" />
        <OperationalMetric label="Pending bookings" value={pending} note="Latest accessible pending sample" icon="event-note" tone="blue" />
      </View>

      <SectionHeader title="Attention required" description="Assessment and safety signals are kept separate. Neither is presented as a diagnosis." action={<Button label="Open monitoring" tone="quiet" onPress={() => router.push('/attention' as Href)} />} />
      <View style={ui.grid}>
        <View style={[ui.column, { flexBasis: 520 }]}><Card title="Unread operational signals" subtitle={`${assessmentSignals} assessment · ${safety} safety`}>
          <View style={{ gap: 10 }}>{(attention.data?.signals || []).slice(0, 4).map(item => <SignalCard key={item.log_id} type={item.signal_type} title={item.signal_type === 'safety' ? 'Safety Guardrail event' : 'Elevated assessment signal'} detail={item.nama || 'Identity unavailable'} meta={`${item.nim || 'No NIM'} · ${formatDate(item.notified_at)}`} action={item.user_id ? <Button label="View" tone="quiet" onPress={() => router.push(('/students/' + item.user_id) as Href)} /> : undefined} />)}{!attention.data?.signals.length && <Text style={ui.muted}>No unread signals require attention.</Text>}</View>
        </Card></View>
        <View style={[ui.column, { flexBasis: 360 }]}><Card title="Assessment snapshot" subtitle="Recorded classifications · all available data"><DistributionBars values={[
          { label: 'Minimal', value: data.severity_distribution.minimal }, { label: 'Mild', value: data.severity_distribution.mild },
          { label: 'Moderate', value: data.severity_distribution.moderate }, { label: 'Severe', value: data.severity_distribution.severe },
        ]} /><Button label="Review assessments" tone="quiet" onPress={() => router.push('/assessments' as Href)} /></Card></View>
      </View>

      <SectionHeader title="Activity & counseling operations" description="Submission activity and upcoming schedule capacity." />
      <View style={ui.grid}>
        <View style={[ui.column, { flexBasis: 520 }]}><WeeklyChart data={data} /></View>
        <View style={[ui.column, { flexBasis: 360 }]}><Card title="Upcoming schedule" subtitle="Organization-wide slots available to the administrator"><View style={{ gap: 10 }}>{upcoming.map(slot => <SignalCard key={slot.jadwal_id} type="booking" title={`${formatDate(slot.tanggal)} · ${slot.waktu_mulai.slice(0, 5)}`} detail={slot.counselor_name} meta={`${slot.waktu_mulai.slice(0, 5)}–${slot.waktu_selesai.slice(0, 5)} · ${slot.booking_status || slot.status}`} />)}{!upcoming.length && <Text style={ui.muted}>No upcoming schedule records.</Text>}</View><Button label="Open schedule" tone="quiet" onPress={() => router.push('/schedule' as Href)} /></Card></View>
      </View>
    </>}
  </Page>;
}
