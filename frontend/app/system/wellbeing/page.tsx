import type { Metadata } from 'next';
import Wellbeing from '@/components/wellbeing/Wellbeing';

export const metadata: Metadata = { title: 'Wellbeing & sleep · ASTRA Health' };

export default function WellbeingPage() {
  return <Wellbeing />;
}
