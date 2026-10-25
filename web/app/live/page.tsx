'use client';
import type { Feed } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { LiveFeedCard } from '../components/LiveFeed';

export default function Page() {
  return <LiveFeedCard state={useApi<Feed>('/api/feed?limit=12', 3000)} />;
}
