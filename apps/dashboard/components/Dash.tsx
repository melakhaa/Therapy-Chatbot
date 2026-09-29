// Shared building blocks for the staff dashboard, in the mobile app's neumorphic language.
import React from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, StyleProp, ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getStoredUserSync } from '@prototype/api-client';
import { T, F, Neu, FACE } from '../constants/sajiwa';

type Icon = keyof typeof MaterialIcons.glyphMap;
export type Tone = 'navy' | 'sage' | 'amber' | 'coral' | 'muted';

export const TONE: Record<Tone, { fg: string; bg: string }> = {
  navy: { fg: T.primary, bg: 'rgba(38,53,110,0.10)' },
  sage: { fg: T.sage, bg: T.sageFill },
  amber: { fg: T.amber, bg: 'rgba(212,150,74,0.20)' },
  coral: { fg: T.coral, bg: 'rgba(217,103,78,0.15)' },
  muted: { fg: T.sub, bg: 'rgba(122,134,168,0.14)' },
};

export const MOOD: Record<string, { label: string; color: string }> = {
  Calm: { label: 'Tenang', color: '#336B4B' },
  Focused: { label: 'Fokus', color: '#26356E' },
  Tired: { label: 'Lelah', color: '#7C5C0D' },
  Anxious: { label: 'Cemas', color: '#9f403d' },
};

export const useRole = () => getStoredUserSync<{ nama?: string; role?: string; user_id?: string }>();
export const isAdmin = (role?: string) => role === 'admin' || role === 'pemangku_jabatan';

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('id-ID', opts);
export const fmtTime = (hms?: string | null) => (hms ? hms.slice(0, 5) : '');
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
};

/** Scrollable page with a title row. */
export const Page: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({
  title, subtitle, actions, children,
}) => (
  <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={s.page}>
    <View style={s.head}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={s.actions}>{actions}</View> : null}
    </View>
    {children}
  </ScrollView>
);

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; title?: string; hint?: string; right?: React.ReactNode }> = ({
  children, style, title, hint, right,
}) => (
  <View style={[s.card, style]}>
    {title ? (
      <View style={s.cardHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.cardTitle}>{title}</Text>
          {hint ? <Text style={s.cardHint}>{hint}</Text> : null}
        </View>
        {right}
      </View>
    ) : null}
    {children}
  </View>
);

