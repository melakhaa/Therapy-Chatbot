import React from 'react';
import { AdminAuth } from '@/components/admin/AdminAuth';
import AdminShell from '@/components/admin/AdminShellV2';
export default function DashboardLayout() { return <AdminAuth><AdminShell /></AdminAuth>; }
