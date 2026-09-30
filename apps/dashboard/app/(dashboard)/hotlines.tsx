import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { apiCreateHotline, apiDeleteHotline, apiGetHotlines, apiUpdateHotline, type HotlineRow } from '@prototype/api-client';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { Badge, Button, Card, DataTable, Dialog, ErrorState, Field, LoadingState, Notice, Page, formatDate, ui } from '@/components/ui';
import { useAdminExperience } from '@/components/admin/AdminExperience';

export default function HotlineManagement() {
  const { language } = useAdminExperience(); const id = language === 'id';
  const resource = useAdminResource(apiGetHotlines);
  const [form, setForm] = useState<HotlineRow | 'new' | null>(null); const [deleting, setDeleting] = useState<HotlineRow | null>(null);
  const [nama, setNama] = useState(''); const [nomor, setNomor] = useState(''); const [deskripsi, setDeskripsi] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const open = (value: HotlineRow | 'new') => { setForm(value); setNama(value === 'new' ? '' : value.nama); setNomor(value === 'new' ? '' : value.nomor); setDeskripsi(value === 'new' ? '' : value.deskripsi || ''); setError(''); setSuccess(''); };
  const save = async () => { if (!nama.trim() || !nomor.trim()) { setError(id ? 'Nama dan nomor kontak wajib diisi.' : 'Name and contact number are required.'); return; } setBusy(true); setError(''); try { const data = { nama: nama.trim(), nomor: nomor.trim(), deskripsi: deskripsi.trim() || null }; if (form === 'new') await apiCreateHotline(data); else if (form) await apiUpdateHotline(form.hotline_id, data); setForm(null); setSuccess(id ? 'Kontak hotline disimpan.' : 'Hotline contact saved.'); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); } };
  const remove = async () => { if (!deleting) return; setBusy(true); setError(''); try { await apiDeleteHotline(deleting.hotline_id); setDeleting(null); setSuccess(id ? 'Kontak hotline dihapus.' : 'Hotline contact deleted.'); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); } };
  return <Page title={id ? 'Manajemen Hotline' : 'Hotline Management'} subtitle={id ? 'Kelola kontak dukungan dan darurat yang digunakan mekanisme keselamatan Sajiwa.' : 'Manage support and emergency contacts surfaced by Sajiwa safety mechanisms.'} action={<Button label={id ? 'Tambah hotline' : 'Add hotline'} icon="add-call" onPress={() => open('new')} />}>
    <Notice danger>{id ? 'Perubahan memengaruhi informasi kontak keselamatan. Verifikasi nomor dan deskripsi sebelum menyimpan atau menghapus.' : 'Changes affect safety contact information. Verify every number and description before saving or deleting.'}</Notice>
    <View style={ui.grid}><OperationalMetric label={id ? 'Kontak hotline' : 'Hotline contacts'} value={resource.data?.total ?? '—'} note={id ? 'Catatan pada tabel hotline' : 'Records in the existing hotline table'} icon="support-agent" /><OperationalMetric label={id ? 'Bidang data' : 'Data fields'} value="3" note={id ? 'Nama, nomor, deskripsi' : 'Name, number, description'} icon="fact-check" tone="blue" /></View>
    {success && <Notice>{success}</Notice>}
    <Card><SectionHeader title={id ? 'Direktori kontak keselamatan' : 'Safety contact directory'} description={id ? 'Tidak ada bidang kontak yang tidak didukung.' : 'No unsupported contact fields are introduced.'} action={<Button label={id ? 'Muat ulang' : 'Refresh'} icon="refresh" tone="quiet" onPress={resource.reload} />} />
      {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <DataTable rows={resource.data?.hotlines || []} rowKey={item => item.hotline_id} columns={[
        { title: id ? 'Kontak' : 'Contact', width: 220, render: item => <View><Text style={[ui.text, { fontWeight: '700' }]}>{item.nama}</Text><Badge value={id ? 'kontak keselamatan' : 'safety contact'} /></View> },
        { title: id ? 'Nomor' : 'Number', width: 150, render: item => <Text selectable style={[ui.text, { fontWeight: '700' }]}>{item.nomor}</Text> },
        { title: id ? 'Deskripsi' : 'Description', width: 310, render: item => <Text style={ui.muted}>{item.deskripsi || '—'}</Text> },
        { title: id ? 'Ditambahkan' : 'Added', width: 120, render: item => <Text style={ui.muted}>{formatDate(item.created_at)}</Text> },
        { title: id ? 'Tindakan' : 'Actions', width: 155, render: item => <View style={ui.row}><Button label={id ? 'Ubah' : 'Edit'} tone="quiet" onPress={() => open(item)} /><Button label={id ? 'Hapus' : 'Delete'} tone="danger" onPress={() => { setError(''); setDeleting(item); }} /></View> },
      ]} />}
    </Card>
    <Dialog title={form === 'new' ? (id ? 'Tambah kontak hotline' : 'Add hotline contact') : (id ? 'Ubah kontak hotline' : 'Edit hotline contact')} visible={!!form} onClose={() => setForm(null)} busy={busy}><Field label={id ? 'Nama kontak' : 'Contact name'} value={nama} onChangeText={setNama} maxLength={100} /><Field label={id ? 'Nomor telepon / kontak' : 'Phone / contact number'} value={nomor} onChangeText={setNomor} maxLength={20} /><Field label={id ? 'Deskripsi' : 'Description'} value={deskripsi} onChangeText={setDeskripsi} maxLength={500} multiline />{error && <ErrorState message={error} />}<Button label={busy ? (id ? 'Menyimpan…' : 'Saving…') : (id ? 'Simpan kontak' : 'Save contact')} disabled={busy} onPress={() => { void save(); }} /></Dialog>
    <Dialog title={id ? 'Hapus kontak hotline?' : 'Delete hotline contact?'} visible={!!deleting} onClose={() => setDeleting(null)} busy={busy}><Notice danger>{id ? `Hapus ${deleting?.nama} dari direktori kontak keselamatan? Pastikan kontak yang tersisa tetap memadai.` : `Remove ${deleting?.nama} from the safety contact directory? Confirm the remaining contacts still provide appropriate coverage.`}</Notice>{error && <ErrorState message={error} />}<Button label={busy ? (id ? 'Menghapus…' : 'Deleting…') : (id ? 'Ya, hapus kontak' : 'Yes, delete contact')} disabled={busy} tone="danger" onPress={() => { void remove(); }} /></Dialog>
  </Page>;
}
