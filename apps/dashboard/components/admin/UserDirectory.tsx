import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetAccounts, apiDeleteAccount, type UserRow } from '@prototype/api-client';
import { useAdminResource, errorMessage } from '@/hooks/useAdminResource';
import { canManageUsers, useAdminProfile } from './AdminAuth';
import AccountForm, { roleOptions } from './AccountForm';
import { Avatar, Badge, Button, Card, DataTable, Dialog, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, SearchInput, formatDate, ui } from '@/components/ui';
export default function UserDirectory({ management = false }: { management?: boolean }) {
  const profile = useAdminProfile(); const allowed = canManageUsers(profile);
  const resource = useAdminResource(apiGetAccounts, allowed);
  const [search, setSearch] = useState(''); const [role, setRole] = useState(management ? '' : 'mahasiswa'); const [page, setPage] = useState(1);
  const [form, setForm] = useState<UserRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const filtered = (resource.data?.users || []).filter(u => (!role || u.role === role) && [u.nama, u.email, u.nim || ''].some(v => v.toLowerCase().includes(search.toLowerCase())));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true); setError(null);
    try { await apiDeleteAccount(deleting.user_id); setDeleting(null); setSuccess('Akun berhasil dihapus.'); resource.reload(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <Page title={management ? 'User Management' : 'Students'} subtitle={management ? 'Kelola akun dan peran tetap yang tersedia di Sanctuary.' : 'Direktori mahasiswa dan pengguna · informasi rahasia.'}
    action={management && allowed ? <Button label="Tambah akun" icon="person-add" onPress={() => { setSuccess(''); setForm('new'); }} /> : undefined}>
    {!allowed ? <Notice danger>Direktori akun hanya tersedia untuk admin dan pemangku jabatan. Konselor dapat meninjau hasil asesmen melalui Risk Monitoring sesuai izin yang ada.</Notice> : <>
      {success && <Notice>{success}</Notice>}
      <Card>
        <View style={ui.row}><SearchInput value={search} onChangeText={v => { setSearch(v); setPage(1); }} /><Button label="Perbarui" tone="quiet" onPress={resource.reload} /></View>
        <FilterControl label="Peran" value={role} onChange={v => { setRole(v); setPage(1); }} options={[{ value: '', label: 'Semua' }, ...roleOptions]} />
        {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <>
          <DataTable rows={filtered.slice((currentPage - 1) * 10, currentPage * 10)} rowKey={u => u.user_id} empty="Tidak ada pengguna yang sesuai dengan filter." columns={[
            { title: 'Nama / email', width: 245, render: u => <View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={u.nama} /><View style={{ flex: 1 }}><Text style={[ui.text, { fontWeight: '600' }]}>{u.nama}</Text><Text style={ui.muted}>{u.email}</Text></View></View> },
            { title: 'NIM', width: 115, render: u => <Text style={ui.text}>{u.nim || '—'}</Text> },
            { title: 'Peran', width: 150, render: u => <Badge value={u.role} /> },
            { title: 'Terdaftar', width: 110, render: u => <Text style={ui.muted}>{formatDate(u.created_at)}</Text> },
            { title: 'Tindakan', width: management ? 235 : 90, render: u => <View style={[ui.row, { gap: 5 }]}><Button label="Detail" tone="quiet" onPress={() => router.push(('/students/' + u.user_id) as Href)} />{management && <><Button label="Edit" tone="quiet" disabled={u.user_id === profile.user_id} onPress={() => setForm(u)} /><Button label="Hapus" tone="danger" disabled={u.user_id === profile.user_id} onPress={() => { setError(null); setDeleting(u); }} /></>}</View> },
          ]} />
          <Pagination page={currentPage} total={filtered.length} size={10} onChange={setPage} />
        </>}
        {management && <Text style={ui.muted}>Edit dan hapus akun sendiri dinonaktifkan di halaman ini untuk mencegah kehilangan akses.</Text>}
      </Card>
    </>}
    {form && <AccountForm user={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); setSuccess('Akun berhasil disimpan.'); resource.reload(); }} />}
    <Dialog title="Hapus akun?" visible={!!deleting} onClose={() => setDeleting(null)} busy={busy}>
      <Notice danger>Menghapus akun {deleting?.nama} juga menghapus data terkait sesuai aturan database, termasuk asesmen, jurnal, pesan, dan booking. Tindakan ini tidak dapat dibatalkan.</Notice>
      {error && <ErrorState message={error} />}<Button label={busy ? 'Menghapus…' : 'Ya, hapus akun'} tone="danger" disabled={busy} onPress={() => { void remove(); }} />
    </Dialog>
  </Page>;
}
