import { createContext } from 'react';
import type { AddressBookmark, PoolConfig } from '../domain/types';

export interface AppStateValue {
  bookmarks: AddressBookmark[];
  customPools: PoolConfig[];
  saveBookmark: (bookmark: AddressBookmark) => void;
  removeBookmark: (address: string) => void;
  addCustomPool: (pool: PoolConfig) => void;
  removeCustomPool: (address: string) => void;
}

export const AppStateContext = createContext<AppStateValue | undefined>(undefined);
