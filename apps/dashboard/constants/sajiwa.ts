// Dashboard theme = the mobile app's theme. Colors and neumorphic shadows come straight from
// @prototype/ui-shared so both apps change together; only dashboard-specific aliases live here.
import { SajiwaColors as S, Neu } from '@prototype/ui-shared';

export { Neu };

export const T = {
  bg: S.background,            // one surface color: depth comes from shadows, not fills
  ink: S.onSurface,
  sub: S.onSurfaceVariant,
  muted: S.textMuted,
  primary: S.primary,          // navy
  primaryDim: S.primaryDim,
  onPrimary: S.onPrimary,
  sage: S.sage, sageFill: S.sageFill,
  amber: S.amber, amberFill: S.amberFill,
  coral: S.coral, coralFill: S.coralFill,
  error: S.error,
  hairline: 'rgba(122,134,168,0.22)', // table rows / dividers only
};

// Plus Jakarta Sans, same as mobile (loaded in app/_layout.tsx)
export const F = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

// The companion, shared with the mobile app's sticker set
export const FACE = {
  menyapa: require('../../mobile/assets/Character/expressions/menyapa.png'),
  senang: require('../../mobile/assets/Character/expressions/senang.png'),
  jempol: require('../../mobile/assets/Character/expressions/jempol.png'),
  berpikir: require('../../mobile/assets/Character/expressions/berpikir.png'),
  tenang: require('../../mobile/assets/Character/expressions/tenang.png'),
};
