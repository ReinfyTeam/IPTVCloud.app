'use client';

import dynamic from 'next/dynamic';

const CookieConsent = dynamic(() => import('@/components/CookieConsent'), { ssr: false });
const NotificationPopup = dynamic(() => import('@/components/NotificationPopup'), { ssr: false });

export default function DynamicWrappers() {
  return (
    <>
      <CookieConsent />
      <NotificationPopup />
    </>
  );
}
