import type { Metadata } from 'next';
import Resources from '@/components/resources/Resources';

export const metadata: Metadata = { title: 'NASA data · ASTRA Health' };

export default function ResourcesPage() {
  return <Resources />;
}
