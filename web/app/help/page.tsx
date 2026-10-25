'use client';
import { TightCard } from '../components/Tight';
import { useShared } from '../components/Shell';

export default function Page() {
  return <TightCard plan={useShared().plan.data} />;
}
