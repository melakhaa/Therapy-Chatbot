import React,{useCallback,useMemo,useState} from 'react';
import {Text,View} from 'react-native';
import {apiCreateAcademicUnit,apiCreateFaculty,apiGetAcademicUnits,apiGetFaculties,apiUpdateAcademicUnit,apiUpdateFaculty,type AcademicUnit,type Faculty} from '@prototype/api-client';
import {errorMessage,useAdminResource} from '@/hooks/useAdminResource';
import {Badge,Button,Card,DataTable,Dialog,ErrorState,Field,FilterControl,LoadingState,Notice,ui} from '@/components/ui';
import {useAdminExperience} from './AdminExperience';

export default function AcademicStructureManager(){
 const {language}=useAdminExperience(),id=language==='id';
 const fs=useAdminResource(useCallback(()=>apiGetFaculties(true),[])),us=useAdminResource(useCallback(()=>apiGetAcademicUnits(undefined,true),[]));
 const [faculty,setFaculty]=useState<Faculty|true|null>(null),[unit,setUnit]=useState<AcademicUnit|true|null>(null);
 const [name,setName]=useState(''),[code,setCode]=useState(''),[facultyId,setFacultyId]=useState(''),[kind,setKind]=useState<'department'|'study_program'>('study_program');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const options=useMemo(()=>[{value:'',label:id?'Pilih fakultas':'Select faculty'},...(fs.data?.faculties||[]).map(x=>({value:x.faculty_id,label:x.name}))],[fs.data,id]);
 const openF=(x:Faculty|true)=>{setFaculty(x);setName(x===true?'':x.name);setCode(x===true?'':x.code||'');setError('');};
 const openU=(x:AcademicUnit|true)=>{setUnit(x);setName(x===true?'':x.name);setCode(x===true?'':x.code||'');setFacultyId(x===true?'':x.faculty_id);setKind(x===true?'study_program':x.unit_type);setError('');};
 const saveF=async()=>{if(!faculty)return;setBusy(true);try{const body={name:name.trim(),code:code.trim()||null,active:faculty===true||faculty.active};if(faculty===true) await apiCreateFaculty(body); else await apiUpdateFaculty(faculty.faculty_id,body);setFaculty(null);fs.reload();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}};
 const saveU=async()=>{if(!unit)return;setBusy(true);try{const current=unit===true?null:unit;const body={faculty_id:facultyId,name:name.trim(),code:code.trim()||null,unit_type:kind,degree_level:current?.degree_level||'S1',active:current?.active??true};if(current) await apiUpdateAcademicUnit(current.academic_unit_id,body); else await apiCreateAcademicUnit(body);setUnit(null);us.reload();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}};
 const toggleF=async(x:Faculty)=>{await apiUpdateFaculty(x.faculty_id,{name:x.name,code:x.code,active:!x.active});fs.reload();};
 const toggleU=async(x:AcademicUnit)=>{await apiUpdateAcademicUnit(x.academic_unit_id,{faculty_id:x.faculty_id,name:x.name,code:x.code,unit_type:x.unit_type,degree_level:x.degree_level,active:!x.active});us.reload();};
 return <Card title={id?'Struktur akademik':'Academic structure'} subtitle={id?'Referensi terkelola; baris yang digunakan dinonaktifkan, bukan dihapus.':'Managed reference data; referenced rows are deactivated instead of deleted.'}>
  <View style={[ui.row,{justifyContent:'flex-end'}]}><Button label={id?'Tambah fakultas':'Add faculty'} tone="quiet" onPress={()=>openF(true)}/><Button label={id?'Tambah unit':'Add unit'} onPress={()=>openU(true)}/></View>
  {fs.loading||us.loading?<LoadingState/>:fs.error||us.error?<ErrorState message={fs.error||us.error||''} retry={()=>{fs.reload();us.reload();}}/>:<>
   <Text style={ui.heading}>{id?'Fakultas':'Faculties'}</Text><DataTable rows={fs.data?.faculties||[]} rowKey={x=>x.faculty_id} columns={[
    {title:id?'Nama':'Name',width:260,render:x=><Text style={ui.text}>{x.name}</Text>},{title:'Status',width:100,render:x=><Badge value={x.active?'active':'inactive'}/>},
    {title:id?'Aksi':'Actions',width:210,render:x=><View style={ui.row}><Button label={id?'Ubah':'Edit'} tone="quiet" onPress={()=>openF(x)}/><Button label={x.active?(id?'Nonaktifkan':'Deactivate'):(id?'Aktifkan':'Activate')} tone="quiet" onPress={()=>{void toggleF(x);}}/></View>}
   ]}/><Text style={ui.heading}>{id?'Unit akademik':'Academic units'}</Text><DataTable rows={us.data?.academic_units||[]} rowKey={x=>x.academic_unit_id} columns={[
    {title:'Unit',width:260,render:x=><View><Text style={ui.text}>{x.name}</Text><Text style={ui.muted}>{x.faculty_name}</Text></View>},{title:id?'Jenis':'Type',width:130,render:x=><Badge value={x.unit_type}/>},
    {title:id?'Aksi':'Actions',width:210,render:x=><View style={ui.row}><Button label={id?'Ubah':'Edit'} tone="quiet" onPress={()=>openU(x)}/><Button label={x.active?(id?'Nonaktifkan':'Deactivate'):(id?'Aktifkan':'Activate')} tone="quiet" onPress={()=>{void toggleU(x);}}/></View>}
   ]}/></>}
  <Dialog title={faculty===true?(id?'Tambah fakultas':'Add faculty'):(id?'Ubah fakultas':'Edit faculty')} visible={!!faculty} onClose={()=>setFaculty(null)} busy={busy}><Field label={id?'Nama':'Name'} value={name} onChangeText={setName}/><Field label={id?'Kode':'Code'} value={code} onChangeText={setCode}/>{error&&<Notice danger>{error}</Notice>}<Button label={id?'Simpan':'Save'} disabled={busy||!name.trim()} onPress={()=>{void saveF();}}/></Dialog>
  <Dialog title={unit===true?(id?'Tambah unit akademik':'Add academic unit'):(id?'Ubah unit akademik':'Edit academic unit')} visible={!!unit} onClose={()=>setUnit(null)} busy={busy}><FilterControl label={id?'Fakultas':'Faculty'} value={facultyId} onChange={setFacultyId} options={options}/><FilterControl label={id?'Jenis':'Type'} value={kind} onChange={x=>setKind(x as 'department'|'study_program')} options={[{value:'study_program',label:id?'Program Studi':'Study program'},{value:'department',label:id?'Departemen':'Department'}]}/><Field label={id?'Nama':'Name'} value={name} onChangeText={setName}/><Field label={id?'Kode':'Code'} value={code} onChangeText={setCode}/>{error&&<Notice danger>{error}</Notice>}<Button label={id?'Simpan':'Save'} disabled={busy||!name.trim()||!facultyId} onPress={()=>{void saveU();}}/></Dialog>
 </Card>;
}
