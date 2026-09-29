// Period report for admins: assessments, counseling bookings and app activity, with CSV export.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { apiGetAnalytics, apiGetInsights, type AnalyticsResponse, type StudentInsights } from '@prototype/api-client';
import { Page, Card, Stat, Grid, Btn, Bars, Columns, Segmented, Empty, Loading, MOOD, useRole, isAdmin, fmtDate, lastDays } from '../../components/Dash';
import { T, F, Neu } from '../../constants/sajiwa';

type Range = '7' | '30' | '90';

const SEVERITY: Record<string, { label: string; color: string }> = {
  minimal: { label: 'Minimal', color: T.sage },
  mild: { label: 'Ringan', color: '#5C7FA3' },
  moderate: { label: 'Sedang', color: T.amber },
  severe: { label: 'Berat', color: T.coral },
};
const BOOKING: Record<string, { label: string; color: string }> = {
  menunggu: { label: 'Menunggu', color: T.amber },
  dikonfirmasi: { label: 'Dikonfirmasi', color: T.primary },
  selesai: { label: 'Selesai', color: T.sage },
  dibatalkan: { label: 'Dibatalkan', color: T.coral },
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsScreen() {
  const user = useRole();
  const [range, setRange] = useState<Range>('30');
  const [a, setA] = useState<AnalyticsResponse | null>(null);
  const [ins, setIns] = useState<StudentInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setA(null);
    setError(null);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (Number(range) - 1));
    try {
      const [an, insight] = await Promise.all([apiGetAnalytics(iso(start), iso(end)), apiGetInsights(Number(range))]);
      setA(an);
      setIns(insight);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat laporan');
    }
  };
  useEffect(() => { if (isAdmin(user?.role)) load(); }, [range]);

  const exportCsv = () => {
    if (!a || !ins) return;
    const rows: (string | number)[][] = [
      ['Laporan Sajiwa', `${a.date_from} s/d ${a.date_to}`],
      [],
      ['Ringkasan', 'Nilai'],
      ['Mahasiswa terdaftar', a.registered_students],
      ['Mahasiswa aktif di aplikasi', ins.students_active],
      ['Asesmen', a.assessment_total],
      ['Booking konseling', a.booking_total],
      ['Jurnal', ins.journals_total],
      ['Check-in cepat', ins.checkins_total],
      ['Sesi chat', ins.chat_sessions_total],
      [],
      ['Tingkat asesmen', 'Jumlah'],
      ...a.severity_distribution.map((r) => [SEVERITY[r.severity]?.label ?? r.severity, r.count]),
      [],
      ['Status booking', 'Jumlah'],
      ...a.booking_status.map((r) => [BOOKING[r.status]?.label ?? r.status, r.count]),
      [],
      ['Suasana hati', 'Jumlah'],
      ...Object.entries(ins.mood_distribution).map(([k, v]) => [MOOD[k]?.label ?? k, v ?? 0]),
      [],
      ['Tanggal', 'Asesmen'],
      ...a.assessment_trend.map((r) => [r.date, r.count]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-sajiwa-${a.date_from}-${a.date_to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isAdmin(user?.role)) {
    return (
      <Page title="Laporan">
        <Card><Empty face="berpikir" title="Laporan khusus admin" body="Halaman ini hanya bisa dibuka oleh admin dan pemangku jabatan." /></Card>
      </Page>
    );
  }

  const trendCols = a
    ? lastDays(Number(range)).map((d) => ({
        label: range === '90' ? '' : new Date(d).getDate().toString(),
        parts: [{ value: a.assessment_trend.find((r) => String(r.date).slice(0, 10) === d)?.count ?? 0, color: T.primary }],
      }))
    : [];

  return (
    <Page
      title="Laporan"
      subtitle={a ? `Periode ${fmtDate(a.date_from)} sampai ${fmtDate(a.date_to)}` : 'Rekap layanan per periode'}
      actions={
        <>
          <Segmented<Range> value={range} onChange={setRange} items={[{ key: '7', label: '7 hari' }, { key: '30', label: '30 hari' }, { key: '90', label: '90 hari' }]} />
          <Btn label="Unduh CSV" icon="download" kind="primary" onPress={exportCsv} disabled={!a} />
        </>
      }
    >
      {error ? (
        <Card><Empty face="berpikir" title="Laporan belum bisa dimuat" body={error} action={<Btn label="Coba lagi" icon="refresh" onPress={load} />} /></Card>
      ) : !a || !ins ? (
        <Loading />
      ) : (
        <>
          <Grid min={200}>
            <Stat icon="school" tone="navy" value={a.registered_students} label="Mahasiswa terdaftar" hint={`${ins.students_active} aktif di aplikasi`} />
            <Stat icon="assignment" tone="sage" value={a.assessment_total} label="Asesmen" hint="pada periode ini" />
            <Stat icon="event-available" tone="amber" value={a.booking_total} label="Booking konseling" hint="berdasarkan tanggal sesi" />
            <Stat icon="forum" tone="navy" value={ins.chat_sessions_total} label="Sesi chat" hint={`${ins.journals_total} jurnal, ${ins.checkins_total} check-in`} />
          </Grid>

          <View style={s.two}>
            <Card title="Tingkat hasil asesmen" style={{ flex: 1, minWidth: 320 }}>
              {a.assessment_total ? (
                <Bars rows={Object.keys(SEVERITY).map((k) => ({ label: SEVERITY[k].label, value: a.severity_distribution.find((r) => r.severity === k)?.count ?? 0, color: SEVERITY[k].color }))} />
              ) : <Empty face="berpikir" title="Belum ada asesmen" />}
            </Card>
            <Card title="Status booking konseling" style={{ flex: 1, minWidth: 320 }}>
              {a.booking_total ? (
                <Bars rows={Object.keys(BOOKING).map((k) => ({ label: BOOKING[k].label, value: a.booking_status.find((r) => r.status === k)?.count ?? 0, color: BOOKING[k].color }))} />
              ) : <Empty face="berpikir" title="Belum ada booking" />}
            </Card>
          </View>

          <Card title="Asesmen per hari">
            <Columns days={trendCols} height={130} />
          </Card>

          <View style={s.note}>
            <Text style={s.noteTxt}>
              File CSV berisi angka ringkasan saja (tanpa nama mahasiswa atau isi percakapan), aman untuk dilampirkan di laporan unit.
            </Text>
          </View>
        </>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  two: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  note: { padding: 16, borderRadius: 18, backgroundColor: T.bg, boxShadow: Neu.inset },
  noteTxt: { fontSize: 13, lineHeight: 19, fontFamily: F.medium, color: T.sub },
});
