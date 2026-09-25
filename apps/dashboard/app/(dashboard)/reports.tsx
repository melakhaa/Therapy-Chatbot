import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { apiGetAnalytics, type AnalyticsData } from '@/services/operationsData';
import { useAdminResource } from '@/hooks/useAdminResource';
import { WeeklyChart } from '@/components/admin/AssessmentCharts';
import { DistributionBars, MethodologyNote, OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { Button, Card, ErrorState, Field, LoadingState, Notice, Page, formatDate, ui } from '@/components/ui';
import type { DashboardData } from '@prototype/api-client';

function ReportPreview({ data }: { data: AnalyticsData }) {
  const severity = Object.fromEntries(data.severity_distribution.map(item => [item.severity, item.count]));
  return <View style={{ gap: 18 }}><View style={{ borderBottomWidth: 2, borderColor: '#326e69', paddingBottom: 16 }}><Text style={{ color: '#326e69', fontSize: 25, fontWeight: '800' }}>SANCTUARY</Text><Text style={{ color: '#243c49', fontSize: 18, fontWeight: '700' }}>Student Mental Health Monitoring Report</Text><Text style={ui.muted}>Reporting period: {formatDate(data.date_from)} – {formatDate(data.date_to)} · Generated {formatDate(new Date().toISOString())}</Text></View>
    <SectionHeader title="Executive summary" description="Aggregate, anonymized operational reporting for university stakeholders." />
    <Text style={ui.text}>During the selected period, Sanctuary recorded {data.assessment_total} assessment submissions and {data.booking_total} counseling bookings. Counts describe platform activity and stored classifications; they do not establish prevalence, diagnoses, or clinical outcomes.</Text>
    <View style={ui.grid}><OperationalMetric label="Registered students" value={data.registered_students} note="Current account count" icon="school" /><OperationalMetric label="Assessments" value={data.assessment_total} note="Selected reporting period" icon="assignment" tone="purple" /><OperationalMetric label="Counseling bookings" value={data.booking_total} note="Sessions scheduled in period" icon="event-note" tone="blue" /></View>
    <View style={ui.grid}><View style={ui.column}><Card title="Recorded stress classification"><DistributionBars values={[{ label: 'Minimal', value: severity.minimal || 0 }, { label: 'Mild', value: severity.mild || 0 }, { label: 'Moderate', value: severity.moderate || 0 }, { label: 'Severe', value: severity.severe || 0 }]} /></Card></View><View style={ui.column}><Card title="Counseling utilization"><DistributionBars values={data.booking_status.map(item => ({ label: item.status, value: item.count }))} /></Card></View></View>
    <Notice>Privacy: this report excludes names, NIM, email, account identifiers, chat or journal content, raw guardrail input, and individual records.</Notice>
  </View>;
}

function exportPrint(data: AnalyticsData) {
  if (Platform.OS !== 'web') return;
  const severity = data.severity_distribution.map(item => `<tr><td>${item.severity}</td><td>${item.count}</td></tr>`).join('');
  const bookings = data.booking_status.map(item => `<tr><td>${item.status}</td><td>${item.count}</td></tr>`).join('');
  const popup = window.open('', '_blank');
  if (!popup) return;
  popup.opener = null;
  popup.document.write(`<!doctype html><html><head><title>Sanctuary Aggregate Report</title><style>body{font-family:Arial,sans-serif;color:#243c49;margin:42px;line-height:1.5}header{border-bottom:3px solid #326e69;padding-bottom:18px}h1{color:#326e69;margin:0}h2{margin-top:30px}small{color:#667b85}.metrics{display:flex;gap:14px;margin:24px 0}.metric{flex:1;border:1px solid #dfe9e7;border-radius:10px;padding:16px}.metric b{font-size:26px;display:block}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #e5edee;text-align:left}.privacy{margin-top:28px;background:#e6f2ef;padding:16px;border-radius:9px}@media print{body{margin:24px}}</style></head><body><header><h1>SANCTUARY</h1><h3>Student Mental Health Monitoring Report</h3><small>Period: ${data.date_from} to ${data.date_to} · Generated ${new Date().toISOString().slice(0, 10)}</small></header><h2>Executive Summary</h2><p>Aggregate operational activity for the selected period. Stored classifications are not medical diagnoses.</p><div class="metrics"><div class="metric"><b>${data.registered_students}</b>Registered students</div><div class="metric"><b>${data.assessment_total}</b>Assessment submissions</div><div class="metric"><b>${data.booking_total}</b>Counseling bookings</div></div><h2>Recorded Stress Classification</h2><table><tr><th>Classification</th><th>Count</th></tr>${severity}</table><h2>Counseling Utilization</h2><table><tr><th>Booking status</th><th>Count</th></tr>${bookings}</table><div class="privacy"><b>Privacy note</b><br/>This aggregate report excludes names, NIM, email, account identifiers, private content, and raw safety trigger input.</div><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

export default function AnalyticsReports() {
  const [from, setFrom] = useState('2026-09-01'); const [to, setTo] = useState('2026-09-30'); const [applied, setApplied] = useState({ from, to }); const [preview, setPreview] = useState(false); const [validation, setValidation] = useState('');
  const loader = useCallback(() => apiGetAnalytics(applied.from, applied.to), [applied]);
  const resource = useAdminResource(loader); const data = resource.data;
  const chartData = useMemo<DashboardData | null>(() => data ? { total_assessments: data.assessment_total, severity_distribution: { minimal: 0, mild: 0, moderate: 0, severe: 0, ...Object.fromEntries(data.severity_distribution.map(item => [item.severity, item.count])) }, weekly_trend: data.assessment_trend, recent_severe: [], guardrail_trigger_count: 0, pending_bookings: [] } : null, [data]);
  const apply = () => { if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) { setValidation('Use a valid reporting period in YYYY-MM-DD format.'); return; } setValidation(''); setPreview(false); setApplied({ from, to }); };
  const severity = Object.fromEntries(data?.severity_distribution.map(item => [item.severity, item.count]) || []);
  return <Page title="Analytics & Reports" subtitle="Explore aggregate Sanctuary patterns over a selected reporting period." action={<Button label="Generate report" icon="description" onPress={() => { apply(); setPreview(true); }} />}>
    <Card><SectionHeader title="Reporting period" description="Metrics update from authorized aggregate records." /><View style={ui.row}><Field label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} /><Field label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} /><Button label="Apply period" onPress={apply} /><Button label="Reset" tone="quiet" onPress={() => { setFrom('2026-09-01'); setTo('2026-09-30'); }} /></View>{validation && <ErrorState message={validation} />}</Card>
    {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : data && chartData && <>
      <View style={ui.grid}><OperationalMetric label="Assessment submissions" value={data.assessment_total} note="Selected period; not unique students" icon="assignment" tone="purple" /><OperationalMetric label="Recorded severe" value={severity.severe || 0} note="Stored classification" icon="monitor-heart" tone="amber" /><OperationalMetric label="Counseling bookings" value={data.booking_total} note="Schedule dates in selected period" icon="event-note" tone="blue" /><OperationalMetric label="Registered students" value={data.registered_students} note="Current account count" icon="school" /></View>
      <View style={ui.grid}><View style={[ui.column, { flexBasis: 520 }]}><WeeklyChart data={chartData} /></View><View style={[ui.column, { flexBasis: 360 }]}><Card title="Recorded stress-level distribution" subtitle="Selected reporting period"><DistributionBars values={[{ label: 'Minimal', value: severity.minimal || 0 }, { label: 'Mild', value: severity.mild || 0 }, { label: 'Moderate', value: severity.moderate || 0 }, { label: 'Severe', value: severity.severe || 0 }]} /></Card></View></View>
      <Card title="Counseling utilization" subtitle="Booking status distribution by scheduled date"><DistributionBars values={data.booking_status.map(item => ({ label: item.status, value: item.count }))} /></Card>
      <Card><SectionHeader title="Stakeholder report" description="Aggregate and anonymized by design." action={<View style={ui.row}><Button label={preview ? 'Hide preview' : 'Preview report'} tone="quiet" onPress={() => setPreview(value => !value)} /><Button label="Export PDF" icon="picture-as-pdf" onPress={() => exportPrint(data)} /></View>} />{preview && <ReportPreview data={data} />}</Card>
      <MethodologyNote>Assessment counts are submissions, not unique students. The repository lacks authoritative DASS-21 Stress scoring documentation, so this workspace reports stored classifications without reinterpreting scores or claiming outcome changes.</MethodologyNote>
    </>}
  </Page>;
}
