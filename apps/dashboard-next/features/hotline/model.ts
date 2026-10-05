import type { HotlineDraft, HotlinePayload, HotlineRecord, HotlineStatus } from './types';

export function normalizeHotlineStatus(value: unknown): HotlineStatus {
  return value === 'active' || value === 'inactive' || value === 'verification_required' ? value : 'verification_required';
}

export function filterHotlines(rows: HotlineRecord[], search: string, status: 'all' | HotlineStatus): HotlineRecord[] {
  const needle = search.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    const matchesStatus = status === 'all' || normalizeHotlineStatus(row.verification_status) === status;
    const haystack = `${row.nama} ${row.nomor} ${row.deskripsi ?? ''}`.toLocaleLowerCase();
    return matchesStatus && (!needle || haystack.includes(needle));
  });
}

export function validateHotlineDraft(draft: HotlineDraft): Partial<Record<keyof HotlineDraft, string>> {
  const errors: Partial<Record<keyof HotlineDraft, string>> = {};
  if (!draft.name.trim()) errors.name = 'required';
  const phone = draft.phone.trim();
  if (!phone) errors.phone = 'required';
  else if (!/^[0-9+()\s.\-]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i.test(phone) || phone.replace(/\D/g, '').length < 3) errors.phone = 'invalid';
  return errors;
}

export function toHotlinePayload(draft: HotlineDraft, creating = false): HotlinePayload {
  return { nama: draft.name.trim(), nomor: draft.phone.trim(), deskripsi: draft.description.trim() || null, verification_note: draft.verificationNote.trim() || null, ...(creating ? { verification_status: 'verification_required' as const } : {}) };
}

export function hotlineActionPayload(action: 'verify' | 'reactivate'): Pick<HotlinePayload, 'verification_status'> {
  return { verification_status: action === 'verify' ? 'active' : 'verification_required' };
}

export type HotlineRowAction = 'edit' | 'verify' | 'deactivate' | 'reactivate';
export function hotlineActionsForStatus(status: HotlineStatus): HotlineRowAction[] {
  if (status === 'active') return ['edit', 'deactivate'];
  if (status === 'inactive') return ['edit', 'reactivate'];
  return ['edit', 'verify', 'deactivate'];
}

export const materialEditRequiresAuthoritativeRefetch = true;
