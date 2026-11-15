import type { ReactNode } from 'react';
import AppShell from '@/components/app/AppShell';

// every system module shares the sidebar shell; switching modules keeps it mounted
export default function SystemLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
