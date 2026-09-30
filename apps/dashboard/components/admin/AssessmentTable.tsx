import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { AssessmentRow } from '@prototype/api-client';
import { Badge, Button, DataTable, formatDate, ui, type Column } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';
export default function AssessmentTable({ rows, showUser = false }: { rows: AssessmentRow[]; showUser?: boolean }) {
  const { language } = useAdminExperience(); const id = language === 'id';
  const columns: Column<AssessmentRow>[] = [];
  if (showUser) columns.push({ title: id ? 'Mahasiswa / ID' : 'Student / ID', width: 190, render: r => <View><Text style={ui.text}>{r.nama || r.user_id.slice(0, 8)}</Text><Text style={ui.muted}>{r.nim || (r.nama ? '' : (id ? 'Identitas dibatasi' : 'Identity restricted'))}</Text></View> });
  columns.push(
    { title: 'Assessment', width: 135, render: r => <View><Text style={ui.text}>{r.instrument_type}</Text><Text style={ui.muted}>{r.instrument_version_id?'DASS-21 · D/A/S':(id?'Legacy / Stress-only':'Legacy / Stress-only')}</Text></View> },
    { title: id?'Hasil tercatat':'Recorded result', width: 240, render: r => r.category_results?.length?<View style={{gap:3}}>{r.category_results.map(result=><Text key={result.category} style={ui.muted}>{result.category}: {result.scaled_score} · {result.severity}</Text>)}</View>:<Text style={[ui.text, { fontWeight: '700' }]}>{r.score}</Text> },
    { title: id ? 'Ringkasan legacy' : 'Legacy summary', width: 145, render: r => <Badge value={r.severity} /> },
    { title: id ? 'Tanggal' : 'Date', width: 125, render: r => <Text style={ui.muted}>{formatDate(r.taken_at)}</Text> },
  );
  if (showUser) columns.push({ title: id ? 'Tindakan' : 'Actions', width: 85, render: r => <Button label={id ? 'Lihat' : 'View'} tone="quiet" onPress={() => router.push(('/students/' + r.user_id) as Href)} /> });
  return <DataTable rows={rows} rowKey={r => r.assessment_id} columns={columns} empty={id ? 'Tidak ada hasil asesmen yang sesuai.' : 'No matching assessment results.'} />;
}
