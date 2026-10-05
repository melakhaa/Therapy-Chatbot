export type HotlineStatus = 'active' | 'verification_required' | 'inactive';

export interface HotlineRecord {
  hotline_id: string;
  nama: string;
  nomor: string;
  deskripsi: string | null;
  verification_status?: HotlineStatus | null;
  verified_at?: string | null;
  verified_by?: string | null;
  verification_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface HotlineDraft { name: string; phone: string; description: string; verificationNote: string }
export type HotlinePayload = { nama: string; nomor: string; deskripsi: string | null; verification_note: string | null; verification_status?: HotlineStatus };
