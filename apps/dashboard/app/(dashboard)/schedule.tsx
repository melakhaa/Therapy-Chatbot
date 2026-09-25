import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiGetAccounts } from '@/services/adminData';
import { apiCreateOrganizationSchedule, apiGetOrganizationSchedules, apiUpdateOrganizationSchedule, type OrganizationSchedule } from '@/services/operationsData';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { Badge, Button, Card, DataTable, Dialog, ErrorState, Field, FilterControl, LoadingState, Notice, Page, formatDate, ui } from '@/components/ui';
import { adminTheme as c } from '@/constants/adminTheme';

export default function CounselingSchedule() {
  const params = useLocalSearchParams<{ counselor?: string }>();
  const [view, setView] = useState('calendar'); const [counselor, setCounselor] = useState(typeof params.counselor === 'string' ? params.counselor : '');
  const [creating, setCreating] = useState(false); const [date, setDate] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const loader = useCallback(() => apiGetOrganizationSchedules({ counselor_id: counselor || undefined }), [counselor]);
  const resource = useAdminResource(loader); const accounts = useAdminResource(apiGetAccounts);
  const counselors = (accounts.data?.users || []).filter(user => user.role === 'konselor');
  const rows = useMemo(() => resource.data?.schedules || [], [resource.data?.schedules]);
  const days = useMemo(() => [...new Set(rows.map(item => item.tanggal))].sort(), [rows]);
  const create = async () => {
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
    if (!counselor || !validDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) { setError('Select a counselor and enter a valid date/time range.'); return; }
    setBusy('create'); setError(''); try { await apiCreateOrganizationSchedule({ counselor_id: counselor, tanggal: date, waktu_mulai: start, waktu_selesai: end }); setCreating(false); setDate(''); setStart(''); setEnd(''); setSuccess('Schedule slot created.'); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); }
  };
  const update = async (slot: OrganizationSchedule, status: OrganizationSchedule['status']) => { setBusy(slot.jadwal_id); setError(''); try { await apiUpdateOrganizationSchedule(slot.jadwal_id, status); setSuccess('Schedule status updated.'); resource.reload(); } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); } };
  return <Page title="Counseling Schedule" subtitle="Manage counselor availability, organization-wide slots, and booking status context." action={<Button label="Create schedule slot" icon="add" onPress={() => { setError(''); setCreating(true); }} />}>
    <View style={ui.grid}>
      <OperationalMetric label="Schedule slots" value={rows.length} note="Current filtered organization view" icon="calendar-month" />
      <OperationalMetric label="Available" value={rows.filter(item => item.status === 'tersedia').length} note="Slots open for booking" icon="event-available" tone="teal" />
      <OperationalMetric label="Booked" value={rows.filter(item => item.status === 'dipesan').length} note="Slots with booking activity" icon="event-busy" tone="amber" />
      <OperationalMetric label="Counselors" value={counselors.length} note="Managed counselor accounts" icon="supervisor-account" tone="blue" />
    </View>
    {success && <Notice>{success}</Notice>}{error && !creating && <ErrorState message={error} />}
    <Card><View style={[ui.row, { justifyContent: 'space-between' }]}><FilterControl label="View" value={view} onChange={setView} options={[{ value: 'calendar', label: 'Calendar' }, { value: 'appointments', label: 'Appointments' }, { value: 'availability', label: 'Availability' }]} /><FilterControl label="Counselor" value={counselor} onChange={setCounselor} options={[{ value: '', label: 'All counselors' }, ...counselors.map(item => ({ value: item.user_id, label: item.nama }))]} /><Button label="Refresh" icon="refresh" tone="quiet" onPress={resource.reload} /></View></Card>
    {resource.loading ? <LoadingState /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : view === 'calendar' ? <>
      <SectionHeader title="Schedule calendar" description="Date-oriented operational view; no room or meeting-link data exists in the current schema." />
      <View style={ui.grid}>{days.map(day => <View key={day} style={[ui.column, { flexBasis: 260, flexGrow: 1 }]}><Card title={formatDate(day)} subtitle={`${rows.filter(item => item.tanggal === day).length} slots`}><View style={{ gap: 9 }}>{rows.filter(item => item.tanggal === day).map(slot => <View key={slot.jadwal_id} style={{ borderLeftWidth: 3, borderLeftColor: slot.status === 'tersedia' ? c.primary : c.warning, backgroundColor: c.background, borderRadius: 10, padding: 12, gap: 5 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={[ui.text, { fontWeight: '800' }]}>{slot.waktu_mulai.slice(0, 5)}–{slot.waktu_selesai.slice(0, 5)}</Text><Badge value={slot.status} /></View><Text style={ui.text}>{slot.counselor_name}</Text>{slot.booking_status && <Text style={ui.muted}>Booking: {slot.booking_status}</Text>}</View>)}</View></Card></View>)}</View>
    </> : <Card><SectionHeader title={view === 'availability' ? 'Availability slots' : 'Appointment operations'} description={view === 'availability' ? 'Slots currently marked available.' : 'Booked slots and associated booking status.'} /><DataTable rows={rows.filter(item => view === 'availability' ? item.status === 'tersedia' : !!item.booking_id)} rowKey={item => item.jadwal_id} columns={[
      { title: 'Date / time', width: 180, render: item => <View><Text style={[ui.text, { fontWeight: '700' }]}>{formatDate(item.tanggal)}</Text><Text style={ui.muted}>{item.waktu_mulai.slice(0, 5)}–{item.waktu_selesai.slice(0, 5)}</Text></View> },
      { title: 'Counselor', width: 210, render: item => <Text style={ui.text}>{item.counselor_name}</Text> },
      { title: 'Slot', width: 120, render: item => <Badge value={item.status} /> },
      { title: 'Booking', width: 130, render: item => item.booking_status ? <Badge value={item.booking_status} /> : <Text style={ui.muted}>No booking</Text> },
      { title: 'Actions', width: 210, render: item => <View style={ui.row}>{item.status === 'tersedia' && <Button label="Cancel slot" disabled={!!busy} tone="danger" onPress={() => { void update(item, 'dibatalkan'); }} />}{item.status === 'dipesan' && <Button label="Mark complete" disabled={!!busy} tone="quiet" onPress={() => { void update(item, 'selesai'); }} />}</View> },
    ]} /></Card>}
    <Dialog title="Create counselor schedule slot" visible={creating} onClose={() => setCreating(false)} busy={!!busy}>
      <FilterControl label="Counselor" value={counselor} onChange={setCounselor} options={counselors.map(item => ({ value: item.user_id, label: item.nama }))} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-02" /><View style={ui.row}><Field label="Start (HH:MM)" value={start} onChangeText={setStart} placeholder="09:00" /><Field label="End (HH:MM)" value={end} onChangeText={setEnd} placeholder="10:00" /></View>
      <Text style={ui.muted}>The current schema stores counselor, date, time, and status only.</Text>{error && <ErrorState message={error} />}<Button label={busy ? 'Creating…' : 'Create slot'} disabled={!!busy} onPress={() => { void create(); }} />
    </Dialog>
  </Page>;
}