export const Stat: React.FC<{ icon: Icon; tone: Tone; value: React.ReactNode; label: string; hint?: string; onPress?: () => void }> = ({
  icon, tone, value, label, hint, onPress,
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={(st: any) => [s.stat, onPress && st.hovered && { boxShadow: Neu.raised }]}
    accessibilityRole={onPress ? 'button' : undefined}
  >
    <View style={[s.knob, { backgroundColor: TONE[tone].bg }]}>
      <MaterialIcons name={icon} size={22} color={TONE[tone].fg} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {hint ? <Text style={s.statHint}>{hint}</Text> : null}
    </View>
    {onPress ? <MaterialIcons name="chevron-right" size={20} color={T.muted} /> : null}
  </Pressable>
);

export const Grid: React.FC<{ children: React.ReactNode; min?: number }> = ({ children, min = 220 }) => (
  <View style={s.grid}>
    {React.Children.map(children, (c) => (c ? <View style={{ flexGrow: 1, flexBasis: min }}>{c}</View> : null))}
  </View>
);

export const Btn: React.FC<{
  label: string; onPress?: () => void; icon?: Icon; kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean; disabled?: boolean; loading?: boolean;
}> = ({ label, onPress, icon, kind = 'secondary', small, disabled, loading }) => {
  const fg = kind === 'primary' || kind === 'danger' ? '#fff' : kind === 'ghost' ? T.sub : T.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={(st: any) => [
        s.btn, small && s.btnSm,
        kind === 'primary' && { backgroundColor: T.primary, boxShadow: '4px 6px 14px rgba(38,53,110,0.30)' },
        kind === 'danger' && { backgroundColor: T.coral, boxShadow: '4px 6px 14px rgba(178,74,51,0.25)' },
        kind === 'secondary' && { boxShadow: st.pressed ? Neu.inset : Neu.raisedSm },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <MaterialIcons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[s.btnTxt, small && { fontSize: 13 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
};

export const Pill: React.FC<{ label: string; tone: Tone; icon?: Icon }> = ({ label, tone, icon }) => (
  <View style={[s.pill, { backgroundColor: TONE[tone].bg }]}>
    {icon ? <MaterialIcons name={icon} size={13} color={TONE[tone].fg} /> : null}
    <Text style={[s.pillTxt, { color: TONE[tone].fg }]}>{label}</Text>
  </View>
);

/** Row of toggle chips; the active one sinks in. */
export function Segmented<K extends string>({ value, onChange, items }: {
  value: K; onChange: (k: K) => void; items: { key: K; label: string; count?: number }[];
}) {
  return (
    <View style={s.seg}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[s.segItem, on && { boxShadow: Neu.inset }]} accessibilityState={{ selected: on }}>
            <Text style={[s.segTxt, on && { color: T.primary, fontFamily: F.bold }]}>{it.label}</Text>
            {it.count !== undefined ? <Text style={[s.segCount, on && { color: T.primary }]}>{it.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Friendly empty/error state told by the companion. */
export const Empty: React.FC<{ face?: keyof typeof FACE; title: string; body?: string; action?: React.ReactNode }> = ({
  face = 'senang', title, body, action,
}) => (
  <View style={s.empty}>
    <View style={s.emptyWell}>
      <Image source={FACE[face]} style={{ width: 104, height: 104, marginBottom: -8 }} resizeMode="contain" />
    </View>
    <Text style={s.emptyTitle}>{title}</Text>
    {body ? <Text style={s.emptyBody}>{body}</Text> : null}
    {action}
  </View>
);

export const Loading = () => (
  <View style={{ padding: 48, alignItems: 'center' }}>
    <ActivityIndicator size="large" color={T.primary} />
  </View>
);

/** Horizontal share bars (e.g. mood mix, booking status). */
export const Bars: React.FC<{ rows: { label: string; value: number; color: string }[] }> = ({ rows }) => {
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 6 }}>
          <View style={s.barHead}>
            <Text style={s.barLabel}>{r.label}</Text>
            <Text style={s.barVal}>{r.value} · {Math.round((r.value / total) * 100)}%</Text>
          </View>
          <View style={s.barTrack}>
            <View style={{ width: `${(r.value / total) * 100}%`, height: '100%', borderRadius: 6, backgroundColor: r.color }} />
          </View>
        </View>
      ))}
    </View>
  );
};

/** Daily columns; each column can be stacked by segments. */
export const Columns: React.FC<{ days: { label: string; parts: { value: number; color: string }[] }[]; height?: number }> = ({
  days, height = 150,
}) => {
  const max = Math.max(1, ...days.map((d) => d.parts.reduce((a, p) => a + p.value, 0)));
  const step = days.length > 14 ? Math.ceil(days.length / 7) : 1;
  return (
    <View style={[s.cols, { height: height + 22 }]}>
      {days.map((d, i) => {
        const sum = d.parts.reduce((a, p) => a + p.value, 0);
        return (
          <View key={i} style={s.col}>
            <View style={[s.colTrack, { height }]}>
              <View style={{ height: `${(sum / max) * 100}%`, width: '100%', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' }}>
                {d.parts.filter((p) => p.value > 0).map((p, j) => (
                  <View key={j} style={{ flex: p.value, backgroundColor: p.color }} />
                ))}
              </View>
            </View>
            {/* Dense charts label every few columns so dates never truncate */}
            <View style={s.colLabelBox}>
              <Text style={[s.colLabel, NOWRAP]}>{i % step === 0 || i === days.length - 1 ? d.label : ''}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

/** Last N calendar days as yyyy-mm-dd, oldest first. */
export const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });

// Web-only style (keeps short date labels on one line); not in RN's style types
const NOWRAP = { whiteSpace: 'nowrap' } as any;

const s = StyleSheet.create({
  page: { padding: 32, gap: 24, maxWidth: 1280, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  title: { fontSize: 30, fontFamily: F.extrabold, color: T.ink, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, fontFamily: F.medium, color: T.sub },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

  card: { backgroundColor: T.bg, borderRadius: 26, padding: 22, gap: 16, boxShadow: Neu.raised },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 17, fontFamily: F.extrabold, color: T.ink, letterSpacing: -0.3 },
  cardHint: { fontSize: 13, fontFamily: F.medium, color: T.sub },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: T.bg, boxShadow: Neu.raisedSm },
  knob: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontFamily: F.extrabold, color: T.ink, letterSpacing: -0.6 },
  statLabel: { fontSize: 13, fontFamily: F.bold, color: T.ink },
  statHint: { fontSize: 12, fontFamily: F.medium, color: T.sub },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, paddingHorizontal: 18,
    borderRadius: 14, backgroundColor: T.bg,
  },
  btnSm: { height: 36, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  btnTxt: { fontSize: 14, fontFamily: F.bold },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillTxt: { fontSize: 12, fontFamily: F.bold },

  seg: { flexDirection: 'row', gap: 6, padding: 6, borderRadius: 18, backgroundColor: T.bg, boxShadow: Neu.raisedSm, alignSelf: 'flex-start', flexWrap: 'wrap' },
  segItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 13 },
  segTxt: { fontSize: 13, fontFamily: F.semibold, color: T.sub },
  segCount: { fontSize: 12, fontFamily: F.bold, color: T.muted },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 24 },
  emptyWell: { width: 128, height: 128, borderRadius: 64, backgroundColor: T.bg, boxShadow: Neu.inset, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontFamily: F.extrabold, color: T.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, fontFamily: F.medium, color: T.sub, textAlign: 'center', maxWidth: 420, lineHeight: 21 },

  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 13, fontFamily: F.bold, color: T.ink },
  barVal: { fontSize: 13, fontFamily: F.semibold, color: T.sub },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: T.bg, boxShadow: Neu.inset, overflow: 'hidden' },

  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  colTrack: { width: '100%', maxWidth: 26, justifyContent: 'flex-end', borderRadius: 8, backgroundColor: T.bg, boxShadow: Neu.inset, padding: 3 },
  colLabelBox: { height: 14, width: '100%', alignItems: 'center' },
  colLabel: { position: 'absolute', width: 60, left: '50%', marginLeft: -30, fontSize: 10, fontFamily: F.semibold, color: T.muted, textAlign: 'center' },
});
