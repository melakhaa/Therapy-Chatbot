import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { apiDeleteAccount, apiGetAccounts, type UserRow } from '@/services/adminData';
import { apiGetOrganizationSchedules } from '@/services/operationsData';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader } from './OperationsUI';
import AccountForm from './AccountForm';
import { Avatar, Badge, Button, Card, DataTable, Dialog, ErrorState, LoadingState, Notice, Page, Pagination, SearchInput, formatDate, ui } from '@/components/ui';

export default function ManagedAccountDirectory({ role }: { role: 'mahasiswa' | 'konselor' }) {
  const students = role === 'mahasiswa';
  const accounts = useAdminResource(apiGetAccounts);
  const schedules = useAdminResource(apiGetOrganizationSchedules, !students);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [form, setForm] = useState<UserRow | 'new' | null>(null); const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const rows = useMemo(() => (accounts.data?.users || []).filter(user => user.role === role && [user.nama, user.email, user.nim || ''].some(value => value.toLowerCase().includes(search.toLowerCase()))), [accounts.data, role, search]);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  const upcoming = schedules.data?.schedules.filter(slot => !['selesai', 'dibatalkan'].includes(slot.status)).length || 0;
  const available = schedules.data?.schedules.filter(slot => slot.status === 'tersedia').length || 0;
  const remove = async () => { if (!deleting || busy) return; setBusy(true); setError(''); try { await apiDeleteAccount(deleting.user_id); setDeleting(null); setSuccess('Account removed successfully.'); accounts.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); } };
  return <Page title={students ? 'Student Management' : 'Counselor Management'} subtitle={students ? 'Manage student accounts and access student operational records.' : 'Manage counselor accounts and review their organization-wide schedule capacity.'} action={<Button label={students ? 'Add student' : 'Add counselor'} icon="person-add" onPress={() => { setSuccess(''); setForm('new'); }} />}>
    <View style={ui.grid}>
      <OperationalMetric label={students ? 'Student accounts' : 'Counselor accounts'} value={accounts.loading ? '…' : rows.length} note="Current filtered directory" icon={students ? 'school' : 'supervisor-account'} />
      {!students && <OperationalMetric label="Upcoming slots" value={schedules.loading ? '…' : upcoming} note="Not completed or cancelled" icon="calendar-month" tone="blue" />}
      {!students && <OperationalMetric label="Available slots" value={schedules.loading ? '…' : available} note="Current organization schedule" icon="event-available" tone="teal" />}
    </View>
    {success && <Notice>{success}</Notice>}
    <Card><SectionHeader title={students ? 'Student directory' : 'Counselor directory'} description="Only fields supported by the existing account schema are displayed." />
      <View style={ui.row}><SearchInput value={search} onChangeText={value => { setSearch(value); setPage(1); }} /><Button label="Refresh" icon="refresh" tone="quiet" onPress={() => { accounts.reload(); schedules.reload(); }} /></View>
      {accounts.loading ? <LoadingState /> : accounts.error ? <ErrorState message={accounts.error} retry={accounts.reload} /> : <><DataTable rows={rows.slice((current - 1) * 10, current * 10)} rowKey={user => user.user_id} empty={students ? 'No students match this search.' : 'No counselors match this search.'} columns={[
        { title: students ? 'Student' : 'Counselor', width: 250, render: user => <View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={user.nama} /><View style={{ flex: 1 }}><Text style={[ui.text, { fontWeight: '700' }]}>{user.nama}</Text><Text style={ui.muted}>{user.email}</Text></View></View> },
        ...(students ? [{ title: 'NIM', width: 130, render: (user: UserRow) => <Text style={ui.text}>{user.nim || '—'}</Text> }] : []),
        { title: 'Role', width: 125, render: user => <Badge value={user.role} /> },
        { title: 'Registered', width: 125, render: user => <Text style={ui.muted}>{formatDate(user.created_at)}</Text> },
        ...(!students ? [{ title: 'Schedule', width: 145, render: (user: UserRow) => { const slots = schedules.data?.schedules.filter(slot => slot.konselor_id === user.user_id) || []; return <View><Text style={[ui.text, { fontWeight: '700' }]}>{slots.length} slots</Text><Text style={ui.muted}>{slots.filter(slot => slot.status === 'tersedia').length} available</Text></View>; } }] : []),
        { title: 'Actions', width: 240, render: user => <View style={ui.row}>{students && <Button label="View" tone="quiet" onPress={() => router.push(('/students/' + user.user_id) as Href)} />}{!students && <Button label="Manage schedule" tone="quiet" onPress={() => router.push(('/schedule?counselor=' + user.user_id) as Href)} />}<Button label="Edit" tone="quiet" onPress={() => setForm(user)} /><Button label="Delete" tone="danger" onPress={() => { setError(''); setDeleting(user); }} /></View> },
      ]} /><Pagination page={current} total={rows.length} size={10} onChange={setPage} /></>}
    </Card>
    {form && <AccountForm user={form === 'new' ? undefined : form} initialRole={role} lockRole onClose={() => setForm(null)} onSaved={() => { setForm(null); setSuccess('Account saved successfully.'); accounts.reload(); }} />}
    <Dialog title="Delete account?" visible={!!deleting} onClose={() => setDeleting(null)} busy={busy}><Notice danger>Deleting {deleting?.nama} also removes related data according to existing database cascades. This cannot be undone.</Notice>{error && <ErrorState message={error} />}<Button label={busy ? 'Deleting…' : 'Yes, delete account'} tone="danger" disabled={busy} onPress={() => { void remove(); }} /></Dialog>
  </Page>;
}
