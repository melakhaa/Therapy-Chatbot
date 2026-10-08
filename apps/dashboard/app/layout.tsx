import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Sajiwa Admin', template: '%s | Sajiwa Admin' },
  description: 'Platform Operasional Kesehatan Mental Mahasiswa',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeScript = `(function(){try{var m=localStorage.getItem('sajiwa_theme')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;
  return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AppProviders>{children}</AppProviders></body></html>;
}
