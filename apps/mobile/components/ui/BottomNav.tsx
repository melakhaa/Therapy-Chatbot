import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Neu, useTheme } from '@prototype/ui-shared';

type Tab = {
  label: string;
  icon: string;
  iconActive: string;
  route: string;
};

const TABS: Tab[] = [
  {
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
    route: '/home',
  },
  {
    label: 'Chat',
    icon: 'chatbubble-outline',
    iconActive: 'chatbubble',
    route: '/chat',
  },
  {
    label: 'Asesmen',
    icon: 'clipboard-outline',
    iconActive: 'clipboard',
    route: '/assessment',
  },
  {
    label: 'Konseling',
    icon: 'calendar-outline',
    iconActive: 'calendar',
    route: '/schedule',
  },
  {
    label: 'Jurnal',
    icon: 'book-outline',
    iconActive: 'book',
    route: '/journal-history',
  },
  {
    label: 'Profil',
    icon: 'person-outline',
    iconActive: 'person',
    route: '/profile',
  },
];

// Floating bar; the active tab sits in a sunken well.
// No motion is used when switching tabs.
export default function BottomNav() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pathname = usePathname();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          bottom: insets.bottom + 10,
          backgroundColor: colors.background,
          boxShadow: Neu.raised,
        },
      ]}
    >
      {TABS.map(tab => {
        const active =
          pathname === tab.route ||
          pathname.startsWith(`${tab.route}/`);

        const color = active
          ? colors.primary
          : colors.tabInactive;

        return (
          <Pressable
            key={tab.route}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.tab,
              active && { boxShadow: Neu.inset },
            ]}
            onPress={() => {
              if (!active) {
                router.push(tab.route as never);
              }
            }}
          >
            <Ionicons
              name={
                (active
                  ? tab.iconActive
                  : tab.icon) as React.ComponentProps<
                  typeof Ionicons
                >['name']
              }
              size={21}
              color={color}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color,
                  fontFamily: active
                    ? 'PlusJakartaSans_700Bold'
                    : 'PlusJakartaSans_500Medium',
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    borderRadius: 28,
    padding: 6,
    gap: 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    gap: 2,
    paddingHorizontal: 2,
  },
  label: {
    maxWidth: '100%',
    fontSize: 9,
    letterSpacing: 0,
    textAlign: 'center',
  },
});