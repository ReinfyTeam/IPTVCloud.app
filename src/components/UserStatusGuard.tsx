'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';

export default function UserStatusGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isAllowedPath =
      pathname === '/restricted' ||
      pathname.startsWith('/support') ||
      pathname === '/tos' ||
      pathname === '/privacy' ||
      pathname === '/dmca';

    if (user?.isRestricted && !isAllowedPath) {
      router.replace('/restricted');
    }
  }, [user, pathname, router]);

  // If user is restricted, only allow them to see the restricted page, support, or legal pages
  const isAllowedPath =
    pathname === '/restricted' ||
    pathname.startsWith('/support') ||
    pathname === '/tos' ||
    pathname === '/privacy' ||
    pathname === '/dmca';

  if (user?.isRestricted && !isAllowedPath) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
