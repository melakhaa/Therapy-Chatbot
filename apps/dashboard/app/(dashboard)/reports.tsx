import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { apiGetAnalytics } from '@/services/operationsData';
import { useAdminResource } from '@/hooks/useAdminResource';
import { WeeklyChart } from '@/components/admin/AssessmentCharts';
import { DistributionBars, MethodologyNote, OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { AcademicScopeControl, type AcademicScope, BackendPending, SegmentedControl } from '@/components/admin/ProductPrimitives';
import { useAdminExperience } from '@/components/admin/AdminExperience';
import { Button, Card, ErrorState, Field, LoadingState, Notice, Page, ui } from '@/components/ui';
import type { DashboardData } from '@prototype/api-client';

export default function AnalyticsReports() {
  const { language } = useAdminExperience(); const id = language === 'id';
  const [from, setFrom] = useState('2026-09-01'), [to, setTo] = useState('2026-09-30'), [applied, setApplied] = useState({ from: '2026-09-01', to: '2026-09-30' });
  const [scope, setScope] = useState<AcademicScope>({ facultyId: '', departmentId: '' }), [mode, setMode] = useState('aggregate'), [confirm, setConfirm] = useState(false), [validation, setValidation] = useState('');
  const loader = useCallback(() => apiGetAnalytics(applied.from, applied.to), [applied]);
  const resource = useAdminResource(loader); const data = resource.data;
  const chartData = useMemo<DashboardData | null>(() => data ? { total_assessments: data.assessment_total, severity_distribution: { minimal: 0, mild: 0, moderate: 0, severe: 0, ...Object.fromEntries(data.severity_distribution.map(item => [item.severity, item.count])) }, weekly_trend: data.assessment_trend, recent_severe: [], guardrail_trigger_count: 0, pending_bookings: [] } : null, [data]);
  const apply = () => { if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) { setValidation(id ? 'Gunakan periode YYYY-MM-DD yang valid.' : 'Use a valid YYYY-MM-DD reporting period.'); return; } setValidation(''); setApplied({ from, to }); };
  const openReport = () => {
    apply();
    if (mode === 'confidential' && !confirm) { setValidation(id ? 'Konfirmasi kewajiban kerahasiaan sebelum membuka laporan.' : 'Confirm confidentiality before opening the report.'); return; }
    const query = new URLSearchParams({ from, to, mode, faculty: scope.facultyId, department: scope.departmentId }).toString();
    if (Platform.OS === 'web') window.open('/report-preview?' + query, '_blank', 'noopener,noreferrer');
  };
  const severity = Object.fromEntries(data?.severity_distribution.map(item => [item.severity, item.count]) || []);
  const scopeLabel = scope.departmentId ? (id ? 'Departemen terpilih (preview)' : 'Selected department (preview)') : scope.facultyId ? (id ? 'Fakultas terpilih (preview)' : 'Selected faculty (preview)') : (id ? 'Universitas' : 'University');

  return <Page title={id ? 'Analitik & Laporan' : 'Analytics & Reports'} subtitle={id ? 'Analisis operasional dan penyusunan laporan institusional dengan batas privasi yang jelas.' : 'Operational analysis and institutional reporting with clear privacy boundaries.'} action={<Button label={id ? 'Buka pratinjau laporan' : 'Open report preview'} icon="description" onPress={openReport} />}>
    <View style={ui.grid}><View style={[ui.column, { flexBasis: 520 }]}><Card><SectionHeader title={id ? 'Konfigurasi laporan' : 'Report configuration'} description={id ? 'Laporan selalu menggunakan Bahasa Indonesia dan tema cetak terang.' : 'Reports always use Indonesian and a fixed light print theme.'} /><View style={ui.row}><Field label={id ? 'Dari' : 'From'} value={from} onChangeText={setFrom} /><Field label={id ? 'Sampai' : 'To'} value={to} onChangeText={setTo} /><Button label={id ? 'Terapkan' : 'Apply'} onPress={apply} /></View><SegmentedControl value={mode} onChange={value => { setMode(value); setConfirm(false); }} options={[{ value: 'aggregate', label: id ? 'Laporan agregat' : 'Aggregate report', icon: 'donut-large' }, { value: 'confidential', label: id ? 'Agregat + perhatian khusus' : 'Aggregate + special attention', icon: 'lock' }]} />
      {mode === 'confidential' && <Notice danger>{id ? 'Mode ini dapat menyertakan identitas terbatas mahasiswa dan harus diperlakukan sebagai dokumen rahasia.' : 'This mode may include limited student identity and must be treated as confidential.'}</Notice>}
      {mode === 'confidential' && <Button label={confirm ? (id ? '✓ Kerahasiaan dikonfirmasi' : '✓ Confidentiality confirmed') : (id ? 'Saya memahami kewajiban kerahasiaan' : 'I understand the confidentiality obligation')} tone={confirm ? 'quiet' : 'danger'} onPress={() => setConfirm(value => !value)} />}
      {mode === 'confidential' && !false && <BackendPending detail={id ? 'Ekspor kasus beridentitas dan audit ekspor belum didukung backend. Laporan produksi hanya akan menjelaskan keterbatasan ini.' : 'Identified-case export and export auditing are not supported by the backend. Production reports will explain this limitation.'} />}{validation && <ErrorState message={validation} />}</Card></View>
      <View style={[ui.column, { flexBasis: 390 }]}><Card><AcademicScopeControl value={scope} onChange={setScope} /><Text style={ui.muted}>{id ? 'Cakupan aktif' : 'Active scope'}: {scopeLabel}</Text></Card></View></View>

    {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : data && chartData && <>
      <View style={ui.grid}><OperationalMetric label={id ? 'Pengiriman asesmen' : 'Assessment submissions'} value={data.assessment_total} note={id ? 'Bukan jumlah mahasiswa unik' : 'Not unique students'} icon="assignment" tone="purple" /><OperationalMetric label={id ? 'Tingkat berat tercatat' : 'Recorded severe'} value={severity.severe || 0} note={id ? 'Klasifikasi yang tersimpan' : 'Stored classification'} icon="monitor-heart" tone="amber" /><OperationalMetric label={id ? 'Booking konseling' : 'Counseling bookings'} value={data.booking_total} note={id ? 'Dalam periode terpilih' : 'Selected period'} icon="event-note" tone="blue" /><OperationalMetric label={id ? 'Mahasiswa terdaftar' : 'Registered students'} value={data.registered_students} note={id ? 'Jumlah akun saat ini' : 'Current account count'} icon="school" /></View>
      <View style={ui.grid}><View style={[ui.column, { flexBasis: 540 }]}><WeeklyChart data={chartData} /></View><View style={[ui.column, { flexBasis: 360 }]}><Card title={id ? 'Distribusi tingkat stres tercatat' : 'Recorded stress distribution'} subtitle={id ? 'Periode laporan' : 'Reporting period'}><DistributionBars values={[{ label: 'Minimal', value: severity.minimal || 0 }, { label: 'Mild', value: severity.mild || 0 }, { label: 'Moderate', value: severity.moderate || 0 }, { label: 'Severe', value: severity.severe || 0 }]} /></Card></View></View>
      <View style={ui.grid}><View style={ui.column}><Card title={id ? 'Utilisasi konseling' : 'Counseling utilization'}><DistributionBars values={data.booking_status.map(item => ({ label: item.status, value: item.count }))} /></Card></View><View style={ui.column}><Card title={id ? 'Cakupan akademik' : 'Academic breakdown'}><BackendPending detail={id ? 'API produksi belum menyediakan Fakultas atau Departemen.' : 'The production API does not provide Faculty or Department metadata.'} /></Card></View></View>
      <Card><SectionHeader title={id ? 'Laporan pemangku kepentingan' : 'Stakeholder report'} description={id ? 'Dokumen A4 terpisah dari antarmuka dashboard.' : 'A4 document separate from the dashboard interface.'} action={<Button label={id ? 'Buka laporan formal' : 'Open formal report'} icon="open-in-new" onPress={openReport} />} /><Text style={ui.text}>{id ? 'Struktur mencakup halaman sampul, identitas laporan, ringkasan eksekutif, statistik, tren, cakupan akademik, konseling, metodologi, dan pernyataan kerahasiaan.' : 'Includes cover, report identity, executive summary, statistics, trends, academic scope, counseling, methodology, and confidentiality statement.'}</Text></Card>
      <MethodologyNote>{id ? 'Jumlah asesmen adalah jumlah pengiriman, bukan mahasiswa unik. Antarmuka menampilkan klasifikasi stres yang tersimpan tanpa menghitung ulang atau membuat diagnosis.' : 'Assessment totals count submissions, not unique students. The interface reports stored stress classifications without recalculation or diagnosis.'}</MethodologyNote>
    </>}
  </Page>;
}
