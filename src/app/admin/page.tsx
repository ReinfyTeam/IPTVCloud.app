import type { Metadata } from 'next';
import AdminDashboard from '@/components/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin | IPTVCloud.app',
  description: 'IPTVCloud admin console for user management and channel operations.',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
