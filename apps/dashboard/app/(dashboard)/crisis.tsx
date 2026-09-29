// Crisis signals from the student app: crisis words caught in chat, "contact me" presses in the
// app's crisis dialog, and severe assessments. Chat text is never shown (the app promises that).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiGetAttention, apiMarkAttentionRead, type AttentionSignal, type SignalType } from '@prototype/api-client';
import { Page, Card, Stat, Grid, Btn, Pill, Segmented, Empty, Loading, ago, fmtDate, type Tone } from '../../components/Dash';
import { T, F, Neu } from '../../constants/sajiwa';

const KIND: Record<SignalType, { label: string; hint: string; tone: Tone; icon: keyof typeof MaterialIcons.glyphMap }> = {
  request: { label: 'Minta dihubungi', hint: 'Mahasiswa menekan "hubungi saya" di dialog krisis', tone: 'coral', icon: 'support-agent' },
  safety: { label: 'Kata krisis di chat', hint: 'Terdeteksi otomatis oleh guardrail percakapan', tone: 'amber', icon: 'warning-amber' },
  assessment: { label: 'Asesmen berat', hint: 'Skor asesmen pada tingkat berat', tone: 'navy', icon: 'assignment-late' },
};

type TypeFilter = 'all' | SignalType;
const PAGE = 20;

