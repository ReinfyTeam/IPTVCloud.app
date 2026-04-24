import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';
import UserStatusGuard from '@/components/UserStatusGuard';
import { SpeedInsights } from '@vercel/speed-insights/next';
import DynamicWrappers from '@/components/DynamicWrappers';
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: 'IPTVCloud.app — Live TV Browser',
  description:
    'Production-ready IPTV browser. Watch thousands of live channels, browse by category and country, save favorites.',
  keywords: ['IPTV', 'live TV', 'streaming', 'channels', 'free TV'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col">
        <NextTopLoader
          color="#06b6d4"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #06b6d4,0 0 5px #06b6d4"
        />
        <ThemeProvider>
          <UserStatusGuard>
            <Navbar />
            <DynamicWrappers />
            <main className="flex-1">{children}</main>
            <Footer />
            <SpeedInsights />
          </UserStatusGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
