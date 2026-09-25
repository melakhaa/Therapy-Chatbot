import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { previewDepartments, previewFaculties } from '@/services/adminProductData';
import { adminTheme as c } from '@/constants/adminTheme';
import { Button, Card, FilterControl, Notice, ui } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';

export type AcademicScope = { facultyId: string; departmentId: string };

export function AcademicScopeControl({ value, onChange, compact = false }: { value: AcademicScope; onChange: (value: AcademicScope) => void; compact?: boolean }) {
  const { language } = useAdminExperience();
  if (!false) return <Card title={language === 'id' ? 'Cakupan akademik' : 'Academic scope'} subtitle={language === 'id' ? 'Metadata Fakultas dan Departemen belum tersedia dari API saat ini.' : 'Faculty and Department metadata is not available from the current API.'}><Notice>{language === 'id' ? 'Tampilan tingkat universitas tetap aktif. Integrasi backend belum tersedia.' : 'University-wide view remains active. Backend integration is pending.'}</Notice></Card>;
  const departments = previewDepartments.filter(item => !value.facultyId || item.facultyId === value.facultyId);
  return <View style={{ gap: compact ? 8 : 13 }}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><View><Text style={ui.heading}>{language === 'id' ? 'Cakupan akademik' : 'Academic scope'}</Text><Text style={ui.muted}>Universitas Diponegoro → Fakultas → Departemen</Text></View><View style={{ backgroundColor: c.warningSoft, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: c.warning, fontSize: 9, fontWeight: '800' }}>SYNTHETIC</Text></View></View>
    <FilterControl label={language === 'id' ? 'Fakultas' : 'Faculty'} value={value.facultyId} onChange={facultyId => onChange({ facultyId, departmentId: '' })} options={[{ value: '', label: language === 'id' ? 'Seluruh universitas' : 'University-wide' }, ...previewFaculties.map(item => ({ value: item.id, label: item.name }))]} />
    {!!value.facultyId && <FilterControl label={language === 'id' ? 'Departemen' : 'Department'} value={value.departmentId} onChange={departmentId => onChange({ ...value, departmentId })} options={[{ value: '', label: language === 'id' ? 'Seluruh fakultas' : 'All departments' }, ...departments.map(item => ({ value: item.id, label: item.name }))]} />}
  </View>;
}

export function BackendPending({ title, detail }: { title?: string; detail?: string }) {
  const { language } = useAdminExperience();
  return <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.warning, backgroundColor: c.warningSoft, borderRadius: 12, padding: 14, gap: 7 }}>
    <View style={[ui.row, { gap: 8 }]}><MaterialIcons name="construction" color={c.warning} size={18} /><Text style={[ui.text, { color: c.warning, fontWeight: '800' }]}>{title || (language === 'id' ? 'Integrasi backend belum tersedia' : 'Backend integration pending')}</Text></View>
    {!!detail && <Text style={[ui.muted, { color: c.warning }]}>{detail}</Text>}
  </View>;
}

export function SegmentedControl({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string; icon?: React.ComponentProps<typeof MaterialIcons>['name'] }[] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: 11, backgroundColor: c.surfaceMuted, borderWidth: 1, borderColor: c.border }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={{ minHeight: 36, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: value === option.value ? c.surface : 'transparent', borderWidth: value === option.value ? 1 : 0, borderColor: c.borderStrong }}>
      {option.icon && <MaterialIcons name={option.icon} size={16} color={value === option.value ? c.primary : c.muted} />}<Text style={{ color: value === option.value ? c.text : c.muted, fontSize: 11, fontWeight: value === option.value ? '700' : '500' }}>{option.label}</Text>
    </Pressable>)}
  </View>;
}

export function PreviewOnlyAction({ label, onPress }: { label: string; onPress: () => void }) {
  if (false) return <Button label={label} onPress={onPress} />;
  return <Button label={label} disabled onPress={() => undefined} />;
}
