import { useCallback, useEffect, useState } from 'react';
import { addressesEqual } from '../../domain/address';
import type { PreparedTransaction } from '../../domain/types';
import { getFluentProvider } from './provider';

type WalletStatus = 'not-installed' | 'not-active' | 'in-activating' | 'active' | 'chain-error';

export function useCoreWallet(viewedAddress?: string) {
  const [status, setStatus] = useState<WalletStatus>(() =>
    getFluentProvider() ? 'not-active' : 'not-installed',
  );
  const [account, setAccount] = useState<string>();
  const [chainId, setChainId] = useState<string>();

  const hydrate = useCallback(async () => {
    const provider = getFluentProvider();
    if (!provider) {
      setStatus('not-installed');
      setAccount(undefined);
      setChainId(undefined);
      return;
    }

    try {
      const [accounts, nextChainId] = await Promise.all([
        provider.request({ method: 'cfx_accounts' }),
        provider.request({ method: 'cfx_chainId' }),
      ]);
      setAccount(accounts[0]);
      setChainId(nextChainId);
      setStatus(accounts[0] ? 'active' : 'not-active');
    } catch {
      setStatus('not-active');
    }
  }, []);

  useEffect(() => {
    const provider = getFluentProvider();
    queueMicrotask(() => void hydrate());
    if (!provider) return;

    const handleAccounts = (accounts: string[]) => {
      setAccount(accounts[0]);
      setStatus(accounts[0] ? 'active' : 'not-active');
    };
    const handleChain = (nextChainId: string) => setChainId(nextChainId);
    provider.on('accountsChanged', handleAccounts);
    provider.on('chainChanged', handleChain);

    return () => {
      provider.off?.('accountsChanged', handleAccounts);
      provider.off?.('chainChanged', handleChain);
    };
  }, [hydrate]);

  const connect = useCallback(async () => {
    const provider = getFluentProvider();
    if (!provider) {
      setStatus('not-installed');
      return [];
    }

    setStatus('in-activating');
    try {
      const accounts = await provider.request({ method: 'cfx_requestAccounts' });
      const nextChainId = await provider.request({ method: 'cfx_chainId' });
      setAccount(accounts[0]);
      setChainId(nextChainId);
      setStatus(accounts[0] ? 'active' : 'not-active');
      return accounts;
    } catch (error) {
      setStatus('not-active');
      throw error;
    }
  }, []);

  const sendTransaction = useCallback(
    async (transaction: PreparedTransaction) => {
      const provider = getFluentProvider();
      if (!provider || !account) throw new Error('Fluent 钱包未连接');
      return provider.request({
        method: 'cfx_sendTransaction',
        params: [{ ...transaction, from: account }],
      });
    },
    [account],
  );

  const numericChainId = chainId ? Number(BigInt(chainId)) : undefined;
  const isMainnet = numericChainId === 1029;
  const isMatchingAccount = addressesEqual(account, viewedAddress);

  return {
    status,
    account,
    chainId,
    isMainnet,
    isMatchingAccount,
    canTransact: status === 'active' && isMainnet && isMatchingAccount,
    connect,
    sendTransaction,
  };
}
