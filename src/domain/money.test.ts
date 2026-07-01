import { describe, expect, it } from 'vitest';
import {
  DRIP_PER_CFX,
  DRIP_PER_VOTE,
  formatCfx,
  isWholeVoteAmount,
  parseCfx,
  toBigInt,
} from './money';

describe('money', () => {
  it('parses and formats CFX without floating point arithmetic', () => {
    const value = parseCfx('1234.567890123456789012');
    expect(value).toBe(1234n * DRIP_PER_CFX + 567890123456789012n);
    expect(formatCfx(value, 6)).toBe('1,234.56789');
  });

  it('rejects excessive precision and unsafe numbers', () => {
    expect(() => parseCfx('1.0000000000000000001')).toThrow('最多 18 位小数');
    expect(() => toBigInt(Number.MAX_SAFE_INTEGER + 1)).toThrow('安全整数');
  });

  it('accepts only positive whole vote amounts', () => {
    expect(isWholeVoteAmount(DRIP_PER_VOTE)).toBe(true);
    expect(isWholeVoteAmount(DRIP_PER_VOTE + 1n)).toBe(false);
    expect(isWholeVoteAmount(0n)).toBe(false);
  });
});
