import { z } from 'zod';
import { CORE_NETWORK, type CoreNetwork } from '../../config/network';
import type { AddressBookmark, PoolConfig } from '../../domain/types';

export function storageKeyForCoreNetwork(network: CoreNetwork): string {
  return network.id === 'testnet'
    ? 'conflux-pos-dashboard:core-testnet:v1'
    : 'conflux-pos-dashboard:v1';
}

const STORAGE_KEY = storageKeyForCoreNetwork(CORE_NETWORK);

const bookmarkSchema = z.object({
  address: z.string(),
  alias: z.string().optional(),
  createdAt: z.string(),
});

const customPoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  website: z.string().optional(),
  source: z.literal('custom'),
});

const persistedStateSchema = z.object({
  version: z.literal(1),
  bookmarks: z.array(bookmarkSchema),
  customPools: z.array(customPoolSchema),
});

export interface PersistedStateV1 {
  version: 1;
  bookmarks: AddressBookmark[];
  customPools: PoolConfig[];
}

export const EMPTY_PERSISTED_STATE: PersistedStateV1 = {
  version: 1,
  bookmarks: [],
  customPools: [],
};

export function readPersistedState(storage: Storage = window.localStorage): PersistedStateV1 {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PERSISTED_STATE;
    const result = persistedStateSchema.safeParse(JSON.parse(raw));
    if (!result.success) return EMPTY_PERSISTED_STATE;
    return result.data;
  } catch {
    return EMPTY_PERSISTED_STATE;
  }
}

export function writePersistedState(
  state: PersistedStateV1,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
