'use client';
import { useState } from 'react';
import type { Explanation, Preset } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { AskCard } from '../components/Ask';
import { useDebounced, useShared } from '../components/Shell';

export default function Page() {
  const { extra } = useShared();
  const [preset, setPreset] = useState<Preset>('worth');
  const settled = useDebounced(extra, 500);
  const explain = useApi<Explanation>(settled === null ? null : `/api/explain?preset=${preset}&extraPerWeek=${settled}`);
  return <AskCard state={explain} preset={preset} onPreset={setPreset} />;
}
