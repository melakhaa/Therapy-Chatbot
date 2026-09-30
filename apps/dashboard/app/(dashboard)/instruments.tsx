import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  apiCreateInstrumentDraft, apiGetAssessmentInstruments, apiGetInstrumentVersion,
  apiCreateDerivedInstrument, apiPublishInstrumentVersion, apiSaveInstrumentDraft, apiValidateInstrumentVersion,
  type DassCategory, type QuestionDefinition,
} from '@prototype/api-client';
import { errorMessage, useAdminResource } from '@/hooks/useAdminResource';
import { useAdminExperience } from '@/components/admin/AdminExperience';
import { SegmentedControl } from '@/components/admin/ProductPrimitives';
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Field, LoadingState, Notice, Page, ui } from '@/components/ui';
import { adminTheme as c } from '@/constants/adminTheme';

const categories: DassCategory[] = ['depression', 'anxiety', 'stress'];
export default function DassInstrumentPage() {
  const { language } = useAdminExperience();
  const id = language === 'id';
  const instruments = useAdminResource(useCallback(apiGetAssessmentInstruments, []));
  const standard = instruments.data?.instruments.find(item => item.code.toLowerCase() === 'dass-21');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
  useEffect(()=>{if(!selectedInstrumentId&&standard)setSelectedInstrumentId(standard.instrument_id);},[selectedInstrumentId,standard]);
  const instrument = instruments.data?.instruments.find(item => item.instrument_id === selectedInstrumentId) || standard;
  const selectedSummary = instrument?.versions.find(item => item.status === 'draft') || instrument?.versions.find(item => item.status === 'published');
  const detail = useAdminResource(useCallback(() => selectedSummary ? apiGetInstrumentVersion(selectedSummary.instrument_version_id) : Promise.resolve(null), [selectedSummary]), !!selectedSummary);
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [category, setCategory] = useState<DassCategory | 'all'>('depression');
  const [preview, setPreview] = useState(false), [confirmPublish, setConfirmPublish] = useState(false);
  const [derivedDialog,setDerivedDialog]=useState(false),[derivedName,setDerivedName]=useState('Instrumen Kesejahteraan Mahasiswa'),[derivedCode,setDerivedCode]=useState('student-wellbeing');
  const [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(()=>{if(detail.data)setQuestions(detail.data.questions);},[detail.data]);
  const source = questions;
  const version = detail.data?.version;
  const standardLocked = version?.instrument_kind === 'standard' || instrument?.instrument_kind === 'standard';
  const visible = category === 'all' ? source : source.filter(item => item.category === category);
  const categoryCounts = useMemo(() => Object.fromEntries(categories.map(value => [value, source.filter(item => item.category === value && item.active).length])), [source]);
  const setSource = (next: QuestionDefinition[]) => setQuestions(next);
  const update = (itemKey: string, change: Partial<QuestionDefinition>) => setSource(source.map(item => item.item_key === itemKey ? { ...item, ...change } : item));
  const add = () => {
    const next = source.length + 1;
    setSource([...source, { item_key: `DRAFT-${next}`, category: category === 'all' ? 'depression' : category, position: next, wording: '', active: true, options: [{ position: 0, label: '', score: 0 }, { position: 1, label: '', score: 1 }] }]);
  };
  const save = async () => {
    if (!version) return;
    setBusy('save'); setError('');
    try { const result = await apiSaveInstrumentDraft(version.instrument_version_id, source); detail.reload(); setMessage(id ? 'Draft tersimpan.' : 'Draft saved.'); return result; }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); }
  };
  const createDraft = async () => {
    if (!instrument) return; setBusy('create'); setError('');
    try { await apiCreateInstrumentDraft(instrument.instrument_id); instruments.reload(); setMessage(id ? 'Draft baru dibuat.' : 'New draft created.'); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); }
  };
  const createDerived = async () => {
    if(!standard)return;setBusy('derived');setError('');
    try{const result=await apiCreateDerivedInstrument(standard.instrument_id,{name:derivedName.trim(),code:derivedCode.trim(),description:'Instrumen kustom/derived; norma DASS-21 tidak diterapkan otomatis.'});setSelectedInstrumentId(result.version.instrument_id);setDerivedDialog(false);instruments.reload();setMessage(id?'Instrumen kustom dibuat. Norma DASS-21 tidak diwariskan.':'Custom instrument created. DASS-21 norms were not inherited.');}
    catch(caught){setError(errorMessage(caught));}finally{setBusy('');}
  };
  const validate = async () => {
    if (!version) return; setBusy('validate'); setError('');
    try { const result = await apiValidateInstrumentVersion(version.instrument_version_id); if (result.publishable) setConfirmPublish(true); else setError(result.issues.join(' ')); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); }
  };
  const publish = async () => {
    if (!version) return; setBusy('publish'); setError('');
    try { await apiPublishInstrumentVersion(version.instrument_version_id); setConfirmPublish(false); instruments.reload(); detail.reload(); setMessage(id ? 'Versi dipublikasikan.' : 'Version published.'); }
    catch (caught) { setError(errorMessage(caught)); } finally { setBusy(''); }
  };
  if (instruments.loading) return <Page title="Instrumen DASS-21" subtitle=""><LoadingState /></Page>;
  return <Page title={id ? 'Instrumen Asesmen' : 'Assessment Instruments'} subtitle={id ? 'Tinjau DASS-21 standar atau kelola instrumen kustom/derived.' : 'Inspect standard DASS-21 or manage custom/derived instruments.'} action={<View style={ui.row}><Button label={id ? 'MODE PRATINJAU' : 'PREVIEW MODE'} icon="visibility" tone="quiet" onPress={() => setPreview(true)} />{standardLocked?<Button label={id?'Buat instrumen kustom':'Create custom instrument'} icon="content-copy" onPress={()=>setDerivedDialog(true)}/>:<Button label={id ? 'Simpan draft' : 'Save draft'} icon="save" disabled={busy !== '' || !version} onPress={() => { void save(); }} />}</View>}>
    <Notice>{standardLocked?(id?'Konten DASS-21 standar dikunci untuk menjaga konsistensi instrumen. Untuk pertanyaan atau skoring berbeda, buat instrumen kustom.':'Standard DASS-21 content is locked to preserve instrument consistency. Create a custom instrument for different wording or scoring.'):(id?'Perubahan membuat instrumen ini tidak lagi identik dengan DASS-21 standar. Norma DASS-21 tidak diterapkan otomatis.':'Changes mean this instrument is no longer identical to standard DASS-21. DASS-21 norms are not applied automatically.')}</Notice>
    {standardLocked&&source.length!==21&&<Notice danger>{id?'Konfigurasi kanonis Source A belum tersedia dari database. Terapkan migrasi 003_iteration4_1 sebelum melakukan validasi publikasi; jangan isi dengan terjemahan pengganti.':'The canonical Source A configuration is not available from the database. Apply migration 003_iteration4_1 before publication validation; do not enter a substitute translation.'}</Notice>}
    {message && <Notice>{message}</Notice>}{error && <ErrorState message={error} />}
    {instruments.data&&<Card title={id?'Pilih instrumen':'Select instrument'}><View style={ui.row}>{instruments.data.instruments.map(item=><Button key={item.instrument_id} label={`${item.instrument_kind==='standard'?'STANDARD':'CUSTOM'} · ${item.name}`} tone={item.instrument_id===instrument?.instrument_id?'primary':'quiet'} onPress={()=>setSelectedInstrumentId(item.instrument_id)}/>)}</View></Card>}
    <View style={ui.grid}><View style={[ui.column,{flexBasis:520}]}><Card title={id ? 'INSTRUMEN AKTIF' : 'ACTIVE INSTRUMENT'}><View style={ui.row}><Badge value={standardLocked?'STANDARD DASS-21':'CUSTOM'} /><Badge value={version?.status || 'draft'} /></View><Text style={ui.heading}>{instrument?.name||'DASS-21 Bahasa Indonesia'}</Text><Text style={ui.text}>{id?'Versi':'Version'} {version?.version_number||1} · {version?.language||instrument?.language||'Bahasa Indonesia'}</Text><Text style={ui.muted}>{version?.published_at?`${id?'Dipublikasikan':'Published'} ${new Date(version.published_at).toLocaleDateString('id-ID')}`:(id?'Belum dipublikasikan':'Not published')}</Text>{!version&&instrument&&<Button label={id?'Buat draft berikutnya':'Create next draft'} onPress={() => { void createDraft(); }}/>}</Card></View><View style={[ui.column,{flexBasis:420}]}><Card title={id?'DIMENSI & SKORING':'DIMENSIONS & SCORING'}><Text style={ui.text}>{source.length} / 21 {id?'item':'items'}</Text>{categories.map(value=><Text key={value} style={ui.muted}>{value[0].toUpperCase()+value.slice(1)} — {categoryCounts[value] || 0} item</Text>)}<Text style={ui.text}>{id?'Respons 0–3 · skor mentah subskala × 2':'Responses 0–3 · raw subscale score × 2'}</Text><Badge value={version?.authoritative_config?'configured':'not publishable'} /><Button label={id?'Validasi untuk publikasi':'Validate for publishing'} tone="danger" disabled={busy!==''||version?.status==='published'} onPress={() => { void validate(); }}/></Card></View></View>
    <View style={ui.grid}><View style={ui.column}><Card title={id?'INTERPRETASI':'INTERPRETATION'}><Text style={ui.text}>Normal · Mild · Moderate · Severe · Extremely Severe</Text><Text style={ui.muted}>{id?'Kategori keparahan gejala dimensional menurut norma konvensional DASS; bukan diagnosis.':'Dimensional symptom-severity categories under conventional DASS norms; not a diagnosis.'}</Text></Card></View><View style={ui.column}><Card title="PROVENANCE"><Text style={ui.text}>Lovibond & Lovibond (1995)</Text><Text style={ui.text}>Muttaqin & Ripa (2021)</Text><Text style={ui.muted}>{id?'Literatur pendukung: Hakim & Aristawati (2023). Bukan penulis kuesioner.':'Supporting literature: Hakim & Aristawati (2023). They are not the questionnaire authors.'}</Text></Card></View></View>
    <Card><SegmentedControl value={category} onChange={value=>setCategory(value as DassCategory|'all')} options={[...categories.map(value=>({value,label:value[0].toUpperCase()+value.slice(1)})),{value:'all',label:id?'Semua 21 Item':'All 21 Items'}]} /></Card>
    <Card title={standardLocked?(id?'Konten DASS-21 standar terkunci':'Locked standard DASS-21 content'):(id?'Pertanyaan draft kustom':'Custom draft questions')} subtitle={standardLocked?(id?'Admin dapat memeriksa pemetaan, opsi, dan pratinjau tanpa menulis ulang konten standar.':'Admins can inspect mappings, options, and preview without rewriting standard content.'):(id?'Draft kustom dapat disunting; norma DASS tidak diwariskan.':'Custom drafts are editable; DASS norms are not inherited.')} action={!standardLocked?<Button label={id?'Tambah item draft':'Add draft item'} icon="add" onPress={add}/>:undefined}>{visible.length?visible.map(item=>standardLocked?<View key={item.item_key} style={{gap:8,padding:16,borderWidth:1,borderColor:c.border,borderRadius:12}}><Text style={ui.heading}>#{item.position} · {item.category}</Text><Text style={ui.text}>{item.wording}</Text>{item.options.map(option=><Text key={option.position} style={ui.muted}>{option.score} — {option.label}</Text>)}</View>:<QuestionEditor key={item.item_key} item={item} id={id} onChange={change=>update(item.item_key,change)} onDelete={()=>setSource(source.filter(value=>value.item_key!==item.item_key).map((value,index)=>({...value,position:index+1})))}/>):<EmptyState message={id?'Belum ada item pada kategori ini.':'No items in this category yet.'}/>}</Card>
    <Dialog title={id?'PREVIEW MODE — Tampilan mahasiswa':'PREVIEW MODE — Student view'} visible={preview} onClose={()=>setPreview(false)}><Notice>{id?'Pratinjau ini tidak membuat catatan asesmen, notifikasi risiko, atau riwayat mahasiswa.':'This preview creates no assessment record, risk notification, or student history.'}</Notice>{source.length?[...source].sort((a,b)=>a.position-b.position).map((item,index)=><View key={item.item_key} style={{gap:10,paddingVertical:12,borderBottomWidth:1,borderColor:c.border}}><Text style={[ui.text,{fontWeight:'800'}]}>{index+1}. {item.wording||`[${id?'Teks pertanyaan belum diisi':'Question text not entered'}]`}</Text>{item.options.map(option=><View key={option.position} style={[ui.row,{minHeight:40,padding:8,borderWidth:1,borderColor:c.border,borderRadius:8}]}><MaterialIcons name="radio-button-unchecked" color={c.primary} size={18}/><Text style={ui.text}>{option.label||'—'}</Text></View>)}</View>):<EmptyState/>}</Dialog>
    <Dialog title={id?'Publikasikan versi DASS-21?':'Publish DASS-21 version?'} visible={confirmPublish} onClose={()=>setConfirmPublish(false)} busy={busy==='publish'}><Notice danger>{id?'Versi ini akan digunakan untuk asesmen baru. Hasil asesmen lama tetap menggunakan versi sebelumnya.':'This version will be used for new assessments. Historical results retain their original version.'}</Notice><View style={ui.row}><Button label={id?'Batal':'Cancel'} tone="quiet" onPress={()=>setConfirmPublish(false)}/><Button label={id?'Publikasikan':'Publish'} tone="danger" onPress={() => { void publish(); }}/></View></Dialog>
    <Dialog title={id?'Buat instrumen kustom/derived':'Create custom/derived instrument'} visible={derivedDialog} onClose={()=>setDerivedDialog(false)} busy={busy==='derived'}><Notice danger>{id?'Instrumen ini tidak lagi identik dengan DASS-21 standar. Norma dan interpretasi DASS-21 tidak diterapkan otomatis.':'This instrument is no longer identical to standard DASS-21. DASS-21 norms and interpretation are not applied automatically.'}</Notice><Field label={id?'Nama instrumen':'Instrument name'} value={derivedName} onChangeText={setDerivedName}/><Field label={id?'Kode unik':'Unique code'} value={derivedCode} onChangeText={setDerivedCode}/><View style={ui.row}><Button label={id?'Batal':'Cancel'} tone="quiet" onPress={()=>setDerivedDialog(false)}/><Button label={id?'Buat draft kustom':'Create custom draft'} onPress={()=>{void createDerived();}}/></View></Dialog>
  </Page>;
}

function QuestionEditor({item,id,onChange,onDelete}:{item:QuestionDefinition;id:boolean;onChange:(change:Partial<QuestionDefinition>)=>void;onDelete:()=>void}) {
  const updateOption=(position:number,change:{label?:string;score?:number})=>onChange({options:item.options.map(option=>option.position===position?{...option,...change}:option)});
  const addOption=()=>{const position=Math.max(-1,...item.options.map(option=>option.position))+1;onChange({options:[...item.options,{position,label:'',score:position}]});};
  return <View style={{gap:12,padding:16,borderWidth:1,borderColor:c.border,borderRadius:12,backgroundColor:c.surfaceMuted}}><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.heading}>#{item.position} · {item.category}</Text><Button label={id?'Hapus draft':'Delete draft'} icon="delete-outline" tone="danger" onPress={onDelete}/></View><View style={ui.row}><Field label={id?'Urutan':'Order'} value={String(item.position)} keyboardType="number-pad" onChangeText={value=>onChange({position:Math.max(1,Number(value)||1)})}/><Field label={id?'Kunci item':'Item key'} value={item.item_key} onChangeText={item_key=>onChange({item_key})}/></View><Field label={id?'Teks pertanyaan':'Question wording'} value={item.wording} onChangeText={wording=>onChange({wording})} multiline/><SegmentedControl value={item.category} onChange={value=>onChange({category:value as DassCategory})} options={categories.map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))}/><Text style={ui.muted}>{id?'Pilihan jawaban dan nilai skor':'Answer options and score values'}</Text>{item.options.map(option=><View key={option.position} style={ui.row}><Field label={`${id?'Pilihan':'Option'} ${option.position+1}`} value={option.label} onChangeText={label=>updateOption(option.position,{label})}/><Field label={id?'Nilai skor':'Score'} value={String(option.score)} keyboardType="number-pad" onChangeText={value=>updateOption(option.position,{score:Number(value)||0})}/><Button label={id?'Hapus pilihan':'Remove option'} tone="quiet" disabled={item.options.length<=2} onPress={()=>onChange({options:item.options.filter(value=>value.position!==option.position).map((value,index)=>({...value,position:index}))})}/></View>)}<Button label={id?'Tambah pilihan jawaban':'Add answer option'} icon="add" tone="quiet" onPress={addOption}/></View>;
}
