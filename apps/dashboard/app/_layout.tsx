import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdminExperienceProvider, useAdminExperience } from '@/components/admin/AdminExperience';

function AppStack() {
  const { resolvedTheme } = useAdminExperience();
  return <>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(dashboard)" />
      <Stack.Screen name="report-preview" />
    </Stack>
    <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
  </>;
}

export default function RootLayout() {
  return <AdminExperienceProvider><AppStack /></AdminExperienceProvider>;
}
