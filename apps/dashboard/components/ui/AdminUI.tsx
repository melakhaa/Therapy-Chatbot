import React, { type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { adminTheme as c } from '@/constants/adminTheme';

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  column: { flexGrow: 1, flexShrink: 1, flexBasis: 360, minWidth: 0, gap: 20 },
  text: { color: c.text, fontSize: 13, lineHeight: 21 },
  muted: { color: c.muted, fontSize: 12, lineHeight: 20 },
  title: { color: c.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.5 },
  heading: { color: c.text, fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 22, gap: 18 },
  input: { color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, minHeight: 42 },
});
export function Button({ label, onPress, disabled, tone = 'primary', icon }: {
  label: string; onPress: () => void; disabled?: boolean; tone?: 'primary' | 'quiet' | 'danger';
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const bg = tone === 'primary' ? c.primary : tone === 'danger' ? c.dangerSoft : c.background;
  const color = tone === 'primary' ? c.surface : tone === 'danger' ? c.danger : c.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => ({ backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10, minHeight: 40, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' })}>
    {icon && <MaterialIcons name={icon} size={17} color={color} />}<Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}
export function Page({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 22, width: '100%', maxWidth: 1500, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
    <View style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, minWidth: 180, gap: 5 }}><Text accessibilityRole="header" style={ui.title}>{title}</Text><Text style={ui.muted}>{subtitle}</Text></View>{action}</View>{children}
    <Text style={[ui.muted, { textAlign: 'center', marginTop: 12 }]}>Sanctuary · Mendukung kesehatan mental mahasiswa</Text>
  </ScrollView>;
}
export function Card({ title, subtitle, action, children }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <View style={ui.card}>{title && <View style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, gap: 5 }}><Text style={ui.heading}>{title}</Text>{subtitle && <Text style={ui.muted}>{subtitle}</Text>}</View>{action}</View>}{children}</View>;
}
export function Badge({ value }: { value: string }) {
  const severe = ['severe', 'dibatalkan'].includes(value);
  const moderate = ['moderate', 'menunggu', 'dipesan'].includes(value);
  const mild = ['mild', 'konselor'].includes(value);
  const color = severe ? c.danger : moderate ? c.warning : mild ? c.lavender : c.primary;
  const bg = severe ? c.dangerSoft : moderate ? c.warningSoft : mild ? c.lavenderSoft : c.primarySoft;
  return <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color, fontSize: 11, fontWeight: '600' }}>{value.replaceAll('_', ' ')}</Text></View>;
}
export function Notice({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <View accessibilityRole={danger ? 'alert' : undefined} style={{ padding: 14, borderRadius: 10, backgroundColor: danger ? c.dangerSoft : c.primarySoft, flexDirection: 'row', gap: 10 }}>
    <MaterialIcons name={danger ? 'error-outline' : 'info-outline'} color={danger ? c.danger : c.primary} size={18} /><Text style={[ui.text, { flex: 1, color: danger ? c.danger : c.primary }]}>{children}</Text>
  </View>;
}
export function LoadingState() { return <View style={{ padding: 50, alignItems: 'center', gap: 12 }}><ActivityIndicator color={c.primary} /><Text style={ui.muted}>Memuat data…</Text></View>; }
export function EmptyState({ message = 'Belum ada catatan untuk ditampilkan.' }: { message?: string }) {
  return <View style={{ padding: 35, alignItems: 'center', gap: 12 }}><MaterialIcons name="inbox" size={32} color={c.muted} /><Text style={[ui.muted, { textAlign: 'center' }]}>{message}</Text></View>;
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <View style={{ gap: 12 }}><Notice danger>{message}</Notice>{retry && <View style={{ alignSelf: 'flex-start' }}><Button label="Coba lagi" onPress={retry} tone="quiet" /></View>}</View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 6, flexGrow: 1, minWidth: 150 }}><Text style={ui.muted}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...props} style={[ui.input, props.style]} /></View>;
}
export function SearchInput({ value, onChangeText, placeholder = 'Cari nama, email, atau NIM…' }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 9, paddingHorizontal: 12, flex: 1, minWidth: 190 }}>
    <MaterialIcons name="search" color={c.muted} size={19} /><TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} style={{ flex: 1, minWidth: 0, paddingVertical: 11, fontSize: 13, color: c.text }} />
  </View>;
}
export function FilterControl({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return <View style={{ gap: 8 }}><Text style={ui.muted}>{label}</Text><View style={[ui.row, { gap: 6 }]}>{options.map(o =>
    <Pressable key={o.value} accessibilityRole="button" accessibilityLabel={label + ': ' + o.label} accessibilityState={{ selected: value === o.value }} onPress={() => onChange(o.value)}
      style={{ paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, borderRadius: 7, backgroundColor: value === o.value ? c.primarySoft : c.background, borderWidth: 1, borderColor: value === o.value ? c.primary : c.border }}>
      <Text style={{ fontSize: 12, color: value === o.value ? c.primary : c.muted, fontWeight: value === o.value ? '600' : '400' }}>{o.label}</Text>
    </Pressable>)}</View></View>;
}
export interface Column<T> { title: string; width: number; render: (row: T) => ReactNode }
export function DataTable<T>({ rows, columns, rowKey, empty }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; empty?: string }) {
  if (!rows.length) return <EmptyState message={empty} />;
  const width = columns.reduce((sum, col) => sum + col.width, 0);
  return <ScrollView horizontal style={{ maxWidth: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
    <View style={{ minWidth: width, flex: 1 }}>
      <View style={{ flexDirection: 'row', backgroundColor: c.background, borderRadius: 7 }}>{columns.map(col => <View key={col.title} style={{ width: col.width, flexGrow: 1, padding: 12 }}><Text style={{ color: c.muted, fontSize: 11, fontWeight: '600' }}>{col.title}</Text></View>)}</View>
      {rows.map(row => <View key={rowKey(row)} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.border, alignItems: 'center', minHeight: 62 }}>{columns.map(col => <View key={col.title} style={{ width: col.width, flexGrow: 1, padding: 12 }}>{col.render(row)}</View>)}</View>)}
    </View>
  </ScrollView>;
}
export function Pagination({ page, total, size = 20, onChange }: { page: number; total: number; size?: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.muted}>{total} catatan · Halaman {page} / {pages}</Text><View style={ui.row}><Button tone="quiet" label="Sebelumnya" disabled={page <= 1} onPress={() => onChange(page - 1)} /><Button tone="quiet" label="Berikutnya" disabled={page >= pages} onPress={() => onChange(page + 1)} /></View></View>;
}
export function Dialog({ title, visible, onClose, children, busy = false }: { title: string; visible: boolean; onClose: () => void; children: ReactNode; busy?: boolean }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={{ flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 540, maxHeight: '90%', backgroundColor: c.surface, borderRadius: 18, padding: 24 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text accessibilityRole="header" style={ui.heading}>{title}</Text><Button label="Tutup" tone="quiet" disabled={busy} onPress={onClose} /></View>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
export function StatCard({ label, value, icon, tone = 'teal', note }: { label: string; value: string | number; icon: React.ComponentProps<typeof MaterialIcons>['name']; tone?: 'teal' | 'purple' | 'red' | 'blue'; note: string }) {
  const color = tone === 'red' ? c.danger : tone === 'purple' ? c.lavender : tone === 'blue' ? c.blue : c.primary;
  const bg = tone === 'red' ? c.dangerSoft : tone === 'purple' ? c.lavenderSoft : tone === 'blue' ? c.blueSoft : c.primarySoft;
  return <View style={[ui.card, { flexGrow: 1, flexBasis: 205, gap: 10 }]}><View style={ui.row}><View style={{ padding: 10, borderRadius: 10, backgroundColor: bg }}><MaterialIcons name={icon} color={color} size={22} /></View><Text style={[ui.muted, { flex: 1 }]}>{label}</Text></View><Text style={{ color: c.text, fontSize: 30, fontWeight: '700' }}>{value}</Text><Text style={ui.muted}>{note}</Text></View>;
}
export function Avatar({ name }: { name: string }) { return <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.primary, fontWeight: '600' }}>{name.slice(0, 2).toUpperCase()}</Text></View>; }
export function formatDate(value?: string | null) { return value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
