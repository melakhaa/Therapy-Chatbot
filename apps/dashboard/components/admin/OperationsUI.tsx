import React, { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { adminTheme as c } from '@/constants/adminTheme';
import { Badge, Card, ui } from '@/components/ui';

type Icon = React.ComponentProps<typeof MaterialIcons>['name'];

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={{ color: c.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>{children}</Text>;
}
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-end' }]}><View style={{ flex: 1, minWidth: 210, gap: 4 }}><Text style={{ color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>{description && <Text style={ui.muted}>{description}</Text>}</View>{action}</View>;
}
export function OperationalMetric({ label, value, note, icon, tone = 'teal' }: { label: string; value: string | number; note: string; icon: Icon; tone?: 'teal' | 'amber' | 'red' | 'blue' | 'purple' }) {
  const color = tone === 'red' ? c.danger : tone === 'amber' ? c.warning : tone === 'blue' ? c.blue : tone === 'purple' ? c.lavender : c.primary;
  const bg = tone === 'red' ? c.dangerSoft : tone === 'amber' ? c.warningSoft : tone === 'blue' ? c.blueSoft : tone === 'purple' ? c.lavenderSoft : c.primarySoft;
  return <View style={[ui.card, { flexGrow: 1, flexBasis: 190, padding: 18, gap: 11, borderTopWidth: 3, borderTopColor: color }]}><View style={[ui.row, { flexWrap: 'nowrap' }]}><View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name={icon} color={color} size={19} /></View><Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>{label}</Text></View><Text style={{ color: c.text, fontSize: 29, fontWeight: '800', letterSpacing: -1 }}>{value}</Text><Text style={[ui.muted, { fontSize: 10 }]}>{note}</Text></View>;
}
export function SignalCard({ type, title, detail, meta, action }: { type: 'assessment' | 'safety' | 'booking'; title: string; detail: string; meta: string; action?: ReactNode }) {
  const icon: Icon = type === 'safety' ? 'health-and-safety' : type === 'booking' ? 'event-note' : 'assignment';
  const color = type === 'safety' ? c.danger : type === 'booking' ? c.blue : c.warning;
  const bg = type === 'safety' ? c.dangerSoft : type === 'booking' ? c.blueSoft : c.warningSoft;
  return <View style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 13, padding: 15, flexDirection: 'row', gap: 13, alignItems: 'center' }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name={icon} size={20} color={color} /></View><View style={{ flex: 1, gap: 3 }}><Text style={[ui.text, { fontWeight: '700' }]}>{title}</Text><Text style={ui.muted}>{detail}</Text><Text style={[ui.muted, { fontSize: 10 }]}>{meta}</Text></View>{action}</View>;
}
export function DistributionBars({ values }: { values: { label: string; value: number; color?: string }[] }) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return <View style={{ gap: 13 }}>{values.map((item, index) => { const percent = total ? item.value / total * 100 : 0; return <View key={item.label} style={{ gap: 6 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={[ui.row, { gap: 7 }]}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color || [c.primary, c.blue, c.warning, c.danger][index % 4] }} /><Text style={ui.text}>{item.label}</Text></View><Text style={[ui.text, { fontWeight: '700' }]}>{item.value} <Text style={ui.muted}>({Math.round(percent)}%)</Text></Text></View><View style={{ height: 7, borderRadius: 4, backgroundColor: c.background, overflow: 'hidden' }}><View style={{ width: `${percent}%`, height: 7, borderRadius: 4, backgroundColor: item.color || [c.primary, c.blue, c.warning, c.danger][index % 4] }} /></View></View>; })}</View>;
}
export function MethodologyNote({ children }: { children: ReactNode }) {
  return <Card><View style={[ui.row, { alignItems: 'flex-start' }]}><MaterialIcons name="info-outline" size={19} color={c.blue} /><View style={{ flex: 1, gap: 4 }}><Text style={[ui.text, { fontWeight: '700' }]}>Interpretation note</Text><Text style={ui.muted}>{children}</Text></View></View></Card>;
}
export function LabelValue({ label, value, badge }: { label: string; value: ReactNode; badge?: string }) {
  return <View style={{ gap: 4 }}><Text style={[ui.muted, { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }]}>{label.toUpperCase()}</Text><View style={ui.row}>{typeof value === 'string' ? <Text style={ui.text}>{value}</Text> : value}{badge && <Badge value={badge} />}</View></View>;
}
