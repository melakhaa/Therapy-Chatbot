import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import type { ComparisonPoint } from '@prototype/api-client';
import { adminTheme as c, comparisonSeries } from '@/constants/adminTheme';
import { Card, EmptyState, ui } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';

const dash = [undefined, '8 5', '2 5', '12 4 2 4', '4 3'] as const;

export function ComparativeTrendChart({ points, title, seriesLabels = [] }: { points: ComparisonPoint[]; title: string; seriesLabels?: string[] }) {
  const { language } = useAdminExperience();
  const width = 760, height = 280, left = 44, top = 20, right = 18, bottom = 42;
  const model = useMemo(() => {
    const dates = [...new Set(points.map(point => String(point.date)))].sort();
    const labels = [...new Set([...seriesLabels,...points.map(point => point.scope_label)])];
    const max = Math.max(1, ...points.map(point => Number(point.assessment_count)));
    const x = (date: string) => left + (dates.length <= 1 ? 0 : dates.indexOf(date) / (dates.length - 1)) * (width - left - right);
    const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
    return { dates, labels, max, x, y };
  }, [points,seriesLabels]);
  return <Card title={title} subtitle={language === 'id' ? 'Setiap garis mewakili satu cakupan terpilih.' : 'Each line represents one selected scope.'}>{!points.length ? <EmptyState message={`${language === 'id' ? 'Belum ada data sebanding dalam periode ini.' : 'No comparable data is available for this period.'} ${model.labels.join(', ')}`} /> : <>
        <View accessibilityRole="image" accessibilityLabel={`${title}. ${model.labels.length} series.`} style={{width:'100%',overflow:'hidden'}}><Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}><Line x1={left} y1={top} x2={left} y2={height-bottom} stroke={c.borderStrong}/><Line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} stroke={c.borderStrong}/>{[0,.25,.5,.75,1].map(step=><React.Fragment key={step}><Line x1={left} y1={model.y(model.max*step)} x2={width-right} y2={model.y(model.max*step)} stroke={c.border} strokeDasharray="3 5"/><SvgText x={left-8} y={model.y(model.max*step)+4} fontSize="10" textAnchor="end" fill={c.muted}>{Math.round(model.max*step)}</SvgText></React.Fragment>)}{model.dates.map((date,index)=>(index===0||index===model.dates.length-1||index===Math.floor(model.dates.length/2))?<SvgText key={date} x={model.x(date)} y={height-15} fontSize="10" textAnchor="middle" fill={c.muted}>{date.slice(5)}</SvgText>:null)}{model.labels.map((label,index)=>{const rows=points.filter(point=>point.scope_label===label).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const coords=rows.map(point=>`${model.x(String(point.date))},${model.y(Number(point.assessment_count))}`).join(' ');return <React.Fragment key={label}><Polyline points={coords} fill="none" stroke={comparisonSeries[index%comparisonSeries.length]} strokeWidth="3" strokeDasharray={dash[index%dash.length]}/>{rows.map(point=><Circle key={`${label}-${point.date}`} cx={model.x(String(point.date))} cy={model.y(Number(point.assessment_count))} r={index%3+3} fill={c.surface} stroke={comparisonSeries[index%comparisonSeries.length]} strokeWidth="2"/>)}</React.Fragment>})}</Svg></View>
    <View style={[ui.row,{gap:14}]}>{model.labels.map((label,index)=><View key={label} style={[ui.row,{gap:6,flexWrap:'nowrap'}]}><View style={{width:24,height:index%2?2:4,backgroundColor:comparisonSeries[index%comparisonSeries.length],borderRadius:2}}/><Text style={ui.muted}>{label}</Text></View>)}</View>
  </>}</Card>;
}
