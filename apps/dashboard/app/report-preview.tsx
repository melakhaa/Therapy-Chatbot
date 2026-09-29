import React, { useCallback, useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { AdminAuth } from '@/components/admin/AdminAuth';
import { apiGetAnalytics } from '@/services/operationsData';
import { useAdminResource } from '@/hooks/useAdminResource';
import { Button, ErrorState, LoadingState } from '@/components/ui';

export default function ReportRoute() { return <AdminAuth><FormalReport /></AdminAuth>; }

function FormalReport() {
  const params = useLocalSearchParams<{ from?: string; to?: string; mode?: string; faculty?: string; department?: string }>();
  const from = typeof params.from === 'string' ? params.from : '2026-09-01', to = typeof params.to === 'string' ? params.to : '2026-09-30';
  const confidential = params.mode === 'confidential';
  const loader = useCallback(() => apiGetAnalytics(from, to), [from, to]); const resource = useAdminResource(loader);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = document.createElement('style'); node.dataset.sanctuaryPrint = 'true';
    node.textContent = '@page{size:A4 portrait;margin:16mm 14mm 18mm}@media print{.report-toolbar{display:none!important}.report-page{box-shadow:none!important;margin:0!important;max-width:none!important}.page-break{break-before:page}.avoid-break{break-inside:avoid}body{background:#fff!important}}';
    document.head.appendChild(node); return () => node.remove();
  }, []);
  if (resource.loading) return <LoadingState />; if (resource.error || !resource.data) return <View style={{ padding: 30 }}><ErrorState message={resource.error || 'Laporan tidak tersedia.'} retry={resource.reload} /></View>;
  const data = resource.data; const severity = Object.fromEntries(data.severity_distribution.map(item => [item.severity, item.count]));
  const scope = 'Universitas Diponegoro';
  return <ScrollView style={r.screen} contentContainerStyle={{ padding: 24 }}>
    <View {...({ className: 'report-toolbar' } as object)} style={r.toolbar}><Button label="Cetak / Simpan PDF" icon="picture-as-pdf" onPress={() => { if (Platform.OS === 'web') window.print(); }} /><Text style={r.toolbarText}>Pratinjau laporan · tema cetak terang tetap</Text></View>
    <View {...({ className: 'report-page' } as object)} style={r.page}>
      <View style={r.cover}>
        <View style={r.brandRow}><LogoSlot label="UNDIP" /><View style={{ flex: 1 }} /><LogoSlot label="SANCTUARY" icon="spa" /></View>
        <View style={r.coverCenter}><Text style={r.university}>UNIVERSITAS DIPONEGORO</Text><Text style={r.sanctuary}>SANCTUARY</Text><View style={r.rule} /><Text style={r.reportTitle}>LAPORAN PEMANTAUAN KESEHATAN MENTAL MAHASISWA</Text><Text style={r.period}>{formatID(from)} — {formatID(to)}</Text><Text style={r.scope}>{scope}</Text>{confidential && <Text style={r.confidential}>DOKUMEN RAHASIA · PERHATIAN KHUSUS</Text>}</View>
        <View><Text style={r.small}>Dihasilkan {new Date().toLocaleString('id-ID')}</Text><Text style={r.small}>Sanctuary · DASS-21 Subskala Stres · Lingkup administrasi</Text></View>
      </View>

      <ReportHeader confidential={confidential} />
      <Section number="01" title="Identitas laporan"><InfoGrid values={[['Periode pelaporan', formatID(from) + ' — ' + formatID(to)], ['Cakupan', scope], ['Mode laporan', confidential ? 'Agregat + Perhatian Khusus' : 'Laporan Agregat'], ['Tanggal dibuat', new Date().toLocaleDateString('id-ID')]]} /></Section>
      <Section number="02" title="Ringkasan eksekutif"><Text style={r.body}>Dalam periode terpilih, Sanctuary mencatat {data.assessment_total} pengiriman asesmen dan {data.booking_total} booking konseling. Angka menggambarkan aktivitas platform dan klasifikasi yang tersimpan. Data ini tidak menetapkan diagnosis, prevalensi klinis, atau hasil perawatan.</Text></Section>
      <Section number="03" title="Statistik utama"><View style={r.metrics}><Metric value={data.registered_students} label="Mahasiswa terdaftar" /><Metric value={data.assessment_total} label="Pengiriman asesmen" /><Metric value={data.booking_total} label="Booking konseling" /><Metric value={severity.severe || 0} label="Tingkat berat tercatat" /></View></Section>
      <Section number="04" title="Distribusi tingkat stres tercatat"><BarRows rows={data.severity_distribution.map(item => ({ label: labelStatus(item.severity), value: item.count }))} /><Text style={r.caption}>Gambar 1. Distribusi klasifikasi stres yang tersimpan selama periode laporan.</Text></Section>
      <Section number="05" title="Tren asesmen"><View style={r.trend}>{data.assessment_trend.map(item => <View key={item.date} style={r.trendItem}><View style={[r.trendBar, { height: 18 + item.count * 8 }]} /><Text style={r.axis}>{item.date.slice(5)}</Text><Text style={r.axis}>{item.count}</Text></View>)}</View><Text style={r.caption}>Gambar 2. Jumlah pengiriman asesmen berdasarkan tanggal.</Text></Section>
      <View {...({ className: 'page-break' } as object)}><ReportHeader confidential={confidential} /></View>
      <Section number="06" title="Analisis cakupan akademik"><PendingText text="Metadata Fakultas dan Departemen belum tersedia dari API produksi. Bagian ini menunggu integrasi backend." /></Section>
      <Section number="07" title="Utilisasi konseling"><ReportTable headers={['Status booking', 'Jumlah']} rows={data.booking_status.map(item => [labelStatus(item.status), String(item.count)])} /></Section>
      {confidential && <Section number="08" title="Perhatian khusus"><View style={r.warning}><MaterialIcons name="lock" color="#9e3548" size={20} /><Text style={r.warningText}>Bagian ini bersifat rahasia dan hanya untuk tindak lanjut administratif yang berwenang.</Text></View><PendingText text="Ekspor identitas terbatas, konfirmasi kewenangan, dan audit laporan memerlukan dukungan backend. Tidak ada identitas mahasiswa produksi yang disusun dari endpoint lain." /></Section>}
      <Section number={confidential ? '09' : '08'} title="Catatan metodologi"><Text style={r.body}>Jumlah asesmen adalah jumlah pengiriman, bukan mahasiswa unik. Sanctuary menampilkan tingkat stres yang telah dicatat oleh sistem saat ini dan tidak menghitung ulang skor. Sinyal asesmen dan sinyal Safety Guardrail tetap merupakan kategori yang terpisah.</Text></Section>
      <Section number={confidential ? '10' : '09'} title="Pernyataan kerahasiaan"><Text style={r.body}>Laporan ini digunakan untuk pemantauan operasional yang berwenang. Dilarang menyebarkan informasi kepada pihak yang tidak memiliki kewenangan. Laporan tidak memuat percakapan chatbot, jurnal, jawaban asesmen, teks pemicu guardrail, kata sandi, token, atau rahasia internal.</Text></Section>
      <View style={r.footer}><Text style={r.small}>SANCTUARY · UNIVERSITAS DIPONEGORO</Text><Text style={r.small}>Dihasilkan {new Date().toLocaleString('id-ID')}</Text></View>
    </View>
  </ScrollView>;
}

