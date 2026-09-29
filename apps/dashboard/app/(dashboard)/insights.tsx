// How students are doing, from the mobile app's journals, quick check-ins and chats.
// Aggregates only (db/init/05_student_insights.sql): no journal or chat text, no names.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { apiGetInsights, type StudentInsights, type MoodKey } from '@prototype/api-client';
import { Page, Card, Stat, Grid, Btn, Bars, Columns, Segmented, Empty, Loading, MOOD, lastDays } from '../../components/Dash';
import { T, F, Neu, FACE } from '../../constants/sajiwa';

const MOODS: MoodKey[] = ['Calm', 'Focused', 'Tired', 'Anxious'];
type Range = '7' | '30' | '90';

export default function InsightsScreen() {
  const [range, setRange] = useState<Range>('30');
  const [data, setData] = useState<StudentInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setData(null);
    setError(null);
    try {
      setData(await apiGetInsights(Number(range)));
    } catch (e: any) {
      setError(e.message || 'Gagal memuat insight');
    }
  };
  useEffect(() => { load(); }, [range]);

  // Daily for 7/30 days; weekly buckets for 90 so the chart stays readable
  const moodCols = useMemo(() => {
    if (!data) return [];
    const days = lastDays(Number(range));
    const byDay: Record<string, Partial<Record<MoodKey, number>>> = {};
    data.mood_daily.forEach((r) => { (byDay[r.date] ??= {})[r.mood] = r.count; });
    const bucket = range === '90' ? 7 : 1;
    const out = [];
    for (let i = 0; i < days.length; i += bucket) {
      const slice = days.slice(i, i + bucket);
      out.push({
        label: new Date(slice[0]).toLocaleDateString('id-ID', { day: 'numeric', month: bucket > 1 || range === '30' ? 'short' : undefined, weekday: range === '7' ? 'short' : undefined }),
        parts: MOODS.map((m) => ({ value: slice.reduce((a, d) => a + (byDay[d]?.[m] ?? 0), 0), color: MOOD[m].color })),
      });
    }
    return out;
  }, [data, range]);

  const chatCols = useMemo(() => {
    if (!data) return [];
    const map = Object.fromEntries(data.chat_daily.map((r) => [r.date, r.count]));
    const days = lastDays(Number(range));
    const bucket = range === '90' ? 7 : 1;
    const out = [];
    for (let i = 0; i < days.length; i += bucket) {
      const slice = days.slice(i, i + bucket);
      out.push({
        label: new Date(slice[0]).toLocaleDateString('id-ID', { day: 'numeric', month: range === '7' ? undefined : 'short' }),
        parts: [{ value: slice.reduce((a, d) => a + (map[d] ?? 0), 0), color: T.primary }],
      });
    }
    return out;
  }, [data, range]);

  const moodTotal = data ? MOODS.reduce((a, m) => a + (data.mood_distribution[m] ?? 0), 0) : 0;
  const heavyShare = data && moodTotal ? Math.round((((data.mood_distribution.Anxious ?? 0) + (data.mood_distribution.Tired ?? 0)) / moodTotal) * 100) : 0;
  const topMood = data && moodTotal ? MOODS.reduce((a, m) => ((data.mood_distribution[m] ?? 0) > (data.mood_distribution[a] ?? 0) ? m : a), MOODS[0]) : null;

  return (
    <Page
      title="Insight Mahasiswa"
      subtitle="Gambaran kondisi mahasiswa dari jurnal, check-in suasana hati, dan chat di aplikasi Sajiwa."
      actions={
        <Segmented<Range>
          value={range}
          onChange={setRange}
          items={[{ key: '7', label: '7 hari' }, { key: '30', label: '30 hari' }, { key: '90', label: '90 hari' }]}
        />
      }
    >
      {error ? (
        <Card><Empty face="berpikir" title="Insight belum bisa dimuat" body={error} action={<Btn label="Coba lagi" icon="refresh" onPress={load} />} /></Card>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <Grid min={200}>
            <Stat icon="groups" tone="navy" value={data.students_active} label="Mahasiswa aktif" hint={`dari ${data.students_total} terdaftar`} />
            <Stat icon="person-add-alt" tone="sage" value={data.students_new} label="Pengguna baru" hint={`${data.days} hari terakhir`} />
            <Stat icon="edit-note" tone="sage" value={data.journals_total} label="Jurnal ditulis" hint={`+ ${data.checkins_total} check-in cepat`} />
            <Stat icon="forum" tone="navy" value={data.chat_sessions_total} label="Sesi chat" hint="dengan Sajiwa" />
          </Grid>

          {/* Plain-language reading first, charts second */}
          <View style={s.reading}>
            <View style={s.readingWell}>
              <Image source={heavyShare >= 50 ? FACE.tenang : FACE.senang} style={{ width: 92, height: 92, marginBottom: -6 }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.readingTitle}>
                {moodTotal === 0
                  ? 'Belum ada catatan suasana hati pada periode ini.'
                  : `${MOOD[topMood!].label} paling sering tercatat. ${heavyShare}% catatan menunjukkan cemas atau lelah.`}
              </Text>
              <Text style={s.readingBody}>
                {heavyShare >= 50
                  ? 'Porsi perasaan berat cukup tinggi. Pertimbangkan membuka lebih banyak slot konseling atau mengirim pengingat dukungan.'
                  : 'Kondisi relatif seimbang. Tetap pantau Peringatan Krisis untuk kasus individual.'}
              </Text>
            </View>
          </View>

          <View style={s.two}>
            <Card title="Komposisi suasana hati" hint={`${moodTotal} catatan bermood`} style={{ flex: 1, minWidth: 320 }}>
              {moodTotal ? (
                <Bars rows={MOODS.map((m) => ({ label: MOOD[m].label, value: data.mood_distribution[m] ?? 0, color: MOOD[m].color }))} />
              ) : (
                <Empty face="berpikir" title="Belum ada data" />
              )}
            </Card>
            <Card title="Suasana hati dari waktu ke waktu" hint={range === '90' ? 'Per minggu' : 'Per hari'} style={{ flex: 2, minWidth: 420 }}>
              <Columns days={moodCols} />
              <View style={s.legend}>
                {MOODS.map((m) => (
                  <View key={m} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: MOOD[m].color }]} />
                    <Text style={s.legendTxt}>{MOOD[m].label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          <Card title="Aktivitas chat dengan Sajiwa" hint={range === '90' ? 'Sesi per minggu' : 'Sesi per hari'}>
            <Columns days={chatCols} height={120} />
          </Card>

          <View style={s.privacy}>
            <Text style={s.privacyTxt}>
              Data di halaman ini berupa jumlah agregat. Isi jurnal dan percakapan mahasiswa tidak pernah dikirim ke dashboard, sesuai janji privasi di aplikasi.
            </Text>
          </View>
        </>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  reading: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, borderRadius: 26, backgroundColor: T.bg, boxShadow: Neu.raised },
  readingWell: { width: 104, height: 104, borderRadius: 52, backgroundColor: T.bg, boxShadow: Neu.inset, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  readingTitle: { fontSize: 18, lineHeight: 25, fontFamily: F.extrabold, color: T.ink, letterSpacing: -0.3 },
  readingBody: { fontSize: 14, lineHeight: 21, fontFamily: F.medium, color: T.sub },
  two: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 12, fontFamily: F.semibold, color: T.sub },
  privacy: { padding: 16, borderRadius: 18, backgroundColor: T.bg, boxShadow: Neu.inset },
  privacyTxt: { fontSize: 13, lineHeight: 19, fontFamily: F.medium, color: T.sub },
});
