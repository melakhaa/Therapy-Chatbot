'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Button, ErrorState, LoadingState } from '@/components/ui';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, logout, refresh } = useAuth(); const { text } = useLanguage(); const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated' || status === 'expired') router.replace('/login'); }, [router, status]);
  if (status === 'loading' || status === 'unauthenticated' || status === 'expired') return <LoadingState fullPage label={status === 'loading' ? text.auth.loading : text.auth.expired} />;
  if (status === 'unauthorized') return <div className="auth-state"><ErrorState title={text.auth.unauthorizedTitle} message={text.auth.unauthorizedBody} /><Button variant="secondary" onClick={() => { logout(); router.replace('/login'); }}>{text.common.logout}</Button></div>;
  if (status === 'unavailable') return <div className="auth-state"><ErrorState title={text.errors.title} message={text.auth.unavailable} retry={() => { void refresh(); }} retryLabel={text.common.retry} /><Button variant="ghost" onClick={() => { logout(); router.replace('/login'); }}>{text.common.logout}</Button></div>;
  return children;
}
