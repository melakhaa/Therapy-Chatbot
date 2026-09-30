import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { apiGetComparisonAnalytics } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { ComparativeTrendChart } from '@/components/admin/ComparativeChart';
import { DistributionBars, MethodologyNote, OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { AcademicMultiScopeControl, type AcademicMultiScope, SegmentedControl } from '@/components/admin/ProductPrimitives';
import { useAdminExperience } from '@/components/admin/AdminExperience';
import { Button, Card, ErrorState, Field, LoadingState, Notice, Page, ui } from '@/components/ui';

export default function AnalyticsReports() {
  const { language } = useAdminExperience();
  const id = language === 'id';
  const [from, setFrom] = useState('2026-09-01');
  const [to, setTo] = useState('2026-09-30');
  const [applied, setApplied] = useState({ from: '2026-09-01', to: '2026-09-30' });
  const [scope, setScope] = useState<AcademicMultiScope>({ facultyIds: [], academicUnitIds: [] });
  const [mode, setMode] = useState('aggregate');
  const [confirm, setConfirm] = useState(false);
  const [validation, setValidation] = useState('');
  const loader = useCallback(() => apiGetComparisonAnalytics(applied.from, applied.to, scope.facultyIds, scope.academicUnitIds), [applied, scope]);
  const resource = useAdminResource(loader);
  const data = resource.data;
  const totals = useMemo(() => ({
    assessments: data?.assessment_trend.reduce((sum, point) => sum + Number(point.assessment_count), 0) || 0,
    severe: data?.severity_distribution.filter(item => item.severity === 'severe').reduce((sum, item) => sum + Number(item.count), 0) || 0,
  }), [data]);
  const severity = useMemo(() => (['minimal', 'mild', 'moderate', 'severe'] as const).map(level => ({ label: level, value: data?.severity_distribution.filter(item => item.severity === level).reduce((sum, item) => sum + Number(item.count), 0) || 0 })), [data]);
  const scopeLabels = useMemo(() => data?.selected_scopes.map(item=>item.scope_label) || [], [data]);
  const categorySummaries = useMemo(() => (['depression','anxiety','stress'] as const).map(category=>({category,values:(['normal','mild','moderate','severe','extremely_severe'] as const).map(level=>({label:level.replace('_',' '),value:data?.category_severity_distribution.filter(item=>item.category===category&&item.severity===level).reduce((sum,item)=>sum+Number(item.count),0)||0}))})),[data]);
  const apply = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      setValidation(id ? 'Gunakan periode YYYY-MM-DD yang valid.' : 'Use a valid YYYY-MM-DD reporting period.');
      return false;
    }
    setValidation('');
    setApplied({ from, to });
    return true;
  };
  const openReport = () => {
    if (!apply()) return;
    if (mode === 'confidential' && !confirm) {
      setValidation(id ? 'Konfirmasi kewajiban kerahasiaan sebelum membuka laporan.' : 'Confirm confidentiality before opening the report.');
      return;
    }
    const query = new URLSearchParams({ from, to, mode, faculties: scope.facultyIds.join(','), units: scope.academicUnitIds.join(','), scope: scopeLabels.join(', ') }).toString();
    if (Platform.OS === 'web') window.open('/report-preview?' + query, '_blank', 'noopener,noreferrer');
  };
  return <Page title={id ? 'Analytics & Laporan Stakeholder' : 'Analytics & Stakeholder Reports'} subtitle={id ? 'Bandingkan tren antar fakultas atau unit akademik dan siapkan laporan dengan cakupan yang jelas.' : 'Compare faculty or academic-unit trends and prepare reports with explicit scope.'} action={<Button label={id ? 'Buka pratinjau laporan' : 'Open report preview'} icon="description" onPress={openReport} />}>
    <View style={ui.grid}>
      <View style={[ui.column, { flexBasis: 520 }]}><Card><SectionHeader title={id ? 'Periode & jenis laporan' : 'Period & report type'} description={id ? 'Pilih periode, lalu terapkan untuk memuat perbandingan.' : 'Choose a period, then apply it to load comparisons.'} />
        <View style={ui.row}><Field label={id ? 'Dari' : 'From'} value={from} onChangeText={setFrom} /><Field label={id ? 'Sampai' : 'To'} value={to} onChangeText={setTo} /><Button label={id ? 'Terapkan' : 'Apply'} onPress={apply} /></View>
        <SegmentedControl value={mode} onChange={value => { setMode(value); setConfirm(false); }} options={[{ value: 'aggregate', label: id ? 'Laporan agregat' : 'Aggregate report', icon: 'donut-large' }, { value: 'confidential', label: id ? 'Agregat + perhatian khusus' : 'Aggregate + special attention', icon: 'lock' }]} />
        {mode === 'confidential' && <Notice danger>{id ? 'Mode ini dapat menyertakan identitas terbatas dan harus diperlakukan sebagai dokumen rahasia.' : 'This mode may include limited identity and must be treated as confidential.'}</Notice>}
        {mode === 'confidential' && <Button label={confirm ? (id ? '✓ Kerahasiaan dikonfirmasi' : '✓ Confidentiality confirmed') : (id ? 'Saya memahami kewajiban kerahasiaan' : 'I understand the confidentiality obligation')} tone={confirm ? 'quiet' : 'danger'} onPress={() => setConfirm(value => !value)} />}
        {validation && <ErrorState message={validation} />}
      </Card></View>
      <View style={[ui.column, { flexBasis: 440 }]}><Card><AcademicMultiScopeControl value={scope} onChange={setScope} /></Card></View>
    </View>
    {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : data && <>
      <View style={ui.grid}>
        <OperationalMetric label={id ? 'Pengiriman asesmen' : 'Assessment submissions'} value={totals.assessments} note={id ? 'Jumlah catatan pada seri terpilih' : 'Records in selected series'} icon="assignment" tone="purple" />
        <OperationalMetric label={id ? 'Hasil severe tercatat' : 'Recorded severe results'} value={totals.severe} note={id ? 'Klasifikasi tersimpan, bukan diagnosis' : 'Stored classification, not diagnosis'} icon="monitor-heart" tone="amber" />
        <OperationalMetric label={id ? 'Seri perbandingan' : 'Comparison series'} value={scopeLabels.length || 1} note={data.mode === 'academic_unit' ? (id ? 'Per unit akademik' : 'By academic unit') : data.mode === 'faculty' ? (id ? 'Per fakultas' : 'By faculty') : (id ? 'Agregat universitas' : 'University aggregate')} icon="compare-arrows" tone="blue" />
      </View>
      <ComparativeTrendChart points={data.assessment_trend} seriesLabels={scopeLabels} title={id ? 'Tren volume asesmen per cakupan' : 'Assessment volume by scope'} />
      <View style={ui.grid}><View style={ui.column}><Card title={id ? 'Distribusi tingkat tercatat' : 'Recorded severity distribution'} subtitle={id ? 'Gabungan seri terpilih; grafik tren tetap terpisah.' : 'Selected-series total; trend lines remain separate.'}><DistributionBars values={severity} /></Card></View><View style={ui.column}><Card title={id ? 'Cakupan laporan' : 'Report scope'}><Text style={ui.text}>{scopeLabels.length ? scopeLabels.join(', ') : (id ? 'Universitas Diponegoro' : 'Diponegoro University')}</Text><Text style={ui.muted}>{id ? 'Jika unit dipilih, perbandingan selalu menggunakan unit. Jika hanya fakultas dipilih, setiap fakultas menjadi satu seri.' : 'Academic units take precedence; otherwise each selected faculty becomes one series.'}</Text></Card></View></View>
      <View style={ui.grid}><View style={ui.column}><Card title={id?'Utilisasi konseling per cakupan':'Counseling utilization by scope'}>{scopeLabels.map(label=><Text key={label} style={ui.text}>{label}: {data.counseling_utilization.filter(item=>item.scope_label===label).reduce((sum,item)=>sum+Number(item.count),0)}</Text>)}</Card></View><View style={ui.column}><Card title={id?'Sinyal perhatian per cakupan':'Attention signals by scope'}>{scopeLabels.map(label=><Text key={label} style={ui.text}>{label}: {data.attention_counts.filter(item=>item.scope_label===label).reduce((sum,item)=>sum+Number(item.count),0)}</Text>)}</Card></View></View>
      {!!data.category_severity_distribution.length&&<><SectionHeader title="DASS-21 · Depression / Anxiety / Stress" description={id?'Distribusi kategori gejala per dimensi. Bukan diagnosis dan tidak digabung menjadi satu skor klinis.':'Symptom-severity distribution by dimension. Not a diagnosis and not combined into one clinical score.'}/><View style={ui.grid}>{categorySummaries.map(item=><View key={item.category} style={ui.column}><Card title={item.category[0].toUpperCase()+item.category.slice(1)}><DistributionBars values={item.values}/></Card></View>)}</View></>}
      {!data.category_trends.length && <Notice>{id ? 'Tren Depression, Anxiety, dan Stress akan muncul setelah versi penuh DASS-21 yang otoritatif dipublikasikan dan digunakan.' : 'Depression, Anxiety, and Stress trends will appear after an authoritative full DASS-21 version is published and used.'}</Notice>}
      <MethodologyNote>{id ? 'Catatan asesmen lama tetap dilaporkan berdasarkan instrumen dan klasifikasi yang tersimpan. Sanctuary tidak menyamakan periode Stress-only dengan DASS-21 penuh.' : 'Legacy records retain their stored instrument and classification. Stress-only periods are not treated as equivalent to full DASS-21.'}</MethodologyNote>
    </>}
  </Page>;
}
