'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, InlineAlert, PageShell } from '@/components/ui';
import { createCustomInstrument } from './api';
import { localDraftCompleteness, newLocalDraft } from './model';
import { QuestionEditor } from './QuestionEditor';

export function BackendInstrumentBuilder(){
 const router=useRouter();const [draft,setDraft]=useState(newLocalDraft);const [dimension,setDimension]=useState('');const [selected,setSelected]=useState(0);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const complete=localDraftCompleteness(draft);const ready=complete.metadata&&complete.dimensions&&complete.questions;
 const addDimension=()=>{const code=dimension.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_');if(code&&/^[a-z][a-z0-9_-]{0,59}$/.test(code)&&!draft.dimensions.includes(code)){setDraft({...draft,dimensions:[...draft.dimensions,code]});setDimension('')}};
 const addQuestion=()=>{if(!draft.dimensions.length)return;const n=draft.questions.length+1;setDraft({...draft,questions:[...draft.questions,{item_key:`ITEM-${String(n).padStart(2,'0')}`,category:draft.dimensions[0],position:n,wording:'',active:true,options:[{position:0,label:'Tidak pernah',score:0},{position:1,label:'Kadang-kadang',score:1}]}]});setSelected(n-1)};
 const save=async()=>{setSaving(true);setError('');try{const row=await createCustomInstrument(draft);router.push(`/instruments/${row.instrument_id}?version=${row.instrument_version_id}`)}catch(e){setError(e instanceof Error?e.message:String(e));setSaving(false)}};
 const copy:any={empty:{questions:'Tambahkan dimensi sebelum membuat pertanyaan.'},detail:{questions:'Pertanyaan'},fields:{code:'Kode',dimension:'Dimensi',wording:'Teks pertanyaan',option:'Pilihan',score:'Skor'},actions:{addQuestion:'Tambah pertanyaan',up:'Naik',down:'Turun',removeQuestion:'Hapus',addOption:'Tambah pilihan',removeOption:'Hapus pilihan'}};
 return <PageShell title="Builder Instrumen Kustom" actions={<Link className="button button-secondary" href="/instruments">Kembali</Link>}>
  <InlineAlert>Definisi disimpan atomik. Skor dijumlahkan per dimensi dan dapat memakai multiplier. Persetujuan konselor terikat pada revisi draft.</InlineAlert>{error&&<InlineAlert tone="danger">{error}</InlineAlert>}
  <section className="instrument-card builder-card"><h2>1. Informasi instrumen</h2><div className="instrument-form-grid"><label><span>Kode instrumen</span><input value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})}/></label><label><span>Nama</span><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label><span>Bahasa</span><input value={draft.language} onChange={e=>setDraft({...draft,language:e.target.value})}/></label><label className="field-wide"><span>Deskripsi</span><textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label></div></section>
  <section className="instrument-card builder-card"><h2>2. Dimensi dan skoring</h2><p>Gunakan kode stabil seperti <code>wellbeing</code> atau <code>academic_stress</code>. Strategi awal: jumlah per dimensi, multiplier 1.</p><div className="compact-actions"><input aria-label="Kode dimensi" value={dimension} onChange={e=>setDimension(e.target.value)}/><Button onClick={addDimension}>Tambah dimensi</Button></div><div className="dimension-picker">{draft.dimensions.map(code=><label key={code}><span>{code}</span><button type="button" onClick={()=>setDraft({...draft,dimensions:draft.dimensions.filter(x=>x!==code),questions:draft.questions.filter(q=>q.category!==code)})}>×</button></label>)}</div></section>
  <section className="instrument-card builder-card"><h2>3. Pertanyaan</h2><Button disabled={!draft.dimensions.length} onClick={addQuestion}>Tambah pertanyaan</Button><QuestionEditor questions={draft.questions} selected={selected} onSelect={setSelected} onChange={questions=>setDraft({...draft,questions})} editable copy={copy} categoryLabel={x=>x} dimensions={draft.dimensions}/></section>
  <section className="instrument-card builder-card"><h2>4. Review</h2><p>{draft.dimensions.length} dimensi · {draft.questions.length} pertanyaan</p><Button disabled={!ready||saving} onClick={save}>{saving?'Menyimpan…':'Simpan draft atomik'}</Button></section>
 </PageShell>
}
