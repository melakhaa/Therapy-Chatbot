'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui';
import { getAcademicStructure } from '@/features/monitoring/api';
import type { AcademicStructure } from '@/features/monitoring/types';
import { getAnalytics } from './api';
import { academicComparison, aggregate, counselingComposition, groupTrend, insights, parseReportConfiguration, REPORT_STORAGE_KEY, severityByCategory } from './model';
import type { AnalyticsResponse, ReportConfiguration, ReportSection } from './types';
import { BarChart, Panel, severityLabels, StackedBars, StatusBars, statusLabel } from './Charts';

export function ReportPreview(){
  const [config,setConfig]=useState<ReportConfiguration|null>(null); const [missing,setMissing]=useState(false); const [data,setData]=useState<AnalyticsResponse|null>(null); const [structure,setStructure]=useState<AcademicStructure|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(false); const [refresh,setRefresh]=useState(0);
  useEffect(()=>{const timer=window.setTimeout(()=>{const parsed=parseReportConfiguration(sessionStorage.getItem(REPORT_STORAGE_KEY));setConfig(parsed);setMissing(!parsed)},0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{if(!config)return;const c=new AbortController();Promise.allSettled([getAnalytics(config.filters,c.signal),getAcademicStructure(c.signal)]).then(([analytics,academic])=>{if(analytics.status==='fulfilled'){setData(analytics.value);setError(false)}else if(!(analytics.reason instanceof DOMException&&analytics.reason.name==='AbortError'))setError(true);if(academic.status==='fulfilled')setStructure(academic.value);setLoading(false)});return()=>c.abort()},[config,refresh]);
  const metrics=useMemo(()=>data?aggregate(data):null,[data]); const trend=useMemo(()=>data?groupTrend(data):[],[data]); const dimensions=useMemo(()=>data?severityByCategory(data):[],[data]); const comparison=useMemo(()=>data?academicComparison(data):[],[data]); const counseling=useMemo(()=>data?counselingComposition(data):[],[data]); const insightRows=useMemo(()=>data?insights(data):[],[data]);
  if(missing)return <main className="report-preview-shell"><ErrorState title="Konfigurasi pratinjau tidak ditemukan" message="Buat pratinjau dari halaman Analytics & Laporan pada tab ini."/><Link className="button button-secondary" href="/analytics"><span>Kembali ke Analytics</span></Link></main>;
  if(!config)return <main className="report-preview-shell"><Skeleton lines={8}/></main>;
  const selected=(section:ReportSection)=>config.sections.includes(section); const scope=scopeLabel(config,structure,data); const generated=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'long',timeStyle:'short'}).format(new Date(config.createdAt));
  return <main className="report-preview-shell"><nav className="report-preview-nav" aria-label="Aksi pratinjau"><Link className="button button-secondary" href="/analytics"><span>Kembali ke Analytics</span></Link><span>Pratinjau agregat · PDF tidak tersedia pada kontrak backend</span></nav>
    <article className="stakeholder-report">
      <header className="report-header"><div className="report-brand"><span>SA</span><div><strong>SAJIWA</strong><small>Universitas Diponegoro</small></div></div><div className="report-label">LAPORAN AGREGAT</div><h1>Laporan Analytics Kesehatan Mental Mahasiswa</h1><dl><div><dt>Periode</dt><dd>{formatDate(config.filters.dateFrom)}–{formatDate(config.filters.dateTo)}</dd></div><div><dt>Lingkup akademik</dt><dd>{scope}</dd></div><div><dt>Dibuat</dt><dd>{generated} WIB</dd></div></dl></header>
      {loading?<div className="report-loading"><Skeleton lines={12}/></div>:error||!data?<ErrorState title="Pratinjau tidak dapat dibuat" message="Sumber analytics agregat tidak tersedia. Laporan parsial tidak ditampilkan." retry={()=>{setLoading(true);setError(false);setRefresh((x)=>x+1)}} retryLabel="Coba lagi"/>:<>
        <InlineAlert tone="info">Laporan ini hanya berisi data agregat. Jumlah asesmen adalah pengiriman, bukan mahasiswa unik.</InlineAlert>
        {selected('summary')&&<ReportSectionBlock title="Ringkasan Eksekutif"><div className="report-kpis"><ReportKpi value={metrics?.assessmentTotal??0} label="Pengiriman asesmen"/><ReportKpi value={`${metrics?.highRiskPercent??0}%`} label="Hasil severe"/><ReportKpi value={metrics?.counselingTotal??0} label="Janji temu"/><ReportKpi value={metrics?.completed??0} label="Sesi selesai"/></div></ReportSectionBlock>}
        {selected('assessmentTrend')&&<ReportSectionBlock title="Aktivitas Asesmen"><Panel title="Pengiriman asesmen per tanggal" description={`${config.filters.dateFrom}–${config.filters.dateTo}; bukan tren tingkat keparahan.`}><BarChart rows={trend} empty="Tidak ada data asesmen pada periode ini." labelFormatter={formatShortDate}/></Panel></ReportSectionBlock>}
        {selected('dimensions')&&<ReportSectionBlock title="Distribusi Dimensi DASS-21"><Panel title="Tingkat keparahan per dimensi" description="Kategori dan tingkat keparahan berasal dari hasil yang disimpan backend."><StackedBars rows={dimensions.map((row)=>({label:dimensionLabel(row.category),values:row.values}))} empty="Tidak ada hasil dimensi DASS-21 pada periode ini."/></Panel></ReportSectionBlock>}
        {selected('academic')&&<ReportSectionBlock title="Perbandingan Akademik"><Panel title="Proporsi hasil severe" description={`Dari pengiriman asesmen pada setiap ${data.mode==='academic_unit'?'unit akademik':'lingkup'}.`}><BarChart rows={comparison.map((row)=>({label:row.label,value:row.percent}))} valueSuffix="%" empty="Tidak ada data perbandingan akademik."/></Panel></ReportSectionBlock>}
        {selected('counseling')&&<ReportSectionBlock title="Pemanfaatan Layanan Konseling"><Panel title="Komposisi status janji temu" description="Status operasional janji temu dalam periode laporan."><StatusBars rows={counseling} empty="Tidak ada data konseling pada periode ini."/></Panel></ReportSectionBlock>}
        {selected('insights')&&<ReportSectionBlock title="Wawasan Utama"><div className="report-insights">{insightRows.map((item)=><p key={item}>{item}</p>)}</div></ReportSectionBlock>}
        {selected('appendix')&&<ReportSectionBlock title="Lampiran Data Agregat"><AggregateTables data={data}/></ReportSectionBlock>}
      </>}
      <footer className="report-footer"><span>Sajiwa · Platform Operasional Kesehatan Mental Mahasiswa</span><span>Agregat rahasia internal · tanpa data identitas mahasiswa</span></footer>
    </article>
  </main>
}
function ReportSectionBlock({title,children}:{title:string;children:React.ReactNode}){return <section className="report-section"><h2>{title}</h2>{children}</section>}
function ReportKpi({value,label}:{value:number|string;label:string}){return <div><strong>{value}</strong><span>{label}</span></div>}
function AggregateTables({data}:{data:AnalyticsResponse}){return <div className="aggregate-tables"><table><caption>Distribusi tingkat keparahan asesmen</caption><thead><tr><th>Lingkup</th><th>Tingkat</th><th>Jumlah</th></tr></thead><tbody>{data.severity_distribution.map((row,index)=><tr key={`${row.scope_label}-${row.severity}-${index}`}><td>{row.scope_label}</td><td>{severityLabels[row.severity]??row.severity}</td><td>{row.count}</td></tr>)}</tbody></table><table><caption>Status janji temu konseling</caption><thead><tr><th>Lingkup</th><th>Status</th><th>Jumlah</th></tr></thead><tbody>{data.counseling_utilization.map((row,index)=><tr key={`${row.scope_label}-${row.status}-${index}`}><td>{row.scope_label}</td><td>{statusLabel(row.status)}</td><td>{row.count}</td></tr>)}</tbody></table></div>}
function scopeLabel(config:ReportConfiguration,structure:AcademicStructure|null,data:AnalyticsResponse|null){if(structure){const units=structure.academicUnits.filter((x)=>config.filters.academicUnitIds.includes(x.academic_unit_id)).map((x)=>x.name);if(units.length)return units.join(', ');const faculties=structure.faculties.filter((x)=>config.filters.facultyIds.includes(x.faculty_id)).map((x)=>x.name);if(faculties.length)return faculties.join(', ')}return data?.selected_scopes.map((item)=>item.scope_label).join(', ')||'Universitas Diponegoro'}
function formatDate(value:string){return new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T00:00:00Z`))}
function formatShortDate(value:string){return new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(`${value}T00:00:00Z`))}
function dimensionLabel(value:string){return ({depression:'Depresi',anxiety:'Kecemasan',stress:'Stres'} as Record<string,string>)[value]??value}
