import { describe, expect, it } from 'vitest';
import { EMPTY_PERSISTED_STATE, readPersistedState, writePersistedState } from './localState';

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
    };
    writePersistedState(state, storage);
    expect(readPersistedState(storage)).toEqual(state);
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
});
