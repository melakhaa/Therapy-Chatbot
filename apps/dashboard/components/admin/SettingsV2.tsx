import React from 'react';
import { Text, View } from 'react-native';
import { useAdminProfile, useLogout } from './AdminAuth';
import { ADMIN_PREVIEW } from '@/services/adminData';
import { Eyebrow, LabelValue, SectionHeader } from './OperationsUI';
import { Avatar, Badge, Button, Card, Notice, Page, formatDate, ui } from '@/components/ui';

export default function SettingsV2() {
  const user = useAdminProfile(); const logout = useLogout();
  return <Page title="Settings" subtitle="Administrator profile, session security, and verifiable Sanctuary system information.">
    <View style={ui.grid}><View style={[ui.column, { flexBasis: 470 }]}><Card><SectionHeader title="Administrator profile" description="Identity returned by the authenticated profile endpoint." /><View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={user.nama} /><View style={{ flex: 1 }}><Eyebrow>ADMINISTRATOR</Eyebrow><Text style={[ui.heading, { fontSize: 18 }]}>{user.nama}</Text><Text style={ui.muted}>{user.email}</Text></View><Badge value={user.role} /></View><View style={ui.grid}><LabelValue label="Registered" value={formatDate(user.created_at)} /><LabelValue label="Account ID" value={user.user_id.slice(0, 8)} /></View></Card></View>
    <View style={[ui.column, { flexBasis: 350 }]}><Card title="Session & security" subtitle="Manage access on this device."><Text style={ui.text}>Signing out removes the stored login session for the normal application. Preview mode has no real session.</Text><Button label={ADMIN_PREVIEW ? 'Return to preview login' : 'Sign out securely'} icon="logout" tone="quiet" onPress={() => { void logout(); }} /></Card></View></View>
    <Card><SectionHeader title="Sanctuary system information" description="Facts determined from the current application architecture." /><View style={ui.grid}><LabelValue label="Platform" value="Mental Health Early Warning & Counseling Operations" /><LabelValue label="Active dashboard role" value="Administrator" /><LabelValue label="Assessment presentation" value="DASS-21 Stress · current approved scope" /><LabelValue label="Data mode" value={ADMIN_PREVIEW ? 'Local synthetic preview' : 'Authenticated API'} /></View></Card>
    <Notice>No unsupported notification preferences, assessment thresholds, AI controls, database status, or service-health switches are exposed here.</Notice>
  </Page>;
}
