// Emergency contacts shown on the student app's Hotline screen and in its crisis dialog.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  apiAdminGetHotlines, apiAdminCreateHotline, apiAdminUpdateHotline, apiAdminDeleteHotline, type HotlineRow,
} from '@prototype/api-client';
import { Page, Card, Btn, Empty, Loading, useRole, isAdmin } from '../../components/Dash';
import { T, F, Neu } from '../../constants/sajiwa';

type Draft = { nama: string; nomor: string; deskripsi: string };
const EMPTY: Draft = { nama: '', nomor: '', deskripsi: '' };

const Field = ({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) => (
  <View style={{ gap: 6, flex: 1, minWidth: 200 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={T.muted}
      multiline={multiline}
      style={[s.input, multiline && { height: 72, paddingTop: 12 }]}
    />
  </View>
);

export default function HotlinesScreen() {
  const user = useRole();
  const [rows, setRows] = useState<HotlineRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null); // hotline_id or 'new'
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    try {
      setRows((await apiAdminGetHotlines()).hotlines);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat hotline');
      setRows([]);
    }
  };
  useEffect(() => { if (isAdmin(user?.role)) load(); }, []);

  const startEdit = (h?: HotlineRow) => {
    setEditing(h ? h.hotline_id : 'new');
    setDraft(h ? { nama: h.nama, nomor: h.nomor, deskripsi: h.deskripsi ?? '' } : EMPTY);
  };

  const save = async () => {
    if (!draft.nama.trim() || !draft.nomor.trim()) {
      setError('Nama dan nomor wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { nama: draft.nama.trim(), nomor: draft.nomor.trim(), deskripsi: draft.deskripsi.trim() || undefined };
      if (editing === 'new') await apiAdminCreateHotline(body);
      else if (editing) await apiAdminUpdateHotline(editing, body);
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (h: HotlineRow) => {
    const ok = Platform.OS === 'web' ? window.confirm(`Hapus "${h.nama}"? Kontak ini akan hilang dari aplikasi mahasiswa.`) : true;
    if (!ok) return;
    try {
      await apiAdminDeleteHotline(h.hotline_id);
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus');
    }
  };

  if (!isAdmin(user?.role)) {
    return (
      <Page title="Hotline">
        <Card><Empty face="berpikir" title="Khusus admin" body="Daftar hotline dikelola oleh admin." /></Card>
      </Page>
    );
  }

  const form = (
    <View style={s.form}>
      <View style={s.formRow}>
        <Field label="Nama layanan" value={draft.nama} onChange={(v) => setDraft({ ...draft, nama: v })} placeholder="Contoh: Into The Light Indonesia" />
        <Field label="Nomor" value={draft.nomor} onChange={(v) => setDraft({ ...draft, nomor: v })} placeholder="Contoh: 119 ext 8" />
      </View>
      <Field label="Keterangan (opsional)" value={draft.deskripsi} onChange={(v) => setDraft({ ...draft, deskripsi: v })} placeholder="Contoh: Layanan krisis nasional, 24 jam" multiline />
      <View style={s.formActions}>
        <Btn label="Batal" kind="ghost" onPress={() => setEditing(null)} />
        <Btn label={editing === 'new' ? 'Tambah hotline' : 'Simpan perubahan'} kind="primary" icon="check" loading={saving} onPress={save} />
      </View>
    </View>
  );

  return (
    <Page
      title="Hotline"
      subtitle="Kontak darurat yang tampil di halaman Hotline dan dialog krisis aplikasi mahasiswa."
      actions={editing ? null : <Btn label="Tambah hotline" icon="add" kind="primary" onPress={() => startEdit()} />}
    >
      {error ? <Text style={s.error}>{error}</Text> : null}
      {editing === 'new' && <Card title="Hotline baru">{form}</Card>}

      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card><Empty face="berpikir" title="Belum ada hotline" body="Tambahkan minimal satu kontak darurat agar mahasiswa selalu punya tujuan saat krisis." /></Card>
      ) : (
        <View style={{ gap: 14 }}>
          {rows.map((h) =>
            editing === h.hotline_id ? (
              <Card key={h.hotline_id} title="Ubah hotline">{form}</Card>
            ) : (
              <View key={h.hotline_id} style={s.row}>
                <View style={s.callKnob}>
                  <MaterialIcons name="call" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.name}>{h.nama}</Text>
                  <Text style={s.number}>{h.nomor}</Text>
                  {h.deskripsi ? <Text style={s.desc}>{h.deskripsi}</Text> : null}
                </View>
                <Btn label="Ubah" icon="edit" small onPress={() => startEdit(h)} />
                <Btn label="Hapus" icon="delete-outline" small kind="ghost" onPress={() => remove(h)} />
              </View>
            ),
          )}
        </View>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  error: { fontSize: 14, fontFamily: F.semibold, color: T.coral },
  form: { gap: 14 },
  formRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  label: { fontSize: 13, fontFamily: F.bold, color: T.ink },
  input: {
    height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.bg, boxShadow: Neu.inset,
    fontSize: 14, fontFamily: F.medium, color: T.ink, outlineStyle: 'none' as any,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: T.bg, boxShadow: Neu.raisedSm },
  callKnob: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  number: { fontSize: 15, fontFamily: F.extrabold, color: T.primary },
  desc: { fontSize: 13, fontFamily: F.medium, color: T.sub },
});
