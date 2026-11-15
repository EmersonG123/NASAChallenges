import type { Metadata } from 'next';
import Monitor from '@/components/monitor/Monitor';

export const metadata: Metadata = { title: 'Physiology & radiation · ASTRA Health' };

export default function MonitorPage() {
  return <Monitor />;
}
