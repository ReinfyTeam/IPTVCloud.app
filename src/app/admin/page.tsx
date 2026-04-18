import type { Metadata } from 'next';
import AdminDashboard from '@/components/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Console | IPTVCloud.app',
  description: 'IPTVCloud admin console for user management and channel operations.',
};

export default function AdminPage() {
  return (
    <div className="pt-16">
      <AdminDashboard />
    </div>
  );
}
