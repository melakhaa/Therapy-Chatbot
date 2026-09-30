import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetAttention, apiGetDashboard, apiMarkAttentionRead } from '@prototype/api-client';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader, SignalCard } from '@/components/admin/OperationsUI';
import { AcademicScopeControl, type AcademicScope } from '@/components/admin/ProductPrimitives';
import { Badge, Button, Card, DataTable, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, formatDate, ui } from '@/components/ui';
import { useAdminExperience } from '@/components/admin/AdminExperience';

export default function AttentionMonitoring() {
  const { language } = useAdminExperience(); const id = language === 'id';
  const [signal, setSignal] = useState(''); const [unread, setUnread] = useState(false); const [page, setPage] = useState(1);
  const [scope, setScope] = useState<AcademicScope>({ facultyId: '', departmentId: '' });
  const loader = useCallback(() => apiGetAttention({ signal, unread_only: unread, page }), [signal, unread, page]);
  const resource = useAdminResource(loader); const dashboard = useAdminResource(apiGetDashboard);
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const assessmentCount = resource.data?.summary.find(item => item.signal_type === 'assessment')?.total || 0;
  const safetyCount = resource.data?.summary.find(item => item.signal_type === 'safety')?.total || 0;
  const unreadCount = resource.data?.summary.reduce((sum, item) => sum + item.unread, 0) || 0;
  const markRead = async (id: string) => { setBusy(id); setError(''); try { await apiMarkAttentionRead(id); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); } };
  return <Page title={id ? 'Pemantauan Risiko Tinggi' : 'High-Risk Monitoring'} subtitle={id ? 'Pisahkan sinyal asesmen dari peristiwa Safety Guardrail tanpa menampilkan konten pribadi.' : 'Separate assessment signals from Safety Guardrail events without exposing private content.'}>
    <Notice danger>{id ? 'Hanya metadata operasional rahasia. Pesan chat, jurnal, teks pemicu guardrail, dan jawaban asesmen tidak pernah ditampilkan.' : 'Confidential operational metadata only. Raw chat messages, journals, guardrail trigger text, and assessment answers are never shown here.'}</Notice>
    <Card><AcademicScopeControl value={scope} onChange={setScope} compact /></Card>
    <View style={ui.grid}>
      <OperationalMetric label={id ? 'Sinyal asesmen' : 'Assessment signals'} value={assessmentCount} note={id ? 'Peristiwa asesmen meningkat' : 'Elevated recorded assessment events'} icon="assignment-late" tone="amber" />
      <OperationalMetric label={id ? 'Sinyal keselamatan' : 'Safety signals'} value={safetyCount} note="Safety Guardrail" icon="health-and-safety" tone="red" />
      <OperationalMetric label={id ? 'Sinyal belum dibaca' : 'Unread signals'} value={unreadCount} note={id ? 'Antrean tinjauan admin' : 'Administrative review queue'} icon="mark-email-unread" tone="blue" />
      <OperationalMetric label={id ? 'Hasil severe tercatat' : 'Recorded severe results'} value={dashboard.data?.severity_distribution.severe ?? '—'} note={id ? 'Baris asesmen, bukan peristiwa krisis' : 'Assessment rows; not crisis events'} icon="monitor-heart" tone="purple" />
    </View>
    <Card><SectionHeader title={id ? 'Antrean perhatian' : 'Attention queue'} description={id ? 'Filter berdasarkan sumber sinyal dan status tinjauan.' : 'Filter by signal source and review state.'} />
      <View style={ui.row}><FilterControl label={id ? 'Jenis sinyal' : 'Signal type'} value={signal} onChange={value => { setSignal(value); setPage(1); }} options={[{ value: '', label: id ? 'Semua sinyal' : 'All signals' }, { value: 'assessment', label: id ? 'Sinyal asesmen' : 'Assessment signal' }, { value: 'safety', label: id ? 'Sinyal keselamatan' : 'Safety signal' }]} /><FilterControl label={id ? 'Status tinjauan' : 'Review state'} value={unread ? 'unread' : 'all'} onChange={value => { setUnread(value === 'unread'); setPage(1); }} options={[{ value: 'all', label: id ? 'Semua' : 'All' }, { value: 'unread', label: id ? 'Belum dibaca' : 'Unread only' }]} /><Button label={id ? 'Muat ulang' : 'Refresh'} icon="refresh" tone="quiet" onPress={resource.reload} /></View>
      {error && <ErrorState message={error} />}
      {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data && <><DataTable rows={resource.data.signals} rowKey={item => item.log_id} columns={[
        { title: id ? 'Sinyal' : 'Signal', width: 155, render: item => <Badge value={item.signal_type === 'safety' ? 'Safety Guardrail' : (id ? 'Asesmen' : 'Assessment')} /> },
        { title: id ? 'Mahasiswa / referensi' : 'Student / reference', width: 210, render: item => <View><Text style={[ui.text, { fontWeight: '700' }]}>{item.nama || (id ? 'Identitas tidak tersedia' : 'Identity unavailable')}</Text><Text style={ui.muted}>{item.nim || item.user_id?.slice(0, 8) || (id ? 'Tidak ada pengguna terkait' : 'No linked user')}</Text></View> },
        { title: id ? 'Tercatat' : 'Recorded', width: 130, render: item => <Text style={ui.muted}>{formatDate(item.notified_at)}</Text> },
        { title: id ? 'Status' : 'State', width: 110, render: item => <Badge value={item.is_read ? (id ? 'ditinjau' : 'reviewed') : (id ? 'belum dibaca' : 'unread')} /> },
        { title: id ? 'Tindakan' : 'Actions', width: 185, render: item => <View style={ui.row}>{item.user_id && <Button label={id ? 'Lihat mahasiswa' : 'View student'} tone="quiet" onPress={() => router.push(('/students/' + item.user_id) as Href)} />}{!item.is_read && <Button label={busy === item.log_id ? (id ? 'Menyimpan…' : 'Saving…') : (id ? 'Tandai ditinjau' : 'Mark reviewed')} disabled={!!busy} tone="quiet" onPress={() => { void markRead(item.log_id); }} />}</View> },
      ]} /><Pagination page={page} total={resource.data.total} onChange={setPage} /></>}
    </Card>
    <View style={ui.grid}><View style={ui.column}><Card title={id ? 'Interpretasi sinyal' : 'Signal interpretation'}><SignalCard type="assessment" title={id ? 'Sinyal asesmen' : 'Assessment signal'} detail={id ? 'Hasil asesmen stres tercatat memenuhi klasifikasi yang tersimpan.' : 'A recorded stress assessment result met an existing stored classification.'} meta={id ? 'Ini tidak menetapkan niat krisis atau diagnosis.' : 'It does not establish crisis intent or a diagnosis.'} /><SignalCard type="safety" title={id ? 'Sinyal keselamatan' : 'Safety signal'} detail={id ? 'Safety Guardrail deterministik diaktifkan.' : 'The deterministic Safety Guardrail was activated.'} meta={id ? 'Konten sengaja disembunyikan dari dashboard.' : 'Content is intentionally hidden from this dashboard.'} /></Card></View><View style={ui.column}><Card title={id ? 'Batas respons administrator' : 'Administrator response boundary'}><Text style={ui.text}>{id ? 'Gunakan sinyal untuk memprioritaskan tindak lanjut operasional sesuai kebijakan kampus. Sanctuary tidak menyimpulkan diagnosis, keputusan perawatan, atau tingkat krisis dari tabel ini.' : 'Use these signals to prioritize operational follow-up under campus policy. Sanctuary does not infer clinical diagnoses, treatment decisions, or crisis severity from this table.'}</Text></Card></View></View>
  </Page>;
}
