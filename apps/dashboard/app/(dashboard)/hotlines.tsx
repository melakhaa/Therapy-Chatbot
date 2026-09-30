import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { apiCreateHotline, apiDeleteHotline, apiGetHotlines, apiUpdateHotline, type HotlineRow } from '@/services/operationsData';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { Badge, Button, Card, DataTable, Dialog, ErrorState, Field, LoadingState, Notice, Page, formatDate, ui } from '@/components/ui';

export default function HotlineManagement() {
  const resource = useAdminResource(apiGetHotlines);
  const [form, setForm] = useState<HotlineRow | 'new' | null>(null); const [deleting, setDeleting] = useState<HotlineRow | null>(null);
  const [nama, setNama] = useState(''); const [nomor, setNomor] = useState(''); const [deskripsi, setDeskripsi] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const open = (value: HotlineRow | 'new') => { setForm(value); setNama(value === 'new' ? '' : value.nama); setNomor(value === 'new' ? '' : value.nomor); setDeskripsi(value === 'new' ? '' : value.deskripsi || ''); setError(''); setSuccess(''); };
  const save = async () => { if (!nama.trim() || !nomor.trim()) { setError('Name and contact number are required.'); return; } setBusy(true); setError(''); try { const data = { nama: nama.trim(), nomor: nomor.trim(), deskripsi: deskripsi.trim() || null }; if (form === 'new') await apiCreateHotline(data); else if (form) await apiUpdateHotline(form.hotline_id, data); setForm(null); setSuccess('Hotline contact saved.'); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); } };
  const remove = async () => { if (!deleting) return; setBusy(true); setError(''); try { await apiDeleteHotline(deleting.hotline_id); setDeleting(null); setSuccess('Hotline contact deleted.'); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); } };
  return <Page title="Hotline Management" subtitle="Manage support and emergency contacts surfaced by Sanctuary safety mechanisms." action={<Button label="Add hotline" icon="add-call" onPress={() => open('new')} />}>
    <Notice danger>Changes affect safety contact information. Verify every number and description before saving or deleting.</Notice>
    <View style={ui.grid}><OperationalMetric label="Hotline contacts" value={resource.data?.total ?? '—'} note="Records in the existing hotline table" icon="support-agent" /><OperationalMetric label="Data fields" value="3" note="Name, number, description" icon="fact-check" tone="blue" /></View>
    {success && <Notice>{success}</Notice>}
    <Card><SectionHeader title="Safety contact directory" description="No unsupported contact fields are introduced." action={<Button label="Refresh" icon="refresh" tone="quiet" onPress={resource.reload} />} />
      {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <DataTable rows={resource.data?.hotlines || []} rowKey={item => item.hotline_id} columns={[
        { title: 'Contact', width: 220, render: item => <View><Text style={[ui.text, { fontWeight: '700' }]}>{item.nama}</Text><Badge value="safety contact" /></View> },
        { title: 'Number', width: 150, render: item => <Text selectable style={[ui.text, { fontWeight: '700' }]}>{item.nomor}</Text> },
        { title: 'Description', width: 310, render: item => <Text style={ui.muted}>{item.deskripsi || '—'}</Text> },
        { title: 'Added', width: 120, render: item => <Text style={ui.muted}>{formatDate(item.created_at)}</Text> },
        { title: 'Actions', width: 155, render: item => <View style={ui.row}><Button label="Edit" tone="quiet" onPress={() => open(item)} /><Button label="Delete" tone="danger" onPress={() => { setError(''); setDeleting(item); }} /></View> },
      ]} />}
    </Card>
    <Dialog title={form === 'new' ? 'Add hotline contact' : 'Edit hotline contact'} visible={!!form} onClose={() => setForm(null)} busy={busy}><Field label="Contact name" value={nama} onChangeText={setNama} maxLength={100} /><Field label="Phone / contact number" value={nomor} onChangeText={setNomor} maxLength={20} /><Field label="Description" value={deskripsi} onChangeText={setDeskripsi} maxLength={500} multiline />{error && <ErrorState message={error} />}<Button label={busy ? 'Saving…' : 'Save contact'} disabled={busy} onPress={() => { void save(); }} /></Dialog>
    <Dialog title="Delete hotline contact?" visible={!!deleting} onClose={() => setDeleting(null)} busy={busy}><Notice danger>Remove {deleting?.nama} from the safety contact directory? Confirm the remaining contacts still provide appropriate coverage.</Notice>{error && <ErrorState message={error} />}<Button label={busy ? 'Deleting…' : 'Yes, delete contact'} disabled={busy} tone="danger" onPress={() => { void remove(); }} /></Dialog>
  </Page>;
}
