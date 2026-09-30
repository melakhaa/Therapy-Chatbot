import React, { useState } from 'react';
import { apiCreateAccount, apiUpdateAccount, type Role, type UserRow } from '@prototype/api-client';
import { Button, Dialog, ErrorState, Field, FilterControl, Notice } from '@/components/ui';
import { errorMessage } from '@/hooks/useAdminResource';
import { useAdminExperience } from './AdminExperience';
export const roleOptions = [
  { value: 'mahasiswa', label: 'Mahasiswa' }, { value: 'konselor', label: 'Konselor' },
  { value: 'admin', label: 'Admin' },
];
export default function AccountForm({ user, initialRole = 'mahasiswa', lockRole = false, onClose, onSaved }: { user?: UserRow; initialRole?: Role; lockRole?: boolean; onClose: () => void; onSaved: () => void }) {
  const { language } = useAdminExperience(); const id = language === 'id';
  const [nama, setNama] = useState(user?.nama || '');
  const [email, setEmail] = useState(user?.email || '');
  const [nim, setNim] = useState(user?.nim || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>((user?.role as Role) || initialRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (busy) return;
    if (!nama.trim() || nama.trim().length > 100 || nim.trim().length > 14) { setError(id ? 'Nama wajib diisi (maks. 100 karakter); NIM maks. 14 karakter.' : 'Name is required (max. 100 characters); NIM is limited to 14 characters.'); return; }
    if (!user && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 100 || password.length < 8 || new TextEncoder().encode(password).length > 72)) { setError(id ? 'Isi email yang valid dan kata sandi minimal 8 karakter, maksimal 72 byte.' : 'Enter a valid email and a password of 8 characters minimum and 72 bytes maximum.'); return; }
    setBusy(true); setError(null);
    try {
      if (user) await apiUpdateAccount(user.user_id, { nama: nama.trim(), nim: nim.trim(), role });
      else await apiCreateAccount({ nama: nama.trim(), email: email.trim(), nim: nim.trim(), password, role });
      setPassword(''); onSaved();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <Dialog title={user ? (id ? 'Ubah akun' : 'Edit account') : (id ? 'Tambah akun' : 'Add account')} visible onClose={onClose} busy={busy}>
    <Field label={id ? 'Nama' : 'Name'} value={nama} onChangeText={setNama} maxLength={100} editable={!busy} />
    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!user && !busy} />
    {user && <Notice>{id ? 'Email tidak dapat diubah melalui API akun saat ini.' : 'Email cannot be changed through the current account API.'}</Notice>}
    <Field label={id ? 'NIM (opsional)' : 'NIM (optional)'} value={nim} onChangeText={setNim} maxLength={14} editable={!busy} />
    {!user && <Field label={id ? 'Kata sandi awal' : 'Initial password'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />}
    {lockRole ? <Notice>{id ? 'Jenis akun' : 'Account type'}: {role === 'mahasiswa' ? (id ? 'Mahasiswa' : 'Student') : (id ? 'Konselor' : 'Counselor')}</Notice> : <FilterControl label={id ? 'Peran akun' : 'Account role'} value={role} options={roleOptions.map(option => ({ ...option, label: id ? option.label : option.value === 'mahasiswa' ? 'Student' : option.value === 'konselor' ? 'Counselor' : 'Admin' }))} onChange={v => { if (!busy) setRole(v as Role); }} />}
    {error && <ErrorState message={error} />}
    <Button label={busy ? (id ? 'Menyimpan…' : 'Saving…') : (id ? 'Simpan akun' : 'Save account')} disabled={busy} onPress={() => { void save(); }} />
  </Dialog>;
}
