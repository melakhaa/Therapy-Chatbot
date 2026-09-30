import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiGetAcademicUnits, apiGetFaculties } from '@prototype/api-client';
import { useAdminResource } from '@/hooks/useAdminResource';
import { adminTheme as c } from '@/constants/adminTheme';
import { FilterControl, Notice, ui } from '@/components/ui';
import { useAdminExperience } from './AdminExperience';

export type AcademicScope={facultyId:string;departmentId:string};

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
