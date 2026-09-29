import { Redirect } from 'expo-router';
export default function LegacyUsersRoute() { return <Redirect href={'/(dashboard)/students' as any} />; }