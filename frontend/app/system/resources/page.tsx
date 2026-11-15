import type { Metadata } from 'next';
import Resources from '@/components/resources/Resources';

export const metadata: Metadata = { title: 'Data & resources · ASTRA Health' };

export default function ResourcesPage() {
  return <Resources />;
}
