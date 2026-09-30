import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiGetAccounts, apiDeleteAccount, type UserRow } from '@prototype/api-client';
import { useAdminResource, errorMessage } from '@/hooks/useAdminResource';
import { canManageUsers, useAdminProfile } from './AdminAuth';
import AccountForm, { roleOptions } from './AccountForm';
import { Avatar, Badge, Button, Card, DataTable, Dialog, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, SearchInput, formatDate, ui } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';
export default function UserDirectory({ management = false }: { management?: boolean }) {
  const { language } = useAdminExperience(); const id = language === 'id';
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
    try { await apiDeleteAccount(deleting.user_id); setDeleting(null); setSuccess(id ? 'Akun berhasil dihapus.' : 'Account deleted.'); resource.reload(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <Page title={management ? (id ? 'Manajemen Pengguna' : 'User Management') : (id ? 'Mahasiswa' : 'Students')} subtitle={management ? (id ? 'Kelola akun dan peran tetap yang tersedia di Sanctuary.' : 'Manage accounts and the fixed roles available in Sanctuary.') : (id ? 'Direktori mahasiswa dan pengguna · informasi rahasia.' : 'Student and user directory · confidential information.')}
    action={management && allowed ? <Button label={id ? 'Tambah akun' : 'Add account'} icon="person-add" onPress={() => { setSuccess(''); setForm('new'); }} /> : undefined}>
    {!allowed ? <Notice danger>{id ? 'Direktori akun hanya tersedia untuk admin dan pemangku jabatan. Konselor dapat meninjau hasil asesmen sesuai izin yang ada.' : 'The account directory is available only to administrators and stakeholders. Counselors can review assessment results within their permissions.'}</Notice> : <>
      {success && <Notice>{success}</Notice>}
      <Card>
        <View style={ui.row}><SearchInput value={search} onChangeText={v => { setSearch(v); setPage(1); }} /><Button label={id ? 'Perbarui' : 'Refresh'} tone="quiet" onPress={resource.reload} /></View>
        <FilterControl label={id ? 'Peran' : 'Role'} value={role} onChange={v => { setRole(v); setPage(1); }} options={[{ value: '', label: id ? 'Semua' : 'All' }, ...roleOptions.map(option => ({ ...option, label: id ? option.label : option.value === 'mahasiswa' ? 'Student' : option.value === 'konselor' ? 'Counselor' : 'Admin' }))]} />
        {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <>
          <DataTable rows={filtered.slice((currentPage - 1) * 10, currentPage * 10)} rowKey={u => u.user_id} empty={id ? 'Tidak ada pengguna yang sesuai dengan filter.' : 'No users match the filters.'} columns={[
            { title: id ? 'Nama / email' : 'Name / email', width: 245, render: u => <View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={u.nama} /><View style={{ flex: 1 }}><Text style={[ui.text, { fontWeight: '600' }]}>{u.nama}</Text><Text style={ui.muted}>{u.email}</Text></View></View> },
            { title: 'NIM', width: 115, render: u => <Text style={ui.text}>{u.nim || '—'}</Text> },
            { title: id ? 'Peran' : 'Role', width: 150, render: u => <Badge value={u.role} /> },
            { title: id ? 'Terdaftar' : 'Registered', width: 110, render: u => <Text style={ui.muted}>{formatDate(u.created_at)}</Text> },
            { title: id ? 'Tindakan' : 'Actions', width: management ? 235 : 90, render: u => <View style={[ui.row, { gap: 5 }]}><Button label={id ? 'Detail' : 'Details'} tone="quiet" onPress={() => router.push(('/students/' + u.user_id) as Href)} />{management && <><Button label={id ? 'Ubah' : 'Edit'} tone="quiet" disabled={u.user_id === profile.user_id} onPress={() => setForm(u)} /><Button label={id ? 'Hapus' : 'Delete'} tone="danger" disabled={u.user_id === profile.user_id} onPress={() => { setError(null); setDeleting(u); }} /></>}</View> },
          ]} />
          <Pagination page={currentPage} total={filtered.length} size={10} onChange={setPage} />
        </>}
        {management && <Text style={ui.muted}>{id ? 'Ubah dan hapus akun sendiri dinonaktifkan untuk mencegah kehilangan akses.' : 'Editing and deleting your own account are disabled to prevent access loss.'}</Text>}
      </Card>
    </>}
    {form && <AccountForm user={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); setSuccess(id ? 'Akun berhasil disimpan.' : 'Account saved.'); resource.reload(); }} />}
    <Dialog title={id ? 'Hapus akun?' : 'Delete account?'} visible={!!deleting} onClose={() => setDeleting(null)} busy={busy}>
      <Notice danger>{id ? `Menghapus akun ${deleting?.nama} juga menghapus data terkait sesuai aturan database. Tindakan ini tidak dapat dibatalkan.` : `Deleting ${deleting?.nama}'s account also deletes related data under database rules. This action cannot be undone.`}</Notice>
      {error && <ErrorState message={error} />}<Button label={busy ? (id ? 'Menghapus…' : 'Deleting…') : (id ? 'Ya, hapus akun' : 'Yes, delete account')} tone="danger" disabled={busy} onPress={() => { void remove(); }} />
    </Dialog>
  </Page>;
}
