'use client';
import type { Feed, Roundups } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { RoundupsCard } from '../components/Roundups';

export default function Page() {
  const running = useApi<Feed>('/api/feed?limit=1', 3000).data?.running ?? false;
  return <RoundupsCard state={useApi<Roundups>('/api/roundups?range=12w', running ? 4000 : 0)} />;
}
