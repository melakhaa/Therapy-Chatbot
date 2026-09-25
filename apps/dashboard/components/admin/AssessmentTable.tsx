import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { AssessmentRow } from '@prototype/api-client';
import { Badge, Button, DataTable, formatDate, ui, type Column } from '@/components/ui';
export default function AssessmentTable({ rows, showUser = false }: { rows: AssessmentRow[]; showUser?: boolean }) {
  const columns: Column<AssessmentRow>[] = [];
  if (showUser) columns.push({ title: 'Mahasiswa / ID', width: 190, render: r => <View><Text style={ui.text}>{r.nama || r.user_id.slice(0, 8)}</Text><Text style={ui.muted}>{r.nim || (r.nama ? '' : 'Identitas dibatasi')}</Text></View> });
  columns.push(
    { title: 'Assessment', width: 100, render: r => <Text style={ui.text}>{r.instrument_type}</Text> },
    { title: 'Stress score', width: 65, render: r => <Text style={[ui.text, { fontWeight: '700' }]}>{r.score}</Text> },
    { title: 'Recorded level', width: 145, render: r => <Badge value={r.severity} /> },
    { title: 'Tanggal', width: 125, render: r => <Text style={ui.muted}>{formatDate(r.taken_at)}</Text> },
  );
  if (showUser) columns.push({ title: 'Tindakan', width: 85, render: r => <Button label="View" tone="quiet" onPress={() => router.push(('/students/' + r.user_id) as Href)} /> });
  return <DataTable rows={rows} rowKey={r => r.assessment_id} columns={columns} empty="Tidak ada hasil asesmen yang sesuai." />;
}
