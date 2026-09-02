import { z } from 'zod';
import { CORE_NETWORK, type CoreNetwork } from '../../config/network';
import type {
  AddressBookmark,
  HomePoolSort,
  PoolConfig,
  PositionPoolSort,
} from '../../domain/types';

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

const homePoolSortSchema = z
  .enum(['favorite', 'apy-desc', 'apy-asc', 'total-staked-desc', 'total-staked-asc'])
  .default('favorite');

const positionPoolSortSchema = z
  .enum([
    'favorite',
    'apy-desc',
    'apy-asc',
    'active-stake-desc',
    'active-stake-asc',
    'claimable-desc',
    'claimable-asc',
  ])
  .default('favorite');

const persistedStateSchema = z.object({
  version: z.literal(1),
  bookmarks: z.array(bookmarkSchema),
  customPools: z.array(customPoolSchema),
  homePoolSort: homePoolSortSchema,
  positionPoolSort: positionPoolSortSchema,
});

const persistedStateExportSchema = z.object({
  app: z.literal('conflux-assets'),
  exportVersion: z.literal(1),
  coreNetworkId: z.enum(['mainnet', 'testnet']),
  exportedAt: z.string(),
  state: persistedStateSchema,
});

const poolConfigExportItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string().optional(),
    source: z.literal('custom'),
  })
  .strict();

const poolConfigExportSchema = z
  .object({
    app: z.literal('conflux-assets'),
    exportType: z.literal('pos-pools'),
    exportVersion: z.literal(1),
    coreNetworkId: z.enum(['mainnet', 'testnet']),
    exportedAt: z.string(),
    pools: z.array(poolConfigExportItemSchema),
  })
  .strict();

export interface PersistedStateV1 {
  version: 1;
  bookmarks: AddressBookmark[];
  customPools: PoolConfig[];
  homePoolSort: HomePoolSort;
  positionPoolSort: PositionPoolSort;
}

export interface PersistedStateExportV1 {
  app: 'conflux-assets';
  exportVersion: 1;
  coreNetworkId: CoreNetwork['id'];
  exportedAt: string;
  state: PersistedStateV1;
}

export interface PoolConfigExportV1 {
  app: 'conflux-assets';
  exportType: 'pos-pools';
  exportVersion: 1;
  coreNetworkId: CoreNetwork['id'];
  exportedAt: string;
  pools: PoolConfig[];
}

export const EMPTY_PERSISTED_STATE: PersistedStateV1 = {
  version: 1,
  bookmarks: [],
  customPools: [],
  homePoolSort: 'favorite',
  positionPoolSort: 'favorite',
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

export function createPersistedStateExport(
  state: PersistedStateV1,
  network: CoreNetwork = CORE_NETWORK,
  exportedAt: Date = new Date(),
): PersistedStateExportV1 {
  return {
    app: 'conflux-assets',
    exportVersion: 1,
    coreNetworkId: network.id,
    exportedAt: exportedAt.toISOString(),
    state,
  };
}

export function serializePersistedStateExport(
  state: PersistedStateV1,
  network: CoreNetwork = CORE_NETWORK,
): string {
  return `${JSON.stringify(createPersistedStateExport(state, network), null, 2)}\n`;
}

export function createPoolConfigExport(
  pools: PoolConfig[],
  network: CoreNetwork = CORE_NETWORK,
  exportedAt: Date = new Date(),
): PoolConfigExportV1 {
  return {
    app: 'conflux-assets',
    exportType: 'pos-pools',
    exportVersion: 1,
    coreNetworkId: network.id,
    exportedAt: exportedAt.toISOString(),
    pools: pools.map(({ id, name, address, website, source }) => ({
      id,
      name,
      address,
      ...(website === undefined ? {} : { website }),
      source,
    })),
  };
}

export function serializePoolConfigExport(
  pools: PoolConfig[],
  network: CoreNetwork = CORE_NETWORK,
): string {
  return `${JSON.stringify(createPoolConfigExport(pools, network), null, 2)}\n`;
}

export function parsePersistedStateImport(
  raw: string,
  network: CoreNetwork = CORE_NETWORK,
): PersistedStateV1 {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('导入文件不是有效 JSON');
  }

  const result = persistedStateExportSchema.safeParse(parsed);
  if (!result.success) throw new Error('导入文件格式不受支持');
  if (result.data.coreNetworkId !== network.id) {
    throw new Error(`导入文件属于 Core ${result.data.coreNetworkId}，当前为 ${network.id}`);
  }

  return result.data.state;
}

export function parsePoolConfigImport(
  raw: string,
  network: CoreNetwork = CORE_NETWORK,
): PoolConfig[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('池配置文件不是有效 JSON');
  }

  const result = poolConfigExportSchema.safeParse(parsed);
  if (!result.success) throw new Error('池配置文件格式不受支持');
  if (result.data.coreNetworkId !== network.id) {
    throw new Error(`池配置文件属于 Core ${result.data.coreNetworkId}，当前为 ${network.id}`);
  }

  return result.data.pools;
}

function mergeByKey<T>(incoming: T[], current: T[], keyOf: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of incoming) merged.set(keyOf(item), item);
  for (const item of current) {
    const key = keyOf(item);
    if (!merged.has(key)) merged.set(key, item);
  }
  return [...merged.values()];
}

export function mergePersistedState(
  current: PersistedStateV1,
  incoming: PersistedStateV1,
): PersistedStateV1 {
  return {
    version: 1,
    bookmarks: mergeByKey(incoming.bookmarks, current.bookmarks, (item) => item.address),
    customPools: mergeByKey(incoming.customPools, current.customPools, (item) => item.address),
    homePoolSort: incoming.homePoolSort,
    positionPoolSort: incoming.positionPoolSort,
  };
}

export function mergePoolConfigs(current: PoolConfig[], incoming: PoolConfig[]): PoolConfig[] {
  return mergeByKey(incoming, current, (item) => item.address);
}
