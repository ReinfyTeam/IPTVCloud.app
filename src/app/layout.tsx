import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';
import CookieConsent from '@/components/CookieConsent';
import NotificationPopup from '@/components/NotificationPopup';
import UserStatusGuard from '@/components/UserStatusGuard';
import { SpeedInsights } from '@vercel/speed-insights/next';

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
        <ThemeProvider>
          <UserStatusGuard>
            <Navbar />
            <NotificationPopup />
            <main className="flex-1">{children}</main>
            <Footer />
            <CookieConsent />
            <SpeedInsights />
          </UserStatusGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
