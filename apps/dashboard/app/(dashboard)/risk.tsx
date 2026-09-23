import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { apiGetAdminAssessments } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import AssessmentTable from '@/components/admin/AssessmentTable';
import { Button, Card, ErrorState, Field, FilterControl, LoadingState, Notice, Page, Pagination, SearchInput, ui } from '@/components/ui';
export default function RiskMonitoring() {
  const [search, setSearch] = useState(''); const [severity, setSeverity] = useState('severe'); const [instrument, setInstrument] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ search: '', date_from: '', date_to: '' });
  const [validation, setValidation] = useState('');
  const loader = useCallback(() => apiGetAdminAssessments({ ...applied, severity, instrument, page }), [applied, severity, instrument, page]);
  const resource = useAdminResource(loader);
  const apply = () => {
    const valid = (v: string) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)));
    if (!valid(from) || !valid(to) || (from && to && from > to)) { setValidation('Gunakan tanggal YYYY-MM-DD dengan rentang yang valid.'); return; }
    setValidation(''); setPage(1); setApplied({ search, date_from: from, date_to: to });
  };
  return <Page title="Risk Monitoring" subtitle="Tinjau hasil asesmen yang tercatat · informasi rahasia.">
    <Notice>Keparahan mengikuti klasifikasi aplikasi yang tersimpan. Setiap baris adalah satu asesmen; seorang mahasiswa dapat memiliki beberapa hasil.</Notice>
    <Card>
      <FilterControl label="Keparahan tercatat" value={severity} onChange={v => { setSeverity(v); setPage(1); }} options={[{ value: '', label: 'Semua' }, ...['minimal', 'mild', 'moderate', 'severe'].map(v => ({ value: v, label: v }))]} />
      <FilterControl label="Instrumen" value={instrument} onChange={v => { setInstrument(v); setPage(1); }} options={[{ value: '', label: 'Semua' }, ...['PHQ-9', 'GAD-7', 'SRQ', 'custom'].map(v => ({ value: v, label: v }))]} />
      <View style={ui.row}><SearchInput value={search} onChangeText={setSearch} placeholder="Cari nama, NIM, atau ID pengguna…" /><Field label="Dari (YYYY-MM-DD)" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /><Field label="Sampai (YYYY-MM-DD)" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /><Button label="Terapkan" onPress={apply} /></View>
      {validation && <ErrorState message={validation} />}
      {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data && <>
        <AssessmentTable rows={resource.data.assessments} showUser /><Pagination page={page} total={resource.data.total} onChange={setPage} />
      </>}
    </Card>
  </Page>;
}
