export const CORE_MAINNET = {
  name: 'Conflux Core Space',
  networkId: 1029,
  chainId: 1029,
  rpcUrl: 'https://main.confluxrpc.com',
  explorerUrl: 'https://confluxscan.org',
} as const;

export const ESPACE_MAINNET = {
  name: 'Conflux eSpace',
  chainId: 1030,
  rpcUrl: 'https://evm.confluxrpc.com',
  explorerUrl: 'https://evm.confluxscan.org',
} as const;

export const PORTFOLIO_REFRESH_INTERVAL = 60_000;
