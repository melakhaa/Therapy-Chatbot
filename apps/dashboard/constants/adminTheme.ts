export type AdminThemeMode = 'light' | 'dark' | 'system';

export type AdminTokens = {
  background: string; surface: string; surfaceElevated: string; surfaceMuted: string;
  surfaceInteractive: string; text: string; textSecondary: string; muted: string;
  border: string; borderStrong: string; primary: string; primarySoft: string;
  lavender: string; lavenderSoft: string; danger: string; dangerSoft: string;
  warning: string; warningSoft: string; success: string; successSoft: string;
  blue: string; blueSoft: string; overlay: string; focusRing: string;
};

export const lightAdminTokens: AdminTokens = {
  background: '#f2f6f5', surface: '#ffffff', surfaceElevated: '#ffffff', surfaceMuted: '#f7faf9', surfaceInteractive: '#edf4f2',
  text: '#18313b', textSecondary: '#425d67', muted: '#6b7f86', border: '#dfe9e7', borderStrong: '#c6d6d2',
  primary: '#246a63', primarySoft: '#e2f1ed', lavender: '#7464b5', lavenderSoft: '#eeebfa',
  danger: '#aa3f50', dangerSoft: '#fbe9ec', warning: '#946018', warningSoft: '#fff1d6',
  success: '#27745b', successSoft: '#e2f3eb', blue: '#3974aa', blueSoft: '#e8f1fa',
  overlay: 'rgba(12,29,34,0.52)', focusRing: '#67a9a1',
};

export const darkAdminTokens: AdminTokens = {
  background: '#0d171b', surface: '#142126', surfaceElevated: '#192a30', surfaceMuted: '#101c20', surfaceInteractive: '#20363a',
  text: '#edf5f3', textSecondary: '#bfd0cd', muted: '#91a8a5', border: '#294047', borderStrong: '#3b5960',
  primary: '#79c7bb', primarySoft: '#193a37', lavender: '#b5a8ef', lavenderSoft: '#292442',
  danger: '#f08b98', dangerSoft: '#41242b', warning: '#e9b960', warningSoft: '#3b3020',
  success: '#79caa6', successSoft: '#19392d', blue: '#8dbce8', blueSoft: '#1d3244',
  overlay: 'rgba(0,0,0,0.72)', focusRing: '#91d9cf',
};

/** CSS-variable tokens let existing RN Web styles respond to the provider without per-component dark-mode branches. */
export const adminTheme: AdminTokens = {
  background: 'var(--admin-background)', surface: 'var(--admin-surface)', surfaceElevated: 'var(--admin-surface-elevated)',
  surfaceMuted: 'var(--admin-surface-muted)', surfaceInteractive: 'var(--admin-surface-interactive)', text: 'var(--admin-text)',
  textSecondary: 'var(--admin-text-secondary)', muted: 'var(--admin-muted)', border: 'var(--admin-border)', borderStrong: 'var(--admin-border-strong)',
  primary: 'var(--admin-primary)', primarySoft: 'var(--admin-primary-soft)', lavender: 'var(--admin-lavender)', lavenderSoft: 'var(--admin-lavender-soft)',
  danger: 'var(--admin-danger)', dangerSoft: 'var(--admin-danger-soft)', warning: 'var(--admin-warning)', warningSoft: 'var(--admin-warning-soft)',
  success: 'var(--admin-success)', successSoft: 'var(--admin-success-soft)', blue: 'var(--admin-blue)', blueSoft: 'var(--admin-blue-soft)',
  overlay: 'var(--admin-overlay)', focusRing: 'var(--admin-focus-ring)',
};
