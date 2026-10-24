import { apiSuite } from './api.suite.ts';
import { createMemoryStore } from '../src/store.ts';

apiSuite('the memory store', async () => createMemoryStore());
