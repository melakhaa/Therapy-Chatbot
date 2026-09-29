import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { apiGetAdminAssessments, apiGetDashboard } from '@prototype/api-client';
import { AcademicScopeControl, type AcademicScope } from '@/components/admin/ProductPrimitives';
import { useAdminResource } from '@/hooks/useAdminResource';
import AssessmentTable from '@/components/admin/AssessmentTable';
import { DistributionBars, Eyebrow, MethodologyNote, OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { Button, Card, ErrorState, Field, FilterControl, LoadingState, Page, Pagination, SearchInput, ui } from '@/components/ui';
import { useAdminExperience } from '@/components/admin/AdminExperience';

export default function AssessmentMonitoring() {
  const { language } = useAdminExperience(); const id = language === 'id';
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest'); const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ search: '', date_from: '', date_to: '' });
  const [validation, setValidation] = useState('');
  const [scope, setScope] = useState<AcademicScope>({ facultyId: '', departmentId: '' });
  const loader = useCallback(() => apiGetAdminAssessments({ ...applied, severity, faculty_id: scope.facultyId, academic_unit_id: scope.departmentId, page }), [applied, severity, scope, page]);
  const results = useAdminResource(loader);
  const dashboard = useAdminResource(apiGetDashboard);
  const rows = useMemo(() => [...(results.data?.assessments || [])].sort((a, b) => sort === 'score' ? b.score - a.score : sort === 'oldest' ? String(a.taken_at).localeCompare(String(b.taken_at)) : String(b.taken_at).localeCompare(String(a.taken_at))), [results.data, sort]);
  const apply = () => {
    const valid = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
    if (!valid(from) || !valid(to) || from && to && from > to) { setValidation(id ? 'Gunakan tanggal YYYY-MM-DD yang valid dan pastikan tanggal awal mendahului tanggal akhir.' : 'Use valid YYYY-MM-DD dates and ensure the start is before the end.'); return; }
    setValidation(''); setPage(1); setApplied({ search, date_from: from, date_to: to });
  };
  const reset = () => { setSearch(''); setSeverity(''); setFrom(''); setTo(''); setSort('newest'); setPage(1); setApplied({ search: '', date_from: '', date_to: '' }); setValidation(''); };
  const distribution = dashboard.data?.severity_distribution;
  return <Page title={id ? 'Pemantauan Asesmen' : 'Assessment Monitoring'} subtitle={id ? 'Pantau aktivitas asesmen mandiri stres terstandar dan hasil yang tercatat.' : 'Monitor standardized stress self-assessment activity and recorded results.'}>
    <View style={{ gap: 5 }}><Eyebrow>{id ? 'DASS-21 / SUBSKALA STRES / CAKUPAN ADMIN SAAT INI' : 'DASS-21 / STRESS SUBSCALE / CURRENT ADMIN SCOPE'}</Eyebrow><Text style={ui.muted}>{id ? 'Hasil adalah sinyal operasional dan klasifikasi tercatat, bukan diagnosis medis.' : 'Results are operational signals and recorded classifications, not medical diagnoses.'}</Text></View>
    <Card><AcademicScopeControl value={scope} onChange={setScope} compact /></Card>
    <View style={ui.grid}>
      <OperationalMetric label={id ? 'Total pengiriman' : 'Total submissions'} value={dashboard.data?.total_assessments ?? '—'} note={id ? 'Semua baris asesmen tercatat' : 'All recorded assessment rows'} icon="assignment" tone="purple" />
      <OperationalMetric label={id ? 'Hasil dalam tampilan' : 'Results in current view'} value={results.data?.total ?? '—'} note={id ? 'Setelah filter diterapkan' : 'After applied filters'} icon="filter-alt" />
      <OperationalMetric label={id ? 'Severe tercatat' : 'Recorded severe'} value={distribution?.severe ?? '—'} note={id ? 'Klasifikasi tersimpan, seluruh waktu' : 'Stored classification, all time'} icon="warning-amber" tone="amber" />
      <OperationalMetric label={id ? 'Aktivitas terbaru' : 'Recent activity'} value={dashboard.data?.weekly_trend.reduce((sum, item) => sum + item.count, 0) ?? '—'} note={id ? 'Pengiriman dalam tren 7 hari' : 'Submissions in available 7-day trend'} icon="calendar-today" tone="blue" />
    </View>
    <View style={ui.grid}>
      <View style={[ui.column, { flexBasis: 420 }]}><Card title={id ? 'Distribusi tingkat stres tercatat' : 'Recorded stress-level distribution'} subtitle={id ? 'Semua catatan asesmen tersedia' : 'All available assessment records'}>{dashboard.loading ? <LoadingState /> : dashboard.error ? <ErrorState message={dashboard.error} retry={dashboard.reload} /> : distribution && <DistributionBars values={[{ label: 'Minimal', value: distribution.minimal }, { label: 'Mild', value: distribution.mild }, { label: 'Moderate', value: distribution.moderate }, { label: 'Severe', value: distribution.severe }]} />}</Card></View>
      <View style={[ui.column, { flexBasis: 560 }]}><Card><SectionHeader title={id ? 'Filter catatan asesmen' : 'Filter assessment records'} description={id ? 'Cari identitas, batasi klasifikasi, dan pilih periode tanggal.' : 'Search identity fields, narrow recorded classification, and select a date period.'} />
        <View style={ui.row}><SearchInput value={search} onChangeText={setSearch} placeholder={id ? 'Cari nama mahasiswa, NIM, atau ID…' : 'Search student name, NIM, or ID…'} /><Field label={id ? 'Dari (YYYY-MM-DD)' : 'From (YYYY-MM-DD)'} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /><Field label={id ? 'Sampai (YYYY-MM-DD)' : 'To (YYYY-MM-DD)'} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></View>
        <FilterControl label={id ? 'Tingkat stres tercatat' : 'Recorded stress level'} value={severity} onChange={value => { setSeverity(value); setPage(1); }} options={[{ value: '', label: id ? 'Semua' : 'All' }, { value: 'minimal', label: 'Minimal' }, { value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }]} />
        <FilterControl label={id ? 'Urutkan' : 'Sort'} value={sort} onChange={setSort} options={[{ value: 'newest', label: id ? 'Terbaru' : 'Newest' }, { value: 'oldest', label: id ? 'Terlama' : 'Oldest' }, { value: 'score', label: id ? 'Skor tertinggi' : 'Highest score' }]} />
        <View style={ui.row}><Button label={id ? 'Terapkan filter' : 'Apply filters'} icon="filter-list" onPress={apply} /><Button label={id ? 'Atur ulang' : 'Reset'} tone="quiet" onPress={reset} /></View>{validation && <ErrorState message={validation} />}
      </Card></View>
    </View>
    <Card title={id ? 'Hasil asesmen' : 'Assessment results'} subtitle={id ? 'DASS-21 Stress adalah cakupan produk saat ini; label lama tetap terlihat bila dikembalikan backend.' : 'DASS-21 Stress is the approved current product scope; legacy stored labels remain visible when returned by the existing backend.'}>
      {results.loading ? <LoadingState /> : results.error ? <ErrorState message={results.error} retry={results.reload} /> : results.data && <><AssessmentTable rows={rows} showUser /><Pagination page={page} total={results.data.total} onChange={setPage} /></>}
    </Card>
    <MethodologyNote>{id ? 'Repositori belum berisi ambang skor DASS-21 Stress yang otoritatif atau kontrak pengiriman khusus DASS. Antarmuka ini tidak mengubah atau menafsirkan ulang skor tersimpan.' : 'The repository does not yet contain authoritative DASS-21 Stress scoring thresholds or a DASS-specific submission contract. This interface does not alter or reinterpret existing stored scores.'}</MethodologyNote>
  </Page>;
}
