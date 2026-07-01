import { describe, expect, it } from 'vitest';
import { CORE_TESTNET } from '../config/network';
import {
  addressesEqual,
  normalizeESpaceAddress,
  normalizePoolAddress,
  normalizeQueryAddress,
  normalizeUserAddress,
} from './address';

const USER = 'cfx:aamjy3abae3j0ud8ys0npt38ggnunk5r4ps2pg8vcc';
const POOL = 'cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0';
const TESTNET_USER = 'cfxtest:aamjy3abae3j0ud8ys0npt38ggnunk5r4pex9025gj';
const TESTNET_POOL = 'cfxtest:acdj1y1r00mzvuw9s831rj1t5amst2405j5urjj8y6';

describe('Core address rules', () => {
  it('normalizes a mainnet user address', () => {
    expect(normalizeUserAddress(USER.toUpperCase())).toBe(USER);
  });

  it('distinguishes user and contract addresses', () => {
    expect(() => normalizeUserAddress(POOL)).toThrow('用户地址');
    expect(normalizePoolAddress(POOL)).toBe(POOL);
    expect(() => normalizePoolAddress(USER)).toThrow('合约地址');
  });

  it('compares verbose and simple representations by payload', () => {
    const verbose = `CFX:TYPE.USER:${USER.split(':')[1].toUpperCase()}`;
    expect(addressesEqual(USER, verbose)).toBe(true);
  });

  it('rejects non-mainnet prefixes', () => {
    expect(() => normalizeUserAddress(TESTNET_USER)).toThrow('仅支持');
  });

  it('normalizes testnet users and pools against the testnet configuration', () => {
    expect(normalizeUserAddress(TESTNET_USER.toUpperCase(), CORE_TESTNET)).toBe(TESTNET_USER);
    expect(normalizePoolAddress(TESTNET_POOL, CORE_TESTNET)).toBe(TESTNET_POOL);
    expect(() => normalizeUserAddress(USER, CORE_TESTNET)).toThrow('仅支持');
  });

  it('normalizes eSpace addresses and detects the query space', () => {
    const espace = '0x52908400098527886e0f7030069857d2e4169ee7';
    expect(normalizeESpaceAddress(espace)).toBe('0x52908400098527886E0F7030069857D2E4169EE7');
    expect(normalizeQueryAddress(espace)).toEqual({
      address: '0x52908400098527886E0F7030069857D2E4169EE7',
      space: 'espace',
    });
    expect(normalizeQueryAddress(USER)).toEqual({ address: USER, space: 'core' });
  });

  it('rejects malformed eSpace addresses', () => {
    expect(() => normalizeESpaceAddress('0x1234')).toThrow('20 字节');
    expect(() => normalizeESpaceAddress('0xgg00000000000000000000000000000000000000')).toThrow(
      '20 字节',
    );
  });
});
