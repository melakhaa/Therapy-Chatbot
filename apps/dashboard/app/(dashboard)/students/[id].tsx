import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { apiGetUserDetail, apiGetUserAssessments, apiGetUserBookings } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { canManageUsers, useAdminProfile } from '@/components/admin/AdminAuth';
import AssessmentTable from '@/components/admin/AssessmentTable';
import { Avatar, Badge, Button, Card, DataTable, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, formatDate, ui } from '@/components/ui';
export default function StudentDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>(); const id = typeof raw === 'string' ? raw : '';
  const allowed = canManageUsers(useAdminProfile());
  const [tab, setTab] = useState('overview'); const [assessmentPage, setAssessmentPage] = useState(1); const [bookingPage, setBookingPage] = useState(1);
  const profile = useAdminResource(useCallback(() => apiGetUserDetail(id), [id]), allowed && !!id);
  const assessments = useAdminResource(useCallback(() => apiGetUserAssessments(id, assessmentPage), [id, assessmentPage]), !!id);
  const bookings = useAdminResource(useCallback(() => apiGetUserBookings(id, bookingPage), [id, bookingPage]), !!id && tab === 'counseling');
  const user = profile.data?.user;
  return <Page title="Student Detail / Case Review" subtitle="Rahasia · akses terbatas sesuai peran Anda." action={<Button label="Kembali" tone="quiet" onPress={() => router.push((allowed ? '/students' : '/risk') as Href)} />}>
    {profile.loading ? <LoadingState /> : profile.error ? <ErrorState message={profile.error} retry={profile.reload} /> : <Card><View style={ui.row}><Avatar name={user?.nama || 'ID'} /><View style={{ gap: 4, flex: 1 }}><Text style={ui.heading}>{user?.nama || 'Identitas dibatasi'}</Text><Text selectable style={ui.muted}>{user?.email || id}</Text></View>{user && <Badge value={user.role} />}</View></Card>}
    {!allowed && <Notice>Profil akun tidak tersedia untuk konselor. Hasil asesmen mengikuti izin yang ada; riwayat konseling hanya mencakup booking yang dapat Anda akses.</Notice>}
    <FilterControl label="Bagian" value={tab} onChange={v => { setTab(v); if (v === 'overview') setAssessmentPage(1); }} options={[{ value: 'overview', label: 'Overview' }, { value: 'assessments', label: 'Asesmen' }, { value: 'counseling', label: 'Riwayat konseling' }]} />
    {tab === 'overview' && <View style={ui.grid}><View style={ui.column}><Card title="Informasi pengguna">{user ? <><Text style={ui.text}>NIM: {user.nim || '—'}</Text><Text style={ui.text}>Terdaftar: {formatDate(user.created_at)}</Text><Text style={ui.text}>Peran: {user.role}</Text></> : <Text style={ui.muted}>Informasi profil tidak tersedia untuk sesi ini.</Text>}</Card></View><View style={ui.column}><Card title="Hasil asesmen terbaru" subtitle="Klasifikasi aplikasi yang tercatat">{assessments.loading ? <LoadingState /> : assessments.error ? <ErrorState message={assessments.error} retry={assessments.reload} /> : assessments.data?.assessments[0] ? <><Badge value={assessments.data.assessments[0].severity} /><Text style={ui.heading}>{assessments.data.assessments[0].instrument_type} · Skor {assessments.data.assessments[0].score}</Text><Text style={ui.muted}>{formatDate(assessments.data.assessments[0].taken_at)}</Text></> : <Text style={ui.muted}>Belum ada hasil asesmen.</Text>}</Card></View></View>}
    {tab === 'assessments' && <Card title="Riwayat asesmen">{assessments.loading ? <LoadingState /> : assessments.error ? <ErrorState message={assessments.error} retry={assessments.reload} /> : assessments.data && <><AssessmentTable rows={assessments.data.assessments} /><Pagination page={assessmentPage} total={assessments.data.total} onChange={setAssessmentPage} /></>}</Card>}
    {tab === 'counseling' && <Card title="Riwayat konseling" subtitle="Hanya booking yang diizinkan oleh akses database Anda">{bookings.loading ? <LoadingState /> : bookings.error ? <ErrorState message={bookings.error} retry={bookings.reload} /> : bookings.data && <><DataTable rows={bookings.data.bookings} rowKey={r => r.booking_id} columns={[
      { title: 'Tanggal', width: 140, render: r => <Text style={ui.text}>{formatDate(r.tanggal)}</Text> },
      { title: 'Waktu', width: 130, render: r => <Text style={ui.text}>{r.waktu_mulai.slice(0, 5)}–{r.waktu_selesai.slice(0, 5)}</Text> },
      { title: 'Status', width: 140, render: r => <Badge value={r.status} /> },
    ]} /><Pagination page={bookingPage} total={bookings.data.total} onChange={setBookingPage} /></>}</Card>}
  </Page>;
}
