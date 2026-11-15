import type { Metadata } from 'next';
import Fatigue from '@/components/bay/Fatigue';

export const metadata: Metadata = { title: 'Fatigue & stress · ASTRA Health' };

export default function FatiguePage() {
  return <Fatigue />;
}
