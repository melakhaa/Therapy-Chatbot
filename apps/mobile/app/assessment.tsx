import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Spacing, Typography } from '@prototype/ui-shared';
import {
  apiGetActiveAssessmentInstrument,
  apiSubmitInstrumentAssessment,
  type ActiveAssessmentInstrument,
  type InstrumentAssessmentCompletion,
} from '@prototype/api-client';
import { BottomNav, Button } from '../components/ui';

export default function AssessmentScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [instrument,setInstrument]=useState<ActiveAssessmentInstrument|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [index,setIndex]=useState(0);
  const [loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const [completion,setCompletion]=useState<InstrumentAssessmentCompletion|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);setError('');setCompletion(null);
    try{const data=await apiGetActiveAssessmentInstrument();setInstrument(data);setAnswers({});setIndex(0);}
    catch{setInstrument(null);setError('Instrumen asesmen aktif belum dapat dimuat. Periksa koneksi lalu coba lagi.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const questions=useMemo(()=>[...(instrument?.questions||[])].sort((a,b)=>a.position-b.position),[instrument]);
  const question=questions[index];
  const complete=questions.length>0&&Object.keys(answers).length===questions.length;

  const submit=async()=>{
    if(!instrument||!complete)return;
    setSubmitting(true);setError('');
    try{
      const result=await apiSubmitInstrumentAssessment({
        instrument_version_id:instrument.version.instrument_version_id,
        answers:questions.map(item=>({question_id:item.assessment_question_id,option_id:answers[item.assessment_question_id]})),
      });
      setCompletion(result);
    }catch{setError('Asesmen belum berhasil dikirim. Jawabanmu tetap tersimpan di layar ini; silakan coba lagi.');}
    finally{setSubmitting(false);}
  };
  const confirmSubmit=()=>{
    if(!complete){setError('Jawab seluruh 21 pertanyaan sebelum mengirim asesmen.');return;}
    Alert.alert('Kirim asesmen?','Pastikan seluruh jawaban sudah sesuai dengan kondisi yang kamu alami selama satu minggu terakhir.',[
      {text:'Periksa lagi',style:'cancel'},
      {text:'Kirim',onPress:()=>{void submit();}},
    ]);
  };

  return <View style={[s.root,{backgroundColor:colors.background}]}><ScrollView contentContainerStyle={[s.content,{paddingTop:insets.top+28,paddingBottom:130}]} keyboardShouldPersistTaps="handled">
    <Text style={[s.eyebrow,{color:colors.primary}]}>ASESMEN KESEJAHTERAAN</Text>
    <Text style={[s.title,{color:colors.onSurface}]}>DASS-21 Bahasa Indonesia</Text>
    <Text style={[s.subtitle,{color:colors.onSurfaceVariant}]}>Jawab berdasarkan kondisi yang kamu alami selama satu minggu terakhir. Hasil ini bukan diagnosis.</Text>
    {loading&&<View style={s.state}><ActivityIndicator color={colors.primary}/><Text style={{color:colors.onSurfaceVariant}}>Memuat instrumen aktif…</Text></View>}
    {!loading&&error&&<View style={[s.notice,{borderColor:colors.error}]}><Text style={[s.noticeText,{color:colors.error}]}>{error}</Text>{!instrument&&<Button label="Coba lagi" onPress={()=>{void load();}}/>}</View>}
    {completion&&<View style={[s.card,{backgroundColor:colors.surfaceContainerLowest}]}><Ionicons name="checkmark-circle" size={48} color={colors.primary}/><Text style={[s.cardTitle,{color:colors.onSurface}]}>{completion.message}</Text><Text style={[s.body,{color:colors.onSurfaceVariant}]}>{completion.support_message}</Text><Button label="Isi asesmen lagi nanti" variant="secondary" onPress={()=>{void load();}}/></View>}
    {!loading&&!completion&&instrument&&question&&<>
      <View style={s.progressRow}><Text style={[s.progressText,{color:colors.onSurfaceVariant}]}>{index+1} / {questions.length}</Text><Text style={[s.progressText,{color:colors.onSurfaceVariant}]}>{Object.keys(answers).length} dijawab</Text></View>
      <View style={[s.track,{backgroundColor:colors.surfaceContainerHigh}]}><View style={[s.fill,{backgroundColor:colors.primary,width:`${((index+1)/questions.length)*100}%`}]}/></View>
      <View style={[s.card,{backgroundColor:colors.surfaceContainerLowest}]}>
        <Text style={[s.itemNumber,{color:colors.primary}]}>BUTIR {question.position}</Text>
        <Text style={[s.question,{color:colors.onSurface}]}>{question.wording}</Text>
        <View style={s.options}>{question.options.map(option=>{const selected=answers[question.assessment_question_id]===option.assessment_answer_option_id;return <TouchableOpacity key={option.assessment_answer_option_id} accessibilityRole="radio" accessibilityState={{selected}} activeOpacity={0.8} onPress={()=>setAnswers(current=>({...current,[question.assessment_question_id]:option.assessment_answer_option_id}))} style={[s.option,{borderColor:selected?colors.primary:colors.outlineVariant,backgroundColor:selected?colors.primaryContainer:colors.surfaceContainerLow}]}><Ionicons name={selected?'radio-button-on':'radio-button-off'} size={22} color={selected?colors.primary:colors.outline}/><Text style={[s.optionText,{color:colors.onSurface}]}>{option.label}</Text></TouchableOpacity>;})}</View>
      </View>
      <View style={s.actions}><Button label="Sebelumnya" variant="secondary" disabled={index===0||submitting} onPress={()=>setIndex(value=>Math.max(0,value-1))}/>{index<questions.length-1?<Button label="Berikutnya" disabled={!answers[question.assessment_question_id]} onPress={()=>setIndex(value=>Math.min(questions.length-1,value+1))}/>:<Button label="Kirim asesmen" loading={submitting} disabled={!complete} onPress={confirmSubmit}/>}</View>
      <Text style={[s.provenance,{color:colors.outline}]}>DASS-21 · {instrument.version.language} · Versi {instrument.version.version_number}</Text>
    </>}
  </ScrollView><BottomNav/></View>;
}

const s=StyleSheet.create({
  root:{flex:1},content:{paddingHorizontal:Spacing.base,gap:16},eyebrow:{fontSize:11,fontFamily:'PlusJakartaSans_700Bold',letterSpacing:1.8},title:{fontSize:30,fontFamily:'PlusJakartaSans_800ExtraBold'},subtitle:{fontSize:14,lineHeight:22,fontFamily:'PlusJakartaSans_400Regular'},state:{minHeight:240,alignItems:'center',justifyContent:'center',gap:14},notice:{padding:16,borderWidth:1,borderRadius:BorderRadius.lg,gap:14},noticeText:{fontSize:14,lineHeight:21,fontFamily:'PlusJakartaSans_600SemiBold'},progressRow:{flexDirection:'row',justifyContent:'space-between'},progressText:{fontSize:12,fontFamily:'PlusJakartaSans_700Bold'},track:{height:8,borderRadius:99,overflow:'hidden'},fill:{height:8,borderRadius:99},card:{borderRadius:BorderRadius.xl,padding:Spacing.xl,gap:18,shadowOpacity:0.05,shadowRadius:20,elevation:2},cardTitle:{fontSize:22,fontFamily:'PlusJakartaSans_800ExtraBold'},body:{fontSize:14,lineHeight:22,fontFamily:'PlusJakartaSans_400Regular'},itemNumber:{fontSize:11,fontFamily:'PlusJakartaSans_700Bold',letterSpacing:1.5},question:{fontSize:19,lineHeight:29,fontFamily:'PlusJakartaSans_700Bold'},options:{gap:10},option:{minHeight:56,borderWidth:1,borderRadius:BorderRadius.lg,padding:14,flexDirection:'row',alignItems:'center',gap:12},optionText:{flex:1,fontSize:14,lineHeight:21,fontFamily:'PlusJakartaSans_500Medium'},actions:{flexDirection:'row',justifyContent:'space-between',gap:12},provenance:{fontSize:11,textAlign:'center',fontFamily:'PlusJakartaSans_500Medium'},
});
