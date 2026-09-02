import { createContext } from 'react';
import type { AddressBookmark, HomePoolSort, PoolConfig, PositionPoolSort } from '../domain/types';
import type { PersistedStateV1 } from '../infrastructure/storage/localState';

export interface AppStateValue {
  bookmarks: AddressBookmark[];
  customPools: PoolConfig[];
  homePoolSort: HomePoolSort;
  positionPoolSort: PositionPoolSort;
  saveBookmark: (bookmark: AddressBookmark) => void;
  removeBookmark: (address: string) => void;
  addCustomPool: (pool: PoolConfig) => void;
  removeCustomPool: (address: string) => void;
  setHomePoolSort: (sort: HomePoolSort) => void;
  setPositionPoolSort: (sort: PositionPoolSort) => void;
  exportState: () => PersistedStateV1;
  importState: (state: PersistedStateV1) => void;
  importCustomPools: (pools: PoolConfig[]) => void;
}

export const AppStateContext = createContext<AppStateValue | undefined>(undefined);
