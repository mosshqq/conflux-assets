import { describe, expect, it } from 'vitest';
import { CORE_MAINNET, CORE_TESTNET, resolveCoreNetwork } from './network';

describe('Core network selection', () => {
  it('uses testnet only in the explicit local development mode', () => {
    expect(resolveCoreNetwork(true, 'core-testnet')).toBe(CORE_TESTNET);
    expect(resolveCoreNetwork(true, 'development')).toBe(CORE_MAINNET);
  });

  it('forces mainnet for production builds regardless of mode', () => {
    expect(resolveCoreNetwork(false, 'core-testnet')).toBe(CORE_MAINNET);
  });
});
