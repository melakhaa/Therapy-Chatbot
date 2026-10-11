import type { AuthenticatedUser } from './auth/session';

export const PREVIEW_ADMIN: AuthenticatedUser = {
  user_id: 'preview-admin-local',
  name: 'Preview Administrator',
  email: 'preview@sajiwa.local',
  role: 'admin',
};

export function resolvePreviewMode(nodeEnv: string | undefined, flag: string | undefined): boolean {
  return nodeEnv === 'development' && flag === 'true';
}

export function isPreviewMode(): boolean {
  return resolvePreviewMode(process.env.NODE_ENV, process.env.NEXT_PUBLIC_PREVIEW_MODE);
}
