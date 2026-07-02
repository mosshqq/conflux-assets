import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  EMPTY_PERSISTED_STATE,
  readPersistedState,
  writePersistedState,
} from '../infrastructure/storage/localState';
import type { AddressBookmark, HomePoolSort, PoolConfig, PositionPoolSort } from '../domain/types';
import { AppStateContext } from './AppStateContext';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() =>
    typeof window === 'undefined' ? EMPTY_PERSISTED_STATE : readPersistedState(),
  );

  useEffect(() => {
    writePersistedState(state);
  }, [state]);

  const saveBookmark = useCallback((bookmark: AddressBookmark) => {
    setState((current) => ({
      ...current,
      bookmarks: [
        bookmark,
        ...current.bookmarks.filter((item) => item.address !== bookmark.address),
      ],
    }));
  }, []);

  const removeBookmark = useCallback((address: string) => {
    setState((current) => ({
      ...current,
      bookmarks: current.bookmarks.filter((item) => item.address !== address),
    }));
  }, []);

  const addCustomPool = useCallback((pool: PoolConfig) => {
    setState((current) => ({
      ...current,
      customPools: [...current.customPools.filter((item) => item.address !== pool.address), pool],
    }));
  }, []);

  const removeCustomPool = useCallback((address: string) => {
    setState((current) => ({
      ...current,
      customPools: current.customPools.filter((item) => item.address !== address),
    }));
  }, []);

  const setHomePoolSort = useCallback((homePoolSort: HomePoolSort) => {
    setState((current) => ({ ...current, homePoolSort }));
  }, []);

  const setPositionPoolSort = useCallback((positionPoolSort: PositionPoolSort) => {
    setState((current) => ({ ...current, positionPoolSort }));
  }, []);

  const value = useMemo(
    () => ({
      bookmarks: state.bookmarks,
      customPools: state.customPools,
      homePoolSort: state.homePoolSort,
      positionPoolSort: state.positionPoolSort,
      saveBookmark,
      removeBookmark,
      addCustomPool,
      removeCustomPool,
      setHomePoolSort,
      setPositionPoolSort,
    }),
    [
      addCustomPool,
      removeBookmark,
      removeCustomPool,
      saveBookmark,
      setHomePoolSort,
      setPositionPoolSort,
      state,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
