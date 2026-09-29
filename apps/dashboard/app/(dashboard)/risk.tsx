import { Redirect } from 'expo-router';
export default function LegacyRiskRoute() { return <Redirect href={'/(dashboard)/assessments' as any} />; }