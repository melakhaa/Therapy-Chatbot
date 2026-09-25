import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { apiGetUserAssessments, apiGetUserBookings, apiGetUserDetail } from '@/services/adminData';
import { useAdminResource } from '@/hooks/useAdminResource';
import AssessmentTable from './AssessmentTable';
import { Eyebrow, LabelValue, OperationalMetric, SectionHeader } from './OperationsUI';
import { Avatar, Badge, Button, Card, DataTable, ErrorState, FilterControl, LoadingState, Notice, Page, Pagination, formatDate, ui } from '@/components/ui';
import { adminTheme as c } from '@/constants/adminTheme';

export default function StudentDetailV2() {
  const { id: raw } = useLocalSearchParams<{ id: string }>(); const id = typeof raw === 'string' ? raw : '';
  const [tab, setTab] = useState('overview'); const [assessmentPage, setAssessmentPage] = useState(1); const [bookingPage, setBookingPage] = useState(1);
  const profile = useAdminResource(useCallback(() => apiGetUserDetail(id), [id]), !!id);
  const assessments = useAdminResource(useCallback(() => apiGetUserAssessments(id, assessmentPage), [id, assessmentPage]), !!id);
  const bookings = useAdminResource(useCallback(() => apiGetUserBookings(id, bookingPage), [id, bookingPage]), !!id && (tab === 'counseling' || tab === 'overview'));
  const user = profile.data?.user; const latest = assessments.data?.assessments[0];
  const compatible = useMemo(() => (assessments.data?.assessments || []).filter(item => item.instrument_type === latest?.instrument_type && item.taken_at).slice().reverse(), [assessments.data, latest]);
  const maxScore = Math.max(1, ...compatible.map(item => item.score));
  return <Page title="Student Detail" subtitle="Confidential operational view · identity, recorded assessments, and authorized counseling history." action={<Button label="Back to students" icon="arrow-back" tone="quiet" onPress={() => router.push('/students' as Href)} />}>
    {profile.loading ? <LoadingState /> : profile.error ? <ErrorState message={profile.error} retry={profile.reload} /> : user && <Card><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={[ui.row, { flex: 1, flexWrap: 'nowrap' }]}><Avatar name={user.nama} /><View style={{ flex: 1, gap: 3 }}><Eyebrow>CONFIDENTIAL STUDENT RECORD</Eyebrow><Text style={{ color: c.text, fontSize: 22, fontWeight: '800' }}>{user.nama}</Text><Text selectable style={ui.muted}>{user.email}</Text></View></View><Badge value={user.role} /></View><View style={[ui.row, { gap: 28 }]}><LabelValue label="NIM" value={user.nim || '—'} /><LabelValue label="Registered" value={formatDate(user.created_at)} /><LabelValue label="Record ID" value={user.user_id.slice(0, 8)} /></View></Card>}
    <FilterControl label="Student workspace" value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'assessments', label: 'Assessments' }, { value: 'counseling', label: 'Counseling' }]} />
    {tab === 'overview' && <>
      <View style={ui.grid}>
        <OperationalMetric label="Assessment records" value={assessments.data?.total ?? '—'} note="Recorded submissions for this student" icon="assignment" tone="purple" />
        <OperationalMetric label="Latest stress score" value={latest?.score ?? '—'} note={latest?.instrument_type || 'No result'} icon="monitor-heart" tone="amber" />
        <OperationalMetric label="Latest recorded level" value={latest?.severity || '—'} note={formatDate(latest?.taken_at)} icon="signal-cellular-alt" tone={latest?.severity === 'severe' ? 'red' : 'teal'} />
        <OperationalMetric label="Counseling records" value={bookings.data?.total ?? '—'} note="Authorized booking history" icon="event-note" tone="blue" />
      </View>
      <View style={ui.grid}><View style={[ui.column, { flexBasis: 500 }]}><Card title="Assessment timeline" subtitle={compatible.length > 1 ? `Comparable ${latest?.instrument_type} records` : 'A trend requires multiple compatible records'}>{assessments.loading ? <LoadingState /> : compatible.length > 1 ? <View style={{ gap: 13 }}>{compatible.map(item => <View key={item.assessment_id} style={{ gap: 6 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.muted}>{formatDate(item.taken_at)}</Text><Text style={[ui.text, { fontWeight: '700' }]}>{item.score} · {item.severity}</Text></View><View style={{ height: 8, borderRadius: 4, backgroundColor: c.background }}><View style={{ width: `${item.score / maxScore * 100}%`, height: 8, borderRadius: 4, backgroundColor: item.severity === 'severe' ? c.danger : item.severity === 'moderate' ? c.warning : c.primary }} /></View></View>)}</View> : <Text style={ui.muted}>No compatible multi-record trend is available. No history is fabricated.</Text>}</Card></View>
      <View style={[ui.column, { flexBasis: 350 }]}><Card title="Latest recorded result" subtitle="Operational assessment metadata only">{latest ? <View style={{ gap: 14 }}><Badge value={latest.severity} /><LabelValue label="Assessment" value={latest.instrument_type} /><LabelValue label="Recorded score" value={String(latest.score)} /><LabelValue label="Assessment date" value={formatDate(latest.taken_at)} /><Notice>Recorded classifications are not medical diagnoses.</Notice></View> : <Text style={ui.muted}>No assessment result is available.</Text>}</Card></View></View>
    </>}
    {tab === 'assessments' && <Card><SectionHeader title="Assessment history" description="Scores, stored classifications, and dates. Answers are not exposed." />{assessments.loading ? <LoadingState /> : assessments.error ? <ErrorState message={assessments.error} retry={assessments.reload} /> : assessments.data && <><AssessmentTable rows={assessments.data.assessments} /><Pagination page={assessmentPage} total={assessments.data.total} onChange={setAssessmentPage} /></>}</Card>}
    {tab === 'counseling' && <Card><SectionHeader title="Counseling history" description="Booking metadata authorized by the existing database policies." />{bookings.loading ? <LoadingState /> : bookings.error ? <ErrorState message={bookings.error} retry={bookings.reload} /> : bookings.data && <><DataTable rows={bookings.data.bookings} rowKey={row => row.booking_id} columns={[
      { title: 'Date', width: 150, render: row => <Text style={ui.text}>{formatDate(row.tanggal)}</Text> }, { title: 'Time', width: 140, render: row => <Text style={ui.text}>{row.waktu_mulai.slice(0, 5)}–{row.waktu_selesai.slice(0, 5)}</Text> }, { title: 'Booking status', width: 150, render: row => <Badge value={row.status} /> },
    ]} /><Pagination page={bookingPage} total={bookings.data.total} onChange={setBookingPage} /></>}</Card>}
  </Page>;
}
