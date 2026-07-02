import { createContext } from 'react';
import type { AddressBookmark, HomePoolSort, PoolConfig, PositionPoolSort } from '../domain/types';

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
}

export const AppStateContext = createContext<AppStateValue | undefined>(undefined);
