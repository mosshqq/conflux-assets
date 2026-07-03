export interface CoreNetwork {
  id: 'mainnet' | 'testnet';
  name: string;
  label: string;
  addressPrefix: 'cfx' | 'cfxtest';
  networkId: number;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
}

export interface ESpaceNetwork {
  id: 'mainnet' | 'testnet';
  name: string;
  label: string;
  chainId: 1030 | 71;
  rpcUrl: string;
  explorerUrl: string;
}

export const CORE_MAINNET: CoreNetwork = {
  id: 'mainnet',
  name: 'Conflux Core Space',
  label: '主网',
  addressPrefix: 'cfx',
  networkId: 1029,
  chainId: 1029,
  rpcUrl: 'https://main.confluxrpc.com',
  explorerUrl: 'https://confluxscan.org',
};

export const CORE_TESTNET: CoreNetwork = {
  id: 'testnet',
  name: 'Conflux Core Space',
  label: '测试网',
  addressPrefix: 'cfxtest',
  networkId: 1,
  chainId: 1,
  rpcUrl: 'https://test.confluxrpc.com',
  explorerUrl: 'https://testnet.confluxscan.org',
};

export function resolveCoreNetwork(isDevelopment: boolean, mode: string): CoreNetwork {
  return isDevelopment && mode === 'core-testnet' ? CORE_TESTNET : CORE_MAINNET;
}

const viteEnvironment = (
  import.meta as ImportMeta & {
    env: { DEV: boolean; MODE: string };
  }
).env;

// Production always resolves to mainnet, even if someone builds with --mode core-testnet.
export const CORE_NETWORK = resolveCoreNetwork(viteEnvironment.DEV, viteEnvironment.MODE);

export const ESPACE_MAINNET: ESpaceNetwork = {
  id: 'mainnet',
  name: 'Conflux eSpace',
  label: '主网',
  chainId: 1030,
  rpcUrl: 'https://evm.confluxrpc.com',
  explorerUrl: 'https://evm.confluxscan.org',
};

export const ESPACE_TESTNET: ESpaceNetwork = {
  id: 'testnet',
  name: 'Conflux eSpace',
  label: '测试网',
  chainId: 71,
  rpcUrl: 'https://evmtestnet.confluxrpc.com',
  explorerUrl: 'https://evmtestnet.confluxscan.org',
};

export function resolveESpaceNetwork(isDevelopment: boolean, mode: string): ESpaceNetwork {
  return isDevelopment && mode === 'espace-testnet' ? ESPACE_TESTNET : ESPACE_MAINNET;
}

// Production always resolves to mainnet, even if someone builds with --mode espace-testnet.
export const ESPACE_NETWORK = resolveESpaceNetwork(viteEnvironment.DEV, viteEnvironment.MODE);

export const PORTFOLIO_REFRESH_INTERVAL = 60_000;
