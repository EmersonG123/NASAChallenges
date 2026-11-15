import type { Metadata } from 'next';
import Bay from '@/components/bay/Bay';

export const metadata: Metadata = { title: 'Crew health · ASTRA Health' };

export default function SystemPage() {
  return <Bay />;
}
