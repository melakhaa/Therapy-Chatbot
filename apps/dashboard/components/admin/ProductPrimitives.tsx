import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiGetAcademicUnits, apiGetFaculties } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { adminTheme as c } from '@/constants/adminTheme';
import { Button, Dialog, FilterControl, Notice, SearchInput, ui } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';

export type AcademicScope={facultyId:string;departmentId:string};
export type AcademicMultiScope={facultyIds:string[];academicUnitIds:string[]};
export type SelectOption={value:string;label:string;group?:string};

export function MultiSelectControl({label,values,options,onChange,placeholder,grouped=false}:{label:string;values:string[];options:SelectOption[];onChange:(values:string[])=>void;placeholder:string;grouped?:boolean}){
  const {language}=useAdminExperience();
  const [open,setOpen]=useState(false),[search,setSearch]=useState('');
  const selected=options.filter(option=>values.includes(option.value));
  const filtered=options.filter(option=>`${option.label} ${option.group||''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const groups=useMemo(()=>grouped?[...new Set(filtered.map(option=>option.group||''))]:[''],[filtered,grouped]);
  const summary=!selected.length?placeholder:selected.length<=2?selected.map(option=>option.label).join(', '):`${selected.length} ${language==='id'?'dipilih':'selected'}`;
  const toggle=(value:string)=>onChange(values.includes(value)?values.filter(item=>item!==value):[...values,value]);
  return <View style={{gap:7,minWidth:220,flexGrow:1}}><Text style={ui.muted}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${summary}`} accessibilityState={{expanded:open}} onPress={()=>setOpen(true)} style={{minHeight:44,borderWidth:1,borderColor:values.length?c.primary:c.border,borderRadius:9,backgroundColor:c.surface,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:8}}><Text numberOfLines={1} style={[ui.text,{flex:1,color:values.length?c.text:c.muted}]}>{summary}</Text>{values.length>0&&<View style={{backgroundColor:c.primarySoft,borderRadius:12,paddingHorizontal:8,paddingVertical:3}}><Text style={{color:c.primary,fontSize:10,fontWeight:'800'}}>{values.length}</Text></View>}<MaterialIcons name="arrow-drop-down" size={22} color={c.muted}/></Pressable>
    <Dialog title={label} visible={open} onClose={()=>{setOpen(false);setSearch('');}}><SearchInput value={search} onChangeText={setSearch} placeholder={language==='id'?'Cari pilihan…':'Search options…'}/><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.muted}>{values.length} {language==='id'?'dipilih':'selected'}</Text><Button label={language==='id'?'Hapus semua':'Clear all'} tone="quiet" disabled={!values.length} onPress={()=>onChange([])}/></View><ScrollView style={{maxHeight:420}} contentContainerStyle={{gap:14}}>{groups.map(group=><View key={group||'all'} style={{gap:6}}>{grouped&&<Text style={[ui.heading,{fontSize:12,color:c.primary}]}>{group||'—'}</Text>}{filtered.filter(option=>(option.group||'')===group||!grouped).map(option=>{const checked=values.includes(option.value);return <Pressable key={option.value} accessibilityRole="checkbox" accessibilityState={{checked}} accessibilityLabel={option.label} onPress={()=>toggle(option.value)} style={({pressed})=>({minHeight:44,paddingHorizontal:10,paddingVertical:9,borderRadius:8,backgroundColor:checked?c.primarySoft:pressed?c.surfaceInteractive:'transparent',flexDirection:'row',alignItems:'center',gap:10})}><MaterialIcons name={checked?'check-box':'check-box-outline-blank'} size={21} color={checked?c.primary:c.muted}/><Text style={[ui.text,{flex:1,fontWeight:checked?'700':'500'}]}>{option.label}</Text></Pressable>})}</View>)}</ScrollView><Button label={language==='id'?'Selesai':'Done'} onPress={()=>{setOpen(false);setSearch('');}}/></Dialog>
  </View>;
}

