import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { apiGetAdminAssessments, apiGetDashboard } from '@/services/adminData';
import { useAdminResource } from '@/hooks/useAdminResource';
import AssessmentTable from '@/components/admin/AssessmentTable';
import { DistributionBars, Eyebrow, MethodologyNote, OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { Button, Card, ErrorState, Field, FilterControl, LoadingState, Page, Pagination, SearchInput, ui } from '@/components/ui';

export default function AssessmentMonitoring() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest'); const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ search: '', date_from: '', date_to: '' });
  const [validation, setValidation] = useState('');
  const loader = useCallback(() => apiGetAdminAssessments({ ...applied, severity, page }), [applied, severity, page]);
  const results = useAdminResource(loader);
  const dashboard = useAdminResource(apiGetDashboard);
  const rows = useMemo(() => [...(results.data?.assessments || [])].sort((a, b) => sort === 'score' ? b.score - a.score : sort === 'oldest' ? String(a.taken_at).localeCompare(String(b.taken_at)) : String(b.taken_at).localeCompare(String(a.taken_at))), [results.data, sort]);
  const apply = () => {
    const valid = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
    if (!valid(from) || !valid(to) || from && to && from > to) { setValidation('Use valid YYYY-MM-DD dates and ensure the start is before the end.'); return; }
    setValidation(''); setPage(1); setApplied({ search, date_from: from, date_to: to });
  };
  const reset = () => { setSearch(''); setSeverity(''); setFrom(''); setTo(''); setSort('newest'); setPage(1); setApplied({ search: '', date_from: '', date_to: '' }); setValidation(''); };
  const distribution = dashboard.data?.severity_distribution;
  return <Page title="Assessment Monitoring" subtitle="Monitor standardized stress self-assessment activity and recorded results.">
    <View style={{ gap: 5 }}><Eyebrow>DASS-21 / STRESS SUBSCALE / CURRENT ADMIN SCOPE</Eyebrow><Text style={ui.muted}>Results are operational signals and recorded classifications, not medical diagnoses.</Text></View>
    <View style={ui.grid}>
      <OperationalMetric label="Total submissions" value={dashboard.data?.total_assessments ?? '—'} note="All recorded assessment rows" icon="assignment" tone="purple" />
      <OperationalMetric label="Results in current view" value={results.data?.total ?? '—'} note="After applied filters" icon="filter-alt" />
      <OperationalMetric label="Recorded severe" value={distribution?.severe ?? '—'} note="Stored classification, all time" icon="warning-amber" tone="amber" />
      <OperationalMetric label="Recent activity" value={dashboard.data?.weekly_trend.reduce((sum, item) => sum + item.count, 0) ?? '—'} note="Submissions in available 7-day trend" icon="calendar-today" tone="blue" />
    </View>
    <View style={ui.grid}>
      <View style={[ui.column, { flexBasis: 420 }]}><Card title="Recorded stress-level distribution" subtitle="All available assessment records">{dashboard.loading ? <LoadingState /> : dashboard.error ? <ErrorState message={dashboard.error} retry={dashboard.reload} /> : distribution && <DistributionBars values={[{ label: 'Minimal', value: distribution.minimal }, { label: 'Mild', value: distribution.mild }, { label: 'Moderate', value: distribution.moderate }, { label: 'Severe', value: distribution.severe }]} />}</Card></View>
      <View style={[ui.column, { flexBasis: 560 }]}><Card><SectionHeader title="Filter assessment records" description="Search identity fields, narrow recorded classification, and select a date period." />
        <View style={ui.row}><SearchInput value={search} onChangeText={setSearch} placeholder="Search student name, NIM, or ID…" /><Field label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /><Field label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></View>
        <FilterControl label="Recorded stress level" value={severity} onChange={value => { setSeverity(value); setPage(1); }} options={[{ value: '', label: 'All' }, { value: 'minimal', label: 'Minimal' }, { value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }]} />
        <FilterControl label="Sort" value={sort} onChange={setSort} options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'score', label: 'Highest score' }]} />
        <View style={ui.row}><Button label="Apply filters" icon="filter-list" onPress={apply} /><Button label="Reset" tone="quiet" onPress={reset} /></View>{validation && <ErrorState message={validation} />}
      </Card></View>
    </View>
    <Card title="Assessment results" subtitle="DASS-21 Stress is the approved current product scope; legacy stored labels remain visible when returned by the existing backend.">
      {results.loading ? <LoadingState /> : results.error ? <ErrorState message={results.error} retry={results.reload} /> : results.data && <><AssessmentTable rows={rows} showUser /><Pagination page={page} total={results.data.total} onChange={setPage} /></>}
    </Card>
    <MethodologyNote>The repository does not yet contain authoritative DASS-21 Stress scoring thresholds or a DASS-specific submission contract. This interface does not alter or reinterpret existing stored scores.</MethodologyNote>
  </Page>;
}