function LogoSlot({ label, icon }: { label: string; icon?: React.ComponentProps<typeof MaterialIcons>['name'] }) { return <View style={r.logo}><MaterialIcons name={icon || 'account-balance'} size={24} color="#246a63" /><Text style={r.logoText}>{label}</Text><Text style={r.assetNote}>SLOT ASET RESMI</Text></View>; }
function ReportHeader({ confidential }: { confidential: boolean }) { return <View style={r.header}><Text style={r.headerBrand}>SANCTUARY</Text><Text style={r.headerText}>Laporan Pemantauan Kesehatan Mental Mahasiswa</Text>{confidential && <Text style={r.headerConfidential}>RAHASIA</Text>}</View>; }
function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <View {...({ className: 'avoid-break' } as object)} style={r.section}><View style={r.sectionTitle}><Text style={r.sectionNumber}>{number}</Text><Text style={r.h2}>{title.toUpperCase()}</Text></View>{children}</View>; }
function Metric({ value, label }: { value: number; label: string }) { return <View style={r.metric}><Text style={r.metricValue}>{value}</Text><Text style={r.metricLabel}>{label}</Text></View>; }
function InfoGrid({ values }: { values: string[][] }) { return <View style={r.infoGrid}>{values.map(item => <View key={item[0]} style={r.infoItem}><Text style={r.infoLabel}>{item[0].toUpperCase()}</Text><Text style={r.infoValue}>{item[1]}</Text></View>)}</View>; }
function BarRows({ rows }: { rows: { label: string; value: number }[] }) { const max = Math.max(1, ...rows.map(item => item.value)); return <View style={{ gap: 12 }}>{rows.map(item => <View key={item.label}><View style={r.barLabel}><Text style={r.body}>{item.label}</Text><Text style={r.barValue}>{item.value}</Text></View><View style={r.barTrack}><View style={[r.barFill, { width: item.value / max * 600 }]} /></View></View>)}</View>; }
function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <View style={r.table}><View style={r.tableRow}>{headers.map(item => <Text key={item} style={[r.cell, r.tableHead]}>{item}</Text>)}</View>{rows.map((row, index) => <View key={index} style={r.tableRow}>{row.map((item, cell) => <Text key={cell} style={r.cell}>{item}</Text>)}</View>)}</View>; }
function PendingText({ text }: { text: string }) { return <View style={r.pending}><Text style={r.body}>{text}</Text></View>; }
function formatID(value: string) { return new Date(value + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
function labelStatus(value: string) { return ({ minimal: 'Minimal', mild: 'Ringan', moderate: 'Sedang', severe: 'Berat', menunggu: 'Menunggu', dikonfirmasi: 'Dikonfirmasi', selesai: 'Selesai', dibatalkan: 'Dibatalkan' } as Record<string, string>)[value] || value; }

const ink='#18313b', muted='#61757c', brand='#246a63', border='#d9e3e1', pale='#eef5f3';
const r=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#e6eceb'},toolbar:{maxWidth:900,width:'100%',alignSelf:'center',marginBottom:14,backgroundColor:'#fff',borderRadius:12,padding:12,flexDirection:'row',gap:14,alignItems:'center'},toolbarText:{color:muted,fontSize:12},
  page:{width:'100%',maxWidth:900,alignSelf:'center',backgroundColor:'#fff',padding:48,gap:26,shadowColor:'#10292d',shadowOpacity:.14,shadowRadius:24},cover:{minHeight:930,justifyContent:'space-between'},brandRow:{flexDirection:'row',alignItems:'flex-start'},logo:{width:132,height:86,borderWidth:1,borderStyle:'dashed',borderColor:'#9db5b0',borderRadius:8,alignItems:'center',justifyContent:'center'},logoText:{color:brand,fontWeight:'900',fontSize:12},assetNote:{fontSize:7,color:muted,letterSpacing:.8},
  coverCenter:{alignItems:'center',gap:14,paddingVertical:80},university:{color:ink,fontSize:18,fontWeight:'700',letterSpacing:2},sanctuary:{color:brand,fontSize:34,fontWeight:'900',letterSpacing:1.5},rule:{width:68,height:3,backgroundColor:brand,marginVertical:8},reportTitle:{color:ink,fontSize:27,lineHeight:37,textAlign:'center',fontWeight:'800',maxWidth:650},period:{color:muted,fontSize:16},scope:{color:brand,fontSize:14,fontWeight:'700'},confidential:{color:'#9e3548',backgroundColor:'#fbe9ec',paddingHorizontal:14,paddingVertical:8,borderRadius:4,fontWeight:'900',letterSpacing:1},
  header:{borderBottomWidth:2,borderColor:brand,paddingBottom:10,flexDirection:'row',alignItems:'center',gap:12},headerBrand:{color:brand,fontSize:14,fontWeight:'900'},headerText:{color:muted,fontSize:10,flex:1},headerConfidential:{color:'#9e3548',fontSize:9,fontWeight:'900',letterSpacing:1},
  section:{gap:15,paddingBottom:10},sectionTitle:{flexDirection:'row',alignItems:'center',gap:12},sectionNumber:{color:brand,fontSize:11,fontWeight:'900',borderWidth:1,borderColor:brand,borderRadius:15,width:30,height:30,textAlign:'center',paddingTop:7},h2:{color:ink,fontSize:16,fontWeight:'900',letterSpacing:.8},body:{color:ink,fontSize:12,lineHeight:20},small:{color:muted,fontSize:9,lineHeight:15},
  metrics:{flexDirection:'row',gap:10,flexWrap:'wrap'},metric:{flexGrow:1,flexBasis:150,borderTopWidth:3,borderColor:brand,backgroundColor:pale,padding:15,gap:5},metricValue:{color:ink,fontSize:26,fontWeight:'900'},metricLabel:{color:muted,fontSize:10},
  infoGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},infoItem:{width:'48%',backgroundColor:pale,padding:13,gap:4},infoLabel:{fontSize:8,color:muted,fontWeight:'800',letterSpacing:.6},infoValue:{fontSize:11,color:ink,fontWeight:'600'},
  barLabel:{flexDirection:'row',justifyContent:'space-between'},barValue:{color:ink,fontSize:12,fontWeight:'800'},barTrack:{height:9,backgroundColor:'#edf1f0',borderRadius:5,overflow:'hidden'},barFill:{height:9,backgroundColor:brand,borderRadius:5},caption:{color:muted,fontSize:9,fontStyle:'italic'},
  trend:{height:170,flexDirection:'row',alignItems:'flex-end',gap:12,borderBottomWidth:1,borderColor:border,paddingHorizontal:10},trendItem:{flex:1,alignItems:'center',gap:4},trendBar:{width:'70%',backgroundColor:brand,borderTopLeftRadius:4,borderTopRightRadius:4},axis:{fontSize:8,color:muted},
  table:{borderWidth:1,borderColor:border},tableRow:{flexDirection:'row',borderBottomWidth:1,borderColor:border},cell:{flex:1,padding:10,color:ink,fontSize:10},tableHead:{backgroundColor:pale,fontWeight:'800'},warning:{flexDirection:'row',gap:9,backgroundColor:'#fbe9ec',padding:13,alignItems:'center'},warningText:{color:'#9e3548',fontSize:11,fontWeight:'700',flex:1},pending:{borderWidth:1,borderStyle:'dashed',borderColor:'#c89745',backgroundColor:'#fff7e5',padding:14},footer:{borderTopWidth:1,borderColor:border,paddingTop:12,flexDirection:'row',justifyContent:'space-between'},
});
