import type { IconName } from '@/components/ui/Icon';

export type NavKey = 'overview' | 'monitoring' | 'students' | 'counseling' | 'counselors' | 'analytics' | 'instruments' | 'hotline' | 'settings';
export type NavGroupKey = 'home' | 'monitoring' | 'counseling' | 'analysis' | 'system';
export interface NavItem { key: NavKey; href: string; icon: IconName }
export interface NavGroup { key: NavGroupKey; items: NavItem[] }

export const navigation: NavGroup[] = [
  { key: 'home', items: [{ key: 'overview', href: '/overview', icon: 'home' }] },
  { key: 'monitoring', items: [{ key: 'monitoring', href: '/monitoring', icon: 'monitoring' }, { key: 'students', href: '/students', icon: 'students' }] },
  { key: 'counseling', items: [{ key: 'counseling', href: '/counseling', icon: 'calendar' }, { key: 'counselors', href: '/counselors', icon: 'counselor' }] },
  { key: 'analysis', items: [{ key: 'analytics', href: '/analytics', icon: 'analytics' }] },
  { key: 'system', items: [{ key: 'instruments', href: '/instruments', icon: 'instrument' }, { key: 'hotline', href: '/hotline', icon: 'phone' }, { key: 'settings', href: '/settings', icon: 'settings' }] },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
