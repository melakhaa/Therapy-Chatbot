import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { apiCreateSchedule, apiGetIncomingBookings, apiGetOwnSchedules, apiUpdateBooking, type BookingStatus, type IncomingBooking } from '@prototype/api-client';
import { useAdminProfile } from '@/components/admin/AdminAuth';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { Badge, Button, Card, DataTable, Dialog, ErrorState, Field, FilterControl, LoadingState, Notice, Page, formatDate, ui } from '@/components/ui';
export default function Counseling() {
  const profile = useAdminProfile(); const allowed = profile.role === 'admin' || profile.role === 'konselor';
  const schedules = useAdminResource(apiGetOwnSchedules, allowed); const bookings = useAdminResource(apiGetIncomingBookings, allowed);
  const [tab, setTab] = useState('bookings'); const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false); const [date, setDate] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [selected, setSelected] = useState<IncomingBooking | null>(null);
  const [pending, setPending] = useState<BookingStatus | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState('');
  const refresh = () => { schedules.reload(); bookings.reload(); };
  const create = async () => {
    if (busy) return;
    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!dateValid || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) { setError('Isi tanggal YYYY-MM-DD dan jam HH:MM yang valid. Jam selesai harus setelah jam mulai.'); return; }
    setBusy(true); setError(null);
    try { await apiCreateSchedule({ tanggal: date, waktu_mulai: start, waktu_selesai: end }); setCreating(false); setDate(''); setStart(''); setEnd(''); setSuccess('Jadwal berhasil dibuat.'); refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const update = async () => {
    if (!selected || !pending || busy) return;
    setBusy(true); setError(null);
    try { await apiUpdateBooking(selected.booking_id, pending); setSelected(null); setPending(null); setSuccess('Status booking berhasil diperbarui.'); refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <Page title="Counseling" subtitle="Jadwal dan booking untuk akun Anda, bukan kalender seluruh organisasi." action={allowed ? <Button icon="add" label="Tambah jadwal" onPress={() => { setError(null); setCreating(true); }} /> : undefined}>
    {!allowed ? <Notice danger>API jadwal saat ini hanya mengizinkan konselor dan admin. Akses pemangku jabatan tidak diperluas melalui halaman ini.</Notice> : <>
      {success && <Notice>{success}</Notice>}
      <View style={ui.row}><FilterControl label="Tampilan" value={tab} onChange={setTab} options={[{ value: 'bookings', label: 'Booking masuk' }, { value: 'schedules', label: 'Jadwal saya' }]} /><Button label="Perbarui" icon="refresh" tone="quiet" onPress={refresh} /></View>
      {tab === 'schedules' ? <Card title="Jadwal saya" subtitle="Tanggal dan waktu sesuai catatan jadwal">{schedules.loading ? <LoadingState /> : schedules.error ? <ErrorState message={schedules.error} retry={schedules.reload} /> : <DataTable rows={schedules.data?.jadwal || []} rowKey={r => r.jadwal_id} columns={[
        { title: 'Tanggal', width: 150, render: r => <Text style={ui.text}>{formatDate(r.tanggal)}</Text> },
        { title: 'Mulai', width: 100, render: r => <Text style={ui.text}>{r.waktu_mulai.slice(0, 5)}</Text> },
        { title: 'Selesai', width: 100, render: r => <Text style={ui.text}>{r.waktu_selesai.slice(0, 5)}</Text> },
        { title: 'Status jadwal', width: 150, render: r => <Badge value={r.status} /> },
      ]} />}</Card> : <Card title="Booking masuk" subtitle="Booking pada jadwal milik Anda">
        <FilterControl label="Status booking" value={filter} onChange={setFilter} options={[{ value: '', label: 'Semua' }, ...['menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan'].map(v => ({ value: v, label: v }))]} />
        {bookings.loading ? <LoadingState /> : bookings.error ? <ErrorState message={bookings.error} retry={bookings.reload} /> : <DataTable rows={(bookings.data?.bookings || []).filter(b => !filter || b.status === filter)} rowKey={r => r.booking_id} columns={[
          { title: 'Booking', width: 130, render: r => <Text style={ui.text}>{r.booking_id.slice(0, 8)}</Text> },
          { title: 'Tanggal', width: 140, render: r => <Text style={ui.text}>{formatDate(r.jadwal_konsultasi.tanggal)}</Text> },
          { title: 'Waktu', width: 140, render: r => <Text style={ui.text}>{r.jadwal_konsultasi.waktu_mulai.slice(0, 5)}–{r.jadwal_konsultasi.waktu_selesai.slice(0, 5)}</Text> },
          { title: 'Status', width: 140, render: r => <Badge value={r.status} /> },
          { title: 'Tindakan', width: 100, render: r => <Button label="Detail" tone="quiet" onPress={() => { setSelected(r); setPending(null); setError(null); }} /> },
        ]} />}
        <Text style={ui.muted}>Identitas pemesan tidak disediakan oleh API booking masuk. ID booking digunakan tanpa menebak identitas mahasiswa.</Text>
      </Card>}
    </>}
    <Dialog title="Tambah jadwal saya" visible={creating} onClose={() => setCreating(false)} busy={busy}>
      <Field label="Tanggal (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" editable={!busy} />
      <Field label="Mulai (HH:MM)" value={start} onChangeText={setStart} placeholder="09:00" editable={!busy} />
      <Field label="Selesai (HH:MM)" value={end} onChangeText={setEnd} placeholder="10:00" editable={!busy} />
      <Text style={ui.muted}>Jadwal akan dibuat atas nama akun Anda.</Text>{error && <ErrorState message={error} />}<Button label={busy ? 'Menyimpan…' : 'Simpan jadwal'} disabled={busy} onPress={() => { void create(); }} />
    </Dialog>
    <Dialog title="Detail booking" visible={!!selected} onClose={() => { setSelected(null); setPending(null); }} busy={busy}>
      {selected && <><Badge value={selected.status} /><Text selectable style={ui.muted}>ID: {selected.booking_id}</Text><Text style={ui.heading}>{formatDate(selected.jadwal_konsultasi.tanggal)} · {selected.jadwal_konsultasi.waktu_mulai.slice(0, 5)}–{selected.jadwal_konsultasi.waktu_selesai.slice(0, 5)}</Text><Text style={ui.muted}>Catatan booking · rahasia</Text><Text style={ui.text}>{selected.catatan || 'Tidak ada catatan.'}</Text>
        {!['selesai', 'dibatalkan'].includes(selected.status) && <View style={ui.row}>{selected.status === 'menunggu' && <Button label="Konfirmasi" disabled={busy} onPress={() => setPending('dikonfirmasi')} />}{selected.status === 'dikonfirmasi' && <Button label="Tandai selesai" disabled={busy} onPress={() => setPending('selesai')} />}<Button label="Batalkan booking" tone="danger" disabled={busy} onPress={() => setPending('dibatalkan')} /></View>}
        {pending && <><Notice danger={pending === 'dibatalkan'}>Ubah status booking menjadi {pending}? {pending === 'dibatalkan' ? 'Slot akan tersedia kembali.' : ''}</Notice><Button label={busy ? 'Menyimpan…' : 'Ya, ubah status'} disabled={busy} onPress={() => { void update(); }} /></>}
      </>}{error && <ErrorState message={error} />}
    </Dialog>
  </Page>;
}
