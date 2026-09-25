import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { darkAdminTokens, lightAdminTokens, type AdminThemeMode, type AdminTokens } from '@/constants/adminTheme';

export type AdminLanguage = 'id' | 'en';
type Dictionary = Record<string, string>;

const id: Dictionary = {
  'nav.overview': 'Ringkasan Operasional', 'nav.assessments': 'Pemantauan Asesmen', 'nav.attention': 'Pemantauan Risiko Tinggi',
  'nav.reports': 'Analitik & Laporan', 'nav.schedule': 'Jadwal Konseling', 'nav.counselors': 'Manajemen Konselor',
  'nav.students': 'Manajemen Mahasiswa', 'nav.hotlines': 'Manajemen Hotline', 'nav.settings': 'Pengaturan',
  'group.overview': 'RINGKASAN', 'group.monitoring': 'PEMANTAUAN', 'group.counseling': 'KONSELING', 'group.management': 'MANAJEMEN', 'group.system': 'SISTEM',
  'common.refresh': 'Muat ulang', 'common.search': 'Cari', 'common.all': 'Semua', 'common.unavailable': 'Belum tersedia',
  'common.pending': 'Integrasi backend belum tersedia', 'common.retry': 'Coba lagi', 'common.close': 'Tutup', 'common.today': 'Hari ini',
  'theme.light': 'Terang', 'theme.dark': 'Gelap', 'theme.system': 'Sistem', 'language.id': 'Bahasa Indonesia', 'language.en': 'English',
  'shell.confidential': 'Rahasia · Administrator', 'shell.notifications': 'Notifikasi', 'shell.profile': 'Profil administrator',
  'preview.label': 'PREVIEW LOKAL — DATA SINTETIS', 'status.connected': 'Terhubung', 'status.backendPending': 'Backend pending',
};
const en: Dictionary = {
  'nav.overview': 'Operations Overview', 'nav.assessments': 'Assessment Monitoring', 'nav.attention': 'High-Risk Monitoring',
  'nav.reports': 'Analytics & Reports', 'nav.schedule': 'Counseling Schedule', 'nav.counselors': 'Counselor Management',
  'nav.students': 'Student Management', 'nav.hotlines': 'Hotline Management', 'nav.settings': 'Settings',
  'group.overview': 'OVERVIEW', 'group.monitoring': 'MONITORING', 'group.counseling': 'COUNSELING', 'group.management': 'MANAGEMENT', 'group.system': 'SYSTEM',
  'common.refresh': 'Refresh', 'common.search': 'Search', 'common.all': 'All', 'common.unavailable': 'Not available',
  'common.pending': 'Backend integration pending', 'common.retry': 'Try again', 'common.close': 'Close', 'common.today': 'Today',
  'theme.light': 'Light', 'theme.dark': 'Dark', 'theme.system': 'System', 'language.id': 'Bahasa Indonesia', 'language.en': 'English',
  'shell.confidential': 'Confidential · Administrator', 'shell.notifications': 'Notifications', 'shell.profile': 'Administrator profile',
  'preview.label': 'LOCAL PREVIEW — SYNTHETIC DATA', 'status.connected': 'Connected', 'status.backendPending': 'Backend pending',
};

type ContextValue = {
  language: AdminLanguage; setLanguage: (value: AdminLanguage) => void;
  themeMode: AdminThemeMode; setThemeMode: (value: AdminThemeMode) => void;
  resolvedTheme: 'light' | 'dark'; colors: AdminTokens; t: (key: string, fallback?: string) => string;
};
const Context = createContext<ContextValue | null>(null);

function readPreference<T extends string>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return (window.localStorage.getItem(key) as T | null) || fallback;
}

export function AdminExperienceProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AdminLanguage>('id');
  const [themeMode, setThemeModeState] = useState<AdminThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
  useEffect(() => { setLanguageState(readPreference('sanctuary_admin_language', 'id')); setThemeModeState(readPreference('sanctuary_admin_theme', 'system')); }, []);
  useEffect(() => { const listener = Appearance.addChangeListener(({ colorScheme }) => setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light')); return () => listener.remove(); }, []);
  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const colors = resolvedTheme === 'dark' ? darkAdminTokens : lightAdminTokens;
  const setLanguage = (value: AdminLanguage) => { setLanguageState(value); if (typeof window !== 'undefined') window.localStorage.setItem('sanctuary_admin_language', value); };
  const setThemeMode = (value: AdminThemeMode) => { setThemeModeState(value); if (typeof window !== 'undefined') window.localStorage.setItem('sanctuary_admin_theme', value); };
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => root.style.setProperty('--admin-' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), value));
    root.style.colorScheme = resolvedTheme;
    root.style.backgroundColor = colors.background;
    let accessibilityStyle = document.getElementById('sanctuary-admin-accessibility');
    if (!accessibilityStyle) { accessibilityStyle = document.createElement('style'); accessibilityStyle.id = 'sanctuary-admin-accessibility'; document.head.appendChild(accessibilityStyle); }
    accessibilityStyle.textContent = '*:focus-visible{outline:3px solid var(--admin-focus-ring)!important;outline-offset:2px}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}';
  }, [colors, resolvedTheme]);
  const value = useMemo<ContextValue>(() => ({ language, setLanguage, themeMode, setThemeMode, resolvedTheme, colors, t: (key, fallback) => (language === 'id' ? id : en)[key] || fallback || key }), [language, themeMode, resolvedTheme, colors]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminExperience() {
  const value = useContext(Context);
  if (!value) throw new Error('AdminExperienceProvider is required');
  return value;
}
