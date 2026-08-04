import { describe, expect, it } from 'vitest';
import { CORE_MAINNET, CORE_TESTNET } from '../../config/network';
import {
  claimSettingsStorageKeyForCoreNetwork,
  readMinimumClaimDrip,
  writeMinimumClaimDrip,
} from './claimSettings';

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

describe('one-click claim settings', () => {
  it('keeps the threshold isolated by Core network', () => {
    const storage = new MemoryStorage();
    writeMinimumClaimDrip(1234567890123456789n, storage, CORE_MAINNET);

    expect(readMinimumClaimDrip(storage, CORE_MAINNET)).toBe(1234567890123456789n);
    expect(readMinimumClaimDrip(storage, CORE_TESTNET)).toBe(0n);
    expect(claimSettingsStorageKeyForCoreNetwork(CORE_MAINNET)).not.toBe(
      claimSettingsStorageKeyForCoreNetwork(CORE_TESTNET),
    );
  });

  it('falls back safely when saved settings are malformed', () => {
    const storage = new MemoryStorage();
    storage.setItem(claimSettingsStorageKeyForCoreNetwork(CORE_MAINNET), '{broken');
    expect(readMinimumClaimDrip(storage, CORE_MAINNET)).toBe(0n);
  });
});
