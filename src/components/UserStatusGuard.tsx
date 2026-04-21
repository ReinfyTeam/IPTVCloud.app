'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';

export default function UserStatusGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user?.isRestricted && pathname !== '/restricted' && !pathname.startsWith('/support')) {
      router.replace('/restricted');
    }
  }, [user, pathname, router]);

  // If user is restricted, only allow them to see the restricted page or support
  if (user?.isRestricted && pathname !== '/restricted' && !pathname.startsWith('/support')) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