export default function CrisisScreen() {
  const [signals, setSignals] = useState<AttentionSignal[]>([]);
  const [summary, setSummary] = useState<Record<string, { total: number; unread: number }>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TypeFilter>('all');
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(p === 1);
    setError(null);
    try {
      const [res, all] = await Promise.all([
        apiGetAttention({ signal: type === 'all' ? undefined : type, unreadOnly, page: p, pageSize: PAGE }),
        // Counters always show the full picture, independent of the active filters
        p === 1 ? apiGetAttention({ pageSize: 1 }) : Promise.resolve(null),
      ]);
      setSignals((prev) => (p === 1 ? res.signals : [...prev, ...res.signals]));
      setTotal(res.total);
      setPage(p);
      if (all) setSummary(Object.fromEntries(all.summary.map((r) => [r.signal_type, r])));
    } catch (e: any) {
      setError(e.message || 'Gagal memuat peringatan');
    } finally {
      setLoading(false);
    }
  }, [type, unreadOnly]);

  useEffect(() => { load(1); }, [load]);

  const markRead = async (id: string) => {
    setBusy(id);
    try {
      await apiMarkAttentionRead(id);
      setSignals((prev) => (unreadOnly ? prev.filter((x) => x.log_id !== id) : prev.map((x) => (x.log_id === id ? { ...x, is_read: true } : x))));
      setTotal((t) => (unreadOnly ? t - 1 : t));
      const kind = signals.find((x) => x.log_id === id)?.signal_type;
      if (kind) setSummary((s) => ({ ...s, [kind]: { ...s[kind], unread: Math.max(0, (s[kind]?.unread ?? 1) - 1) } }));
    } catch (e: any) {
      setError(e.message || 'Gagal menandai');
    } finally {
      setBusy(null);
    }
  };

  const unreadOf = (k: SignalType) => summary[k]?.unread ?? 0;
  const unreadAll = unreadOf('request') + unreadOf('safety') + unreadOf('assessment');

  return (
    <Page
      title="Peringatan Krisis"
      subtitle="Sinyal dari aplikasi mahasiswa yang perlu ditindaklanjuti. Isi percakapan tidak ditampilkan demi privasi."
      actions={<Btn label="Segarkan" icon="refresh" onPress={() => load(1)} />}
    >
      <Grid min={240}>
        <Stat icon="notification-important" tone={unreadAll ? 'coral' : 'sage'} value={unreadAll} label="Belum ditinjau" hint={unreadAll ? 'Tindak lanjuti yang paling baru dulu' : 'Semua sudah ditinjau'} />
        <Stat icon={KIND.request.icon} tone="coral" value={unreadOf('request')} label="Minta dihubungi" hint={`${summary.request?.total ?? 0} total`} onPress={() => setType('request')} />
        <Stat icon={KIND.safety.icon} tone="amber" value={unreadOf('safety')} label="Kata krisis di chat" hint={`${summary.safety?.total ?? 0} total`} onPress={() => setType('safety')} />
        <Stat icon={KIND.assessment.icon} tone="navy" value={unreadOf('assessment')} label="Asesmen berat" hint={`${summary.assessment?.total ?? 0} total`} onPress={() => setType('assessment')} />
      </Grid>

      <Card>
        <View style={s.filters}>
          <Segmented<TypeFilter>
            value={type}
            onChange={setType}
            items={[
              { key: 'all', label: 'Semua jenis' },
              { key: 'request', label: 'Minta dihubungi' },
              { key: 'safety', label: 'Chat' },
              { key: 'assessment', label: 'Asesmen' },
            ]}
          />
          <Segmented<'unread' | 'all'>
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(k) => setUnreadOnly(k === 'unread')}
            items={[{ key: 'unread', label: 'Belum ditinjau' }, { key: 'all', label: 'Semua' }]}
          />
        </View>

        {loading ? (
          <Loading />
        ) : error ? (
          <Empty face="berpikir" title="Peringatan belum bisa dimuat" body={error} action={<Btn label="Coba lagi" icon="refresh" onPress={() => load(1)} />} />
        ) : signals.length === 0 ? (
          <Empty
            face="jempol"
            title={unreadOnly ? 'Tidak ada yang menunggu ditinjau' : 'Belum ada peringatan'}
            body="Saat mahasiswa menunjukkan tanda krisis di aplikasi atau meminta dihubungi, sinyalnya muncul di sini."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {signals.map((sig) => {
              const k = KIND[sig.signal_type];
              return (
                <View key={sig.log_id} style={[s.row, sig.is_read && { opacity: 0.65 }]}>
                  <View style={[s.dot, { backgroundColor: sig.is_read ? T.muted : k.tone === 'coral' ? T.coral : k.tone === 'amber' ? T.amber : T.primary }]} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={s.rowTop}>
                      <Pill label={k.label} tone={k.tone} icon={k.icon} />
                      {sig.is_read ? <Pill label="Sudah ditinjau" tone="muted" icon="done" /> : null}
                    </View>
                    <Text style={s.name}>
                      {sig.nama ?? 'Mahasiswa tanpa akun terhubung'}
                      {sig.nim ? <Text style={s.nim}>  ·  NIM {sig.nim}</Text> : null}
                    </Text>
                    <Text style={s.meta}>{k.hint} · {ago(sig.notified_at)} ({fmtDate(sig.notified_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})</Text>
                  </View>
                  {!sig.is_read && (
                    <Btn label="Tandai ditinjau" icon="task-alt" small loading={busy === sig.log_id} onPress={() => markRead(sig.log_id)} />
                  )}
                </View>
              );
            })}
            {signals.length < total && <Btn label="Muat lebih banyak" icon="expand-more" kind="ghost" onPress={() => load(page + 1)} />}
          </View>
        )}
      </Card>

      <Card title="Panduan tindak lanjut" hint="Langkah yang disarankan untuk setiap sinyal">
        {[
          'Minta dihubungi: hubungi mahasiswa hari ini lewat kontak kampus, lalu tawarkan jadwal konseling.',
          'Kata krisis di chat: aplikasi sudah menampilkan kontak darurat ke mahasiswa. Pantau dan tawarkan sesi.',
          'Keadaan darurat (risiko keselamatan segera): arahkan ke 112 atau IGD terdekat.',
        ].map((t) => (
          <View key={t} style={s.tip}>
            <MaterialIcons name="arrow-right" size={20} color={T.primary} />
            <Text style={s.tipTxt}>{t}</Text>
          </View>
        ))}
      </Card>
    </Page>
  );
}

const s = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: T.bg, boxShadow: Neu.raisedSm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTop: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  nim: { fontSize: 13, fontFamily: F.medium, color: T.sub },
  meta: { fontSize: 12, fontFamily: F.medium, color: T.sub },
  tip: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  tipTxt: { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: F.medium, color: T.ink },
});
