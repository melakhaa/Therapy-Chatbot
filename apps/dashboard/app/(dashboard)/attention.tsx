import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetDashboard } from '@/services/adminData';
import { apiGetAttention, apiMarkAttentionRead } from '@/services/operationsData';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader, SignalCard } from '@/components/admin/OperationsUI';
import { AcademicScopeControl, type AcademicScope } from '@/components/admin/ProductPrimitives';
import { Badge, Button, Card, DataTable, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, formatDate, ui } from '@/components/ui';

export default function AttentionMonitoring() {
  const [signal, setSignal] = useState(''); const [unread, setUnread] = useState(false); const [page, setPage] = useState(1);
  const [scope, setScope] = useState<AcademicScope>({ facultyId: '', departmentId: '' });
  const loader = useCallback(() => apiGetAttention({ signal, unread_only: unread, page }), [signal, unread, page]);
  const resource = useAdminResource(loader); const dashboard = useAdminResource(apiGetDashboard);
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const assessmentCount = resource.data?.summary.find(item => item.signal_type === 'assessment')?.total || 0;
  const safetyCount = resource.data?.summary.find(item => item.signal_type === 'safety')?.total || 0;
  const unreadCount = resource.data?.summary.reduce((sum, item) => sum + item.unread, 0) || 0;
  const markRead = async (id: string) => { setBusy(id); setError(''); try { await apiMarkAttentionRead(id); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); } };
  return <Page title="High-Risk Monitoring" subtitle="Separate assessment signals from Safety Guardrail events without exposing private content.">
    <Notice danger>Confidential operational metadata only. Raw chat messages, journals, guardrail trigger text, and assessment answers are never shown here.</Notice>
    <Card><AcademicScopeControl value={scope} onChange={setScope} compact /></Card>
    <View style={ui.grid}>
      <OperationalMetric label="Assessment signals" value={assessmentCount} note="Elevated recorded assessment events" icon="assignment-late" tone="amber" />
      <OperationalMetric label="Safety signals" value={safetyCount} note="Safety Guardrail events" icon="health-and-safety" tone="red" />
      <OperationalMetric label="Unread signals" value={unreadCount} note="Administrative review queue" icon="mark-email-unread" tone="blue" />
      <OperationalMetric label="Recorded severe results" value={dashboard.data?.severity_distribution.severe ?? '—'} note="Assessment rows; not crisis events" icon="monitor-heart" tone="purple" />
    </View>
    <Card><SectionHeader title="Attention queue" description="Filter by signal source and review state." />
      <View style={ui.row}><FilterControl label="Signal type" value={signal} onChange={value => { setSignal(value); setPage(1); }} options={[{ value: '', label: 'All signals' }, { value: 'assessment', label: 'Assessment signal' }, { value: 'safety', label: 'Safety signal' }]} /><FilterControl label="Review state" value={unread ? 'unread' : 'all'} onChange={value => { setUnread(value === 'unread'); setPage(1); }} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread only' }]} /><Button label="Refresh" icon="refresh" tone="quiet" onPress={resource.reload} /></View>
      {error && <ErrorState message={error} />}
      {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data && <><DataTable rows={resource.data.signals} rowKey={item => item.log_id} columns={[
        { title: 'Signal', width: 155, render: item => <Badge value={item.signal_type === 'safety' ? 'Safety Guardrail' : 'Assessment'} /> },
        { title: 'Student / reference', width: 210, render: item => <View><Text style={[ui.text, { fontWeight: '700' }]}>{item.nama || 'Identity unavailable'}</Text><Text style={ui.muted}>{item.nim || item.user_id?.slice(0, 8) || 'No linked user'}</Text></View> },
        { title: 'Recorded', width: 130, render: item => <Text style={ui.muted}>{formatDate(item.notified_at)}</Text> },
        { title: 'State', width: 110, render: item => <Badge value={item.is_read ? 'reviewed' : 'unread'} /> },
        { title: 'Actions', width: 185, render: item => <View style={ui.row}>{item.user_id && <Button label="View student" tone="quiet" onPress={() => router.push(('/students/' + item.user_id) as Href)} />}{!item.is_read && <Button label={busy === item.log_id ? 'Saving…' : 'Mark reviewed'} disabled={!!busy} tone="quiet" onPress={() => { void markRead(item.log_id); }} />}</View> },
      ]} /><Pagination page={page} total={resource.data.total} onChange={setPage} /></>}
    </Card>
    <View style={ui.grid}><View style={ui.column}><Card title="Signal interpretation"><SignalCard type="assessment" title="Assessment signal" detail="A recorded stress assessment result met an existing stored classification." meta="It does not establish crisis intent or a diagnosis." /><SignalCard type="safety" title="Safety signal" detail="The deterministic Safety Guardrail was activated." meta="Content is intentionally hidden from this dashboard." /></Card></View><View style={ui.column}><Card title="Administrator response boundary"><Text style={ui.text}>Use these signals to prioritize operational follow-up under campus policy. Sanctuary does not infer clinical diagnoses, treatment decisions, or crisis severity from this table.</Text></Card></View></View>
  </Page>;
}