export function AcademicMultiScopeControl({value,onChange,compact=false}:{value:AcademicMultiScope;onChange:(value:AcademicMultiScope)=>void;compact?:boolean}){
  const {language}=useAdminExperience();
  const facultiesResource=useAdminResource(useCallback(()=>apiGetFaculties(false),[]));
  const unitsResource=useAdminResource(useCallback(()=>apiGetAcademicUnits(undefined,false),[]));
  const faculties=(facultiesResource.data?.faculties||[]).map(item=>({id:item.faculty_id,name:item.name}));
  const allUnits=(unitsResource.data?.academic_units||[]).map(item=>({id:item.academic_unit_id,facultyId:item.faculty_id,name:item.name}));
  const visibleUnits=value.facultyIds.length?allUnits.filter(unit=>value.facultyIds.includes(unit.facultyId)):allUnits;
  const validUnitIds=value.academicUnitIds.filter(unitId=>visibleUnits.some(unit=>unit.id===unitId));
  const setFaculties=(facultyIds:string[])=>onChange({facultyIds,academicUnitIds:validUnitIds.filter(unitId=>{const unit=allUnits.find(item=>item.id===unitId);return !facultyIds.length||!!unit&&facultyIds.includes(unit.facultyId);})});
  return <View style={{gap:compact?8:13}}><View style={[ui.row,{justifyContent:'space-between'}]}><View><Text style={ui.heading}>{language==='id'?'Cakupan akademik':'Academic scope'}</Text><Text style={ui.muted}>{language==='id'?'Pilih beberapa cakupan dengan logika ATAU.':'Select multiple scopes using OR semantics.'}</Text></View></View>{facultiesResource.error&&<Notice>{language==='id'?'Data fakultas tidak dapat dimuat.':'Faculty data could not be loaded.'}</Notice>}<View style={ui.row}><MultiSelectControl label={language==='id'?'Fakultas':'Faculties'} values={value.facultyIds} options={faculties.map(item=>({value:item.id,label:item.name}))} onChange={setFaculties} placeholder={language==='id'?'Seluruh universitas':'University-wide'}/><MultiSelectControl label={language==='id'?'Unit akademik':'Academic units'} values={validUnitIds} options={visibleUnits.map(unit=>({value:unit.id,label:unit.name,group:faculties.find(faculty=>faculty.id===unit.facultyId)?.name||'—'}))} onChange={academicUnitIds=>onChange({...value,academicUnitIds})} placeholder={language==='id'?'Semua unit':'All units'} grouped/></View>{(value.facultyIds.length>6||value.academicUnitIds.length>6)&&<Notice>{language==='id'?'Banyak kelompok dipilih. Grafik mungkin lebih sulit dibaca.':'Many groups are selected. Charts may be harder to read.'}</Notice>}</View>;
}

export function AcademicScopeControl({value,onChange,compact=false}:{value:AcademicScope;onChange:(value:AcademicScope)=>void;compact?:boolean}){
  const {language}=useAdminExperience();
  const facultyLoader=useCallback(()=>apiGetFaculties(false),[]);
  const unitLoader=useCallback(()=>apiGetAcademicUnits(value.facultyId||undefined,false),[value.facultyId]);
  const facultyResource=useAdminResource(facultyLoader);
  const unitResource=useAdminResource(unitLoader);
  const faculties=(facultyResource.data?.faculties||[]).map(x=>({id:x.faculty_id,name:x.name}));
  const departments=(unitResource.data?.academic_units||[]).map(x=>({id:x.academic_unit_id,facultyId:x.faculty_id,name:x.name}));
  return <View style={{gap:compact?8:13}}>
    <View style={[ui.row,{justifyContent:'space-between'}]}><View><Text style={ui.heading}>{language==='id'?'Cakupan akademik':'Academic scope'}</Text><Text style={ui.muted}>Universitas Diponegoro → Fakultas → Unit Akademik</Text></View></View>
    {facultyResource.error&&<Notice>{language==='id'?'Data fakultas tidak dapat dimuat.':'Faculty data could not be loaded.'}</Notice>}
    <FilterControl label={language==='id'?'Fakultas':'Faculty'} value={value.facultyId} onChange={facultyId=>onChange({facultyId,departmentId:''})} options={[{value:'',label:language==='id'?'Seluruh universitas':'University-wide'},...faculties.map(x=>({value:x.id,label:x.name}))]}/>
    {!!value.facultyId&&<FilterControl label={language==='id'?'Unit akademik':'Academic unit'} value={value.departmentId} onChange={departmentId=>onChange({...value,departmentId})} options={[{value:'',label:language==='id'?'Seluruh fakultas':'All academic units'},...departments.map(x=>({value:x.id,label:x.name}))]}/>}
  </View>;
}
export function BackendPending({title,detail}:{title?:string;detail?:string}){
  const {language}=useAdminExperience();
  return <View style={{borderWidth:1,borderStyle:'dashed',borderColor:c.warning,backgroundColor:c.warningSoft,borderRadius:12,padding:14,gap:7}}><View style={[ui.row,{gap:8}]}><MaterialIcons name="construction" color={c.warning} size={18}/><Text style={[ui.text,{color:c.warning,fontWeight:'800'}]}>{title||(language==='id'?'Integrasi backend belum tersedia':'Backend integration pending')}</Text></View>{!!detail&&<Text style={[ui.muted,{color:c.warning}]}>{detail}</Text>}</View>;
}
export function SegmentedControl({value,onChange,options}:{value:string;onChange:(value:string)=>void;options:{value:string;label:string;icon?:React.ComponentProps<typeof MaterialIcons>['name']}[]}){
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,padding:4,borderRadius:11,backgroundColor:c.surfaceMuted,borderWidth:1,borderColor:c.border}}>{options.map(option=><Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{selected:value===option.value}} onPress={()=>onChange(option.value)} style={({pressed})=>({minHeight:36,borderRadius:8,paddingHorizontal:12,flexDirection:'row',gap:6,alignItems:'center',backgroundColor:value===option.value?c.surface:'transparent',borderWidth:value===option.value?1:0,borderColor:c.borderStrong,opacity:pressed ? 0.76 : 1,transform:[{scale:pressed ? 0.98 : 1}]})}>{option.icon&&<MaterialIcons name={option.icon} size={16} color={value===option.value?c.primary:c.muted}/>}<Text style={{color:value===option.value?c.text:c.muted,fontSize:11,fontWeight:value===option.value?'700':'500'}}>{option.label}</Text></Pressable>)}</View>;
}
