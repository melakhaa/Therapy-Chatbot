import React, { useState } from 'react';
import { apiCreateAccount, apiUpdateAccount, type Role, type UserRow } from '@prototype/api-client';
import { Button, Dialog, ErrorState, Field, FilterControl, Notice } from '@/components/ui';
import { errorMessage } from '@/hooks/useAdminResource';
export const roleOptions = [
  { value: 'mahasiswa', label: 'Mahasiswa' }, { value: 'konselor', label: 'Konselor' },
  { value: 'admin', label: 'Admin' }, { value: 'pemangku_jabatan', label: 'Pemangku jabatan' },
];
export default function AccountForm({ user, onClose, onSaved }: { user?: UserRow; onClose: () => void; onSaved: () => void }) {
  const [nama, setNama] = useState(user?.nama || '');
  const [email, setEmail] = useState(user?.email || '');
  const [nim, setNim] = useState(user?.nim || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>((user?.role as Role) || 'mahasiswa');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (busy) return;
    if (!nama.trim() || nama.trim().length > 100 || nim.trim().length > 14) { setError('Nama wajib diisi (maks. 100 karakter); NIM maks. 14 karakter.'); return; }
    if (!user && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 100 || password.length < 8 || new TextEncoder().encode(password).length > 72)) { setError('Isi email yang valid dan kata sandi minimal 8 karakter, maksimal 72 byte.'); return; }
    setBusy(true); setError(null);
    try {
      if (user) await apiUpdateAccount(user.user_id, { nama: nama.trim(), nim: nim.trim(), role });
      else await apiCreateAccount({ nama: nama.trim(), email: email.trim(), nim: nim.trim(), password, role });
      setPassword(''); onSaved();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <Dialog title={user ? 'Edit akun' : 'Tambah akun'} visible onClose={onClose} busy={busy}>
    <Field label="Nama" value={nama} onChangeText={setNama} maxLength={100} editable={!busy} />
    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!user && !busy} />
    {user && <Notice>Email tidak dapat diubah melalui API akun saat ini.</Notice>}
    <Field label="NIM (opsional)" value={nim} onChangeText={setNim} maxLength={14} editable={!busy} />
    {!user && <Field label="Kata sandi awal" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />}
    <FilterControl label="Peran akun" value={role} options={roleOptions} onChange={v => { if (!busy) setRole(v as Role); }} />
    {error && <ErrorState message={error} />}
    <Button label={busy ? 'Menyimpan…' : 'Simpan akun'} disabled={busy} onPress={() => { void save(); }} />
  </Dialog>;
}
