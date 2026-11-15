import type { Metadata } from 'next';
import Monitor from '@/components/monitor/Monitor';

export const metadata: Metadata = { title: 'Radiation & vitals · ASTRA Health' };

export default function MonitorPage() {
  return <Monitor />;
}
