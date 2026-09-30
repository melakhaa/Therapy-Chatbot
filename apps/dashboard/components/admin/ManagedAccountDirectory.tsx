import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiDeleteAccount, apiGetAccounts, apiGetCounselors, apiGetOrganizationSchedules, type UserRow } from '@prototype/api-client';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader } from './OperationsUI';
import { AcademicScopeControl, type AcademicScope } from './ProductPrimitives';
import { useAdminExperience } from './AdminExperience';
import AccountForm from './AccountForm';
import { Avatar, Badge, Button, Card, DataTable, Dialog, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, SearchInput, formatDate, ui } from '@/components/ui';

export default function ManagedAccountDirectory({ role }: { role: 'mahasiswa' | 'konselor' }) {
  const students = role === 'mahasiswa'; const { language } = useAdminExperience(); const id = language === 'id';
  const accounts = useAdminResource(apiGetAccounts); const schedules = useAdminResource(apiGetOrganizationSchedules, !students); const counselorProfiles = useAdminResource(apiGetCounselors, !students);
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [scope, setScope] = useState<AcademicScope>({ facultyId: '', departmentId: '' }), [active, setActive] = useState('');
  const [form, setForm] = useState<UserRow | 'new' | null>(null), [deleting, setDeleting] = useState<UserRow | null>(null), [profile, setProfile] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const rows = useMemo(() => (accounts.data?.users || []).filter(user => {
    if (user.role !== role || ![user.nama, user.email, user.nim || ''].some(value => value.toLowerCase().includes(search.toLowerCase()))) return false;
    if (!students) { const profile = counselorProfiles.data?.counselors.find(item => item.user_id === user.user_id); return !active || (active === 'active' ? profile?.active !== false : profile?.active === false); }
    return (!scope.facultyId || user.faculty_id === scope.facultyId) && (!scope.departmentId || user.academic_unit_id === scope.departmentId);
  }), [accounts.data, active, counselorProfiles.data, role, search, students, scope]);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  const upcoming = schedules.data?.schedules.filter(slot => !['selesai', 'dibatalkan'].includes(slot.status)).length || 0;
  const available = schedules.data?.schedules.filter(slot => slot.status === 'tersedia').length || 0;
  const remove = async () => { if (!deleting || busy) return; setBusy(true); setError(''); try { await apiDeleteAccount(deleting.user_id); setDeleting(null); setSuccess(id ? 'Akun berhasil dihapus.' : 'Account removed successfully.'); accounts.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); } };
  const academic = (user: UserRow) => ({ faculty: user.faculty_name, department: user.academic_unit_name });
  const counselorProfile = (user: UserRow) => counselorProfiles.data?.counselors.find(item => item.user_id === user.user_id);

  return <Page title={students ? (id ? 'Manajemen Mahasiswa' : 'Student Management') : (id ? 'Manajemen Konselor' : 'Counselor Management')} subtitle={students ? (id ? 'Direktori identitas dan catatan administratif mahasiswa.' : 'Student identity and administrative records directory.') : (id ? 'Direktori sumber daya konselor, kapasitas, dan ketersediaan.' : 'Counselor resource, capacity, and availability directory.')} action={<Button label={students ? (id ? 'Tambah mahasiswa' : 'Add student') : (id ? 'Tambah konselor' : 'Add counselor')} icon="person-add" onPress={() => { setSuccess(''); setForm('new'); }} />}>
    <View style={ui.grid}><OperationalMetric label={students ? (id ? 'Akun mahasiswa' : 'Student accounts') : (id ? 'Akun konselor' : 'Counselor accounts')} value={accounts.loading ? '…' : rows.length} note={id ? 'Direktori pada filter aktif' : 'Directory in active filters'} icon={students ? 'school' : 'supervisor-account'} />{!students && <><OperationalMetric label={id ? 'Slot mendatang' : 'Upcoming slots'} value={schedules.loading ? '…' : upcoming} note={id ? 'Belum selesai atau dibatalkan' : 'Not completed or cancelled'} icon="calendar-month" tone="blue" /><OperationalMetric label={id ? 'Kapasitas tersedia' : 'Available capacity'} value={schedules.loading ? '…' : available} note={id ? 'Slot API saat ini' : 'Current API slots'} icon="event-available" /></>}</View>
    {success && <Notice>{success}</Notice>}
    <View style={ui.grid}>
      <View style={[ui.column, { flexBasis: 620 }]}><Card><SectionHeader title={students ? (id ? 'Direktori mahasiswa' : 'Student directory') : (id ? 'Direktori konselor' : 'Counselor directory')} description={students ? (id ? 'Cari identitas dan buka catatan terstruktur.' : 'Search identities and open structured records.') : (id ? 'Tinjau profil, jadwal, dan kapasitas.' : 'Review profiles, schedules, and capacity.')} /><View style={ui.row}><SearchInput value={search} onChangeText={value => { setSearch(value); setPage(1); }} /><Button label={id ? 'Muat ulang' : 'Refresh'} icon="refresh" tone="quiet" onPress={() => { accounts.reload(); schedules.reload(); }} /></View>{!students && <FilterControl label={id ? 'Status profil' : 'Profile status'} value={active} onChange={setActive} options={[{ value: '', label: id ? 'Semua' : 'All' }, { value: 'active', label: id ? 'Aktif' : 'Active' }, { value: 'pending', label: id ? 'Belum tersedia' : 'Unavailable' }]} />}</Card></View>
      {students && <View style={[ui.column, { flexBasis: 390 }]}><Card><AcademicScopeControl value={scope} onChange={value => { setScope(value); setPage(1); }} compact /></Card></View>}
    </View>
    <Card>
      {accounts.loading ? <LoadingState /> : accounts.error ? <ErrorState message={accounts.error} retry={accounts.reload} /> : <><DataTable rows={rows.slice((current - 1) * 10, current * 10)} rowKey={user => user.user_id} empty={students ? (id ? 'Tidak ada mahasiswa yang cocok.' : 'No students match these filters.') : (id ? 'Tidak ada konselor yang cocok.' : 'No counselors match these filters.')} columns={[
        { title: students ? (id ? 'Mahasiswa' : 'Student') : (id ? 'Konselor' : 'Counselor'), width: 250, render: user => <View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={user.nama} /><View style={{ flex: 1 }}><Text style={[ui.text, { fontWeight: '800' }]}>{user.nama}</Text><Text style={ui.muted}>{user.email}</Text></View></View> },
        ...(students ? [
          { title: 'NIM', width: 130, render: (user: UserRow) => <Text style={ui.text}>{user.nim || '—'}</Text> },
          { title: id ? 'Fakultas / Departemen' : 'Faculty / Department', width: 260, render: (user: UserRow) => { const a=academic(user); return <View><Text style={ui.text}>{a.faculty || (id ? 'Belum ditentukan' : 'Not assigned')}</Text><Text style={ui.muted}>{a.department || (id ? 'Belum ditentukan' : 'Not assigned')}</Text></View>; } },
        ] : [
          { title: id ? 'Gelar / spesialisasi' : 'Title / specialization', width: 240, render: (user: UserRow) => { const p=counselorProfile(user); return <View><Text style={ui.text}>{p?.title || '—'}</Text><Text style={ui.muted}>{p?.specialization || '—'}</Text></View>; } },
          { title: id ? 'Kapasitas' : 'Capacity', width: 140, render: (user: UserRow) => { const slots=schedules.data?.schedules.filter(item=>item.konselor_id===user.user_id)||[]; return <View><Text style={[ui.text,{fontWeight:'800'}]}>{slots.length} {id ? 'slot' : 'slots'}</Text><Text style={ui.muted}>{slots.filter(item=>item.status==='tersedia').length} {id ? 'tersedia' : 'available'}</Text></View>; } },
        ]),
        { title: id ? 'Terdaftar' : 'Registered', width: 125, render: user => <Text style={ui.muted}>{formatDate(user.created_at)}</Text> },
        { title: id ? 'Tindakan' : 'Actions', width: 270, render: user => <View style={ui.row}>{students && <Button label={id ? 'Lihat' : 'View'} tone="quiet" onPress={() => router.push(('/students/' + user.user_id) as Href)} />}{!students && <><Button label={id ? 'Profil' : 'Profile'} tone="quiet" onPress={() => setProfile(user)} /><Button label={id ? 'Jadwal' : 'Schedule'} tone="quiet" onPress={() => router.push(('/schedule?counselor=' + user.user_id) as Href)} /></>}<Button label={id ? 'Ubah' : 'Edit'} tone="quiet" onPress={() => setForm(user)} /><Button label={id ? 'Hapus' : 'Delete'} tone="danger" onPress={() => { setError(''); setDeleting(user); }} /></View> },
      ]} /><Pagination page={current} total={rows.length} size={10} onChange={setPage} /></>}
    </Card>
    {form && <AccountForm user={form === 'new' ? undefined : form} initialRole={role} lockRole onClose={() => setForm(null)} onSaved={() => { setForm(null); setSuccess(id ? 'Akun berhasil disimpan.' : 'Account saved successfully.'); accounts.reload(); }} />}
    <Dialog title={id ? 'Hapus akun?' : 'Delete account?'} visible={!!deleting} onClose={() => setDeleting(null)} busy={busy}><Notice danger>{id ? 'Penghapusan mengikuti cascade database yang ada dan tidak dapat dibatalkan.' : 'Deletion follows existing database cascades and cannot be undone.'}</Notice>{error && <ErrorState message={error} />}<Button label={busy ? (id ? 'Menghapus…' : 'Deleting…') : (id ? 'Ya, hapus akun' : 'Yes, delete account')} tone="danger" disabled={busy} onPress={() => { void remove(); }} /></Dialog>
    <Dialog title={id ? 'Profil konselor' : 'Counselor profile'} visible={!!profile} onClose={() => setProfile(null)}>{profile && <CounselorDetail user={profile} preview={counselorProfile(profile)} id={id} />}</Dialog>
  </Page>;
}

function CounselorDetail({ user, preview, id }: { user: UserRow; preview?: { title?: string | null; specialization?: string | null; active?: boolean }; id: boolean }) {
  return <View style={{ gap: 16 }}><View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={user.nama} /><View style={{ flex: 1 }}><Text style={ui.heading}>{user.nama}</Text><Text style={ui.muted}>{user.email}</Text></View><Badge value={preview?.active === false ? 'inactive' : 'active'} /></View>
    <View style={ui.grid}><View style={ui.column}><Text style={ui.muted}>{id ? 'GELAR' : 'TITLE'}</Text><Text style={ui.text}>{preview?.title || '—'}</Text></View><View style={ui.column}><Text style={ui.muted}>{id ? 'SPESIALISASI' : 'SPECIALIZATION'}</Text><Text style={ui.text}>{preview?.specialization || '—'}</Text></View></View><Button label={id ? 'Kelola ketersediaan' : 'Manage availability'} onPress={() => router.push(('/schedule?counselor=' + user.user_id) as Href)} />
  </View>;
}
