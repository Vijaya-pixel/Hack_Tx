// Inserts one new purchase every few seconds so the live feed moves during the demo.
import type { Store } from './store.ts';
import { CUSTOMER_ID, randomPurchase } from './seed.ts';

export interface Simulator { start(): void; stop(): void; running(): boolean }

export function createSimulator(store: Store, intervalMs = 3000, customerId = CUSTOMER_ID): Simulator {
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    start() {
      if (timer) return;
      timer = setInterval(() => {
        store.add({ ...randomPurchase(), customerId }).catch((e) => console.error('Simulator insert failed:', e.message));
      }, intervalMs);
      timer.unref?.();
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
    running: () => timer !== null,
  };
}
