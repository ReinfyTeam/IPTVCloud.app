import React from 'react';
import type { Metadata } from 'next';
import { getChannels } from '@/services/channel-service';
import HomeDashboard from '@/components/HomeDashboard';

export const metadata: Metadata = {
  title: 'Home — IPTVCloud.app',
  description: 'Welcome to IPTVCloud.app. The smartest way to watch live TV.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { channels } = await getChannels();
  return <HomeDashboard allChannels={channels} />;
}
