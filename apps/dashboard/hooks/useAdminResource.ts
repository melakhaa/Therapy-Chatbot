import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@prototype/api-client';
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) return 'Layanan belum tersedia. Silakan coba lagi.';
    if (error.status === 400) return 'Permintaan tidak dapat diproses. Periksa isian atau hubungan data akun.';
    if (error.status === 422) return 'Data permintaan tidak valid.';
    if (error.status === 401) return 'Sesi berakhir. Silakan keluar dan masuk kembali.';
    if (error.status === 403) return 'Akses tidak diizinkan untuk peran Anda.';
    if (error.status === 404) return 'Catatan tidak ditemukan.';
    return error.message;
  }
  return 'Tidak dapat menghubungi layanan. Periksa koneksi lalu coba lagi.';
}
export function useAdminResource<T>(loader: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    let current = true;
    if (!enabled) { setData(null); setLoading(false); setError(null); return; }
    setLoading(true); setError(null); setData(null);
    loader().then(value => { if (current) setData(value); })
      .catch(e => { if (current) setError(errorMessage(e)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [loader, enabled, revision]);
  return { data, loading, error, reload };
}
