import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { apiGetAccounts } from '@/services/adminData';
import { apiCreateOrganizationSchedule, apiGetOrganizationSchedules } from '@/services/operationsData';
import { previewAvailability, previewCalendarEntries, previewCounselingRequests, previewCounselorProfiles, type CalendarEntryView, type CounselingRequestView } from '@/services/adminProductData';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { OperationalMetric, SectionHeader } from '@/components/admin/OperationsUI';
import { BackendPending, SegmentedControl } from '@/components/admin/ProductPrimitives';
import { useAdminExperience } from '@/components/admin/AdminExperience';
import { Badge, Button, Card, DataTable, Dialog, ErrorState, Field, FilterControl, LoadingState, Notice, Page, formatDate, ui } from '@/components/ui';
import { adminTheme as c } from '@/constants/adminTheme';

type WorkspaceView = 'week' | 'month' | 'list';
type WorkspaceTab = 'calendar' | 'requests' | 'availability';
const tone: Record<CalendarEntryView['kind'], { color: string; background: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = {
  appointment: { color: c.blue, background: c.blueSoft, icon: 'event' }, available: { color: c.success, background: c.successSoft, icon: 'event-available' },
  blocked: { color: c.muted, background: c.surfaceMuted, icon: 'block' }, conflict: { color: c.danger, background: c.dangerSoft, icon: 'warning-amber' },
};

export default function CounselingSchedule() {
  const params = useLocalSearchParams<{ counselor?: string }>();
  const { width } = useWindowDimensions();
  const { language } = useAdminExperience();
  const id = language === 'id';
  const [tab, setTab] = useState<WorkspaceTab>('calendar'), [view, setView] = useState<WorkspaceView>('week');
  const [counselor, setCounselor] = useState(typeof params.counselor === 'string' ? params.counselor : ''), [status, setStatus] = useState('');
  const [periodOffset, setPeriodOffset] = useState(0), [selected, setSelected] = useState<CalendarEntryView | null>(null), [request, setRequest] = useState<CounselingRequestView | null>(null);
  const [entries, setEntries] = useState(previewCalendarEntries), [requests, setRequests] = useState(previewCounselingRequests), [availability, setAvailability] = useState(previewAvailability);
  const [creating, setCreating] = useState(false), [date, setDate] = useState(''), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const loader = useCallback(() => apiGetOrganizationSchedules({ counselor_id: counselor || undefined }), [counselor]);
  const resource = useAdminResource(loader); const accounts = useAdminResource(apiGetAccounts);
  const counselors = (accounts.data?.users || []).filter(user => user.role === 'konselor');
  const apiEntries = useMemo<CalendarEntryView[]>(() => (resource.data?.schedules || []).map(item => ({ id: item.jadwal_id, date: item.tanggal, start: item.waktu_mulai.slice(0, 5), end: item.waktu_selesai.slice(0, 5), counselorId: item.konselor_id, counselor: item.counselor_name, kind: item.status === 'tersedia' ? 'available' : item.status === 'dibatalkan' ? 'blocked' : 'appointment', status: item.booking_status || item.status })), [resource.data]);
  const sourceEntries = false ? entries : apiEntries;
  const filtered = sourceEntries.filter(item => (!counselor || item.counselorId === counselor) && (!status || item.status === status || item.kind === status));
  const days = [...new Set(filtered.map(item => item.date))].sort();
  const counselorOptions = false ? previewCounselorProfiles.map(item => ({ value: item.id, label: item.name })) : counselors.map(item => ({ value: item.user_id, label: item.nama }));

  const createSlot = async () => {
    const valid = counselor && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(end) && end > start;
    if (!valid) { setError(id ? 'Pilih konselor serta tanggal dan waktu yang valid.' : 'Select a counselor and valid date/time range.'); return; }
    setBusy('create'); setError('');
    try {
      await apiCreateOrganizationSchedule({ counselor_id: counselor, tanggal: date, waktu_mulai: start, waktu_selesai: end });
      setCreating(false); setDate(''); setStart(''); setEnd(''); setMessage(id ? 'Slot jadwal berhasil dibuat.' : 'Schedule slot created.'); resource.reload();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); }
  };
  const previewAction = (action: string) => {
    if (!false || !selected) return;
    setEntries(current => current.map(item => item.id === selected.id ? { ...item, status: action, kind: action === 'cancelled' ? 'blocked' : item.kind } : item));
    setSelected(current => current ? { ...current, status: action } : null);
    setMessage(id ? 'Perubahan simulasi disimpan hanya pada sesi preview lokal.' : 'Simulated change saved only for this local preview session.');
  };
  const handleRequest = () => {
    if (!request || !false) return;
    setRequests(current => current.map(item => item.id === request.id ? { ...item, status: 'assigned' } : item)); setRequest(null);
    setMessage(id ? 'Permintaan ditugaskan dalam preview sintetis.' : 'Request assigned in synthetic preview.');
  };
  const compactCalendar = width < 820;

  return <Page title={id ? 'Ruang Kerja Konseling' : 'Counseling Workspace'} subtitle={id ? 'Koordinasikan permintaan, kapasitas konselor, dan jadwal dalam satu ruang operasional.' : 'Coordinate requests, counselor capacity, and schedules in one operational workspace.'} action={<Button label={id ? 'Buat slot manual' : 'Create manual slot'} icon="add" onPress={() => setCreating(true)} />}>
    <View style={ui.grid}>
      <OperationalMetric label={id ? 'Permintaan menunggu' : 'Waiting requests'} value={false ? requests.filter(item => item.status === 'waiting').length : '—'} note={false ? 'Synthetic preview queue' : 'Backend pending'} icon="pending-actions" tone="amber" />
      <OperationalMetric label={id ? 'Janji temu' : 'Appointments'} value={filtered.filter(item => item.kind === 'appointment').length} note={id ? 'Pada cakupan saat ini' : 'Current workspace scope'} icon="event" tone="blue" />
      <OperationalMetric label={id ? 'Kapasitas terbuka' : 'Open capacity'} value={filtered.filter(item => item.kind === 'available').length} note={id ? 'Slot tersedia' : 'Available schedule slots'} icon="event-available" />
      <OperationalMetric label={id ? 'Konflik' : 'Conflicts'} value={false ? filtered.filter(item => item.kind === 'conflict').length : '—'} note={false ? 'UX validation only' : 'Backend pending'} icon="warning-amber" tone="red" />
    </View>
    {message && <Notice>{message}</Notice>}
    <Card><View style={[ui.row, { justifyContent: 'space-between' }]}>
      <SegmentedControl value={tab} onChange={value => setTab(value as WorkspaceTab)} options={[{ value: 'calendar', label: id ? 'Kalender' : 'Calendar', icon: 'calendar-month' }, { value: 'requests', label: id ? 'Antrean permintaan' : 'Request queue', icon: 'pending-actions' }, { value: 'availability', label: id ? 'Ketersediaan' : 'Availability', icon: 'schedule' }]} />
      <View style={ui.row}><FilterControl label={id ? 'Konselor' : 'Counselor'} value={counselor} onChange={setCounselor} options={[{ value: '', label: id ? 'Semua konselor' : 'All counselors' }, ...counselorOptions]} /><Button label={id ? 'Muat ulang' : 'Refresh'} icon="refresh" tone="quiet" onPress={resource.reload} /></View>
    </View></Card>

    {tab === 'calendar' && <>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <SegmentedControl value={view} onChange={value => setView(value as WorkspaceView)} options={[{ value: 'week', label: id ? 'Minggu' : 'Week' }, { value: 'month', label: id ? 'Bulan' : 'Month' }, { value: 'list', label: id ? 'Daftar' : 'List' }]} />
        <View style={ui.row}><Button label="‹" tone="quiet" onPress={() => setPeriodOffset(value => value - 1)} /><Button label={id ? 'Hari ini' : 'Today'} tone="quiet" onPress={() => setPeriodOffset(0)} /><Button label="›" tone="quiet" onPress={() => setPeriodOffset(value => value + 1)} /><Text style={ui.muted}>{periodOffset === 0 ? (id ? 'Periode saat ini' : 'Current period') : (periodOffset > 0 ? '+' : '') + periodOffset}</Text></View>
      </View>
      <View style={ui.row}><FilterControl label={id ? 'Status' : 'Status'} value={status} onChange={setStatus} options={[{ value: '', label: id ? 'Semua' : 'All' }, { value: 'appointment', label: id ? 'Janji temu' : 'Appointments' }, { value: 'available', label: id ? 'Tersedia' : 'Available' }, { value: 'blocked', label: id ? 'Diblokir' : 'Blocked' }, ...(false ? [{ value: 'conflict', label: id ? 'Konflik' : 'Conflict' }] : [])]} /></View>
      {resource.loading && !false ? <LoadingState /> : resource.error && !false ? <ErrorState message={resource.error} retry={resource.reload} /> :
      view === 'list' || compactCalendar ? <Card title={compactCalendar && view !== 'list' ? (id ? 'Kalender adaptif' : 'Adaptive calendar') : undefined} subtitle={compactCalendar && view !== 'list' ? (id ? 'Tampilan daftar digunakan pada layar sempit agar jadwal tetap mudah dibaca.' : 'List view is used on narrow screens to keep schedules readable.') : undefined}><ScheduleList entries={filtered} onSelect={setSelected} id={id} /></Card> :
      view === 'month' ? <MonthCalendar entries={filtered} onSelect={setSelected} id={id} /> :
      <WeekCalendar entries={filtered} days={days} onSelect={setSelected} id={id} />}
      {false && filtered.some(item => item.kind === 'conflict') && <Notice danger>{id ? 'Indikator konflik adalah validasi UX preview. Perlindungan konkurensi yang otoritatif tetap memerlukan backend dan constraint database.' : 'Conflict indicators are preview UX validation. Authoritative concurrency protection still requires backend and database constraints.'}</Notice>}
    </>}

    {tab === 'requests' && <Card><SectionHeader title={id ? 'Antrean permintaan konseling' : 'Counseling request queue'} description={id ? 'Alur masa depan: tinjau → pilih konselor → pilih waktu → konfirmasi.' : 'Future flow: review → assign counselor → select time → confirm.'} />
      {false ? <DataTable rows={requests} rowKey={item => item.id} columns={[
        { title: id ? 'Mahasiswa' : 'Student', width: 220, render: item => <View><Text style={[ui.text, { fontWeight: '800' }]}>{item.student}</Text><Text style={ui.muted}>{item.nim}</Text></View> },
        { title: id ? 'Diajukan' : 'Requested', width: 140, render: item => <Text style={ui.muted}>{formatDate(item.requestedAt)}</Text> },
        { title: id ? 'Preferensi' : 'Preference', width: 160, render: item => <Text style={ui.text}>{item.preference}</Text> },
        { title: 'Status', width: 120, render: item => <Badge value={item.status} /> },
        { title: id ? 'Tindakan' : 'Action', width: 150, render: item => <Button label={item.status === 'waiting' ? (id ? 'Tinjau & tugaskan' : 'Review & assign') : (id ? 'Lihat penugasan' : 'View assignment')} tone="quiet" onPress={() => setRequest(item)} /> },
      ]} /> : <BackendPending detail={id ? 'API saat ini hanya menyediakan slot dan booking yang sudah terkait. Booking tersebut tidak diubah maknanya menjadi permintaan tanpa penugasan.' : 'The current API only exposes slots and linked bookings. Those bookings are not reinterpreted as unassigned requests.'} />}
    </Card>}

    {tab === 'availability' && <View style={ui.grid}><View style={[ui.column, { flexBasis: 520 }]}><Card><SectionHeader title={id ? 'Ketersediaan berulang' : 'Recurring availability'} description={id ? 'Aturan mingguan dan status aktif.' : 'Weekly rules and active state.'} />
      {false ? <View style={{ gap: 9 }}>{availability.map(rule => { const person = previewCounselorProfiles.find(item => item.id === rule.counselorId); return <View key={rule.id} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, backgroundColor: c.surfaceMuted, gap: 7 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={[ui.text, { fontWeight: '800' }]}>{rule.day} · {rule.start}–{rule.end}</Text><Badge value={rule.active ? 'active' : 'inactive'} /></View><Text style={ui.muted}>{person?.name}</Text><Button label={rule.active ? (id ? 'Nonaktifkan' : 'Deactivate') : (id ? 'Aktifkan' : 'Activate')} tone="quiet" onPress={() => setAvailability(current => current.map(item => item.id === rule.id ? { ...item, active: !item.active } : item))} /></View>; })}<Button label={id ? 'Tambah aturan berulang' : 'Add recurring rule'} icon="add" onPress={() => setMessage(id ? 'Editor aturan didemonstrasikan pada preview; perubahan tidak persisten.' : 'Rule editor is demonstrated in preview; changes are not persistent.')} /></View> : <BackendPending detail={id ? 'Backend saat ini mendukung slot manual, belum memiliki aturan ketersediaan berulang atau waktu terblokir.' : 'The current backend supports manual slots, but not recurring availability or blocked-time rules.'} />}
    </Card></View><View style={[ui.column, { flexBasis: 340 }]}><Card title={id ? 'Panduan konflik' : 'Conflict guidance'}><ConflictGuide id={id} /><Notice>{id ? 'Pemeriksaan frontend membantu pengguna, tetapi bukan perlindungan konkurensi.' : 'Frontend checks assist users but do not provide concurrency protection.'}</Notice></Card></View></View>}

    <Dialog title={id ? 'Detail janji temu' : 'Appointment details'} visible={!!selected} onClose={() => setSelected(null)}>
      {selected && <><View style={{ backgroundColor: tone[selected.kind].background, borderRadius: 12, padding: 14, gap: 6 }}><View style={ui.row}><MaterialIcons name={tone[selected.kind].icon} color={tone[selected.kind].color} size={20} /><Badge value={selected.status} /></View><Text style={ui.heading}>{formatDate(selected.date)} · {selected.start}–{selected.end}</Text><Text style={ui.text}>{selected.counselor}</Text><Text style={ui.muted}>{selected.student || (id ? 'Tidak ada mahasiswa terkait' : 'No linked student')}</Text></View>
      {false ? <><View style={ui.row}><Button label={id ? 'Jadwalkan ulang' : 'Reschedule'} tone="quiet" onPress={() => previewAction('rescheduled')} /><Button label={id ? 'Selesaikan' : 'Complete'} tone="quiet" onPress={() => previewAction('completed')} /><Button label="No-show" tone="quiet" onPress={() => previewAction('no_show')} /><Button label={id ? 'Batalkan' : 'Cancel'} tone="danger" onPress={() => previewAction('cancelled')} /></View><Field label={id ? 'Catatan administratif internal (preview)' : 'Internal administrative note (preview)'} placeholder={id ? 'Tidak masuk laporan atau notifikasi' : 'Excluded from reports and notifications'} multiline /></> : <BackendPending detail={id ? 'Penugasan, penggantian konselor, penjadwalan ulang, no-show, dan catatan internal memerlukan API baru. Tindakan yang didukung API lama tetap tersedia melalui status jadwal.' : 'Assignment, reassignment, rescheduling, no-show, and internal notes require new APIs. Existing schedule status operations remain available through current flows.'} />}</>}
    </Dialog>

    <Dialog title={id ? 'Tinjau dan tugaskan' : 'Review and assign'} visible={!!request} onClose={() => setRequest(null)}>
      {request && <><Notice>{request.student} · {request.nim}<br />{id ? 'Preferensi' : 'Preference'}: {request.preference}</Notice><FilterControl label={id ? 'Pilih konselor' : 'Select counselor'} value={counselor} onChange={setCounselor} options={counselorOptions} /><Field label={id ? 'Tanggal' : 'Date'} value={date} onChangeText={setDate} placeholder="2026-10-02" /><View style={ui.row}><Field label={id ? 'Mulai' : 'Start'} value={start} onChangeText={setStart} placeholder="09:00" /><Field label={id ? 'Selesai' : 'End'} value={end} onChangeText={setEnd} placeholder="10:00" /></View><Button label={id ? 'Konfirmasi penugasan preview' : 'Confirm preview assignment'} disabled={!counselor} onPress={handleRequest} /></>}
    </Dialog>

    <Dialog title={id ? 'Buat slot manual' : 'Create manual slot'} visible={creating} onClose={() => setCreating(false)} busy={!!busy}>
      <FilterControl label={id ? 'Konselor' : 'Counselor'} value={counselor} onChange={setCounselor} options={counselorOptions} /><Field label={id ? 'Tanggal (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} value={date} onChangeText={setDate} /><View style={ui.row}><Field label={id ? 'Mulai' : 'Start'} value={start} onChangeText={setStart} placeholder="09:00" /><Field label={id ? 'Selesai' : 'End'} value={end} onChangeText={setEnd} placeholder="10:00" /></View>{error && <ErrorState message={error} />}<Button label={busy ? (id ? 'Menyimpan…' : 'Saving…') : (id ? 'Buat slot' : 'Create slot')} disabled={!!busy} onPress={() => { void createSlot(); }} />
    </Dialog>
  </Page>;
}

function ScheduleList({ entries, onSelect, id }: { entries: CalendarEntryView[]; onSelect: (entry: CalendarEntryView) => void; id: boolean }) {
  return <DataTable rows={entries} rowKey={item => item.id} empty={id ? 'Tidak ada jadwal pada cakupan ini.' : 'No schedules in this scope.'} columns={[
    { title: id ? 'Tanggal & waktu' : 'Date & time', width: 180, render: item => <View><Text style={[ui.text, { fontWeight: '800' }]}>{formatDate(item.date)}</Text><Text style={ui.muted}>{item.start}–{item.end}</Text></View> },
    { title: id ? 'Konselor' : 'Counselor', width: 210, render: item => <Text style={ui.text}>{item.counselor}</Text> },
    { title: id ? 'Mahasiswa / kapasitas' : 'Student / capacity', width: 210, render: item => <Text style={ui.muted}>{item.student || (item.kind === 'available' ? (id ? 'Kapasitas terbuka' : 'Open capacity') : '—')}</Text> },
    { title: 'Status', width: 130, render: item => <Badge value={item.status} /> },
    { title: id ? 'Tindakan' : 'Action', width: 100, render: item => <Button label={id ? 'Detail' : 'Details'} tone="quiet" onPress={() => onSelect(item)} /> },
  ]} />;
}

function WeekCalendar({ entries, days, onSelect, id }: { entries: CalendarEntryView[]; days: string[]; onSelect: (entry: CalendarEntryView) => void; id: boolean }) {
  const shown = days.slice(0, 7);
  return <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: 'hidden', backgroundColor: c.surface }}>
    <ScrollView horizontal contentContainerStyle={{ minWidth: 980 }}><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', backgroundColor: c.surfaceMuted }}><View style={{ width: 72, padding: 12 }}><Text style={ui.muted}>WIB</Text></View>{shown.map(day => <View key={day} style={{ flex: 1, minWidth: 125, padding: 12, borderLeftWidth: 1, borderColor: c.border }}><Text style={[ui.text, { fontWeight: '800' }]}>{formatDate(day)}</Text></View>)}</View>
      <View style={{ flexDirection: 'row', minHeight: 430 }}><View style={{ width: 72, paddingVertical: 10 }}>{['08:00','10:00','12:00','14:00','16:00'].map(time => <Text key={time} style={[ui.muted, { height: 80, paddingHorizontal: 10 }]}>{time}</Text>)}</View>{shown.map(day => <View key={day} style={{ flex: 1, minWidth: 125, borderLeftWidth: 1, borderColor: c.border, padding: 7, gap: 7 }}>{entries.filter(item => item.date === day).map(entry => <CalendarBlock key={entry.id} entry={entry} onPress={() => onSelect(entry)} />)}</View>)}</View>
    </View></ScrollView>
  </View>;
}

