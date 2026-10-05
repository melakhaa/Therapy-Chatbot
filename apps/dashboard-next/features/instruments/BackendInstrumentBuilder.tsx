'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, InlineAlert, PageShell } from '@/components/ui';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { createCustomInstrument } from './api';
import { localDraftCompleteness, newLocalDraft } from './model';
import { QuestionEditor } from './QuestionEditor';

export function BackendInstrumentBuilder(){
 const router=useRouter();const {text}=useLanguage();const copy=text.instruments;const builder=text.instrumentCreate;const [draft,setDraft]=useState(newLocalDraft);const [dimension,setDimension]=useState('');const [selected,setSelected]=useState(0);const [saving,setSaving]=useState(false);const [error,setError]=useState(false);const [dirty,setDirty]=useState(false);const complete=localDraftCompleteness(draft);const ready=complete.metadata&&complete.dimensions&&complete.questions;
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 const updateDraft=(next:ReturnType<typeof newLocalDraft>)=>{setDraft(next);setDirty(true)};
 const addDimension=()=>{const code=dimension.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_');if(code&&/^[a-z][a-z0-9_-]{0,59}$/.test(code)&&!draft.dimensions.includes(code)){updateDraft({...draft,dimensions:[...draft.dimensions,code]});setDimension('')}};
 const addQuestion=()=>{if(!draft.dimensions.length)return;const n=draft.questions.length+1;updateDraft({...draft,questions:[...draft.questions,{item_key:`ITEM-${String(n).padStart(2,'0')}`,category:draft.dimensions[0],position:n,wording:'',active:true,options:[{position:0,label:builder.defaultNever,score:0},{position:1,label:builder.defaultSometimes,score:1}]}]});setSelected(n-1)};
 const save=async()=>{setSaving(true);setError(false);try{const row=await createCustomInstrument(draft);setDirty(false);router.push(`/instruments/${row.instrument_id}?version=${row.instrument_version_id}`)}catch{setError(true);setSaving(false)}};
 const leave=(event:React.MouseEvent<HTMLAnchorElement>)=>{if(dirty&&!window.confirm(copy.unsaved))event.preventDefault()};
 return <PageShell title={copy.builder.title} actions={<Link className="button button-secondary" href="/instruments" onClick={leave}>{copy.actions.back}</Link>}>
  <InlineAlert>{builder.notice}</InlineAlert>{error&&<InlineAlert tone="danger">{copy.errors.save}</InlineAlert>}
  <section className="instrument-card builder-card"><h2>1. {builder.metadata}</h2><div className="instrument-form-grid"><label><span>{builder.instrumentCode}</span><input value={draft.code} onChange={e=>updateDraft({...draft,code:e.target.value})}/></label><label><span>{copy.fields.name}</span><input value={draft.name} onChange={e=>updateDraft({...draft,name:e.target.value})}/></label><label><span>{copy.fields.language}</span><input value={draft.language} onChange={e=>updateDraft({...draft,language:e.target.value})}/></label><label className="field-wide"><span>{copy.fields.description}</span><textarea value={draft.description} onChange={e=>updateDraft({...draft,description:e.target.value})}/></label></div></section>
  <section className="instrument-card builder-card"><h2>2. {builder.dimensionsScoring}</h2><p>{builder.dimensionHelp}</p><div className="compact-actions"><input aria-label={builder.dimensionCode} value={dimension} onChange={e=>setDimension(e.target.value)}/><Button onClick={addDimension}>{builder.addDimension}</Button></div><div className="dimension-picker">{draft.dimensions.map(code=><span className="dimension-token" key={code}><span>{code}</span><button type="button" aria-label={`${builder.removeDimension}: ${code}`} onClick={()=>updateDraft({...draft,dimensions:draft.dimensions.filter(x=>x!==code),questions:draft.questions.filter(q=>q.category!==code)})}>×</button></span>)}</div></section>
  <section className="instrument-card builder-card"><h2>3. {builder.questions}</h2><Button disabled={!draft.dimensions.length} onClick={addQuestion}>{copy.actions.addQuestion}</Button><QuestionEditor questions={draft.questions} selected={selected} onSelect={setSelected} onChange={questions=>updateDraft({...draft,questions})} editable copy={copy} categoryLabel={x=>x} dimensions={draft.dimensions}/></section>
  <section className="instrument-card builder-card"><h2>4. {builder.review}</h2><p>{builder.summary.replace('{dimensions}',String(draft.dimensions.length)).replace('{questions}',String(draft.questions.length))}</p><Button disabled={!ready||saving} loading={saving} onClick={save}>{builder.saveAtomic}</Button></section>
 </PageShell>
}
