'use client';
import { WhatIfCard } from '../components/WhatIf';
import { useShared } from '../components/Shell';

export default function Page() {
  const { plan, extra, setExtra } = useShared();
  return <WhatIfCard state={plan} extra={extra ?? 0} onChange={setExtra} />;
}
