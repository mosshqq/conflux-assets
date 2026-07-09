import { describe, expect, it } from 'vitest';
import { CORE_MAINNET, CORE_TESTNET } from '../../config/network';
import {
  createPersistedStateExport,
  EMPTY_PERSISTED_STATE,
  mergePersistedState,
  parsePersistedStateImport,
  readPersistedState,
  serializePersistedStateExport,
  storageKeyForCoreNetwork,
  writePersistedState,
} from './localState';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('local state', () => {
  it('keeps mainnet and local testnet data in separate storage keys', () => {
    expect(storageKeyForCoreNetwork(CORE_MAINNET)).toBe('conflux-pos-dashboard:v1');
    expect(storageKeyForCoreNetwork(CORE_TESTNET)).toBe('conflux-pos-dashboard:core-testnet:v1');
  });

  it('round-trips versioned data', () => {
    const storage = new MemoryStorage();
    const state = {
      version: 1 as const,
      bookmarks: [
        {
          address: 'cfx:user',
          alias: '主账户',
          createdAt: '2026-06-30T00:00:00.000Z',
        },
      ],
      customPools: [
        {
          id: 'custom:pool',
          name: '收藏池',
          address: 'cfx:contract',
          source: 'custom' as const,
        },
      ],
      homePoolSort: 'total-staked-desc' as const,
      positionPoolSort: 'claimable-asc' as const,
    };
    writePersistedState(state, storage);
    expect(readPersistedState(storage)).toEqual(state);
  });

  it('adds default sort preferences to existing version 1 data', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'conflux-pos-dashboard:v1',
      JSON.stringify({ version: 1, bookmarks: [], customPools: [] }),
    );

    expect(readPersistedState(storage)).toEqual(EMPTY_PERSISTED_STATE);
  });

  it('recovers safely from malformed or future data', () => {
    const storage = new MemoryStorage();
    storage.setItem('conflux-pos-dashboard:v1', '{broken');
    expect(readPersistedState(storage)).toEqual(EMPTY_PERSISTED_STATE);
    storage.setItem(
      'conflux-pos-dashboard:v1',
      JSON.stringify({ version: 2, bookmarks: [], customPools: [] }),
    );
    expect(readPersistedState(storage)).toEqual(EMPTY_PERSISTED_STATE);
  });

  it('serializes and parses export files for the current Core network', () => {
    const state = {
      version: 1 as const,
      bookmarks: [
        {
          address: 'cfx:user',
          alias: '主账户',
          createdAt: '2026-06-30T00:00:00.000Z',
        },
      ],
      customPools: [],
      homePoolSort: 'favorite' as const,
      positionPoolSort: 'favorite' as const,
    };

    const exported = serializePersistedStateExport(state, CORE_MAINNET);

    expect(parsePersistedStateImport(exported, CORE_MAINNET)).toEqual(state);
  });

  it('rejects imports from a different Core network', () => {
    const exported = createPersistedStateExport(EMPTY_PERSISTED_STATE, CORE_TESTNET);

    expect(() => parsePersistedStateImport(JSON.stringify(exported), CORE_MAINNET)).toThrowError(
      '导入文件属于 Core testnet，当前为 mainnet',
    );
  });

  it('merges imported data ahead of existing duplicates without clearing local-only items', () => {
    const current = {
      version: 1 as const,
      bookmarks: [
        { address: 'cfx:old', alias: '旧别名', createdAt: '2026-06-30T00:00:00.000Z' },
        { address: 'cfx:local', alias: '本地', createdAt: '2026-07-01T00:00:00.000Z' },
      ],
      customPools: [
        { id: 'old', name: '旧池', address: 'cfx:pool', source: 'custom' as const },
        { id: 'local', name: '本地池', address: 'cfx:localpool', source: 'custom' as const },
      ],
      homePoolSort: 'favorite' as const,
      positionPoolSort: 'favorite' as const,
    };
    const incoming = {
      version: 1 as const,
      bookmarks: [{ address: 'cfx:old', alias: '新别名', createdAt: '2026-07-02T00:00:00.000Z' }],
      customPools: [{ id: 'new', name: '新池', address: 'cfx:pool', source: 'custom' as const }],
      homePoolSort: 'apy-desc' as const,
      positionPoolSort: 'claimable-desc' as const,
    };

    expect(mergePersistedState(current, incoming)).toEqual({
      version: 1,
      bookmarks: [
        { address: 'cfx:old', alias: '新别名', createdAt: '2026-07-02T00:00:00.000Z' },
        { address: 'cfx:local', alias: '本地', createdAt: '2026-07-01T00:00:00.000Z' },
      ],
      customPools: [
        { id: 'new', name: '新池', address: 'cfx:pool', source: 'custom' },
        { id: 'local', name: '本地池', address: 'cfx:localpool', source: 'custom' },
      ],
      homePoolSort: 'apy-desc',
      positionPoolSort: 'claimable-desc',
    });
  });
});
