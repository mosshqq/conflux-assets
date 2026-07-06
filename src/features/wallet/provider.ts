import type { PreparedTransaction } from '../../domain/types';

type ProviderEvent = 'accountsChanged' | 'chainChanged';

export interface FluentProvider {
  request(args: { method: 'cfx_accounts' }): Promise<string[]>;
  request(args: { method: 'cfx_requestAccounts' }): Promise<string[]>;
  request(args: { method: 'cfx_chainId' }): Promise<string>;
  request(args: {
    method: 'wallet_switchConfluxChain';
    params: [{ chainId: string }];
  }): Promise<null>;
  request(args: {
    method: 'cfx_sendTransaction';
    params: [PreparedTransaction & { from: string }];
  }): Promise<string>;
  on(event: ProviderEvent, callback: (value: any) => void): void;
  off?(event: ProviderEvent, callback: (value: any) => void): void;
}

declare global {
  interface Window {
    conflux?: FluentProvider;
  }
}

export function getFluentProvider(): FluentProvider | undefined {
  return window.conflux;
}
