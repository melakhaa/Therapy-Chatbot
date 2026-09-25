import { Redirect } from 'expo-router';

/** Preserve legacy router links to /(dashboard); /overview is canonical. */
export default function DashboardIndex() {
  return <Redirect href="/overview" />;
}