function MonthCalendar({ entries, onSelect, id }: { entries: CalendarEntryView[]; onSelect: (entry: CalendarEntryView) => void; id: boolean }) {
  const cells = Array.from({ length: 35 }, (_, index) => index + 1);
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
    {cells.map(day => { const date = '2026-09-' + String(day).padStart(2, '0'); const rows = entries.filter(item => item.date === date); return <View key={day} style={{ width: '14.2857%', minWidth: 110, minHeight: 112, padding: 8, borderRightWidth: 1, borderBottomWidth: 1, borderColor: c.border, gap: 5 }}><Text style={[ui.muted, { fontWeight: '800' }]}>{day <= 30 ? day : day - 30}</Text>{rows.slice(0, 2).map(entry => <CalendarBlock key={entry.id} entry={entry} onPress={() => onSelect(entry)} compact />)}{rows.length > 2 && <Text style={ui.muted}>+{rows.length - 2} {id ? 'lainnya' : 'more'}</Text>}</View>; })}
  </View>;
}

function CalendarBlock({ entry, onPress, compact }: { entry: CalendarEntryView; onPress: () => void; compact?: boolean }) {
  const style = tone[entry.kind];
  return <Pressable accessibilityRole="button" accessibilityLabel={entry.counselor + ' ' + entry.start} onPress={onPress} style={({ pressed }) => ({ borderLeftWidth: 3, borderLeftColor: style.color, backgroundColor: style.background, borderRadius: 8, padding: compact ? 6 : 9, gap: 3, opacity: pressed ? 0.72 : 1 })}><Text numberOfLines={1} style={{ color: style.color, fontSize: compact ? 9 : 11, fontWeight: '900' }}>{entry.start} · {entry.kind}</Text><Text numberOfLines={1} style={{ color: c.text, fontSize: compact ? 9 : 11 }}>{entry.student || entry.counselor}</Text></Pressable>;
}

function ConflictGuide({ id }: { id: boolean }) {
  const items = id ? ['Konselor sudah memiliki janji temu', 'Mahasiswa memiliki jadwal lain', 'Waktu diblokir atau tidak tersedia', 'Rentang slot saling tumpang tindih', 'Tanggal atau waktu sudah lewat', 'Slot terisi tidak dapat dihapus'] : ['Counselor is already booked', 'Student has another appointment', 'Time is blocked or unavailable', 'Schedule ranges overlap', 'Date or time is in the past', 'Booked slots cannot be deleted'];
  return <View style={{ gap: 9 }}>{items.map(item => <View key={item} style={[ui.row, { flexWrap: 'nowrap' }]}><MaterialIcons name="error-outline" color={c.warning} size={17} /><Text style={[ui.muted, { flex: 1 }]}>{item}</Text></View>)}</View>;
}
