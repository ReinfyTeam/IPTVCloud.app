import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'IPTVCloud.app — Live TV Browser',
  description: 'Production-ready IPTV browser. Watch thousands of live channels, browse by category and country, save favorites.',
  keywords: ['IPTV', 'live TV', 'streaming', 'channels', 'free TV'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
