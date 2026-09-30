import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LineChart } from 'react-native-chart-kit';
import type { DashboardData } from '@prototype/api-client';
import { Card, EmptyState, ui } from '@/components/ui';
import { adminTheme as c } from '@/constants/adminTheme';
import { useAdminExperience } from './AdminExperience';
const colors = [c.primary, c.blue, c.warning, c.danger];
export function SeverityChart({ data }: { data: DashboardData }) {
  const { language } = useAdminExperience(); const id = language === 'id';
  const entries = Object.entries(data.severity_distribution);
  const total = entries.reduce((n, [, value]) => n + value, 0);
  let offset = 0;
  return <Card title={id ? 'Distribusi tingkat keparahan' : 'Severity distribution'} subtitle={id ? 'Hasil asesmen · seluruh periode' : 'Assessment results · all time'}>
    {!total ? <EmptyState message={id ? 'Belum ada hasil asesmen.' : 'No assessment results yet.'} /> : <View style={[ui.row, { justifyContent: 'space-around', gap: 24 }]}>
      <View accessibilityLabel={`${total} ${id ? 'hasil asesmen' : 'assessment results'}`} style={{ width: 180, height: 180 }}>
        <Svg width={180} height={180} viewBox="0 0 180 180"><Circle cx={90} cy={90} r={66} stroke={c.border} strokeWidth={23} fill="none" />{entries.map(([key, value], index) => {
          const length = value / total * 414.69; const start = offset; offset += length;
          return <Circle key={key} cx={90} cy={90} r={66} fill="none" stroke={colors[index]} strokeWidth={23} strokeDasharray={[length, 414.69 - length]} strokeDashoffset={-start} rotation={-90} origin="90,90" />;
        })}</Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.text, fontSize: 26, fontWeight: '700' }}>{total}</Text><Text style={ui.muted}>{id ? 'asesmen' : 'assessments'}</Text></View>
      </View>
      <View style={{ gap: 15, minWidth: 145 }}>{entries.map(([key, value], i) => <View key={key} style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors[i] }} /><Text style={[ui.text, { flex: 1 }]}>{key}</Text><Text style={ui.muted}>{value} · {Math.round(value / total * 100)}%</Text></View>)}</View>
    </View>}
  </Card>;
}
export function WeeklyChart({ data }: { data: DashboardData }) {
  const { language } = useAdminExperience(); const id = language === 'id';
  const [width, setWidth] = useState(0);
  const trend = data.weekly_trend;
  return <Card title={id ? 'Asesmen mingguan' : 'Weekly assessments'} subtitle={id ? 'Jumlah pengiriman per tanggal · 7 hari terakhir' : 'Submissions by date · last 7 days'}>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ minHeight: 210, minWidth: 0 }}>
      {!trend.length ? <EmptyState message={id ? 'Belum ada pengiriman dalam 7 hari terakhir.' : 'No submissions in the last 7 days.'} /> : width > 0 && <LineChart width={Math.max(100, width)} height={210}
        data={{ labels: trend.map(t => t.date.slice(5)), datasets: [{ data: trend.map(t => t.count) }] }}
        segments={Math.max(1, Math.min(4, Math.max(...trend.map(t => t.count))))} yAxisLabel="" yAxisSuffix="" fromZero withVerticalLines={false} withOuterLines={false}
        chartConfig={{ backgroundGradientFrom: c.surface, backgroundGradientTo: c.surface, decimalPlaces: 0, color: () => c.lavender, labelColor: () => c.muted, propsForDots: { r: '3' }, propsForBackgroundLines: { stroke: c.border } }}
      />}
    </View>
    {!!trend.length && <Text style={ui.muted}>{trend.map(t => t.date + ': ' + t.count).join(' · ')}</Text>}
  </Card>;
}
